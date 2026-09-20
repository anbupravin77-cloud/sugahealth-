-- =============================================================================
-- SUGA.HEALTH — PHASE 5K TRANSACTIONAL WORKFLOWS & SCHEMA INTEGRITY
-- Migration: 20260918060000_phase5k_transactional_workflows.sql
-- Description: Corrective prescription reconciliation across dependent tables,
--              and atomic Postgres RPC functions with TEXT thread IDs and
--              hardened SECURITY DEFINER search_paths and execution permissions.
-- =============================================================================

-- 1. Corrective prescription reconciliation for dependent tables (subscriptions, refill_requests, orders, items)
DO $$
DECLARE
    r RECORD;
    canonical_rx_id UUID;
    dup_rx_id UUID;
BEGIN
    FOR r IN (
        SELECT consultation_id
        FROM public.prescriptions
        GROUP BY consultation_id
        HAVING count(*) > 1
    ) LOOP
        -- Choose canonical prescription (latest finalized or created)
        SELECT id INTO canonical_rx_id
        FROM public.prescriptions
        WHERE consultation_id = r.consultation_id
        ORDER BY (status = 'finalized') DESC, created_at DESC
        LIMIT 1;

        FOR dup_rx_id IN (
            SELECT id FROM public.prescriptions
            WHERE consultation_id = r.consultation_id AND id <> canonical_rx_id
        ) LOOP
            -- Move prescription items
            UPDATE public.prescription_items
            SET prescription_id = canonical_rx_id
            WHERE prescription_id = dup_rx_id;

            -- Move orders
            UPDATE public.orders
            SET prescription_id = canonical_rx_id
            WHERE prescription_id = dup_rx_id;

            -- Move subscriptions if table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions') THEN
                EXECUTE format('UPDATE public.subscriptions SET source_prescription_id = %L WHERE source_prescription_id = %L', canonical_rx_id, dup_rx_id);
            END IF;

            -- Move refill_requests if table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='refill_requests') THEN
                EXECUTE format('UPDATE public.refill_requests SET source_prescription_id = %L WHERE source_prescription_id = %L', canonical_rx_id, dup_rx_id);
            END IF;

            -- Delete duplicate prescription record
            DELETE FROM public.prescriptions WHERE id = dup_rx_id;
        END LOOP;
    END LOOP;
END $$;

-- Verify/ensure unique index on consultation_id for prescriptions
CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_unique_consultation ON public.prescriptions(consultation_id);

-- 2. Postgres RPC Function: fn_submit_consultation
CREATE OR REPLACE FUNCTION public.fn_submit_consultation(
    p_consultation_id UUID,
    p_patient_id UUID,
    p_test_doctor_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_consultation RECORD;
    v_doctor_id UUID := NULL;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_notif_id TEXT;
    v_idempotency_key TEXT;
    v_patient_name TEXT;
    v_concern TEXT;
BEGIN
    -- Lock consultation record
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consultation not found.';
    END IF;

    IF v_consultation.patient_id <> p_patient_id THEN
        RAISE EXCEPTION 'Forbidden: You can only submit your own consultation.';
    END IF;

    -- Handle idempotency & lifecycle
    IF v_consultation.status IN ('submitted', 'assigned', 'under_review') THEN
        RETURN jsonb_build_object(
            'success', true,
            'consultationId', p_consultation_id,
            'assignedDoctorId', v_consultation.assigned_to,
            'alreadySubmitted', true,
            'status', v_consultation.status
        );
    END IF;

    IF v_consultation.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot submit a consultation with status: %.', v_consultation.status;
    END IF;

    IF v_consultation.status <> 'draft' THEN
        RAISE EXCEPTION 'Consultation is not in draft status.';
    END IF;

    -- Resolve eligible doctor from staff_profiles
    IF p_test_doctor_email IS NOT NULL AND lower(trim(p_test_doctor_email)) <> '' THEN
        SELECT id INTO v_doctor_id
        FROM public.staff_profiles
        WHERE lower(email) = lower(trim(p_test_doctor_email))
          AND role = 'doctor'
          AND active = true
          AND onboarding_status = 'completed'
        LIMIT 1;
    END IF;

    IF v_doctor_id IS NULL THEN
        SELECT id INTO v_doctor_id
        FROM public.staff_profiles
        WHERE role = 'doctor'
          AND active = true
          AND onboarding_status = 'completed'
        LIMIT 1;
    END IF;

    -- Update consultation status atomically
    UPDATE public.consultations
    SET status = CASE WHEN v_doctor_id IS NOT NULL THEN 'assigned' ELSE 'submitted' END,
        assigned_to = v_doctor_id,
        submitted_at = v_now,
        updated_at = v_now
    WHERE id = p_consultation_id;

    -- Create doctor notification if assigned
    IF v_doctor_id IS NOT NULL THEN
        v_notif_id := 'notif_' || extract(epoch from v_now)::text || '_' || substring(md5(random()::text), 1, 8);
        v_idempotency_key := 'consultation_submit_' || p_consultation_id::text;
        v_patient_name := coalesce(v_consultation.responses->>'fullName', 'Patient');
        v_concern := coalesce(v_consultation.primary_concern, 'Intake');

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
            v_doctor_id,
            'CONSULTATION_SUBMITTED',
            'New consultation requires review',
            'New intake for ' || v_patient_name || ' (' || v_concern || ') is ready for clinician evaluation.',
            p_consultation_id::text,
            'consultation',
            'unread',
            v_idempotency_key,
            v_now
        )
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'consultationId', p_consultation_id,
        'assignedDoctorId', v_doctor_id
    );
END;
$$;

-- 3. Postgres RPC Function: fn_approve_consultation
CREATE OR REPLACE FUNCTION public.fn_approve_consultation(
    p_consultation_id UUID,
    p_doctor_id UUID,
    p_attestation BOOLEAN,
    p_summary TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_consultation RECORD;
    v_note RECORD;
    v_prescription RECORD;
    v_item_count INT;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_notif_id TEXT;
    v_idempotency_key TEXT;
    v_thread_id TEXT;
    v_assessment_text TEXT;
BEGIN
    -- 1. Lock consultation record
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consultation not found.';
    END IF;

    -- 2. Verify assigned doctor
    IF v_consultation.assigned_to IS NULL OR v_consultation.assigned_to <> p_doctor_id THEN
        RAISE EXCEPTION 'Forbidden: Consultation must be claimed and assigned to you before approving.';
    END IF;

    -- 3. Idempotent check
    IF v_consultation.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'alreadyCompleted', true,
            'status', 'completed',
            'signatureStatus', 'ready_for_signature'
        );
    END IF;

    IF v_consultation.status NOT IN ('assigned', 'under_review') THEN
        RAISE EXCEPTION 'Cannot approve consultation with status: %.', v_consultation.status;
    END IF;

    -- 4. Verify attestation
    IF p_attestation IS NOT TRUE THEN
        RAISE EXCEPTION 'Validation failed: Clinician attestation check is required.';
    END IF;

    -- 5 & 6. Verify assessment & plan
    SELECT * INTO v_note
    FROM public.clinical_notes
    WHERE consultation_id = p_consultation_id AND doctor_id = p_doctor_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_assessment_text := coalesce(nullif(trim(v_note.assessment), ''), nullif(trim(p_summary), ''));
    IF v_assessment_text IS NULL OR v_assessment_text = '' THEN
        RAISE EXCEPTION 'Validation failed: A meaningful clinical assessment is required before approval.';
    END IF;

    IF v_note.plan IS NULL OR trim(v_note.plan) = '' THEN
        RAISE EXCEPTION 'Validation failed: A meaningful clinical treatment plan is required before approval.';
    END IF;

    -- 7, 8, 9, 10. Verify prescription & items
    SELECT * INTO v_prescription
    FROM public.prescriptions
    WHERE consultation_id = p_consultation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Validation failed: A prescription must be saved before approving consultation.';
    END IF;

    IF v_prescription.doctor_id <> p_doctor_id THEN
        RAISE EXCEPTION 'Validation failed: Prescription belongs to a different doctor.';
    END IF;

    SELECT count(*) INTO v_item_count
    FROM public.prescription_items
    WHERE prescription_id = v_prescription.id;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'Validation failed: Prescription must contain at least one offered medication option before approval.';
    END IF;

    -- 11. Finalize prescription
    UPDATE public.prescriptions
    SET status = 'finalized',
        finalized_at = v_now,
        updated_at = v_now
    WHERE id = v_prescription.id;

    -- 12. Complete consultation & store sign-off
    UPDATE public.consultations
    SET status = 'completed',
        completed_at = v_now,
        responses = jsonb_set(
            coalesce(responses, '{}'::jsonb),
            '{signOff}',
            jsonb_build_object(
                'doctorId', p_doctor_id,
                'approvedAt', v_now,
                'clinicianAttestation', true,
                'signaturePlaceholder', 'Electronic signature integration pending provider configuration',
                'signing_status', 'ready_for_signature',
                'treatmentSummary', v_assessment_text
            )
        ) || jsonb_build_object('signing_status', 'ready_for_signature'),
        updated_at = v_now
    WHERE id = p_consultation_id;

    -- 13. Ensure exactly one message thread (with explicit TEXT id)
    SELECT id INTO v_thread_id
    FROM public.message_threads
    WHERE consultation_id = p_consultation_id;

    IF v_thread_id IS NULL THEN
        v_thread_id := 'thread_' || extract(epoch from v_now)::text || '_' || substring(md5(random()::text), 1, 10);

        INSERT INTO public.message_threads (
            id,
            patient_id,
            doctor_id,
            consultation_id,
            status,
            patient_unread_count,
            doctor_unread_count,
            last_message_preview,
            last_message_at,
            created_at,
            updated_at
        ) VALUES (
            v_thread_id,
            v_consultation.patient_id,
            p_doctor_id,
            p_consultation_id,
            'open',
            0,
            0,
            'Conversation started.',
            v_now,
            v_now,
            v_now
        )
        ON CONFLICT (consultation_id) DO UPDATE SET updated_at = EXCLUDED.updated_at
        RETURNING id INTO v_thread_id;
    END IF;

    -- 14. Create exactly one CONSULTATION_APPROVED notification
    v_notif_id := 'notif_' || extract(epoch from v_now)::text || '_' || substring(md5(random()::text), 1, 8);
    v_idempotency_key := 'consultation_approved_' || p_consultation_id::text;

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
        v_consultation.patient_id,
        'CONSULTATION_APPROVED',
        'Your consultation has been reviewed',
        'Your physician has reviewed your intake and approved clinical treatment options.',
        p_consultation_id::text,
        'consultation',
        'unread',
        v_idempotency_key,
        v_now
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'completed',
        'signatureStatus', 'ready_for_signature'
    );
END;
$$;

-- 4. Postgres RPC Function: fn_send_message
CREATE OR REPLACE FUNCTION public.fn_send_message(
    p_thread_id TEXT,
    p_sender_uid UUID,
    p_sender_role TEXT,
    p_message_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_thread RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_msg_id TEXT;
    v_recipient_id UUID;
    v_notif_id TEXT;
    v_idempotency_key TEXT;
    v_preview TEXT;
BEGIN
    IF p_sender_role NOT IN ('patient', 'doctor') THEN
        RAISE EXCEPTION 'Forbidden: Unsupported messaging role.';
    END IF;

    IF p_message_text IS NULL OR trim(p_message_text) = '' THEN
        RAISE EXCEPTION 'Message text is required.';
    END IF;

    -- Lock message thread
    SELECT * INTO v_thread
    FROM public.message_threads
    WHERE id = p_thread_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message thread not found.';
    END IF;

    IF v_thread.status <> 'open' THEN
        RAISE EXCEPTION 'Forbidden: Message thread is closed.';
    END IF;

    IF p_sender_role = 'patient' AND v_thread.patient_id <> p_sender_uid THEN
        RAISE EXCEPTION 'Forbidden: You are not a participant in this message thread.';
    END IF;

    IF p_sender_role = 'doctor' AND v_thread.doctor_id <> p_sender_uid THEN
        RAISE EXCEPTION 'Forbidden: You are not a participant in this message thread.';
    END IF;

    v_msg_id := 'msg_' || extract(epoch from v_now)::text || '_' || substring(md5(random()::text), 1, 10);

    -- Insert message
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
        p_sender_role,
        trim(p_message_text),
        NULL,
        v_now
    );

    v_preview := CASE WHEN length(trim(p_message_text)) > 80 THEN substring(trim(p_message_text) from 1 for 77) || '...' ELSE trim(p_message_text) END;

    -- Update thread counters & snippet
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

    -- Create recipient notification
    v_notif_id := 'notif_' || extract(epoch from v_now)::text || '_' || substring(md5(random()::text), 1, 8);
    v_idempotency_key := 'msg_notif_' || v_msg_id;

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
        CASE WHEN p_sender_role = 'doctor' THEN 'New Message from Physician' ELSE 'New Patient Message' END,
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
$$;

-- 5. Revoke direct browser/public execution of SECURITY DEFINER functions and grant exclusively to service_role
REVOKE ALL ON FUNCTION public.fn_submit_consultation(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_approve_consultation(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_send_message(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_submit_consultation(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_approve_consultation(UUID, UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_send_message(TEXT, UUID, TEXT, TEXT) TO service_role;
