import { supabaseAdmin } from '../supabaseAdmin';
import { DbPaymentEvent } from './types';

export class PaymentEventRepository {
  async getEventByProviderEventId(eventId: string): Promise<DbPaymentEvent | null> {
    const { data, error } = await supabaseAdmin
      .from('payment_events')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) {
      console.error(`[PaymentEventRepository] Failed to check event ${eventId}:`, error.message);
      return null;
    }
    return data as DbPaymentEvent;
  }

  /**
   * Records a verified webhook payment event idempotently.
   */
  async recordPaymentEvent(event: Omit<DbPaymentEvent, 'id' | 'created_at'>): Promise<DbPaymentEvent> {
    // Check if already processed to ensure strict idempotency
    const existing = await this.getEventByProviderEventId(event.event_id);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('payment_events')
      .insert({
        ...event,
        created_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record payment event: ${error?.message}`);
    }
    return data as DbPaymentEvent;
  }

  async listEventsForOrder(orderId: string): Promise<DbPaymentEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('payment_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[PaymentEventRepository] Failed to list events for order ${orderId}:`, error.message);
      return [];
    }
    return (data || []) as DbPaymentEvent[];
  }
}

export const paymentEventRepository = new PaymentEventRepository();
