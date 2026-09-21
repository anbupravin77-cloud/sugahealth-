-- =============================================================================
-- SUGA.HEALTH — SPECIALTY-AWARE CLAIM GUARD
-- Migration: 20260921124500_specialty_claim_guard.sql
-- Keeps the fallback doctor queue aligned with automatic specialty/load routing.
-- =============================================================================

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
    v_consultation public.consultations%ROWTYPE;
    v_doctor public.staff_profiles%ROWTYPE;
    v_specialty TEXT;
    v_active_load INTEGER := 0;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT * INTO v_consultation
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consultation not found.';
    END IF;

    SELECT * INTO v_doctor
    FROM public.staff_profiles
    WHERE id = p_doctor_id
    FOR UPDATE;

    IF NOT FOUND OR v_doctor.role <> 'doctor' OR v_doctor.active IS NOT TRUE
       OR v_doctor.onboarding_status <> 'completed' THEN
        RAISE EXCEPTION 'Forbidden: Clinician is not active and fully onboarded.';
    END IF;

    -- Idempotent check: already claimed by this doctor.
    IF v_consultation.status = 'under_review' AND v_consultation.assigned_to = p_doctor_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'assignedTo', p_doctor_id,
            'status', 'under_review',
            'alreadyClaimed', true
        );
    END IF;

    IF v_consultation.assigned_to IS NOT NULL AND v_consultation.assigned_to <> p_doctor_id THEN
        RAISE EXCEPTION 'Forbidden: Consultation is assigned to another clinician.';
    END IF;

    IF v_consultation.status NOT IN ('submitted', 'assigned') THEN
        RAISE EXCEPTION 'Cannot claim consultation with status: %.', v_consultation.status;
    END IF;

    v_specialty := CASE lower(trim(COALESCE(v_consultation.primary_concern, '')))
        WHEN 'weight' THEN 'weight'
        WHEN 'weight_loss' THEN 'weight'
        WHEN 'medical_weight_loss' THEN 'weight'
        WHEN 'hair' THEN 'hair'
        WHEN 'hair_growth' THEN 'hair'
        WHEN 'hair_regrowth' THEN 'hair'
        WHEN 'sex' THEN 'sex'
        WHEN 'sexual' THEN 'sex'
        WHEN 'sexual_health' THEN 'sex'
        ELSE lower(trim(COALESCE(v_consultation.primary_concern, '')))
    END;

    IF NOT (
        v_specialty = ANY(COALESCE(v_doctor.specialties, ARRAY[]::TEXT[]))
        OR 'general' = ANY(COALESCE(v_doctor.specialties, ARRAY[]::TEXT[]))
    ) THEN
        RAISE EXCEPTION 'Forbidden: Doctor specialty does not match this consultation.';
    END IF;

    -- Capacity only blocks taking a new unassigned case. A case already assigned to this
    -- doctor remains claimable so that assignment cannot become stranded after settings change.
    IF v_consultation.assigned_to IS NULL THEN
        IF v_doctor.accepting_new_patients IS NOT TRUE THEN
            RAISE EXCEPTION 'Forbidden: Doctor is not accepting new consultations.';
        END IF;

        SELECT count(*)::INTEGER INTO v_active_load
        FROM public.consultations
        WHERE assigned_to = p_doctor_id
          AND status IN ('assigned', 'under_review');

        IF v_active_load >= COALESCE(v_doctor.max_active_cases, 50) THEN
            RAISE EXCEPTION 'Forbidden: Doctor has reached the active-case limit.';
        END IF;
    END IF;

    UPDATE public.consultations
    SET status = 'under_review',
        assigned_to = p_doctor_id,
        updated_at = v_now
    WHERE id = p_consultation_id;

    UPDATE public.staff_profiles
    SET last_assigned_at = CASE
            WHEN v_consultation.assigned_to IS NULL THEN v_now
            ELSE last_assigned_at
        END,
        updated_at = v_now
    WHERE id = p_doctor_id;

    RETURN jsonb_build_object(
        'success', true,
        'assignedTo', p_doctor_id,
        'status', 'under_review',
        'specialty', v_specialty
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_consultation(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_claim_consultation(UUID, UUID) TO service_role;