-- SUGA.HEALTH — clinical workflow integrity
-- Align approval and medication-selection RPCs with the canonical schema.

CREATE OR REPLACE FUNCTION public.fn_approve_consultation(
    p_consultation_id uuid,
    p_doctor_id uuid,
    p_attestation boolean,
    p_summary text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_consultation public.consultations%ROWTYPE;
    v_note public.clinical_notes%ROWTYPE;
    v_prescription public.prescriptions%ROWTYPE;
    v_item_count integer;
    v_now timestamptz := clock_timestamp();
    v_notif_id text;
    v_idempotency_key text;
    v_thread_id text;
    v_assessment_text text;
BEGIN
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consultation not found.';
    END IF;

    IF v_consultation.assigned_to IS NULL OR v_consultation.assigned_to <> p_doctor_id THEN
        RAISE EXCEPTION 'Forbidden: Consultation must be assigned to you before approval.';
    END IF;

    IF v_consultation.status = 'completed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'alreadyCompleted', true,
            'status', 'completed',
            'signatureStatus', 'ready_for_signature'
        );
    END IF;

    IF v_consultation.status <> 'under_review' THEN
        RAISE EXCEPTION 'Cannot approve consultation with status: %. Consultation must be under review first.', v_consultation.status;
    END IF;

    IF p_attestation IS NOT TRUE THEN
        RAISE EXCEPTION 'Clinician attestation is required.';
    END IF;

    SELECT * INTO v_note
    FROM public.clinical_notes
    WHERE consultation_id = p_consultation_id
      AND doctor_id = p_doctor_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_assessment_text := coalesce(
        nullif(trim(v_note.assessment), ''),
        nullif(trim(p_summary), '')
    );

    IF v_assessment_text IS NULL THEN
        RAISE EXCEPTION 'A clinical assessment is required before approval.';
    END IF;

    IF v_note.plan IS NULL OR trim(v_note.plan) = '' THEN
        RAISE EXCEPTION 'A treatment plan is required before approval.';
    END IF;

    SELECT * INTO v_prescription
    FROM public.prescriptions
    WHERE consultation_id = p_consultation_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND OR v_prescription.id IS NULL THEN
        RAISE EXCEPTION 'A prescription draft is required before approval.';
    END IF;

    IF v_prescription.doctor_id IS NOT NULL AND v_prescription.doctor_id <> p_doctor_id THEN
        RAISE EXCEPTION 'Prescription belongs to another clinician.';
    END IF;

    SELECT count(*) INTO v_item_count
    FROM public.prescription_items
    WHERE prescription_id = v_prescription.id;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'At least one medication option is required before approval.';
    END IF;

    UPDATE public.prescriptions
    SET status = 'finalized',
        doctor_id = p_doctor_id,
        issued_at = coalesce(issued_at, v_now),
        finalized_at = coalesce(finalized_at, v_now),
        updated_at = v_now
    WHERE id = v_prescription.id;

    UPDATE public.consultations
    SET status = 'completed',
        completed_at = v_now,
        assigned_to = p_doctor_id,
        updated_at = v_now,
        responses = jsonb_set(
            coalesce(responses, '{}'::jsonb),
            '{signing_status}',
            '"ready_for_signature"'::jsonb
        )
    WHERE id = p_consultation_id;

    v_idempotency_key := 'consultation_approved_' || p_consultation_id::text;
    v_notif_id := 'notif_' || extract(epoch from v_now)::bigint::text || '_' || substring(md5(random()::text), 1, 10);

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
    )
    VALUES (
        v_notif_id,
        v_consultation.patient_id,
        'CONSULTATION_APPROVED',
        'Your consultation has been reviewed',
        'Your doctor has completed the review. Your treatment plan is ready to view.',
        p_consultation_id::text,
        'consultation',
        'unread',
        v_idempotency_key,
        v_now
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    v_thread_id := 'thread_' || p_consultation_id::text;

    INSERT INTO public.message_threads (
        id,
        consultation_id,
        patient_id,
        doctor_id,
        status,
        patient_unread_count,
        doctor_unread_count,
        last_message_preview,
        last_message_at,
        created_at,
        updated_at
    )
    VALUES (
        v_thread_id,
        p_consultation_id,
        v_consultation.patient_id,
        p_doctor_id,
        'open',
        0,
        0,
        NULL,
        v_now,
        v_now,
        v_now
    )
    ON CONFLICT (id) DO UPDATE
    SET doctor_id = EXCLUDED.doctor_id,
        status = 'open',
        updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'completed',
        'signatureStatus', 'ready_for_signature',
        'prescriptionId', v_prescription.id,
        'threadId', v_thread_id
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_approve_consultation(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_consultation(uuid, uuid, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_select_medication_option(
    p_consultation_id uuid,
    p_patient_id uuid,
    p_prescription_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_consultation public.consultations%ROWTYPE;
    v_prescription public.prescriptions%ROWTYPE;
    v_item public.prescription_items%ROWTYPE;
    v_now timestamptz := clock_timestamp();
BEGIN
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consultation not found.';
    END IF;

    IF v_consultation.patient_id <> p_patient_id THEN
        RAISE EXCEPTION 'Forbidden: You can only select an option for your own consultation.';
    END IF;

    IF v_consultation.status <> 'completed' THEN
        RAISE EXCEPTION 'The consultation must be completed before selecting a medication option.';
    END IF;

    SELECT * INTO v_prescription
    FROM public.prescriptions
    WHERE consultation_id = p_consultation_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No prescription was found for this consultation.';
    END IF;

    IF v_prescription.patient_id <> p_patient_id THEN
        RAISE EXCEPTION 'Forbidden: Prescription does not belong to this patient.';
    END IF;

    IF v_prescription.status <> 'finalized' THEN
        RAISE EXCEPTION 'The prescription has not been finalized yet.';
    END IF;

    SELECT * INTO v_item
    FROM public.prescription_items
    WHERE id = p_prescription_item_id
      AND prescription_id = v_prescription.id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The selected medication option is not part of this prescription.';
    END IF;

    UPDATE public.prescriptions
    SET selected_item_id = v_item.id,
        selected_at = v_now,
        updated_at = v_now
    WHERE id = v_prescription.id;

    RETURN jsonb_build_object(
        'success', true,
        'selectedOption', jsonb_build_object(
            'id', v_item.id,
            'name', v_item.medication_name,
            'strength', v_item.strength,
            'dosageForm', v_item.dosage_form,
            'priceInr', coalesce(v_item.unit_price, 0),
            'description', coalesce(v_item.description, v_item.sig, 'Treatment option'),
            'isRecommended', coalesce(v_item.is_recommended, false)
        ),
        'selectionStatus', 'selected_pending_payment'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_select_medication_option(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_select_medication_option(uuid, uuid, uuid) TO service_role;
