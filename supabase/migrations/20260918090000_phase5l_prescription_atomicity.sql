-- =============================================================================
-- SUGA.HEALTH — V20 PATIENT + DOCTOR RELEASE HARDENING MIGRATION
-- Migration: 20260918090000_phase5l_prescription_atomicity.sql
-- Description:
--   1. Update fn_approve_consultation to strictly require status = 'under_review'
--      (Direct approval from 'assigned' or other states is strictly prohibited)
--   2. fn_save_prescription_with_options RPC for atomic prescription & items save
--      (Locks consultation, verifies assigned doctor & under_review, replaces items atomically, enforces finalization immutability)
--   3. Function security execution grants and revokes
-- =============================================================================

-- 1. Postgres RPC Function: fn_save_prescription_with_options
CREATE OR REPLACE FUNCTION public.fn_save_prescription_with_options(
    p_consultation_id UUID,
    p_doctor_id UUID,
    p_directions TEXT DEFAULT NULL,
    p_refill_count INT DEFAULT 0,
    p_refill_interval_days INT DEFAULT 30,
    p_clinician_message TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_consultation RECORD;
    v_existing_rx RECORD;
    v_rx_id UUID;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_item_count INT;
    v_input_count INT;
    v_clinician_msg TEXT;
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
        RAISE EXCEPTION 'Forbidden: Consultation must be claimed and assigned to you before prescribing medication.';
    END IF;

    -- 3. Verify status = 'under_review' (do not allow writes while merely 'assigned' or after 'completed')
    IF v_consultation.status <> 'under_review' THEN
        RAISE EXCEPTION 'Forbidden: Consultation must be under_review before prescribing medication. Current status: %.', v_consultation.status;
    END IF;

    -- 4. Check existing prescription and enforce immutability if finalized
    SELECT * INTO v_existing_rx
    FROM public.prescriptions
    WHERE consultation_id = p_consultation_id
    FOR UPDATE;

    IF v_existing_rx IS NOT NULL THEN
        IF v_existing_rx.doctor_id IS NOT NULL AND v_existing_rx.doctor_id <> p_doctor_id THEN
            RAISE EXCEPTION 'Forbidden: Prescription belongs to a different clinician.';
        END IF;

        IF v_existing_rx.status = 'finalized' THEN
            RAISE EXCEPTION 'Forbidden: Prescription is finalized and cannot be modified.';
        END IF;
    END IF;

    v_clinician_msg := COALESCE(
        NULLIF(TRIM(p_clinician_message), ''),
        CASE WHEN v_existing_rx IS NOT NULL THEN v_existing_rx.clinician_message ELSE NULL END,
        'These options correspond to your approved treatment plan. Please review the available choices.'
    );

    -- 5. Create or update prescription
    IF v_existing_rx IS NOT NULL THEN
        v_rx_id := v_existing_rx.id;
        UPDATE public.prescriptions
        SET doctor_id = p_doctor_id,
            directions = p_directions,
            refill_count = COALESCE(p_refill_count, 0),
            refill_interval_days = COALESCE(p_refill_interval_days, 30),
            clinician_message = v_clinician_msg,
            updated_at = v_now
        WHERE id = v_rx_id;
    ELSE
        INSERT INTO public.prescriptions (
            consultation_id,
            patient_id,
            doctor_id,
            status,
            directions,
            refill_count,
            refill_interval_days,
            clinician_message,
            created_at,
            updated_at
        ) VALUES (
            p_consultation_id,
            v_consultation.patient_id,
            p_doctor_id,
            'draft',
            p_directions,
            COALESCE(p_refill_count, 0),
            COALESCE(p_refill_interval_days, 30),
            v_clinician_msg,
            v_now,
            v_now
        )
        RETURNING id INTO v_rx_id;
    END IF;

    -- 6. Delete draft prescription items atomically
    DELETE FROM public.prescription_items
    WHERE prescription_id = v_rx_id;

    -- 7. Insert complete prescription items set
    v_input_count := jsonb_array_length(COALESCE(p_items, '[]'::JSONB));

    IF v_input_count > 0 THEN
        INSERT INTO public.prescription_items (
            prescription_id,
            medication_name,
            active_ingredient,
            strength,
            dosage_form,
            quantity,
            unit_price,
            description,
            is_recommended,
            sig,
            created_at
        )
        SELECT
            v_rx_id,
            TRIM(item->>'name'),
            COALESCE(NULLIF(TRIM(item->>'activeIngredient'), ''), TRIM(item->>'name')),
            TRIM(item->>'strength'),
            TRIM(item->>'dosageForm'),
            COALESCE((item->>'quantity')::INT, 30),
            COALESCE((item->>'priceInr')::NUMERIC, 0),
            NULLIF(TRIM(item->>'description'), ''),
            COALESCE((item->>'isRecommended')::BOOLEAN, false),
            NULLIF(TRIM(p_directions), ''),
            v_now
        FROM jsonb_array_elements(p_items) AS item;

        -- Validate count inserted matches count provided
        SELECT count(*) INTO v_item_count
        FROM public.prescription_items
        WHERE prescription_id = v_rx_id;

        IF v_item_count <> v_input_count THEN
            RAISE EXCEPTION 'Validation failed: Failed to insert complete prescription item set.';
        END IF;
    END IF;

    -- 8. Return result
    RETURN jsonb_build_object(
        'success', true,
        'prescriptionId', v_rx_id
    );
END;
$$;

-- 2. Update fn_approve_consultation to strictly require status = 'under_review'
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

    -- MUST BE under_review (direct approval from assigned or submitted is strictly prohibited)
    IF v_consultation.status <> 'under_review' THEN
        RAISE EXCEPTION 'Cannot approve consultation with status: %. Consultation must be under_review before approval.', v_consultation.status;
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
        RAISE EXCEPTION 'Validation failed: A meaningful treatment plan is required before approval.';
    END IF;

    -- 7 & 8. Verify prescription & items
    SELECT * INTO v_prescription
    FROM public.prescriptions
    WHERE consultation_id = p_consultation_id
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND OR v_prescription.id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: A prescription draft must be prepared before approving.';
    END IF;

    SELECT count(*) INTO v_item_count
    FROM public.prescription_items
    WHERE prescription_id = v_prescription.id;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'Validation failed: At least one canonical medication option must be prescribed.';
    END IF;

    -- 9. Finalize prescription and consultation
    UPDATE public.prescriptions
    SET status = 'finalized',
        doctor_id = p_doctor_id,
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

    -- 10. Generate patient notification (Idempotent via unique key)
    v_idempotency_key := 'notif_comp_' || p_consultation_id::TEXT;
    v_notif_id := 'notif_' || gen_random_uuid()::TEXT;

    INSERT INTO public.notifications (
        id,
        patient_id,
        title,
        message,
        type,
        action_url,
        is_read,
        idempotency_key,
        created_at
    )
    VALUES (
        v_notif_id,
        v_consultation.patient_id,
        'Consultation Approved: Review Your Treatment Plan',
        'Your clinician has reviewed your medical intake and approved your clinical treatment plan. Please review your medication choices.',
        'approval',
        '/consultation?id=' || p_consultation_id::TEXT,
        false,
        v_idempotency_key,
        v_now
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    -- 11. Ensure canonical message thread exists
    v_thread_id := 'thread_' || p_consultation_id::TEXT;

    INSERT INTO public.message_threads (
        id,
        consultation_id,
        patient_id,
        doctor_id,
        subject,
        status,
        last_message_at,
        created_at,
        updated_at
    )
    VALUES (
        v_thread_id,
        p_consultation_id,
        v_consultation.patient_id,
        p_doctor_id,
        'Clinical Consultation Care Thread',
        'active',
        v_now,
        v_now,
        v_now
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'completed',
        'signatureStatus', 'ready_for_signature',
        'prescriptionId', v_prescription.id,
        'threadId', v_thread_id
    );
END;
$$;

-- 3. Function Security Execution Grants
REVOKE ALL ON FUNCTION public.fn_save_prescription_with_options(UUID, UUID, TEXT, INT, INT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_prescription_with_options(UUID, UUID, TEXT, INT, INT, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.fn_approve_consultation(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_consultation(UUID, UUID, BOOLEAN, TEXT) TO service_role;
