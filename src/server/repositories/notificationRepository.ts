import { supabaseAdmin } from '../supabaseAdmin';
import {
  DbNotification,
  DbNotificationPreferences,
  DbDeliveryRecord,
  DeliveryChannel,
  DeliveryStatus,
} from './types';

export class NotificationRepository {
  async getPreferences(userId: string): Promise<DbNotificationPreferences> {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      // Default preferences
      return {
        user_id: userId,
        email: true,
        sms: false,
        in_app: true,
      };
    }
    return data as DbNotificationPreferences;
  }

  async updatePreferences(
    userId: string,
    prefs: Partial<Pick<DbNotificationPreferences, 'email' | 'sms' | 'in_app'>>
  ): Promise<DbNotificationPreferences> {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...prefs,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update notification preferences: ${error?.message}`);
    }
    return data as DbNotificationPreferences;
  }

  async createNotification(
    data: Omit<DbNotification, 'id' | 'created_at' | 'status'> & { id?: string }
  ): Promise<DbNotification> {
    // 1. Check idempotency
    if (data.idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('idempotency_key', data.idempotency_key)
        .maybeSingle();

      if (existing) {
        return existing as DbNotification;
      }
    }

    const notifId = data.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const { data: inserted, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        id: notifId,
        legacy_notification_id: data.legacy_notification_id || null,
        patient_id: data.patient_id,
        type: data.type,
        title: data.title,
        short_message: data.short_message,
        related_entity_id: data.related_entity_id || null,
        related_entity_type: data.related_entity_type || null,
        status: 'unread',
        idempotency_key: data.idempotency_key || null,
        created_at: now,
      })
      .select()
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to create notification: ${error?.message}`);
    }
    return inserted as DbNotification;
  }

  async listForPatient(patientId: string, limit = 50, unreadOnly = false): Promise<DbNotification[]> {
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('status', 'unread');
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[NotificationRepository] listForPatient failed:`, error.message);
      return [];
    }
    return (data || []) as DbNotification[];
  }

  async markRead(notificationId: string, patientId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('patient_id', patientId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  async markAllRead(patientId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('patient_id', patientId)
      .eq('status', 'unread');

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  async recordDeliveryAttempt(record: {
    notificationId: string;
    channel: DeliveryChannel;
    provider: string;
    status: DeliveryStatus;
    providerMessageId?: string;
    failureReason?: string;
    legacyDeliveryId?: string;
  }): Promise<DbDeliveryRecord> {
    const delId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('delivery_records')
      .insert({
        id: delId,
        notification_id: record.notificationId,
        channel: record.channel,
        provider: record.provider,
        provider_message_id: record.providerMessageId || null,
        status: record.status,
        attempted_at: now,
        failure_reason: record.failureReason || null,
        legacy_delivery_id: record.legacyDeliveryId || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record delivery attempt: ${error?.message}`);
    }
    return data as DbDeliveryRecord;
  }
}

export const notificationRepository = new NotificationRepository();
