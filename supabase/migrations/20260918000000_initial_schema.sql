-- =============================================================================
-- SUGA.HEALTH — SUPABASE POSTGRESQL FOUNDATION
-- Migration: 20260918000000_initial_schema.sql
-- Description: Complete normalized relational schema, legacy ID mapping,
--              Row Level Security (RLS), and secure role resolution.
-- =============================================================================

-- Enable standard cryptographic & UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'pharmacist', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE consultation_status AS ENUM ('draft', 'submitted', 'assigned', 'under_review', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE prescription_status AS ENUM ('draft', 'finalized', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE order_payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE order_fulfillment_status AS ENUM ('unfulfilled', 'processing', 'packed', 'shipped', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('pending', 'active', 'past_due', 'paused', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE refill_status AS ENUM ('pending_review', 'approved', 'denied', 'expired', 'cancelled', 'converted_to_order');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('consultation', 'prescription');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE delivery_channel AS ENUM ('email', 'sms', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('queued', 'sending', 'sent', 'delivered', 'failed', 'skipped', 'not_configured');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLE DEFINITIONS WITH RELATIONAL CONSTRAINTS & LEGACY MAPPING
-- -----------------------------------------------------------------------------

-- Table 1: Profiles (Extends auth.users, holds patient & base staff identity)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    firebase_uid TEXT UNIQUE,
    email TEXT,
    phone_number TEXT,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    sex TEXT CHECK (sex IN ('male', 'female', 'other', 'prefer-not-to-say', '')),
    role user_role NOT NULL DEFAULT 'patient',
    shipping_address JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Table 2: Staff Profiles (Professional metadata, specialties, licenses)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    firebase_uid TEXT UNIQUE,
    email TEXT NOT NULL,
    role user_role NOT NULL CHECK (role IN ('doctor', 'pharmacist', 'admin')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    onboarding_status TEXT NOT NULL DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'completed')),
    first_name TEXT,
    last_name TEXT,
    initials TEXT,
    phone_number TEXT,
    specialties TEXT[],
    professional_address JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON public.staff_profiles(role, active);

-- Table 3: Consultations (Intakes and doctor assignments)
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_document_id TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assigned_to UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    status consultation_status NOT NULL DEFAULT 'draft',
    primary_concern TEXT NOT NULL,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    schema_version INT NOT NULL DEFAULT 1,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_assigned ON public.consultations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations(status);

-- Table 4: Clinical Notes (Doctor SOAP notes)
CREATE TABLE IF NOT EXISTS public.clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_document_id TEXT UNIQUE,
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
    content TEXT,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_consultation ON public.clinical_notes(consultation_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor ON public.clinical_notes(doctor_id);

-- Table 5: Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_document_id TEXT UNIQUE,
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
    status prescription_status NOT NULL DEFAULT 'draft',
    directions TEXT,
    refill_count INT NOT NULL DEFAULT 0,
    refill_interval_days INT NOT NULL DEFAULT 30,
    issued_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation ON public.prescriptions(consultation_id);

-- Table 6: Prescription Items (Normalized child medications)
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    active_ingredient TEXT,
    strength TEXT NOT NULL,
    dosage_form TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sig TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prescription_items_parent ON public.prescription_items(prescription_id);

-- Table 7: Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- Preserves 'ord_...' format
    legacy_order_id TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    shipping_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_status order_payment_status NOT NULL DEFAULT 'pending',
    fulfillment_status order_fulfillment_status NOT NULL DEFAULT 'unfulfilled',
    shipping_address JSONB,
    carrier TEXT,
    tracking_number TEXT,
    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON public.orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_prescription ON public.orders(prescription_id);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON public.orders(fulfillment_status);

-- Table 8: Order Items (Normalized child line items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    active_ingredient TEXT,
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- Table 9: Order Events (Audit timeline for status changes)
CREATE TABLE IF NOT EXISTS public.order_events (
    id TEXT PRIMARY KEY, -- Preserves 'evt_...'
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON public.order_events(order_id, created_at DESC);

-- Table 10: Payment Events (Stripe webhook receipts)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    stripe_session_id TEXT,
    amount NUMERIC(10, 2),
    status TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_session ON public.payment_events(stripe_session_id);

-- Table 11: Clinical Documents (Metadata for generated PDFs)
CREATE TABLE IF NOT EXISTS public.clinical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_document_id TEXT UNIQUE,
    document_type document_type NOT NULL,
    source_entity_id TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    doctor_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    file_size INT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    status document_status NOT NULL DEFAULT 'active',
    generated_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON public.clinical_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_source ON public.clinical_documents(source_entity_id);

-- Table 12: Message Threads (Patient-Doctor conversations)
CREATE TABLE IF NOT EXISTS public.message_threads (
    id TEXT PRIMARY KEY, -- Preserves 'thread_...'
    legacy_thread_id TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    patient_unread_count INT NOT NULL DEFAULT 0,
    doctor_unread_count INT NOT NULL DEFAULT 0,
    last_message_preview TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_threads_patient ON public.message_threads(patient_id);
CREATE INDEX IF NOT EXISTS idx_threads_doctor ON public.message_threads(doctor_id);

-- Table 13: Messages (Decoupled chat entries)
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY, -- Preserves 'msg_...'
    legacy_message_id TEXT UNIQUE,
    thread_id TEXT NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
    sender_uid UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    sender_role user_role NOT NULL,
    message_text TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id, created_at ASC);

-- Table 14: Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY, -- Preserves 'notif_...'
    legacy_notification_id TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    short_message TEXT NOT NULL,
    related_entity_id TEXT,
    related_entity_type TEXT,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    idempotency_key TEXT UNIQUE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_patient ON public.notifications(patient_id, created_at DESC);

-- Table 15: Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email BOOLEAN NOT NULL DEFAULT TRUE,
    sms BOOLEAN NOT NULL DEFAULT FALSE,
    in_app BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 16: Delivery Records (Delivery audit trail for SMS/Email)
CREATE TABLE IF NOT EXISTS public.delivery_records (
    id TEXT PRIMARY KEY, -- Preserves 'del_...'
    legacy_delivery_id TEXT UNIQUE,
    notification_id TEXT NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    channel delivery_channel NOT NULL,
    provider TEXT NOT NULL,
    provider_message_id TEXT,
    status delivery_status NOT NULL DEFAULT 'queued',
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_delivery_notification ON public.delivery_records(notification_id);

-- Table 17: Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY, -- Preserves 'sub_...'
    legacy_subscription_id TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    source_prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE RESTRICT,
    treatment_name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'stripe',
    provider_customer_id TEXT NOT NULL,
    provider_subscription_id TEXT NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'day')),
    interval_count INT NOT NULL DEFAULT 30,
    next_billing_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_patient ON public.subscriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON public.subscriptions(provider_subscription_id);

-- Table 18: Refill Requests
CREATE TABLE IF NOT EXISTS public.refill_requests (
    id TEXT PRIMARY KEY, -- Preserves 'refreq_...'
    legacy_refill_id TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    source_prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE RESTRICT,
    subscription_id TEXT REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    status refill_status NOT NULL DEFAULT 'pending_review',
    decision_reason TEXT,
    resulting_order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    idempotency_key TEXT UNIQUE,
    reviewed_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refill_requests_patient ON public.refill_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_status ON public.refill_requests(status);

-- Table 19: Audit Logs (Tamper-evident append-only ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    actor_uid TEXT NOT NULL,
    target_uid TEXT,
    consultation_id TEXT,
    prescription_id TEXT,
    document_id TEXT,
    thread_id TEXT,
    order_id TEXT,
    subscription_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_uid);

-- -----------------------------------------------------------------------------
-- 3. SECURE ROLE RESOLUTION FUNCTION (PREVENTS RECURSIVE RLS LOOPS)
-- -----------------------------------------------------------------------------

/**
 * Resolves the authenticated user's role without causing recursive RLS evaluation.
 * Strategy:
 * 1. Checks Supabase JWT 'app_metadata' -> 'role' (fastest, zero table queries).
 * 2. Fallback: Queries profiles table as SECURITY DEFINER with fixed search_path,
 *    running with table-owner privileges to safely bypass profiles RLS during lookup.
 */
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_jwt_claims JSONB;
  v_role user_role;
BEGIN
  -- Extract claims from current session
  BEGIN
    v_jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
    IF v_jwt_claims IS NOT NULL AND v_jwt_claims ? 'app_metadata' AND (v_jwt_claims -> 'app_metadata') ? 'role' THEN
      RETURN (v_jwt_claims -> 'app_metadata' ->> 'role')::user_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Fallback query via SECURITY DEFINER (immune to recursive RLS)
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role IS NOT NULL THEN
      RETURN v_role;
    END IF;
  END IF;

  RETURN 'patient'::user_role;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS across all 19 application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT USING (
    auth.uid() = id OR public.get_current_role() = 'admin'
);

CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE USING (
    auth.uid() = id OR public.get_current_role() = 'admin'
) WITH CHECK (
    -- Patients cannot escalate their own role
    public.get_current_role() = 'admin' OR role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 2. Staff Profiles Policies
CREATE POLICY "staff_profiles_select" ON public.staff_profiles
FOR SELECT USING (
    public.get_current_role() IN ('doctor', 'pharmacist', 'admin') OR
    auth.uid() = id
);

-- 3. Consultations Policies
CREATE POLICY "consultations_select" ON public.consultations
FOR SELECT USING (
    auth.uid() = patient_id OR
    public.get_current_role() = 'admin' OR
    (public.get_current_role() = 'doctor' AND (assigned_to = auth.uid() OR assigned_to IS NULL))
);

CREATE POLICY "consultations_insert" ON public.consultations
FOR INSERT WITH CHECK (
    auth.uid() = patient_id
);

CREATE POLICY "consultations_update" ON public.consultations
FOR UPDATE USING (
    (auth.uid() = patient_id AND status = 'draft') OR
    public.get_current_role() = 'admin' OR
    (public.get_current_role() = 'doctor' AND (assigned_to = auth.uid() OR assigned_to IS NULL))
);

-- 4. Clinical Notes Policies
CREATE POLICY "clinical_notes_select" ON public.clinical_notes
FOR SELECT USING (
    doctor_id = auth.uid() OR public.get_current_role() = 'admin'
);
-- Direct client writes prohibited; must be authored through authenticated server endpoint
CREATE POLICY "clinical_notes_no_client_write" ON public.clinical_notes
FOR INSERT WITH CHECK (false);

-- 5. Prescriptions Policies
CREATE POLICY "prescriptions_select" ON public.prescriptions
FOR SELECT USING (
    patient_id = auth.uid() OR
    doctor_id = auth.uid() OR
    public.get_current_role() IN ('pharmacist', 'admin')
);
CREATE POLICY "prescriptions_no_client_write" ON public.prescriptions
FOR ALL USING (false);

-- 6. Prescription Items Policies
CREATE POLICY "prescription_items_select" ON public.prescription_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.prescriptions p
        WHERE p.id = prescription_items.prescription_id
        AND (
            p.patient_id = auth.uid() OR
            p.doctor_id = auth.uid() OR
            public.get_current_role() IN ('pharmacist', 'admin')
        )
    )
);
CREATE POLICY "prescription_items_no_client_write" ON public.prescription_items
FOR ALL USING (false);

-- 7. Orders Policies
CREATE POLICY "orders_select" ON public.orders
FOR SELECT USING (
    patient_id = auth.uid() OR
    public.get_current_role() IN ('pharmacist', 'admin')
);
CREATE POLICY "orders_no_client_write" ON public.orders
FOR ALL USING (false);

-- 8. Order Items Policies
CREATE POLICY "order_items_select" ON public.order_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
        AND (
            o.patient_id = auth.uid() OR
            public.get_current_role() IN ('pharmacist', 'admin')
        )
    )
);
CREATE POLICY "order_items_no_client_write" ON public.order_items
FOR ALL USING (false);

-- 9. Order Events Policies
CREATE POLICY "order_events_select" ON public.order_events
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_events.order_id
        AND (
            o.patient_id = auth.uid() OR
            public.get_current_role() IN ('pharmacist', 'admin')
        )
    )
);
CREATE POLICY "order_events_no_client_write" ON public.order_events
FOR ALL USING (false);

-- 10. Payment Events Policies
CREATE POLICY "payment_events_admin_only" ON public.payment_events
FOR SELECT USING (public.get_current_role() = 'admin');
CREATE POLICY "payment_events_no_client_write" ON public.payment_events
FOR ALL USING (false);

-- 11. Clinical Documents Policies
CREATE POLICY "clinical_documents_select" ON public.clinical_documents
FOR SELECT USING (
    patient_id = auth.uid() OR
    doctor_id = auth.uid() OR
    public.get_current_role() IN ('pharmacist', 'admin')
);
CREATE POLICY "clinical_documents_no_client_write" ON public.clinical_documents
FOR ALL USING (false);

-- 12. Message Threads Policies
CREATE POLICY "message_threads_select" ON public.message_threads
FOR SELECT USING (
    patient_id = auth.uid() OR
    doctor_id = auth.uid() OR
    public.get_current_role() = 'admin'
);
CREATE POLICY "message_threads_no_client_write" ON public.message_threads
FOR ALL USING (false);

-- 13. Messages Policies
CREATE POLICY "messages_select" ON public.messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.message_threads t
        WHERE t.id = messages.thread_id
        AND (t.patient_id = auth.uid() OR t.doctor_id = auth.uid() OR public.get_current_role() = 'admin')
    )
);
CREATE POLICY "messages_no_client_write" ON public.messages
FOR ALL USING (false);

-- 14. Notifications Policies
CREATE POLICY "notifications_select" ON public.notifications
FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
FOR UPDATE USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- 15. Notification Preferences Policies
CREATE POLICY "notification_preferences_select" ON public.notification_preferences
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_update" ON public.notification_preferences
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 16. Delivery Records Policies
CREATE POLICY "delivery_records_admin_only" ON public.delivery_records
FOR SELECT USING (public.get_current_role() = 'admin');
CREATE POLICY "delivery_records_no_client_write" ON public.delivery_records
FOR ALL USING (false);

-- 17. Subscriptions Policies
CREATE POLICY "subscriptions_select" ON public.subscriptions
FOR SELECT USING (
    patient_id = auth.uid() OR public.get_current_role() = 'admin'
);
CREATE POLICY "subscriptions_no_client_write" ON public.subscriptions
FOR ALL USING (false);

-- 18. Refill Requests Policies
CREATE POLICY "refill_requests_select" ON public.refill_requests
FOR SELECT USING (
    patient_id = auth.uid() OR
    public.get_current_role() IN ('doctor', 'admin')
);
CREATE POLICY "refill_requests_no_client_write" ON public.refill_requests
FOR ALL USING (false);

-- 19. Audit Logs Policies
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
FOR SELECT USING (public.get_current_role() = 'admin');
CREATE POLICY "audit_logs_no_client_write" ON public.audit_logs
FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- 5. STORAGE & REALTIME PREPARATION
-- -----------------------------------------------------------------------------

-- Create private storage bucket 'clinical-documents' if storage schema exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'clinical-documents',
            'clinical-documents',
            false,
            20971520, -- 20 MB max file size
            ARRAY['application/pdf']
        )
        ON CONFLICT (id) DO UPDATE SET public = false;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Enable Realtime publication for messaging & notifications
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
