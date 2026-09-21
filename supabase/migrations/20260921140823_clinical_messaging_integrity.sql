-- SUGA.HEALTH — clinical messaging integrity
-- Align the RPC input role with the canonical public.user_role enum.

CREATE OR REPLACE FUNCTION public.fn_send_message(
    p_thread_id text,
    p_sender_uid uuid,
    p_sender_role text,
    p_message_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_thread public.message_threads%ROWTYPE;
    v_now timestamptz := clock_timestamp();
    v_msg_id text;
    v_recipient_id uuid;
    v_notif_id text;
    v_idempotency_key text;
    v_preview text;
BEGIN
    IF p_sender_role NOT IN ('patient', 'doctor') THEN
        RAISE EXCEPTION 'Forbidden: Unsupported messaging role.';
    END IF;

    IF p_message_text IS NULL OR trim(p_message_text) = '' THEN
        RAISE EXCEPTION 'Message text is required.';
    END IF;

    SELECT * INTO v_thread
    FROM public.message_threads
    WHERE id = p_thread_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message thread not found.';
    END IF;

    IF v_thread.status <> 'open' THEN
        RAISE EXCEPTION 'Message thread is closed.';
    END IF;

    IF p_sender_role = 'patient' AND v_thread.patient_id <> p_sender_uid THEN
        RAISE EXCEPTION 'Forbidden: You are not a participant in this message thread.';
    END IF;

    IF p_sender_role = 'doctor' AND v_thread.doctor_id <> p_sender_uid THEN
        RAISE EXCEPTION 'Forbidden: You are not a participant in this message thread.';
    END IF;

    v_msg_id := 'msg_' || extract(epoch from v_now)::bigint::text || '_' || substring(md5(random()::text), 1, 10);

    INSERT INTO public.messages (
        id,
        thread_id,
        sender_uid,
        sender_role,
        message_text,
        read_at,
        created_at
    ) VALUES (
        v_msg_id,
        p_thread_id,
        p_sender_uid,
        p_sender_role::public.user_role,
        trim(p_message_text),
        NULL,
        v_now
    );

    v_preview := CASE
        WHEN length(trim(p_message_text)) > 80
          THEN substring(trim(p_message_text) from 1 for 77) || '...'
        ELSE trim(p_message_text)
    END;

    IF p_sender_role = 'doctor' THEN
        UPDATE public.message_threads
        SET patient_unread_count = patient_unread_count + 1,
            last_message_preview = v_preview,
            last_message_at = v_now,
            updated_at = v_now
        WHERE id = p_thread_id;
        v_recipient_id := v_thread.patient_id;
    ELSE
        UPDATE public.message_threads
        SET doctor_unread_count = doctor_unread_count + 1,
            last_message_preview = v_preview,
            last_message_at = v_now,
            updated_at = v_now
        WHERE id = p_thread_id;
        v_recipient_id := v_thread.doctor_id;
    END IF;

    v_notif_id := 'notif_' || extract(epoch from v_now)::bigint::text || '_' || substring(md5(random()::text), 1, 8);
    v_idempotency_key := 'message_' || v_msg_id;

    INSERT INTO public.notifications (
        id,
        patient_id,
        type,
        title,
        short_message,
        related_entity_id,
        related_entity_type,
        status,
        idempotency_key,
        created_at
    ) VALUES (
        v_notif_id,
        v_recipient_id,
        'NEW_MESSAGE',
        CASE WHEN p_sender_role = 'doctor' THEN 'New message from your doctor' ELSE 'New patient message' END,
        v_preview,
        p_thread_id,
        'thread',
        'unread',
        v_idempotency_key,
        v_now
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'messageId', v_msg_id,
        'createdAt', v_now
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_send_message(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_send_message(text, uuid, text, text) TO service_role;
