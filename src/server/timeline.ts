import { orderRepository } from './repositories/orderRepository';

export interface TimelineEvent {
  eventId: string;
  orderId?: string;
  consultationId?: string;
  eventType: string; // e.g. 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_PACKED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED'
  timestamp: string;
  actorType: 'system' | 'patient' | 'doctor' | 'pharmacist' | 'admin';
  actorId: string;
  metadata?: Record<string, any>;
}

export class TimelineService {
  async createEvent(event: Omit<TimelineEvent, 'eventId'>) {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = event.timestamp || new Date().toISOString();
    const fullEvent: TimelineEvent = {
      ...event,
      timestamp,
      eventId
    };

    try {
      await orderRepository.createOrderEvent({
        id: eventId,
        order_id: event.orderId || '',
        consultation_id: event.consultationId || null,
        event_type: event.eventType,
        actor_type: event.actorType,
        actor_id: event.actorId,
        metadata: event.metadata || null,
      });
    } catch (err: any) {
      console.warn('[TimelineService] Supabase event write error:', err.message);
    }

    return fullEvent;
  }

  async getEventsForOrder(orderId: string): Promise<TimelineEvent[]> {
    try {
      const dbEvents = await orderRepository.getOrderEvents(orderId);
      return dbEvents.map(event => ({
        eventId: event.id,
        orderId: event.order_id,
        consultationId: event.consultation_id || undefined,
        eventType: event.event_type,
        timestamp: event.created_at || '',
        actorType: event.actor_type,
        actorId: event.actor_id,
        metadata: event.metadata || undefined
      }));
    } catch (err: any) {
      console.error('[TimelineService] Failed to fetch events:', err.message);
      return [];
    }
  }
}

