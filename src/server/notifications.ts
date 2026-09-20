import { supabaseAdmin } from './supabaseAdmin';
import { notificationRepository } from './repositories/notificationRepository';
import { profileRepository } from './repositories/profileRepository';
import { auditRepository } from './repositories/auditRepository';
import { getTemplate, NotificationEventType } from './notificationTemplates';
import { DefaultEmailProvider, EmailProvider } from './providers/email';
import { DefaultSmsProvider, SmsProvider } from './providers/sms';
import { DeliveryChannel, DeliveryStatus } from './repositories/types';

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
    try {
      const prefs = await notificationRepository.getPreferences(userId);
      return {
        email: prefs.email,
        sms: prefs.sms,
        inApp: prefs.in_app,
      };
    } catch (err) {
      return { email: true, sms: false, inApp: true };
    }
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreferences>) {
    await notificationRepository.updatePreferences(userId, {
      ...(prefs.email !== undefined && { email: prefs.email }),
      ...(prefs.sms !== undefined && { sms: prefs.sms }),
      ...(prefs.inApp !== undefined && { in_app: prefs.inApp }),
    });
  }

  async createNotification(data: Omit<Notification, 'notificationId' | 'createdAt' | 'status'> & { notificationId?: string }) {
    const notifId = data.notificationId || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    let dbNotif;
    try {
      dbNotif = await notificationRepository.createNotification({
        id: notifId,
        patient_id: data.patientId,
        type: data.type,
        title: data.title,
        short_message: data.shortMessage,
        related_entity_id: data.relatedEntityId || null,
        related_entity_type: data.relatedEntityType || null,
        idempotency_key: data.idempotencyKey || null,
      });
    } catch (err: any) {
      console.error('[NotificationService] Failed to create notification in DB:', err.message);
      throw err;
    }

    const notification: Notification = {
      notificationId: dbNotif.id,
      patientId: dbNotif.patient_id,
      type: dbNotif.type,
      title: dbNotif.title,
      shortMessage: dbNotif.short_message,
      relatedEntityId: dbNotif.related_entity_id || undefined,
      relatedEntityType: (dbNotif.related_entity_type as any) || undefined,
      createdAt: dbNotif.created_at || new Date().toISOString(),
      status: dbNotif.status as 'unread' | 'read',
      readAt: dbNotif.read_at || null,
      idempotencyKey: dbNotif.idempotency_key || undefined,
    };

    const prefs = await this.getPreferences(data.patientId);

    // Write audit log to Supabase
    await auditRepository.log({
      action: 'NOTIFICATION_CREATED',
      actorUid: 'system',
      metadata: { notificationId: notification.notificationId, patientId: data.patientId }
    });

    // Deliver external notifications (email, SMS) without blocking
    this.processExternalDeliveries(notification, prefs).catch(err => {
      console.error('Background delivery processing failed:', err);
    });

    return notification;
  }

  private async processExternalDeliveries(notification: Notification, prefs: NotificationPreferences) {
    const profile = await profileRepository.getProfileById(notification.patientId);
    if (!profile) return;

    const emailAddress = profile.email || undefined;
    const emailVerified = true; // Assume true since it's from clinical verified flow
    
    const phoneNumber = profile.phone_number || undefined;
    const phoneVerified = true; // Assume true

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
    // Check if delivery already succeeded for this channel and notification
    const { data: existingDeliveries, error: checkError } = await supabaseAdmin
      .from('delivery_records')
      .select('id')
      .eq('notification_id', notification.notificationId)
      .eq('channel', channel)
      .in('status', ['sent', 'delivered', 'not_configured', 'skipped']);

    if (!checkError && existingDeliveries && existingDeliveries.length > 0) {
      console.log(`Skipping duplicate delivery for ${notification.notificationId}_${channel}`);
      return;
    }

    const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let status: DeliveryStatus = 'queued';
    let failureReason: string | undefined;

    if (!destination) {
      status = 'skipped';
      failureReason = 'Destination not provided';
    } else if (!isVerified) {
      status = 'skipped';
      failureReason = 'Destination not verified';
    }

    if (status === 'skipped') {
      try {
        await notificationRepository.recordDeliveryAttempt({
          notificationId: notification.notificationId,
          channel: channel as DeliveryChannel,
          provider: channel === 'email' ? 'DefaultEmailProvider' : 'DefaultSmsProvider',
          status,
          failureReason,
          legacyDeliveryId: deliveryId,
        });
      } catch (err: any) {
        console.error('Failed to record skipped delivery attempt:', err.message);
      }
      return;
    }

    const template = getTemplate(notification.type as NotificationEventType, channel);
    let result: { status: 'queued' | 'sent' | 'failed' | 'skipped' | 'not_configured', providerMessageId?: string, failureReason?: string } = { status: 'failed', failureReason: 'Initialization' };
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (channel === 'email') {
          const { config } = await import('./config');
          const bodyWithLink = template.actionUrl ? `${template.body}\n\n${template.actionLabel}: ${config.appUrl}${template.actionUrl}` : template.body;
          result = await this.emailProvider.sendEmail(destination!, template.subject || 'Suga.Health Notification', bodyWithLink);
        } else {
          const { config } = await import('./config');
          const bodyWithLink = template.actionUrl ? `${template.body} ${config.appUrl}${template.actionUrl}` : template.body;
          result = await this.smsProvider.sendSms(destination!, bodyWithLink);
        }
        
        if (result.status === 'sent' || result.status === 'not_configured') {
          break;
        }
      } catch (err: any) {
        result = { status: 'failed', failureReason: err.message || 'Unknown error' };
      }
      
      if (attempt < maxRetries && result.status === 'failed') {
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }

    try {
      await notificationRepository.recordDeliveryAttempt({
        notificationId: notification.notificationId,
        channel: channel as DeliveryChannel,
        provider: channel === 'email' ? 'DefaultEmailProvider' : 'DefaultSmsProvider',
        status: result.status as DeliveryStatus,
        providerMessageId: result.providerMessageId,
        failureReason: result.failureReason,
        legacyDeliveryId: deliveryId,
      });
    } catch (err: any) {
      console.error('Failed to record final delivery attempt:', err.message);
    }

    // Audit log in Supabase
    await auditRepository.log({
      action: result.status === 'sent' ? `NOTIFICATION_${channel.toUpperCase()}_SUCCEEDED` : `NOTIFICATION_${channel.toUpperCase()}_FAILED`,
      actorUid: 'system',
      metadata: { deliveryId, notificationId: notification.notificationId }
    });
  }
}
