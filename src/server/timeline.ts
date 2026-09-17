import { getFirestore } from 'firebase-admin/firestore';

export interface TimelineEvent {
  eventId: string;
  orderId: string;
  eventType: string; // e.g. 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'ORDER_PROCESSING', 'ORDER_PACKED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED'
  timestamp: string;
  actorType: 'system' | 'patient' | 'doctor' | 'pharmacist' | 'admin';
  actorId: string;
  metadata?: Record<string, any>;
}

export class TimelineService {
  async createEvent(event: Omit<TimelineEvent, 'eventId'>) {
    const db = getFirestore();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullEvent: TimelineEvent = {
      ...event,
      eventId
    };

    await db.collection('order_events').doc(eventId).set(fullEvent);
    return fullEvent;
  }

  async getEventsForOrder(orderId: string) {
    const db = getFirestore();
    const snap = await db.collection('order_events')
      .where('orderId', '==', orderId)
      .orderBy('timestamp', 'desc')
      .get();
    
    return snap.docs.map(doc => doc.data() as TimelineEvent);
  }
}
