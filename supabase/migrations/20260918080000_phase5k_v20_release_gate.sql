-- =============================================================================
-- SUGA.HEALTH — V20 PATIENT + DOCTOR RELEASE GATE MIGRATION
-- Migration: 20260918080000_phase5k_v20_release_gate.sql
-- Description:
--   1. fn_claim_consultation RPC (atomic state transition from submitted/assigned to under_review)
--   2. clinician_message column on prescriptions table
--   3. fn_select_medication_option RPC (transactional row locking & validation)
--   4. Function security execution grants
-- =============================================================================

-- 1. Add clinician_message column to public.prescriptions
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS clinician_message TEXT;

-- 2. Postgres RPC Function: fn_claim_consultation
CREATE OR REPLACE FUNCTION public.fn_claim_consultation(
    p_consultation_id UUID,
    p_doctor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_consultation RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    -- Lock consultation record
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consultation not found.';
    END IF;

    -- Idempotent check: already claimed by this doctor
    IF v_consultation.status = 'under_review' AND v_consultation.assigned_to = p_doctor_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'assignedTo', p_doctor_id,
            'status', 'under_review',
            'alreadyClaimed', true
        );
    END IF;

    -- Cannot claim if assigned to another doctor
    IF v_consultation.assigned_to IS NOT NULL AND v_consultation.assigned_to <> p_doctor_id THEN
        RAISE EXCEPTION 'Forbidden: Consultation is assigned to another clinician.';
    END IF;

    -- Allow claim if status is 'submitted' or 'assigned'
    IF v_consultation.status NOT IN ('submitted', 'assigned') THEN
        RAISE EXCEPTION 'Cannot claim consultation with status: %.', v_consultation.status;
    END IF;

    -- Atomically update status to under_review and assigned_to to p_doctor_id
    UPDATE public.consultations
    SET status = 'under_review',
        assigned_to = p_doctor_id,
        updated_at = v_now
    WHERE id = p_consultation_id;

    RETURN jsonb_build_object(
        'success', true,
        'assignedTo', p_doctor_id,
        'status', 'under_review'
    );
END;
$$;

-- 3. Postgres RPC Function: fn_select_medication_option
CREATE OR REPLACE FUNCTION public.fn_select_medication_option(
    p_consultation_id UUID,
    p_patient_id UUID,
    p_prescription_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_consultation RECORD;
    v_prescription RECORD;
    v_item RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
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
        RAISE EXCEPTION 'Forbidden: You can only select options for your own consultation.';
    END IF;

    IF v_consultation.status <> 'completed' THEN
        RAISE EXCEPTION 'Consultation is not in a completed state for medication selection.';
    END IF;

    -- Lock prescription record
    SELECT * INTO v_prescription
    FROM public.prescriptions
    WHERE consultation_id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No clinical prescription found for this consultation.';
    END IF;

    IF v_prescription.status <> 'finalized' THEN
        RAISE EXCEPTION 'Prescription is not finalized by physician yet.';
    END IF;

    -- Verify item belongs to prescription
    SELECT * INTO v_item
    FROM public.prescription_items
    WHERE id = p_prescription_item_id AND prescription_id = v_prescription.id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid medication selection. Selected item ID is not in the offered clinical prescription.';
    END IF;

    -- Set selected_item_id atomically
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
            'priceInr', COALESCE(v_item.unit_price, 0),
            'description', COALESCE(v_item.description, v_item.directions, 'Clinical therapeutic regimen'),
            'isRecommended', COALESCE(v_item.is_recommended, false)
        ),
        'selectionStatus', 'selected_pending_payment'
    );
END;
$$;

-- 4. Function Security Execution Grants
REVOKE ALL ON FUNCTION public.fn_claim_consultation(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_select_medication_option(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_claim_consultation(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_select_medication_option(UUID, UUID, UUID) TO service_role;
