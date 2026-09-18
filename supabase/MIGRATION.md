# Suga.Health — Firebase to Supabase Migration Guide

## 1. Overview & Architectural Shift

This document outlines the zero-downtime, fully audited migration strategy transitioning the Suga.Health clinical telehealth and compounded pharmacy platform from Firebase (Authentication, Firestore, Cloud Storage) to Supabase (Supabase Auth, PostgreSQL, Row Level Security, Supabase Storage, and Supabase Realtime).

```
   Existing Architecture (Firebase)                   Target Architecture (Supabase)
┌──────────────────────────────────────┐           ┌──────────────────────────────────────┐
│  React Client (Vite)                 │           │  React Client (Vite)                 │
│  - Firebase Auth SDK                 │   ───►    │  - Supabase Browser Client           │
│  - Firestore SDK (intake & queries)  │           │  - Supabase Realtime Channels        │
│  - onSnapshot Listeners              │           │  - Client RLS Queries (Profiles/Rx)  │
└──────────────────┬───────────────────┘           └──────────────────┬───────────────────┘
                   │                                                  │
                   │ (Bearer Token)                                   │ (Bearer JWT)
                   ▼                                                  ▼
┌──────────────────────────────────────┐           ┌──────────────────────────────────────┐
│  Express API Server                  │           │  Express API Server                  │
│  - Firebase Admin SDK                │   ───►    │  - Supabase Admin Client             │
│  - adminAuth.verifyIdToken           │           │  - supabaseAdmin.auth.getUser        │
│  - Firestore Admin Collections       │           │  - Relational PostgreSQL Queries     │
│  - Firebase Storage Bucket           │           │  - Private Supabase Storage Bucket   │
└──────────────────────────────────────┘           └──────────────────────────────────────┘
```

---

## 2. Table & Model Mapping

The migration converts denormalized Firestore document structures and subcollections into 19 relational tables with strict foreign keys and legacy traceability:

| Firestore Collection | PostgreSQL Table | Primary Key | Legacy Identifier Field | Child Tables / Normalization |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `public.profiles` | `UUID` (auth.users) | `firebase_uid TEXT` | Extends auth credentials |
| `staff_profiles` | `public.staff_profiles` | `UUID` (profiles.id) | `firebase_uid TEXT` | Professional metadata & credentials |
| `consultations` | `public.consultations` | `UUID` | `legacy_document_id TEXT` | Relational FK to patient & doctor |
| `clinical_notes` | `public.clinical_notes` | `UUID` | `legacy_document_id TEXT` | Cascade delete with consultation |
| `prescriptions` | `public.prescriptions` | `UUID` | `legacy_document_id TEXT` | Normalizes `medications` array |
| *(embedded array)* | `public.prescription_items` | `UUID` | N/A | Child items for compounding dosing |
| `orders` | `public.orders` | `TEXT` (`ord_...`) | `legacy_order_id TEXT` | Normalizes `lineItems` array |
| *(embedded array)* | `public.order_items` | `UUID` | N/A | Child items with unit & total prices |
| `order_events` | `public.order_events` | `TEXT` (`evt_...`) | N/A | Audit timeline of status changes |
| `payment_events` | `public.payment_events` | `UUID` | N/A | Stripe webhook idempotency receipts |
| `documents` | `public.clinical_documents` | `UUID` | `legacy_document_id TEXT` | Metadata registry for generated PDFs |
| `message_threads` | `public.message_threads` | `TEXT` (`thread_...`) | `legacy_thread_id TEXT` | Conversation container |
| `message_threads/{id}/messages` | `public.messages` | `TEXT` (`msg_...`) | `legacy_message_id TEXT` | Flattened relational chat table |
| `notifications` | `public.notifications` | `TEXT` (`notif_...`) | `legacy_notification_id TEXT` | In-app patient alerts |
| `notification_preferences` | `public.notification_preferences` | `UUID` (user_id) | N/A | Delivery channel options |
| `delivery_records` | `public.delivery_records` | `TEXT` (`del_...`) | `legacy_delivery_id TEXT` | Provider delivery audit |
| `subscriptions` | `public.subscriptions` | `TEXT` (`sub_...`) | `legacy_subscription_id TEXT` | Refill recurring schedules |
| `refill_requests` | `public.refill_requests` | `TEXT` (`refreq_...`) | `legacy_refill_id TEXT` | Refill clinician review queue |
| `audit_logs` | `public.audit_logs` | `BIGSERIAL` | N/A | Tamper-proof append-only ledger |

---

## 3. Identity & Authentication Mapping

1. **Mapping Firebase UID to Supabase UUID:**
   * Supabase requires RFC 4122 UUIDs for `auth.users(id)`.
   * For existing accounts, a deterministic UUIDv5 is generated from the Firebase UID and a fixed project namespace.
   * The original Firebase UID is preserved in `public.profiles.firebase_uid` and `public.staff_profiles.firebase_uid` to guarantee 100% bidirectional traceability.
2. **Authentication Methods:**
   * **Google OAuth:** Maps directly via Supabase Auth `signInWithOAuth({ provider: 'google' })`.
   * **Phone OTP:** Dispatches OTP via configured SMS gateway with `signInWithOtp({ phone })`.
   * **Staff Accounts:** Admin invites and password setup use `supabaseAdmin.auth.admin.inviteUserByEmail`.

---

## 4. Row Level Security (RLS) Strategy

1. **Role Resolution Function (`public.get_current_role()`):**
   * Uses JWT `app_metadata.role` first to eliminate database latency.
   * Fallback queries `public.profiles` as a `SECURITY DEFINER` function with a fixed `search_path`, eliminating recursive RLS loops.
2. **Access Isolation & Least Privilege:**
   * **Patient:** Confined to records matching `auth.uid() = patient_id`. Can only update their own consultations while in `'draft'` without altering status, clinician assignment, ownership, or lifecycle timestamps (`completed_at`, `submitted_at`).
   * **Doctor:** Confined to assigned consultations (`assigned_to = auth.uid()`), authored clinical notes, and active patient conversations. Unassigned intake queue triage is restricted to an operational metadata view (`public.v_unassigned_consultation_queue`), shielding sensitive medical responses (`responses` JSONB) until an intake is claimed.
   * **Patient-Safe Doctor Directory:** Sanitized view (`public.v_doctor_directory`) exposing only public clinician metadata (`first_name`, `last_name`, `initials`, `specialties`, `license_state`), strictly excluding emails, phones, addresses, and internal identifiers.
   * **Notification Immutability:** A PostgreSQL trigger (`trg_enforce_notification_update_safety`) locks all notification metadata, types, timestamps, and ownership, restricting client updates strictly to transitioning status between `'unread'` and `'read'`.
   * **Pharmacist:** Restricted to orders and finalized prescriptions for fulfillment; strictly blocked from clinical notes and private chat threads.
   * **Admin:** System oversight, reassignment, and audit log inspection.
3. **Write Protection:**
   * Direct client-side write access is explicitly denied (`FOR INSERT WITH CHECK (false)`, `FOR UPDATE USING (false) WITH CHECK (false)`, `FOR DELETE USING (false)`) for sensitive clinical tables (`clinical_notes`, `prescriptions`, `orders`, `clinical_documents`, `audit_logs`). All mutations are routed through authenticated Express endpoints.

---

## 5. Storage Strategy

* **Bucket:** `clinical-documents`
* **Visibility:** Strictly private (`public = false`).
* **Path Convention:**
  * Consultations: `consultations/{consultationId}/consultation_{docId}.pdf`
  * Prescriptions: `prescriptions/{prescriptionId}/prescription_{docId}.pdf`
* **Access Control:**
  * The Express server serves authenticated PDF downloads via `GET /api/documents/:id/download`, checking permissions in PostgreSQL before streaming binary buffers via `supabaseAdmin.storage.from('clinical-documents').download()`.
  * No permanent public URLs exist.

---

## 6. Migration Sequence (Phased Roadmap)

1. **Phase 1: Architecture Audit & Migration Plan** *(Completed)*
2. **Phase 2: Supabase Project Setup & PostgreSQL Foundation** *(Current Milestone Completed)*
   * Added `src/lib/supabase.ts` and `src/server/supabaseAdmin.ts`.
   * Executed initial relational PostgreSQL migration and RLS definitions.
   * Validated schema integrity and RLS test cases.
3. **Phase 3: Express Backend Migration** *(Awaiting approval)*
   * Implement Supabase JWT verification middleware.
   * Port server services (`documentService.ts`, `messaging.ts`, `notifications.ts`, `subscription.ts`, `timeline.ts`).
4. **Phase 4: Frontend Client & Realtime Migration** *(Awaiting approval)*
   * Update `AuthContext.tsx` and `Login.tsx`.
   * Switch chat listeners to Supabase Realtime channels.
5. **Phase 5: Data Migration & Verification** *(Awaiting approval)*
   * Execute one-way ETL script copying Firestore documents to PostgreSQL.
   * Copy PDF files to Supabase Storage.
6. **Phase 6: Firebase Decommissioning & Cutover** *(Awaiting approval)*
   * Remove Firebase SDKs and config files.

---

## 7. Rollback & Contingency Strategy

* **Parallel Coexistence:** Firebase remains active as the primary production system throughout Phases 2, 3, and 4.
* **Non-Destructive Execution:** No Firestore collections or Firebase Storage files will be modified or deleted during migration.
* **Immediate Fallback:** If issues arise during Phase 4 or 5 testing, the frontend and server configurations can be pointed back to Firebase instantly by reverting deployment environment flags.

---

## 8. Unresolved Risks & Operational Considerations

1. **SMS Provider Setup:** Firebase Auth provides built-in SMS verification; Supabase Auth requires an external provider (e.g. Twilio) configured in the Supabase project dashboard for phone OTP authentication.
2. **Firebase Auth User Export:** Exporting user password hashes requires accessing the Firebase CLI or Google Cloud Console with Project Owner privileges to retrieve the scrypt signer key and salt separator.
