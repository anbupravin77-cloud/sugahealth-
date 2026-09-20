import { subscriptionRepository } from './repositories/subscriptionRepository';
import { prescriptionRepository } from './repositories/prescriptionRepository';
import { consultationRepository } from './repositories/consultationRepository';
import { auditRepository } from './repositories/auditRepository';

export interface Subscription {
  subscriptionId: string;
  patientId: string;
  sourcePrescriptionId: string;
  treatmentName: string;
  provider: string; // 'stripe'
  providerCustomerId: string;
  providerSubscriptionId: string;
  status: 'pending' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';
  billingInterval: 'month' | 'day';
  intervalCount: number;
  nextBillingAt?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  pausedAt?: string;
}

export interface RefillRequest {
  refillRequestId: string;
  patientId: string;
  sourcePrescriptionId: string;
  subscriptionId?: string;
  status: 'pending_review' | 'approved' | 'denied' | 'expired' | 'cancelled' | 'converted_to_order';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  decisionReason?: string;
  resultingOrderId?: string;
}

export class SubscriptionService {
  async handleSubscriptionCreated(providerSubscriptionId: string, customerId: string, metadata: any, interval: 'month' | 'day', intervalCount: number) {
    const { patientId, prescriptionId } = metadata;
    
    if (!patientId || !prescriptionId) return;

    // Check if subscription already exists for this prescription in Supabase to prevent duplicates
    const existing = await subscriptionRepository.listSubscriptionsForPatient(patientId);
    const alreadyExists = existing.some(sub => 
      sub.source_prescription_id === prescriptionId && 
      ['active', 'past_due', 'paused'].includes(sub.status)
    );
      
    if (alreadyExists) {
      console.warn(`[Subscription] A subscription already exists in Supabase for prescription ${prescriptionId}`);
      return;
    }

    const prescription = await prescriptionRepository.getById(prescriptionId);
    if (!prescription) {
      console.warn(`[Subscription] Prescription ${prescriptionId} not found in Supabase`);
      return;
    }

    let treatmentName = 'General Refill';
    if (prescription.consultation_id) {
      const consultation = await consultationRepository.getById(prescription.consultation_id);
      if (consultation && consultation.primary_concern) {
        treatmentName = consultation.primary_concern;
      }
    }

    const subId = `sub_${Date.now()}`;
    
    // Create subscription in Supabase
    try {
      await subscriptionRepository.createSubscription({
        id: subId,
        patient_id: patientId,
        source_prescription_id: prescriptionId,
        treatment_name: treatmentName,
        provider: 'stripe',
        billing_interval: interval,
        interval_count: intervalCount,
        status: 'active',
        provider_customer_id: customerId,
        provider_subscription_id: providerSubscriptionId,
      });
    } catch (err: any) {
      console.error('[SubscriptionService] Supabase create subscription error:', err.message);
      return;
    }

    // Write audit log to Supabase
    await auditRepository.log({
      action: 'SUBSCRIPTION_CREATED',
      actorUid: 'system',
      subscriptionId: subId,
      metadata: { patientId, prescriptionId }
    });

    const { NotificationService } = await import('./notifications');
    const notif = new NotificationService();
    await notif.createNotification({
      patientId,
      type: 'SUBSCRIPTION_ACTIVATED',
      title: 'Subscription Activated',
      shortMessage: `Your refill subscription for ${treatmentName} is now active.`,
      relatedEntityId: subId,
      relatedEntityType: 'document',
      idempotencyKey: `sub_act_${subId}`
    });
  }

  async handlePaymentSucceeded(providerSubscriptionId: string, invoiceId: string, billingReason: string) {
    const subData = await subscriptionRepository.getSubscriptionByProviderId(providerSubscriptionId);
    if (!subData) {
      console.warn(`[Subscription] Subscription for provider sub ID ${providerSubscriptionId} not found in Supabase`);
      return;
    }

    if (subData.status === 'past_due') {
      await subscriptionRepository.updateSubscriptionStatus(subData.id, 'active');
    }

    // Idempotency: avoid creating duplicate refill requests for the same invoice
    const idempotencyKey = `refill_req_${invoiceId}`;
    const refillRequestId = `refreq_${Date.now()}`;

    // Create a refill request in Supabase
    try {
      await subscriptionRepository.createRefillRequest({
        id: refillRequestId,
        patient_id: subData.patient_id,
        source_prescription_id: subData.source_prescription_id,
        subscription_id: subData.id,
        status: 'pending_review',
        idempotency_key: idempotencyKey,
      });
    } catch (err: any) {
      console.error('[SubscriptionService] Supabase create refill request error:', err.message);
      return;
    }

    // Log to Supabase audit_logs
    await auditRepository.log({
      action: 'RENEWAL_PAYMENT_VERIFIED',
      actorUid: 'system',
      subscriptionId: subData.id,
      metadata: { patientId: subData.patient_id }
    });

    await auditRepository.log({
      action: 'REFILL_REQUEST_CREATED',
      actorUid: 'system',
      metadata: { refillRequestId, patientId: subData.patient_id }
    });

    const { NotificationService } = await import('./notifications');
    const notif = new NotificationService();
    await notif.createNotification({
      patientId: subData.patient_id,
      type: 'REFILL_SUBMITTED',
      title: 'Refill Request Submitted',
      shortMessage: `Your recurring payment was successful. A refill request for ${subData.treatment_name || 'General Refill'} has been submitted for clinical review.`,
      relatedEntityId: refillRequestId,
      relatedEntityType: 'document',
      idempotencyKey: `refill_notif_${invoiceId}`
    });
  }

  async handlePaymentFailed(providerSubscriptionId: string, invoiceId: string) {
    const subData = await subscriptionRepository.getSubscriptionByProviderId(providerSubscriptionId);
    if (!subData) {
      console.warn(`[Subscription] Subscription for provider sub ID ${providerSubscriptionId} not found in Supabase`);
      return;
    }

    await subscriptionRepository.updateSubscriptionStatus(subData.id, 'past_due');

    // Audit log in Supabase
    await auditRepository.log({
      action: 'RENEWAL_PAYMENT_FAILED',
      actorUid: 'system',
      subscriptionId: subData.id,
      metadata: { patientId: subData.patient_id }
    });

    const { NotificationService } = await import('./notifications');
    const notif = new NotificationService();
    await notif.createNotification({
      patientId: subData.patient_id,
      type: 'PAYMENT_REQUIRED',
      title: 'Action Required: Payment Failed',
      shortMessage: `Your recurring payment failed. Please update your payment method to continue your subscription.`,
      relatedEntityId: subData.id,
      relatedEntityType: 'document',
      idempotencyKey: `pay_fail_${invoiceId}`
    });
  }

  async handleSubscriptionCancelled(providerSubscriptionId: string) {
    const subData = await subscriptionRepository.getSubscriptionByProviderId(providerSubscriptionId);
    if (!subData) {
      console.warn(`[Subscription] Subscription for provider sub ID ${providerSubscriptionId} not found in Supabase`);
      return;
    }

    const now = new Date().toISOString();
    await subscriptionRepository.updateSubscriptionStatus(subData.id, 'cancelled', {
      cancelledAt: now
    });

    // Audit log in Supabase
    await auditRepository.log({
      action: 'SUBSCRIPTION_CANCELLED',
      actorUid: 'system',
      subscriptionId: subData.id,
      metadata: { patientId: subData.patient_id }
    });

    const { NotificationService } = await import('./notifications');
    const notif = new NotificationService();
    await notif.createNotification({
      patientId: subData.patient_id,
      type: 'SUBSCRIPTION_CANCELLED',
      title: 'Subscription Cancelled',
      shortMessage: `Your refill subscription for ${subData.treatment_name || 'General Refill'} has been cancelled.`,
      relatedEntityId: subData.id,
      relatedEntityType: 'document',
      idempotencyKey: `sub_can_${subData.id}`
    });
  }
}
