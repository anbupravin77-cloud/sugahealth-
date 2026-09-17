import { getFirestore } from 'firebase-admin/firestore';
import { getTemplate, NotificationEventType } from './notificationTemplates';
import { DefaultEmailProvider, EmailProvider } from './providers/email';
import { DefaultSmsProvider, SmsProvider } from './providers/sms';

export interface Notification {
  notificationId: string;
  patientId: string;
  type: string; // NotificationEventType
  title: string;
  shortMessage: string;
  relatedEntityId?: string;
  relatedEntityType?: 'consultation' | 'order' | 'prescription' | 'document' | 'thread';
  createdAt: string;
  readAt?: string | null;
  status: 'unread' | 'read';
  idempotencyKey?: string; // To prevent duplicates
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface DeliveryRecord {
  deliveryId: string;
  notificationId: string;
  channel: 'email' | 'sms' | 'in_app';
  provider: string;
  providerMessageId?: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'skipped' | 'not_configured';
  attemptedAt: string;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
}

export class NotificationService {
  private emailProvider: EmailProvider;
  private smsProvider: SmsProvider;

  constructor() {
    this.emailProvider = new DefaultEmailProvider();
    this.smsProvider = new DefaultSmsProvider();
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const db = getFirestore();
    const snap = await db.collection('notification_preferences').doc(userId).get();
    if (!snap.exists) {
      // Defaults
      return { email: true, sms: false, inApp: true };
    }
    return snap.data() as NotificationPreferences;
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreferences>) {
    const db = getFirestore();
    await db.collection('notification_preferences').doc(userId).set(prefs, { merge: true });
  }

  async createNotification(data: Omit<Notification, 'notificationId' | 'createdAt' | 'status'>) {
    const db = getFirestore();
    
    // Check idempotency
    if (data.idempotencyKey) {
      const existingSnap = await db.collection('notifications')
        .where('idempotencyKey', '==', data.idempotencyKey)
        .limit(1)
        .get();
        
      if (!existingSnap.empty) {
        return existingSnap.docs[0].data() as Notification;
      }
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const notification: Notification = {
      ...data,
      notificationId,
      createdAt: new Date().toISOString(),
      status: 'unread',
      readAt: null
    };

    const prefs = await this.getPreferences(data.patientId);

    if (prefs.inApp) {
      await db.collection('notifications').doc(notificationId).set(notification);
    }

    await db.collection('audit_logs').add({
      action: 'NOTIFICATION_CREATED',
      actorUid: 'system',
      notificationId,
      patientId: data.patientId,
      timestamp: new Date().toISOString()
    });

    // Deliver external notifications (email, SMS) without blocking
    this.processExternalDeliveries(notification, prefs).catch(err => {
      console.error('Background delivery processing failed:', err);
    });

    return notification;
  }

  private async processExternalDeliveries(notification: Notification, prefs: NotificationPreferences) {
    const db = getFirestore();
    const patientSnap = await db.collection('users').doc(notification.patientId).get();
    const patientData = patientSnap.data();
    
    if (!patientData) return;

    const emailAddress = patientData.email;
    const emailVerified = patientData.emailVerified !== false; // Assume verified unless explicitly false
    
    const phoneNumber = patientData.phone;
    const phoneVerified = patientData.phoneVerified === true; // Assume false unless explicitly true

    const deliveries: Promise<any>[] = [];

    if (prefs.email) {
      deliveries.push(this.attemptDelivery(notification, 'email', emailAddress, emailVerified));
    }

    if (prefs.sms) {
      deliveries.push(this.attemptDelivery(notification, 'sms', phoneNumber, phoneVerified));
    }

    await Promise.allSettled(deliveries);
  }

  private async attemptDelivery(
    notification: Notification, 
    channel: 'email' | 'sms', 
    destination: string | undefined, 
    isVerified: boolean,
    maxRetries = 3
  ) {
    const db = getFirestore();
    const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create deterministic idempotency key for this delivery attempt
    const deliveryIdempotencyKey = `${notification.notificationId}_${channel}`;
    
    // Check if delivery already succeeded for this channel and notification
    const existingSnap = await db.collection('delivery_records')
      .where('notificationId', '==', notification.notificationId)
      .where('channel', '==', channel)
      .where('status', 'in', ['sent', 'delivered', 'not_configured', 'skipped'])
      .limit(1)
      .get();
      
    if (!existingSnap.empty) {
      console.log(`Skipping duplicate delivery for ${deliveryIdempotencyKey}`);
      return;
    }

    const timestamp = new Date().toISOString();

    let record: DeliveryRecord = {
      deliveryId,
      notificationId: notification.notificationId,
      channel,
      provider: channel === 'email' ? 'DefaultEmailProvider' : 'DefaultSmsProvider',
      status: 'queued',
      attemptedAt: timestamp,
    };

    if (!destination) {
      record.status = 'skipped';
      record.failureReason = 'Destination not provided';
    } else if (!isVerified) {
      record.status = 'skipped';
      record.failureReason = 'Destination not verified';
    }

    await db.collection('delivery_records').doc(deliveryId).set(record);

    if (record.status === 'skipped') {
      return;
    }

    const template = getTemplate(notification.type as NotificationEventType, channel);
    
    let result: { status: 'queued' | 'sent' | 'failed' | 'skipped' | 'not_configured', providerMessageId?: string, failureReason?: string } = { status: 'failed', failureReason: 'Initialization' };
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (channel === 'email') {
          const { config } = await import('./config');
          const bodyWithLink = template.actionUrl ? `${template.body}\n\n${template.actionLabel}: ${config.appUrl}${template.actionUrl}` : template.body;
          result = await this.emailProvider.sendEmail(destination, template.subject || 'Suga.Health Notification', bodyWithLink);
        } else {
          const { config } = await import('./config');
          const bodyWithLink = template.actionUrl ? `${template.body} ${config.appUrl}${template.actionUrl}` : template.body;
          result = await this.smsProvider.sendSms(destination, bodyWithLink);
        }
        
        // Break on success or permanent terminal states
        if (result.status === 'sent' || result.status === 'not_configured') {
          break;
        }
      } catch (err: any) {
        result = { status: 'failed', failureReason: err.message || 'Unknown error' };
      }
      
      if (attempt < maxRetries && result.status === 'failed') {
        // Exponential backoff or simple delay
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }

    record.status = result.status;
    record.providerMessageId = result.providerMessageId;
    
    if (result.status === 'failed' || result.status === 'not_configured') {
      record.failedAt = new Date().toISOString();
      record.failureReason = result.failureReason;
    } else if (result.status === 'sent') {
      record.deliveredAt = new Date().toISOString(); 
    }

    await db.collection('delivery_records').doc(deliveryId).set(record);

    await db.collection('audit_logs').add({
      action: result.status === 'sent' ? `NOTIFICATION_${channel.toUpperCase()}_SUCCEEDED` : `NOTIFICATION_${channel.toUpperCase()}_FAILED`,
      actorUid: 'system',
      deliveryId,
      notificationId: notification.notificationId,
      timestamp: new Date().toISOString()
    });
  }
}
