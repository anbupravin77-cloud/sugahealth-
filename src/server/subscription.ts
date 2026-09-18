import { adminDb as db } from './firebaseAdmin';
import { config } from './config';

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

    // Check if subscription already exists for this prescription to prevent duplicates
    const existingSnap = await db.collection('subscriptions')
      .where('sourcePrescriptionId', '==', prescriptionId)
      .where('status', 'in', ['active', 'past_due', 'paused'])
      .get();
      
    if (!existingSnap.empty) {
      console.warn(`[Subscription] A subscription already exists for prescription ${prescriptionId}`);
      // In real life we'd cancel the new one in Stripe to avoid double billing.
      return;
    }

    const prescriptionSnap = await db.collection('prescriptions').doc(prescriptionId).get();
    if (!prescriptionSnap.exists) return;
    const prescriptionData = prescriptionSnap.data() as any;

    const subId = `sub_${Date.now()}`;
    const subscription: Subscription = {
      subscriptionId: subId,
      patientId,
      sourcePrescriptionId: prescriptionId,
      treatmentName: prescriptionData.treatmentCategory || 'General Refill',
      provider: 'stripe',
      providerCustomerId: customerId,
      providerSubscriptionId,
      status: 'active',
      billingInterval: interval,
      intervalCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('subscriptions').doc(subId).set(subscription);
    
    // Dual-write to Supabase subscriptions
    try {
      const { subscriptionRepository } = await import('./repositories/subscriptionRepository');
      await subscriptionRepository.createSubscription({
        id: subId,
        patient_id: patientId,
        source_prescription_id: prescriptionId,
        treatment_name: subscription.treatmentName,
        provider: 'stripe',
        billing_interval: interval,
        interval_count: intervalCount,
        status: 'active',
        provider_customer_id: customerId,
        provider_subscription_id: providerSubscriptionId,
      });
    } catch (err: any) {
      console.warn('[SubscriptionService] Supabase dual-write error:', err.message);
    }



    await db.collection('audit_logs').add({

      action: 'SUBSCRIPTION_CREATED',
      actorUid: 'system',
      subscriptionId: subId,
      patientId,
      timestamp: new Date().toISOString()
    });

    const { NotificationService } = await import('./notifications');
    const notif = new NotificationService();
    await notif.createNotification({
      patientId,
      type: 'SUBSCRIPTION_ACTIVATED',
      title: 'Subscription Activated',
      shortMessage: `Your refill subscription for ${subscription.treatmentName} is now active.`,
      relatedEntityId: subId,
      relatedEntityType: 'document',
      idempotencyKey: `sub_act_${subId}`
    });
  }

  async handlePaymentSucceeded(providerSubscriptionId: string, invoiceId: string, billingReason: string) {
    const subsSnap = await db.collection('subscriptions').where('providerSubscriptionId', '==', providerSubscriptionId).limit(1).get();
    
    if (subsSnap.empty) return;
    
    const subDoc = subsSnap.docs[0];
    const subData = subDoc.data() as Subscription;

    if (subData.status === 'past_due') {
      await subDoc.ref.update({ status: 'active', updatedAt: new Date().toISOString() });
    }

    // Idempotency: avoid creating duplicate refill requests for the same invoice
    const idempotencyKey = `refill_req_${invoiceId}`;
    const existingReqSnap = await db.collection('refill_requests').where('idempotencyKey', '==', idempotencyKey).get();
    if (!existingReqSnap.empty) return;

    // Create a refill request
    const refillRequestId = `refreq_${Date.now()}`;
    const refillReq: RefillRequest & { idempotencyKey: string } = {
      refillRequestId,
      patientId: subData.patientId,
      sourcePrescriptionId: subData.sourcePrescriptionId,
      subscriptionId: subData.subscriptionId,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      idempotencyKey
    };

    await db.collection('refill_requests').doc(refillRequestId).set(refillReq);

    // Dual-write to Supabase refill requests
    try {
      const { subscriptionRepository } = await import('./repositories/subscriptionRepository');
      await subscriptionRepository.createRefillRequest({
        id: refillRequestId,
        patient_id: subData.patientId,
        source_prescription_id: subData.sourcePrescriptionId,
        subscription_id: subData.subscriptionId,
        status: 'pending_review',
        idempotency_key: idempotencyKey,
      });
    } catch (err: any) {
      console.warn('[SubscriptionService] Supabase refill request dual-write error:', err.message);
    }




    await db.collection('audit_logs').add({
      action: 'RENEWAL_PAYMENT_VERIFIED',
      actorUid: 'system',
      subscriptionId: subData.subscriptionId,
      patientId: subData.patientId,
      timestamp: new Date().toISOString()
    });

    await db.collection('audit_logs').add({
      action: 'REFILL_REQUEST_CREATED',
      actorUid: 'system',
      refillRequestId,
      patientId: subData.patientId,
      timestamp: new Date().toISOString()
    });

    const { NotificationService } = await import('./notifications');
    const notif = new NotificationService();
    await notif.createNotification({
      patientId: subData.patientId,
      type: 'REFILL_SUBMITTED',
      title: 'Refill Request Submitted',
      shortMessage: `Your recurring payment was successful. A refill request for ${subData.treatmentName} has been submitted for clinical review.`,
      relatedEntityId: refillRequestId,
      relatedEntityType: 'document',
      idempotencyKey: `refill_notif_${invoiceId}`
    });
  }

  async handlePaymentFailed(providerSubscriptionId: string, invoiceId: string) {
    const subsSnap = await db.collection('subscriptions').where('providerSubscriptionId', '==', providerSubscriptionId).limit(1).get();
    
    if (subsSnap.empty) return;
    
    const subDoc = subsSnap.docs[0];
    const subData = subDoc.data() as Subscription;

    await subDoc.ref.update({ status: 'past_due', updatedAt: new Date().toISOString() });

    await db.collection('audit_logs').add({
      action: 'RENEWAL_PAYMENT_FAILED',
      actorUid: 'system',
      subscriptionId: subData.subscriptionId,
      patientId: subData.patientId,
      timestamp: new Date().toISOString()
    });

    const { NotificationService } = await import('./notifications');
    const notif = new NotificationService();
    await notif.createNotification({
      patientId: subData.patientId,
      type: 'PAYMENT_REQUIRED',
      title: 'Action Required: Payment Failed',
      shortMessage: `Your recurring payment failed. Please update your payment method to continue your subscription.`,
      relatedEntityId: subData.subscriptionId,
      relatedEntityType: 'document',
      idempotencyKey: `pay_fail_${invoiceId}`
    });
  }

  async handleSubscriptionCancelled(providerSubscriptionId: string) {
    const subsSnap = await db.collection('subscriptions').where('providerSubscriptionId', '==', providerSubscriptionId).limit(1).get();
    
    if (subsSnap.empty) return;
    
    const subDoc = subsSnap.docs[0];
    const subData = subDoc.data() as Subscription;

    await subDoc.ref.update({ 
      status: 'cancelled', 
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString() 
    });

    // Dual-write cancellation to Supabase
    try {
      const { subscriptionRepository } = await import('./repositories/subscriptionRepository');
      await subscriptionRepository.updateSubscriptionStatus(subData.subscriptionId, 'cancelled');
    } catch (err: any) {
      console.warn('[SubscriptionService] Supabase cancel status error:', err.message);
    }


    await db.collection('audit_logs').add({
      action: 'SUBSCRIPTION_CANCELLED',
      actorUid: 'system',
      subscriptionId: subData.subscriptionId,
      patientId: subData.patientId,
      timestamp: new Date().toISOString()
    });

    const { NotificationService } = await import('./notifications');
    const notif = new NotificationService();
    await notif.createNotification({
      patientId: subData.patientId,
      type: 'SUBSCRIPTION_CANCELLED',
      title: 'Subscription Cancelled',
      shortMessage: `Your refill subscription for ${subData.treatmentName} has been cancelled.`,
      relatedEntityId: subData.subscriptionId,
      relatedEntityType: 'document',
      idempotencyKey: `sub_can_${subData.subscriptionId}`
    });
  }
}
