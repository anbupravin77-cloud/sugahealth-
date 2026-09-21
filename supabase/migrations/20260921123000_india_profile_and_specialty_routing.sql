-- SUGA.HEALTH — India-first patient profile onboarding + specialty-aware doctor routing

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_height_cm_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_height_cm_check
  CHECK (height_cm IS NULL OR (height_cm >= 80 AND height_cm <= 250));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_weight_kg_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_weight_kg_check
  CHECK (weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 400));

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS accepting_new_patients BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_active_cases INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ;

ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_max_active_cases_check;
ALTER TABLE public.staff_profiles ADD CONSTRAINT staff_profiles_max_active_cases_check
  CHECK (max_active_cases > 0 AND max_active_cases <= 500);

-- Populate canonical profiles for existing Supabase Auth users without trusting client metadata for elevated roles.
INSERT INTO public.profiles (
  id, email, display_name, first_name, last_name, role, created_at, updated_at
)
SELECT
  u.id,
  lower(u.email),
  COALESCE(NULLIF(u.raw_user_meta_data->>'display_name',''), NULLIF(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1)),
  COALESCE(NULLIF(u.raw_user_meta_data->>'first_name',''), split_part(COALESCE(u.raw_user_meta_data->>'full_name',''),' ',1)),
  COALESCE(NULLIF(u.raw_user_meta_data->>'last_name',''), ''),
  CASE
    WHEN u.raw_app_meta_data->>'role' IN ('patient','doctor','pharmacist','admin')
      THEN (u.raw_app_meta_data->>'role')::public.user_role
    ELSE 'patient'::public.user_role
  END,
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
  first_name = COALESCE(NULLIF(public.profiles.first_name,''), EXCLUDED.first_name),
  last_name = COALESCE(NULLIF(public.profiles.last_name,''), EXCLUDED.last_name),
  updated_at = now();

-- Ensure staff directory rows exist for server-authorized staff accounts.
INSERT INTO public.staff_profiles (
  id, email, role, active, onboarding_status, first_name, last_name, initials, specialties,
  accepting_new_patients, max_active_cases, created_at, updated_at
)
SELECT
  p.id,
  COALESCE(p.email, ''),
  p.role,
  true,
  'completed',
  p.first_name,
  p.last_name,
  upper(left(COALESCE(p.first_name,'S'),1) || left(COALESCE(NULLIF(p.last_name,''),'H'),1)),
  CASE WHEN p.role = 'doctor' THEN ARRAY['weight','hair','sex']::text[] ELSE NULL END,
  CASE WHEN p.role = 'doctor' THEN true ELSE false END,
  50,
  COALESCE(p.created_at, now()),
  now()
FROM public.profiles p
WHERE p.role IN ('doctor','pharmacist','admin')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  active = true,
  onboarding_status = 'completed',
  first_name = COALESCE(public.staff_profiles.first_name, EXCLUDED.first_name),
  last_name = COALESCE(public.staff_profiles.last_name, EXCLUDED.last_name),
  specialties = CASE
    WHEN public.staff_profiles.role = 'doctor' AND COALESCE(array_length(public.staff_profiles.specialties,1),0) = 0
      THEN ARRAY['weight','hair','sex']::text[]
    ELSE public.staff_profiles.specialties
  END,
  updated_at = now();

-- Keep the canonical test doctor eligible for all three V1 care pathways.
UPDATE public.staff_profiles
SET specialties = ARRAY['weight','hair','sex']::text[],
    accepting_new_patients = true,
    max_active_cases = 50,
    onboarding_status = 'completed',
    active = true,
    updated_at = now()
WHERE lower(email) = 'doctor123@gmail.com' AND role = 'doctor';

-- Give the default patient a complete India/Madurai demo profile so it can exercise the whole portal immediately.
UPDATE public.profiles
SET first_name = 'Test',
    last_name = 'Patient',
    display_name = 'Test Patient',
    phone_number = '+919876543210',
    date_of_birth = DATE '1995-01-01',
    sex = 'other',
    height_cm = 170,
    weight_kg = 70,
    shipping_address = jsonb_build_object(
      'recipientName','Test Patient',
      'line1','Demo Address',
      'line2','',
      'city','Madurai',
      'state','Tamil Nadu',
      'postalCode','625001',
      'country','India',
      'phoneNumber','+919876543210'
    ),
    profile_completed_at = now(),
    updated_at = now()
WHERE lower(email) = 'patient123@gmail.com' AND role = 'patient';

CREATE INDEX IF NOT EXISTS idx_staff_profiles_specialties_gin ON public.staff_profiles USING GIN (specialties);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_assignment ON public.staff_profiles(role, active, accepting_new_patients, last_assigned_at);

-- Canonical specialty-aware least-loaded dispatcher.
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
    v_consultation public.consultations%ROWTYPE;
    v_doctor_id UUID := NULL;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_notif_id TEXT;
    v_idempotency_key TEXT;
    v_patient_name TEXT;
    v_concern TEXT;
    v_specialty TEXT;
BEGIN
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
    IF v_consultation.status IN ('submitted','assigned','under_review') THEN
        RETURN jsonb_build_object(
            'success', true,
            'consultationId', p_consultation_id,
            'assignedDoctorId', v_consultation.assigned_to,
            'alreadySubmitted', true,
            'status', v_consultation.status
        );
    END IF;
    IF v_consultation.status IN ('completed','cancelled') THEN
        RAISE EXCEPTION 'Cannot submit a consultation with status: %.', v_consultation.status;
    END IF;
    IF v_consultation.status <> 'draft' THEN
        RAISE EXCEPTION 'Consultation is not in draft status.';
    END IF;

    v_specialty := CASE lower(trim(COALESCE(v_consultation.primary_concern,'')))
        WHEN 'weight' THEN 'weight'
        WHEN 'weight_loss' THEN 'weight'
        WHEN 'medical_weight_loss' THEN 'weight'
        WHEN 'hair' THEN 'hair'
        WHEN 'hair_growth' THEN 'hair'
        WHEN 'hair_regrowth' THEN 'hair'
        WHEN 'sex' THEN 'sex'
        WHEN 'sexual' THEN 'sex'
        WHEN 'sexual_health' THEN 'sex'
        ELSE lower(trim(COALESCE(v_consultation.primary_concern,'')))
    END;

    -- Prefer eligible doctors for the requested specialty, then choose the least active workload.
    -- last_assigned_at gives deterministic round-robin behavior when loads are equal.
    SELECT s.id INTO v_doctor_id
    FROM public.staff_profiles s
    LEFT JOIN LATERAL (
        SELECT count(*)::int AS active_load
        FROM public.consultations c
        WHERE c.assigned_to = s.id
          AND c.status IN ('assigned','under_review')
    ) load ON true
    WHERE s.role = 'doctor'
      AND s.active = true
      AND s.onboarding_status = 'completed'
      AND s.accepting_new_patients = true
      AND COALESCE(load.active_load,0) < s.max_active_cases
      AND (
        v_specialty = ANY(COALESCE(s.specialties, ARRAY[]::text[]))
        OR 'general' = ANY(COALESCE(s.specialties, ARRAY[]::text[]))
      )
    ORDER BY COALESCE(load.active_load,0) ASC, s.last_assigned_at ASC NULLS FIRST, s.created_at ASC, s.id ASC
    LIMIT 1
    FOR UPDATE OF s SKIP LOCKED;

    -- Backward-compatible fallback only for an explicitly configured test doctor that is active and eligible.
    IF v_doctor_id IS NULL AND p_test_doctor_email IS NOT NULL AND trim(p_test_doctor_email) <> '' THEN
      SELECT s.id INTO v_doctor_id
      FROM public.staff_profiles s
      WHERE lower(s.email) = lower(trim(p_test_doctor_email))
        AND s.role = 'doctor'
        AND s.active = true
        AND s.onboarding_status = 'completed'
        AND s.accepting_new_patients = true
        AND (v_specialty = ANY(COALESCE(s.specialties, ARRAY[]::text[])) OR 'general' = ANY(COALESCE(s.specialties, ARRAY[]::text[])))
      LIMIT 1
      FOR UPDATE;
    END IF;

    UPDATE public.consultations
    SET status = CASE WHEN v_doctor_id IS NOT NULL THEN 'assigned'::public.consultation_status ELSE 'submitted'::public.consultation_status END,
        assigned_to = v_doctor_id,
        submitted_at = v_now,
        updated_at = v_now
    WHERE id = p_consultation_id;

    IF v_doctor_id IS NOT NULL THEN
        UPDATE public.staff_profiles
        SET last_assigned_at = v_now, updated_at = v_now
        WHERE id = v_doctor_id;

        v_notif_id := 'notif_' || extract(epoch from v_now)::bigint::text || '_' || substring(md5(random()::text), 1, 10);
        v_idempotency_key := 'consultation_submit_' || p_consultation_id::text;
        SELECT COALESCE(NULLIF(trim(display_name),''), NULLIF(trim(first_name || ' ' || last_name),''), 'Patient')
          INTO v_patient_name
        FROM public.profiles WHERE id = p_patient_id;
        v_patient_name := COALESCE(v_patient_name, 'Patient');
        v_concern := COALESCE(v_consultation.primary_concern, 'consultation');

        INSERT INTO public.notifications (
            id, patient_id, type, title, short_message,
            related_entity_id, related_entity_type, status, idempotency_key, created_at
        ) VALUES (
            v_notif_id, v_doctor_id, 'CONSULTATION_SUBMITTED',
            'New consultation to review',
            v_patient_name || ' submitted a ' || replace(v_concern,'_',' ') || ' consultation.',
            p_consultation_id::text, 'consultation', 'unread', v_idempotency_key, v_now
        ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'consultationId', p_consultation_id,
        'assignedDoctorId', v_doctor_id,
        'specialty', v_specialty,
        'status', CASE WHEN v_doctor_id IS NOT NULL THEN 'assigned' ELSE 'submitted' END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_submit_consultation(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_submit_consultation(UUID, UUID, TEXT) TO service_role;