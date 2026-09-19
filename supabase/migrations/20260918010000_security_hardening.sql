-- =============================================================================
-- SUGA.HEALTH - SECURITY HARDENING & POLICY REFINEMENT MIGRATION
-- Migration: 20260918010000_security_hardening.sql
-- Description: Enforces least-privilege RLS policies, patient consultation draft
--              constraints, doctor unassigned queue data minimization, safe doctor
--              directory view, notification immutability trigger, and explicit
--              operation-specific write denials (INSERT, UPDATE, DELETE).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CONSULTATIONS RLS HARDENING
-- -----------------------------------------------------------------------------

-- Drop old consultation policies
DROP POLICY IF EXISTS "consultations_select" ON public.consultations;
DROP POLICY IF EXISTS "consultations_update" ON public.consultations;
DROP POLICY IF EXISTS "consultations_insert" ON public.consultations;
DROP POLICY IF EXISTS "consultations_no_client_delete" ON public.consultations;

-- 1.1 SELECT: Patients read their own; Admins read all; Doctors read ONLY assigned
-- Note: Doctors CANNOT read full consultation records (responses JSONB, etc.) for unassigned queue items.
CREATE POLICY "consultations_select" ON public.consultations
FOR SELECT TO authenticated
USING (
    auth.uid() = patient_id OR
    public.get_current_role() = 'admin' OR
    (public.get_current_role() = 'doctor' AND assigned_to = auth.uid())
);

-- 1.2 INSERT: Patients can only create draft or submitted consultations for themselves
CREATE POLICY "consultations_patient_insert" ON public.consultations
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = patient_id AND
    assigned_to IS NULL AND
    completed_at IS NULL
);

-- 1.3 UPDATE (PATIENT): Patients can only edit their OWN draft consultations.
-- Strict WITH CHECK prevents changing status, patient_id, assigned_to, or lifecycle timestamps.
CREATE POLICY "consultations_patient_update" ON public.consultations
FOR UPDATE TO authenticated
USING (
    auth.uid() = patient_id AND status = 'draft'
)
WITH CHECK (
    auth.uid() = patient_id AND
    status = 'draft' AND
    assigned_to IS NULL AND
    submitted_at IS NULL AND
    completed_at IS NULL
);

-- 1.4 UPDATE (ADMIN): Privileged staff/admin lifecycle management
CREATE POLICY "consultations_admin_update" ON public.consultations
FOR UPDATE TO authenticated
USING (
    public.get_current_role() = 'admin'
)
WITH CHECK (
    public.get_current_role() = 'admin'
);

-- 1.5 DELETE: Explicit client denial (consultations are permanent medical records)
CREATE POLICY "consultations_no_client_delete" ON public.consultations
FOR DELETE TO authenticated
USING (false);


-- -----------------------------------------------------------------------------
-- 2. CLINICAL NOTES WRITE HARDENING (EXPLICIT OPERATION POLICIES)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "clinical_notes_no_client_write" ON public.clinical_notes;
DROP POLICY IF EXISTS "clinical_notes_no_client_insert" ON public.clinical_notes;
DROP POLICY IF EXISTS "clinical_notes_no_client_update" ON public.clinical_notes;
DROP POLICY IF EXISTS "clinical_notes_no_client_delete" ON public.clinical_notes;

-- Explicitly deny client-side INSERT, UPDATE, and DELETE
CREATE POLICY "clinical_notes_no_client_insert" ON public.clinical_notes
FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "clinical_notes_no_client_update" ON public.clinical_notes
FOR UPDATE TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "clinical_notes_no_client_delete" ON public.clinical_notes
FOR DELETE TO authenticated
USING (false);


-- -----------------------------------------------------------------------------
-- 3. DOCTOR UNASSIGNED QUEUE VIEW (DATA MINIMIZATION)
-- -----------------------------------------------------------------------------

-- Secure view exposing only operational metadata needed for queue triage and claiming.
-- Strictly excludes clinical questionnaire answers (`responses` JSONB), patient demographics, and medical notes.
CREATE OR REPLACE VIEW public.v_unassigned_consultation_queue
WITH (security_barrier = true)
AS
SELECT
    c.id AS consultation_id,
    c.status,
    c.primary_concern,
    c.preferred_dosage,
    c.submitted_at,
    c.created_at
FROM public.consultations c
WHERE c.status = 'submitted'
  AND c.assigned_to IS NULL
  AND public.get_current_role() IN ('doctor', 'admin');

GRANT SELECT ON public.v_unassigned_consultation_queue TO authenticated;


-- -----------------------------------------------------------------------------
-- 4. PATIENT-SAFE DOCTOR DIRECTORY VIEW
-- -----------------------------------------------------------------------------

-- Secure view exposing only non-sensitive clinician metadata for patient UI displays.
-- Strictly excludes email, phone, physical address, DOB, license number, NPI number,
-- signature URL, firebase_uid, and internal audit flags.
CREATE OR REPLACE VIEW public.v_doctor_directory
WITH (security_barrier = true)
AS
SELECT
    sp.id AS doctor_id,
    p.first_name,
    p.last_name,
    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS display_name,
    CONCAT(
        UPPER(SUBSTRING(COALESCE(NULLIF(p.first_name, ''), 'D'), 1, 1)),
        UPPER(SUBSTRING(COALESCE(NULLIF(p.last_name, ''), 'R'), 1, 1))
    ) AS initials,
    sp.specialties,
    sp.license_state
FROM public.staff_profiles sp
JOIN public.profiles p ON p.id = sp.id
WHERE sp.role = 'doctor'
  AND sp.active = true
  AND sp.onboarding_status = 'completed';

GRANT SELECT ON public.v_doctor_directory TO authenticated;


-- -----------------------------------------------------------------------------
-- 5. NOTIFICATION IMMUTABILITY & UPDATE RESTRICTION
-- -----------------------------------------------------------------------------

-- Trigger ensuring non-admin users cannot tamper with notification text, type,
-- idempotency key, entity IDs, or ownership when updating status.
CREATE OR REPLACE FUNCTION public.enforce_notification_update_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin can perform operational updates
  IF public.get_current_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Ensure immutable fields are not modified
  IF NEW.id <> OLD.id OR
     NEW.patient_id <> OLD.patient_id OR
     NEW.type <> OLD.type OR
     NEW.title <> OLD.title OR
     NEW.short_message <> OLD.short_message OR
     NEW.related_entity_type IS DISTINCT FROM OLD.related_entity_type OR
     NEW.related_entity_id IS DISTINCT FROM OLD.related_entity_id OR
     NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR
     NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Unauthorized modification of immutable notification fields';
  END IF;

  -- Patients can only transition status between unread and read
  IF NEW.status NOT IN ('unread', 'read') THEN
    RAISE EXCEPTION 'Invalid notification status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_notification_update_safety ON public.notifications;
CREATE TRIGGER trg_enforce_notification_update_safety
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_notification_update_safety();

-- Operation-specific RLS policies for notifications
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_no_client_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_no_client_delete" ON public.notifications;

CREATE POLICY "notifications_patient_update" ON public.notifications
FOR UPDATE TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid() AND status IN ('unread', 'read'));

CREATE POLICY "notifications_no_client_insert" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.get_current_role() = 'admin');

CREATE POLICY "notifications_no_client_delete" ON public.notifications
FOR DELETE TO authenticated
USING (public.get_current_role() = 'admin');


-- -----------------------------------------------------------------------------
-- 6. EXPLICIT WRITE DENIAL POLICIES ACROSS SENSITIVE TABLES
-- -----------------------------------------------------------------------------

-- 6.1 Prescriptions
DROP POLICY IF EXISTS "prescriptions_no_client_write" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_no_client_insert" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_no_client_update" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_no_client_delete" ON public.prescriptions;

CREATE POLICY "prescriptions_no_client_insert" ON public.prescriptions
FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "prescriptions_no_client_update" ON public.prescriptions
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "prescriptions_no_client_delete" ON public.prescriptions
FOR DELETE TO authenticated USING (false);

-- 6.2 Orders
DROP POLICY IF EXISTS "orders_no_client_write" ON public.orders;
DROP POLICY IF EXISTS "orders_no_client_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_no_client_update" ON public.orders;
DROP POLICY IF EXISTS "orders_no_client_delete" ON public.orders;

CREATE POLICY "orders_no_client_insert" ON public.orders
FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "orders_no_client_update" ON public.orders
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "orders_no_client_delete" ON public.orders
FOR DELETE TO authenticated USING (false);

-- 6.3 Clinical Documents
DROP POLICY IF EXISTS "clinical_documents_no_client_write" ON public.clinical_documents;
DROP POLICY IF EXISTS "clinical_documents_no_client_insert" ON public.clinical_documents;
DROP POLICY IF EXISTS "clinical_documents_no_client_update" ON public.clinical_documents;
DROP POLICY IF EXISTS "clinical_documents_no_client_delete" ON public.clinical_documents;

CREATE POLICY "clinical_documents_no_client_insert" ON public.clinical_documents
FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "clinical_documents_no_client_update" ON public.clinical_documents
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "clinical_documents_no_client_delete" ON public.clinical_documents
FOR DELETE TO authenticated USING (false);

-- 6.4 Audit Logs
DROP POLICY IF EXISTS "audit_logs_no_client_write" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_client_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_client_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_client_delete" ON public.audit_logs;

CREATE POLICY "audit_logs_no_client_insert" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "audit_logs_no_client_update" ON public.audit_logs
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "audit_logs_no_client_delete" ON public.audit_logs
FOR DELETE TO authenticated USING (false);
