import { supabaseAdmin } from '../supabaseAdmin';
import { DbOrder, DbOrderItem, DbOrderEvent, OrderFulfillmentStatus, OrderPaymentStatus } from './types';

export interface OrderWithItems extends DbOrder {
  items: DbOrderItem[];
}

export class OrderRepository {
  async getById(id: string): Promise<OrderWithItems | null> {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (orderError || !order) {
      return null;
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    if (itemsError) {
      console.error(`[OrderRepository] Failed to fetch items for order ${id}:`, itemsError.message);
    }

    return {
      ...(order as DbOrder),
      items: (items || []) as DbOrderItem[],
    };
  }

  async listByPatient(patientId: string): Promise<OrderWithItems[]> {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error || !orders) {
      return [];
    }

    const results: OrderWithItems[] = [];
    for (const order of orders) {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      results.push({
        ...(order as DbOrder),
        items: (items || []) as DbOrderItem[],
      });
    }

    return results;
  }

  async listForPharmacist(fulfillmentStatus?: OrderFulfillmentStatus): Promise<OrderWithItems[]> {
    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (fulfillmentStatus) {
      query = query.eq('fulfillment_status', fulfillmentStatus);
    }

    const { data: orders, error } = await query;
    if (error || !orders) {
      return [];
    }

    const results: OrderWithItems[] = [];
    for (const order of orders) {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      results.push({
        ...(order as DbOrder),
        items: (items || []) as DbOrderItem[],
      });
    }

    return results;
  }

  async createOrder(
    orderData: Omit<DbOrder, 'created_at' | 'updated_at'>,
    items: Omit<DbOrderItem, 'id' | 'order_id' | 'created_at'>[]
  ): Promise<OrderWithItems> {
    const now = new Date().toISOString();

    // 1. Insert order header
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        ...orderData,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    // 2. Insert order items
    const insertedItems: DbOrderItem[] = [];
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        order_id: order.id,
        medication_name: item.medication_name,
        active_ingredient: item.active_ingredient || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        created_at: now,
      }));

      const { data: savedItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }
      insertedItems.push(...((savedItems || []) as DbOrderItem[]));
    }

    return {
      ...(order as DbOrder),
      items: insertedItems,
    };
  }

  async updatePaymentStatus(orderId: string, status: OrderPaymentStatus, paidAt?: string): Promise<void> {
    const updates: Record<string, any> = {
      payment_status: status,
      updated_at: new Date().toISOString(),
    };
    if (paidAt) {
      updates.paid_at = paidAt;
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      throw new Error(`Failed to update order payment status: ${error.message}`);
    }
  }

  async updateFulfillmentStatus(
    orderId: string,
    status: OrderFulfillmentStatus,
    metadata?: { carrier?: string; trackingNumber?: string; shippedAt?: string; deliveredAt?: string }
  ): Promise<void> {
    const updates: Record<string, any> = {
      fulfillment_status: status,
      updated_at: new Date().toISOString(),
    };
    if (metadata?.carrier) updates.carrier = metadata.carrier;
    if (metadata?.trackingNumber) updates.tracking_number = metadata.trackingNumber;
    if (metadata?.shippedAt) updates.shipped_at = metadata.shippedAt;
    if (metadata?.deliveredAt) updates.delivered_at = metadata.deliveredAt;

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      throw new Error(`Failed to update order fulfillment status: ${error.message}`);
    }
  }

  async createOrderEvent(event: Omit<DbOrderEvent, 'created_at'>): Promise<DbOrderEvent> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('order_events')
      .insert({
        ...event,
        created_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create order event: ${error?.message}`);
    }
    return data as DbOrderEvent;
  }

  async getOrderEvents(orderId: string): Promise<DbOrderEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('order_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[OrderRepository] Failed to fetch events for order ${orderId}:`, error.message);
      return [];
    }
    return (data || []) as DbOrderEvent[];
  }
}

export const orderRepository = new OrderRepository();
