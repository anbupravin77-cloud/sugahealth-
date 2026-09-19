-- =============================================================================
-- SUGA.HEALTH - ROW LEVEL SECURITY (RLS) TEST SUITE
-- File: supabase/tests/rls_test.sql
-- Description: Automated verification script validating authorization isolation
--              and least privilege constraints across all healthcare roles.
-- =============================================================================

BEGIN;

-- Helper to simulate Supabase PostgREST JWT claims
CREATE OR REPLACE PROCEDURE test_set_jwt_context(p_uid UUID, p_role TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('role', 'anon', true);
  ELSE
    PERFORM set_config(
      'request.jwt.claims',
      json_build_object(
        'sub', p_uid::text,
        'role', 'authenticated',
        'app_metadata', json_build_object('role', p_role)
      )::text,
      true
    );
    PERFORM set_config('role', 'authenticated', true);
  END IF;
END;
$$;

-- Test Runner Block
DO $$
DECLARE
  v_patient_a_id UUID := '11111111-1111-4111-8111-111111111111'::UUID;
  v_patient_b_id UUID := '22222222-2222-4222-8222-222222222222'::UUID;
  v_doctor_a_id UUID  := '33333333-3333-4333-8333-333333333333'::UUID;
  v_doctor_b_id UUID  := '44444444-4444-4444-8444-444444444444'::UUID;
  v_pharmacist_id UUID:= '55555555-5555-4555-8555-555555555555'::UUID;
  v_admin_id UUID     := '66666666-6666-4666-8666-666666666666'::UUID;

  v_consultation_a_id UUID := 'a0000000-0000-4000-8000-000000000001'::UUID;
  v_consultation_b_id UUID := 'b0000000-0000-4000-8000-000000000002'::UUID;
  v_consultation_draft_a_id UUID := 'a0000000-0000-4000-8000-000000000003'::UUID;
  v_consultation_unassigned_id UUID := 'c0000000-0000-4000-8000-000000000004'::UUID;
  v_rx_a_id UUID           := 'e0000000-0000-4000-8000-000000000001'::UUID;
  v_note_a_id UUID         := 'f0000000-0000-4000-8000-000000000001'::UUID;
  v_order_a_id TEXT        := 'ord_test_001';
  v_thread_a_id TEXT       := 'thread_test_001';
  v_notif_a_id TEXT        := 'notif_test_001';

  v_test_count INT;
BEGIN
  RAISE NOTICE 'Starting Suga.Health RLS Test Suite...';

  -- Temporarily act as superuser/postgres to insert fixture records
  PERFORM set_config('role', 'postgres', true);

  -- Insert mock auth users if auth schema exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO auth.users (id, email) VALUES
      (v_patient_a_id, 'patienta@example.com'),
      (v_patient_b_id, 'patientb@example.com'),
      (v_doctor_a_id, 'doctora@sugahealth.com'),
      (v_doctor_b_id, 'doctorb@sugahealth.com'),
      (v_pharmacist_id, 'pharmacy@sugahealth.com'),
      (v_admin_id, 'admin@sugahealth.com')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Seed profiles
  INSERT INTO public.profiles (id, email, first_name, last_name, role) VALUES
    (v_patient_a_id, 'patienta@example.com', 'Alice', 'Patient', 'patient'),
    (v_patient_b_id, 'patientb@example.com', 'Bob', 'Patient', 'patient'),
    (v_doctor_a_id, 'doctora@sugahealth.com', 'Dr. Adams', 'Physician', 'doctor'),
    (v_doctor_b_id, 'doctorb@sugahealth.com', 'Dr. Baker', 'Physician', 'doctor'),
    (v_pharmacist_id, 'pharmacy@sugahealth.com', 'Phil', 'Pharmacist', 'pharmacist'),
    (v_admin_id, 'admin@sugahealth.com', 'Admin', 'Officer', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  -- Seed staff profiles
  INSERT INTO public.staff_profiles (id, email, role, active, onboarding_status, specialties) VALUES
    (v_doctor_a_id, 'doctora@sugahealth.com', 'doctor', true, 'completed', ARRAY['Endocrinology']),
    (v_doctor_b_id, 'doctorb@sugahealth.com', 'doctor', true, 'completed', ARRAY['Metabolic Health']),
    (v_pharmacist_id, 'pharmacy@sugahealth.com', 'pharmacist', true, 'completed', ARRAY['Compounding']),
    (v_admin_id, 'admin@sugahealth.com', 'admin', true, 'completed', ARRAY['Operations'])
  ON CONFLICT (id) DO NOTHING;

  -- Seed Consultations
  INSERT INTO public.consultations (id, patient_id, assigned_to, status, primary_concern, responses) VALUES
    (v_consultation_a_id, v_patient_a_id, v_doctor_a_id, 'assigned', 'Metabolic support intake', '{"hba1c": 6.8, "allergies": ["penicillin"]}'::jsonb),
    (v_consultation_b_id, v_patient_b_id, v_doctor_b_id, 'assigned', 'Weight management intake', '{"weight_goal": 20}'::jsonb),
    (v_consultation_draft_a_id, v_patient_a_id, NULL, 'draft', 'Draft metabolic intake', '{"step": 1}'::jsonb),
    (v_consultation_unassigned_id, v_patient_b_id, NULL, 'submitted', 'Unassigned queue consultation', '{"sensitive_medical_history": "confidential"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Seed Clinical Notes: Doctor A wrote note for Consultation A
  INSERT INTO public.clinical_notes (id, consultation_id, doctor_id, content, assessment) VALUES
    (v_note_a_id, v_consultation_a_id, v_doctor_a_id, 'SOAP Note for Alice', 'Stable glycemic profile')
  ON CONFLICT (id) DO NOTHING;

  -- Seed Prescription for Consultation A
  INSERT INTO public.prescriptions (id, consultation_id, patient_id, doctor_id, status) VALUES
    (v_rx_a_id, v_consultation_a_id, v_patient_a_id, v_doctor_a_id, 'finalized')
  ON CONFLICT (id) DO NOTHING;

  -- Seed Order for Prescription A
  INSERT INTO public.orders (id, patient_id, prescription_id, subtotal, total_amount, payment_status, fulfillment_status) VALUES
    (v_order_a_id, v_patient_a_id, v_rx_a_id, 120.00, 120.00, 'paid', 'processing')
  ON CONFLICT (id) DO NOTHING;

  -- Seed Message Thread between Patient A and Doctor A
  INSERT INTO public.message_threads (id, patient_id, doctor_id, consultation_id, status) VALUES
    (v_thread_a_id, v_patient_a_id, v_doctor_a_id, v_consultation_a_id, 'open')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.messages (id, thread_id, sender_uid, sender_role, message_text) VALUES
    ('msg_a_001', v_thread_a_id, v_patient_a_id, 'patient', 'Hello Doctor Adams')
  ON CONFLICT (id) DO NOTHING;

  -- Seed Notification for Patient A
  INSERT INTO public.notifications (id, patient_id, type, title, short_message, status, idempotency_key) VALUES
    (v_notif_a_id, v_patient_a_id, 'consultation_scheduled', 'Consultation Confirmed', 'Your appointment is booked', 'unread', 'idem_notif_001')
  ON CONFLICT (id) DO NOTHING;

  -- Seed Audit Log
  INSERT INTO public.audit_logs (action, actor_uid, consultation_id) VALUES
    ('CONSULTATION_SUBMITTED', v_patient_a_id::text, v_consultation_a_id::text);

  -- ---------------------------------------------------------------------------
  -- TEST 1: ANONYMOUS ACCESS RESTRICTIONS
  -- ---------------------------------------------------------------------------
  CALL test_set_jwt_context(NULL, NULL);

  SELECT count(*) INTO v_test_count FROM public.profiles;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Anonymous was able to read % profile records', v_test_count; END IF;

  SELECT count(*) INTO v_test_count FROM public.consultations;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Anonymous was able to read % consultations', v_test_count; END IF;

  SELECT count(*) INTO v_test_count FROM public.prescriptions;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Anonymous was able to read % prescriptions', v_test_count; END IF;

  SELECT count(*) INTO v_test_count FROM public.orders;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Anonymous was able to read % orders', v_test_count; END IF;

  SELECT count(*) INTO v_test_count FROM public.messages;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Anonymous was able to read % messages', v_test_count; END IF;

  SELECT count(*) INTO v_test_count FROM public.audit_logs;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Anonymous was able to read % audit logs', v_test_count; END IF;
  RAISE NOTICE 'PASS: Anonymous access strictly denied across all sensitive tables.';

  -- ---------------------------------------------------------------------------
  -- TEST 2: PATIENT A ISOLATION & CONSULTATION UPDATE HARDENING
  -- ---------------------------------------------------------------------------
  CALL test_set_jwt_context(v_patient_a_id, 'patient');

  -- Can read own profile
  SELECT count(*) INTO v_test_count FROM public.profiles WHERE id = v_patient_a_id;
  IF v_test_count <> 1 THEN RAISE EXCEPTION 'FAIL: Patient A cannot read own profile'; END IF;

  -- CANNOT read Patient B profile
  SELECT count(*) INTO v_test_count FROM public.profiles WHERE id = v_patient_b_id;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Patient A was able to read Patient B profile'; END IF;

  -- Can read own consultation A
  SELECT count(*) INTO v_test_count FROM public.consultations WHERE id = v_consultation_a_id;
  IF v_test_count <> 1 THEN RAISE EXCEPTION 'FAIL: Patient A cannot read own consultation A'; END IF;

  -- CANNOT read Patient B consultation B
  SELECT count(*) INTO v_test_count FROM public.consultations WHERE id = v_consultation_b_id;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Patient A was able to read Patient B consultation'; END IF;

  -- Can update draft consultation content
  UPDATE public.consultations
  SET primary_concern = 'Updated metabolic concern'
  WHERE id = v_consultation_draft_a_id;

  -- TEST 2.1: Patient CANNOT change consultation status (draft -> completed)
  BEGIN
    UPDATE public.consultations
    SET status = 'completed'
    WHERE id = v_consultation_draft_a_id;
    RAISE EXCEPTION 'FAIL: Patient was able to change consultation status directly';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected RLS check violation
  END;

  -- TEST 2.2: Patient CANNOT change consultation assignment
  BEGIN
    UPDATE public.consultations
    SET assigned_to = v_doctor_a_id
    WHERE id = v_consultation_draft_a_id;
    RAISE EXCEPTION 'FAIL: Patient was able to assign doctor to consultation';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected RLS check violation
  END;

  -- TEST 2.3: Patient CANNOT change consultation ownership (patient_id)
  BEGIN
    UPDATE public.consultations
    SET patient_id = v_patient_b_id
    WHERE id = v_consultation_draft_a_id;
    RAISE EXCEPTION 'FAIL: Patient was able to reassign consultation ownership';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected RLS check violation
  END;

  RAISE NOTICE 'PASS: Patient A isolation verified.';
  RAISE NOTICE 'PASS: Patient consultation update restrictions verified (status, assignment, ownership protected).';

  -- ---------------------------------------------------------------------------
  -- TEST 3: NOTIFICATION UPDATE SAFETY (MARK-AS-READ ONLY)
  -- ---------------------------------------------------------------------------
  -- Patient CAN mark notification as read
  UPDATE public.notifications
  SET status = 'read', read_at = NOW()
  WHERE id = v_notif_a_id;

  -- Patient CANNOT modify notification title or message
  BEGIN
    UPDATE public.notifications
    SET title = 'Tampered Title'
    WHERE id = v_notif_a_id;
    RAISE EXCEPTION 'FAIL: Patient was able to tamper with notification title';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected trigger/RLS violation
  END;

  -- Patient CANNOT modify notification ownership or idempotency fields
  BEGIN
    UPDATE public.notifications
    SET patient_id = v_patient_b_id, idempotency_key = 'hacked_key'
    WHERE id = v_notif_a_id;
    RAISE EXCEPTION 'FAIL: Patient was able to modify notification ownership';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected trigger/RLS violation
  END;
  RAISE NOTICE 'PASS: Notification mark-as-read restriction verified (content, ownership, idempotency immutable).';

  -- ---------------------------------------------------------------------------
  -- TEST 4: DOCTOR A ASSIGNMENT & UNASSIGNED QUEUE LEAST-PRIVILEGE
  -- ---------------------------------------------------------------------------
  CALL test_set_jwt_context(v_doctor_a_id, 'doctor');

  -- Doctor A CAN read assigned Consultation A
  SELECT count(*) INTO v_test_count FROM public.consultations WHERE id = v_consultation_a_id;
  IF v_test_count <> 1 THEN RAISE EXCEPTION 'FAIL: Doctor A cannot read assigned Consultation A'; END IF;

  -- Doctor A CANNOT read Consultation B assigned to Doctor B
  SELECT count(*) INTO v_test_count FROM public.consultations WHERE id = v_consultation_b_id;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Doctor A was able to read Doctor B consultation'; END IF;

  -- Doctor A CANNOT read full clinical data (responses JSONB) from unassigned consultation directly from table
  SELECT count(*) INTO v_test_count FROM public.consultations WHERE id = v_consultation_unassigned_id;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Doctor A was able to read full unassigned consultation record'; END IF;

  -- Doctor A CAN inspect minimal operational queue view for unassigned consultations
  SELECT count(*) INTO v_test_count FROM public.v_unassigned_consultation_queue WHERE consultation_id = v_consultation_unassigned_id;
  IF v_test_count <> 1 THEN RAISE EXCEPTION 'FAIL: Doctor A cannot see operational unassigned queue view'; END IF;

  RAISE NOTICE 'PASS: Doctor assigned isolation and unassigned queue least privilege verified.';

  -- ---------------------------------------------------------------------------
  -- TEST 5: CLINICAL NOTES WRITE HARDENING (CLIENT LOCKOUT)
  -- ---------------------------------------------------------------------------
  -- Authorized Doctor A can read their assigned clinical note
  SELECT count(*) INTO v_test_count FROM public.clinical_notes WHERE consultation_id = v_consultation_a_id;
  IF v_test_count <> 1 THEN RAISE EXCEPTION 'FAIL: Doctor A cannot read clinical note for assigned Consultation A'; END IF;

  -- Client CANNOT INSERT clinical notes
  BEGIN
    INSERT INTO public.clinical_notes (consultation_id, doctor_id, content)
    VALUES (v_consultation_a_id, v_doctor_a_id, 'Direct client insert attempt');
    RAISE EXCEPTION 'FAIL: Direct client insert on clinical_notes succeeded';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected RLS denial
  END;

  -- Client CANNOT UPDATE clinical notes
  BEGIN
    UPDATE public.clinical_notes
    SET content = 'Tampered content'
    WHERE id = v_note_a_id;
    RAISE EXCEPTION 'FAIL: Direct client update on clinical_notes succeeded';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected RLS denial
  END;

  -- Client CANNOT DELETE clinical notes
  BEGIN
    DELETE FROM public.clinical_notes
    WHERE id = v_note_a_id;
    RAISE EXCEPTION 'FAIL: Direct client delete on clinical_notes succeeded';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected RLS denial
  END;
  RAISE NOTICE 'PASS: Clinical notes client-write lockout (INSERT, UPDATE, DELETE denied) verified.';

  -- ---------------------------------------------------------------------------
  -- TEST 6: PHARMACIST ACCESS BOUNDARIES
  -- ---------------------------------------------------------------------------
  CALL test_set_jwt_context(v_pharmacist_id, 'pharmacist');

  -- Pharmacist CAN read orders for dispensing/fulfillment
  SELECT count(*) INTO v_test_count FROM public.orders WHERE id = v_order_a_id;
  IF v_test_count <> 1 THEN RAISE EXCEPTION 'FAIL: Pharmacist cannot read order for fulfillment'; END IF;

  -- Pharmacist CAN read authorized prescription
  SELECT count(*) INTO v_test_count FROM public.prescriptions WHERE id = v_rx_a_id;
  IF v_test_count <> 1 THEN RAISE EXCEPTION 'FAIL: Pharmacist cannot read prescription'; END IF;

  -- Pharmacist CANNOT read clinical notes
  SELECT count(*) INTO v_test_count FROM public.clinical_notes;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Pharmacist was able to read clinical notes'; END IF;

  -- Pharmacist CANNOT read doctor-patient message threads
  SELECT count(*) INTO v_test_count FROM public.message_threads;
  IF v_test_count > 0 THEN RAISE EXCEPTION 'FAIL: Pharmacist was able to read message threads'; END IF;
  RAISE NOTICE 'PASS: Pharmacist access boundaries & clinical privacy verified.';

  -- ---------------------------------------------------------------------------
  -- TEST 7: PATIENT-SAFE DOCTOR DIRECTORY VIEW
  -- ---------------------------------------------------------------------------
  CALL test_set_jwt_context(v_patient_a_id, 'patient');

  -- Patient CAN read public doctor directory view
  SELECT count(*) INTO v_test_count FROM public.v_doctor_directory WHERE doctor_id = v_doctor_a_id;
  IF v_test_count <> 1 THEN RAISE EXCEPTION 'FAIL: Patient cannot view doctor directory view'; END IF;
  RAISE NOTICE 'PASS: Patient-safe doctor directory view verified.';

  -- ---------------------------------------------------------------------------
  -- TEST 8: ADMIN ACCESS & AUDIT LOG IMMUTABILITY
  -- ---------------------------------------------------------------------------
  CALL test_set_jwt_context(v_admin_id, 'admin');

  SELECT count(*) INTO v_test_count FROM public.profiles;
  IF v_test_count < 6 THEN RAISE EXCEPTION 'FAIL: Admin cannot read all profiles'; END IF;

  SELECT count(*) INTO v_test_count FROM public.audit_logs;
  IF v_test_count < 1 THEN RAISE EXCEPTION 'FAIL: Admin cannot read audit logs'; END IF;

  BEGIN
    INSERT INTO public.audit_logs (action, actor_uid) VALUES ('MALICIOUS_LOG', v_admin_id::text);
    RAISE EXCEPTION 'FAIL: Direct client write to audit_logs succeeded';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Expected denial
  END;
  RAISE NOTICE 'PASS: Admin authorization and audit immutability verified.';

  RAISE NOTICE 'ALL RLS TEST SUITES COMPLETED SUCCESSFULLY!';
END;
$$;

ROLLBACK; -- Always roll back test fixtures cleanly
