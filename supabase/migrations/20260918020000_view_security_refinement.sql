-- =============================================================================
-- SUGA.HEALTH - VIEW SECURITY & LEAST PRIVILEGE REFINEMENT
-- Migration: 20260918020000_view_security_refinement.sql
-- Description: Refines PostgreSQL views:
--              1. Removes preferred_dosage from v_unassigned_consultation_queue
--                 to eliminate non-essential clinical data exposure during triage.
--              2. Re-affirms strict projection boundaries and security_barrier
--                 guarantees on v_doctor_directory and v_unassigned_consultation_queue.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. UNASSIGNED CONSULTATION QUEUE VIEW (DATA MINIMIZATION)
-- -----------------------------------------------------------------------------
-- Drops and recreates the unassigned queue view to remove preferred_dosage.
-- Exposes strictly: consultation_id, status, primary_concern, submitted_at, created_at.
-- Excludes: preferred_dosage, responses (questionnaire JSONB), patient demographics, notes.
--
-- Security Evaluation:
-- This view intentionally runs with owner privileges (security_invoker = false)
-- accompanied by security_barrier = true.
-- RATIONALE: The underlying public.consultations table RLS strictly confines doctors
-- to their assigned consultations (assigned_to = auth.uid()). If security_invoker = true
-- were set, the underlying RLS would either block all doctors from viewing the queue (0 rows),
-- or if underlying RLS were loosened, doctors would gain access to query `responses` directly
-- from public.consultations. The security_barrier view with an explicit role filter
-- (public.get_current_role() IN ('doctor', 'admin')) acts as a secure, sanitized projection
-- enforcing least privilege.

DROP VIEW IF EXISTS public.v_unassigned_consultation_queue;

CREATE VIEW public.v_unassigned_consultation_queue
WITH (security_barrier = true)
AS
SELECT
    c.id AS consultation_id,
    c.status,
    c.primary_concern,
    c.submitted_at,
    c.created_at
FROM public.consultations c
WHERE c.status = 'submitted'
  AND c.assigned_to IS NULL
  AND public.get_current_role() IN ('doctor', 'admin');

-- Restrict execution grant to authenticated users
REVOKE ALL ON public.v_unassigned_consultation_queue FROM PUBLIC;
GRANT SELECT ON public.v_unassigned_consultation_queue TO authenticated;


-- -----------------------------------------------------------------------------
-- 2. PATIENT-SAFE DOCTOR DIRECTORY VIEW
-- -----------------------------------------------------------------------------
-- Exposes strictly: doctor_id, first_name, last_name, display_name, initials, specialties, license_state.
-- Strictly excludes: email, phone, physical address, date of birth, license number,
--                    NPI, signature URL, firebase_uid, onboarding flags, audit data.
--
-- Security Evaluation:
-- This view runs with owner privileges (security_invoker = false) and security_barrier = true.
-- RATIONALE: public.profiles contains sensitive PII (personal emails, phone numbers, home addresses).
-- Directly granting patients row-level SELECT on public.profiles would allow patients to query
-- private clinician and peer contact information. This security_barrier view exposes only
-- approved, public-facing clinician metadata without exposing the underlying table.

DROP VIEW IF EXISTS public.v_doctor_directory;

CREATE VIEW public.v_doctor_directory
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

-- Restrict execution grant to authenticated users
REVOKE ALL ON public.v_doctor_directory FROM PUBLIC;
GRANT SELECT ON public.v_doctor_directory TO authenticated;
