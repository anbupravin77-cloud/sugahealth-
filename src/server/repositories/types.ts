import { UserRole } from '../auth/types';

export type ConsultationStatus = 'draft' | 'submitted' | 'assigned' | 'under_review' | 'completed' | 'cancelled';
export type PrescriptionStatus = 'draft' | 'finalized' | 'cancelled';
export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type OrderFulfillmentStatus = 'unfulfilled' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';
export type RefillStatus = 'pending_review' | 'approved' | 'denied' | 'expired' | 'cancelled' | 'converted_to_order';
export type DocumentType = 'consultation' | 'prescription';
export type DocumentStatus = 'active' | 'archived';
export type DeliveryChannel = 'email' | 'sms' | 'in_app';
export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'skipped' | 'not_configured';

export interface DbProfile {
  id: string; // UUID references auth.users(id)
  firebase_uid?: string | null;
  email?: string | null;
  phone_number?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  profile_completed_at?: string | null;
  role: UserRole;
  shipping_address?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbStaffProfile {
  id: string; // UUID references profiles(id)
  firebase_uid?: string | null;
  email: string;
  role: 'doctor' | 'pharmacist' | 'admin';
  active: boolean;
  onboarding_status: 'pending' | 'completed';
  first_name?: string | null;
  last_name?: string | null;
  initials?: string | null;
  phone_number?: string | null;
  specialties?: string[] | null;
  accepting_new_patients?: boolean;
  max_active_cases?: number;
  last_assigned_at?: string | null;
  professional_address?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbConsultation {
  id: string;
  legacy_document_id?: string | null;
  patient_id: string;
  assigned_to?: string | null;
  status: ConsultationStatus;
  primary_concern: string;
  responses: Record<string, any>;
  schema_version: number;
  submitted_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbClinicalNote {
  id: string;
  legacy_document_id?: string | null;
  consultation_id: string;
  doctor_id: string;
  content?: string | null;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbPrescription {
  id: string;
  legacy_document_id?: string | null;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  status: PrescriptionStatus;
  directions?: string | null;
  refill_count: number;
  refill_interval_days: number;
  issued_at?: string | null;
  finalized_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbPrescriptionItem {
  id?: string;
  prescription_id: string;
  medication_name: string;
  active_ingredient?: string | null;
  strength: string;
  dosage_form: string;
  quantity: number;
  unit_price: number;
  sig?: string | null;
  created_at?: string;
}

export interface DbOrder {
  id: string; // 'ord_...'
  legacy_order_id?: string | null;
  patient_id: string;
  prescription_id?: string | null;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: OrderPaymentStatus;
  fulfillment_status: OrderFulfillmentStatus;
  shipping_address?: Record<string, any> | null;
  carrier?: string | null;
  tracking_number?: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbOrderItem {
  id?: string;
  order_id: string;
  medication_name: string;
  active_ingredient?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface DbOrderEvent {
  id: string; // 'evt_...'
  order_id: string;
  consultation_id?: string | null;
  event_type: string;
  actor_type: 'system' | 'patient' | 'doctor' | 'pharmacist' | 'admin';
  actor_id: string;
  metadata?: Record<string, any> | null;
  created_at?: string;
}

export interface DbPaymentEvent {
  id?: string;
  event_id: string;
  event_type: string;
  order_id?: string | null;
  stripe_session_id?: string | null;
  amount?: number | null;
  status: string;
  metadata?: Record<string, any> | null;
  created_at?: string;
}

export interface DbClinicalDocument {
  id?: string;
  legacy_document_id?: string | null;
  document_type: DocumentType;
  source_entity_id: string;
  patient_id: string;
  doctor_id?: string | null;
  storage_path: string;
  file_size: number;
  version: number;
  status: DocumentStatus;
  generated_by: string;
  created_at?: string;
}

export interface DbMessageThread {
  id: string; // 'thread_...'
  legacy_thread_id?: string | null;
  patient_id: string;
  doctor_id: string;
  consultation_id: string;
  status: 'open' | 'closed';
  patient_unread_count: number;
  doctor_unread_count: number;
  last_message_preview?: string | null;
  last_message_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbMessage {
  id: string; // 'msg_...'
  legacy_message_id?: string | null;
  thread_id: string;
  sender_uid: string;
  sender_role: UserRole;
  message_text: string;
  read_at?: string | null;
  created_at?: string;
}

export interface DbNotification {
  id: string; // 'notif_...'
  legacy_notification_id?: string | null;
  patient_id: string;
  type: string;
  title: string;
  short_message: string;
  related_entity_id?: string | null;
  related_entity_type?: string | null;
  status: 'unread' | 'read';
  idempotency_key?: string | null;
  read_at?: string | null;
  created_at?: string;
}

export interface DbNotificationPreferences {
  user_id: string;
  email: boolean;
  sms: boolean;
  in_app: boolean;
  updated_at?: string;
}

export interface DbDeliveryRecord {
  id: string; // 'del_...'
  legacy_delivery_id?: string | null;
  notification_id: string;
  channel: DeliveryChannel;
  provider: string;
  provider_message_id?: string | null;
  status: DeliveryStatus;
  attempted_at?: string;
  delivered_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
}

export interface DbSubscription {
  id: string; // 'sub_...'
  legacy_subscription_id?: string | null;
  patient_id: string;
  source_prescription_id: string;
  treatment_name: string;
  provider: string;
  provider_customer_id: string;
  provider_subscription_id: string;
  status: SubscriptionStatus;
  billing_interval: 'month' | 'day';
  interval_count: number;
  next_billing_at?: string | null;
  paused_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbRefillRequest {
  id: string; // 'refreq_...'
  legacy_refill_id?: string | null;
  patient_id: string;
  source_prescription_id: string;
  subscription_id?: string | null;
  status: RefillStatus;
  decision_reason?: string | null;
  resulting_order_id?: string | null;
  idempotency_key?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
}

export interface DbAuditLog {
  id?: number;
  action: string;
  actor_uid: string;
  target_uid?: string | null;
  consultation_id?: string | null;
  prescription_id?: string | null;
  document_id?: string | null;
  thread_id?: string | null;
  order_id?: string | null;
  subscription_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
}