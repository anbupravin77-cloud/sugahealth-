import { supabaseAdmin } from '../supabaseAdmin';
import { DbSubscription, DbRefillRequest, RefillStatus, SubscriptionStatus } from './types';

export class SubscriptionRepository {
  async getSubscription(id: string): Promise<DbSubscription | null> {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[SubscriptionRepository] getSubscription failed for ${id}:`, error.message);
      return null;
    }
    return data as DbSubscription;
  }

  async getSubscriptionByProviderId(providerSubId: string): Promise<DbSubscription | null> {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('provider_subscription_id', providerSubId)
      .maybeSingle();

    if (error) {
      console.error(`[SubscriptionRepository] getSubscriptionByProviderId failed:`, error.message);
      return null;
    }
    return data as DbSubscription;
  }

  async listSubscriptionsForPatient(patientId: string): Promise<DbSubscription[]> {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[SubscriptionRepository] listSubscriptionsForPatient failed:`, error.message);
      return [];
    }
    return (data || []) as DbSubscription[];
  }

  async createSubscription(sub: Omit<DbSubscription, 'created_at' | 'updated_at'>): Promise<DbSubscription> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        ...sub,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create subscription: ${error?.message}`);
    }
    return data as DbSubscription;
  }

  async updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatus,
    timestamps?: { pausedAt?: string; cancelledAt?: string; nextBillingAt?: string }
  ): Promise<void> {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (timestamps?.pausedAt) updates.paused_at = timestamps.pausedAt;
    if (timestamps?.cancelledAt) updates.cancelled_at = timestamps.cancelledAt;
    if (timestamps?.nextBillingAt) updates.next_billing_at = timestamps.nextBillingAt;

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update subscription status: ${error.message}`);
    }
  }

  async getRefillRequest(id: string): Promise<DbRefillRequest | null> {
    const { data, error } = await supabaseAdmin
      .from('refill_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[SubscriptionRepository] getRefillRequest failed for ${id}:`, error.message);
      return null;
    }
    return data as DbRefillRequest;
  }

  async listRefillRequests(params?: {
    patientId?: string;
    status?: RefillStatus;
  }): Promise<DbRefillRequest[]> {
    let query = supabaseAdmin
      .from('refill_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.patientId) {
      query = query.eq('patient_id', params.patientId);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[SubscriptionRepository] listRefillRequests failed:`, error.message);
      return [];
    }
    return (data || []) as DbRefillRequest[];
  }

  async createRefillRequest(req: Omit<DbRefillRequest, 'created_at'>): Promise<DbRefillRequest> {
    // Idempotency check
    if (req.idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from('refill_requests')
        .select('*')
        .eq('idempotency_key', req.idempotency_key)
        .maybeSingle();

      if (existing) {
        return existing as DbRefillRequest;
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('refill_requests')
      .insert({
        ...req,
        created_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create refill request: ${error?.message}`);
    }
    return data as DbRefillRequest;
  }

  /**
   * Reviews and decisions a refill request.
   * Only authorized doctors or admins can review refill requests.
   */
  async reviewRefillRequest(params: {
    id: string;
    reviewerId: string;
    status: RefillStatus;
    decisionReason?: string;
    resultingOrderId?: string;
  }): Promise<DbRefillRequest> {
    const existing = await this.getRefillRequest(params.id);
    if (!existing) {
      throw new Error('Refill request not found');
    }
    if (existing.status !== 'pending_review') {
      throw new Error(`Refill request has already been ${existing.status}`);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('refill_requests')
      .update({
        status: params.status,
        reviewed_by: params.reviewerId,
        reviewed_at: now,
        decision_reason: params.decisionReason || null,
        resulting_order_id: params.resultingOrderId || null,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to review refill request: ${error?.message}`);
    }
    return data as DbRefillRequest;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
