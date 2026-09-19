import { supabaseAdmin } from '../supabaseAdmin';
import { DbMessageThread, DbMessage } from './types';
import { UserRole } from '../auth/types';

export class MessageRepository {
  async ensureThread(patientId: string, doctorId: string, consultationId: string): Promise<string> {
    // Check if open thread already exists
    const { data: existing, error: findError } = await supabaseAdmin
      .from('message_threads')
      .select('id')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    if (!findError && existing) {
      return existing.id;
    }

    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('message_threads')
      .insert({
        id: threadId,
        patient_id: patientId,
        doctor_id: doctorId,
        consultation_id: consultationId,
        status: 'open',
        patient_unread_count: 0,
        doctor_unread_count: 0,
        last_message_preview: 'Conversation started.',
        last_message_at: now,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();

    if (error || !data) {
      // Re-fetch in case of concurrent creation race condition
      const { data: retryData } = await supabaseAdmin
        .from('message_threads')
        .select('id')
        .eq('consultation_id', consultationId)
        .maybeSingle();

      if (retryData) {
        return retryData.id;
      }
      throw new Error(`Failed to ensure message thread: ${error?.message}`);
    }

    return data.id;
  }

  async getThread(threadId: string): Promise<DbMessageThread | null> {
    const { data, error } = await supabaseAdmin
      .from('message_threads')
      .select('*')
      .eq('id', threadId)
      .maybeSingle();

    if (error) {
      console.error(`[MessageRepository] getThread failed for ${threadId}:`, error.message);
      return null;
    }
    return data as DbMessageThread;
  }

  async getThreadByConsultationId(consultationId: string): Promise<DbMessageThread | null> {
    const { data, error } = await supabaseAdmin
      .from('message_threads')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    if (error) {
      console.error(`[MessageRepository] getThreadByConsultationId failed for ${consultationId}:`, error.message);
      return null;
    }
    return data as DbMessageThread;
  }

  async listThreadsForUser(userId: string, role: UserRole): Promise<DbMessageThread[]> {
    let query = supabaseAdmin
      .from('message_threads')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (role === 'patient') {
      query = query.eq('patient_id', userId);
    } else if (role === 'doctor') {
      query = query.eq('doctor_id', userId);
    } else {
      return [];
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[MessageRepository] listThreadsForUser failed:`, error.message);
      return [];
    }
    return (data || []) as DbMessageThread[];
  }

  /**
   * Adds an immutable message to a thread and increments the recipient unread counter.
   * Enforces message length limits.
   */
  async addMessage(params: {
    threadId: string;
    senderUid: string;
    senderRole: UserRole;
    text: string;
    legacyMessageId?: string;
  }): Promise<{ messageId: string; createdAt: string }> {
    const thread = await this.getThread(params.threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }
    if (thread.status !== 'open') {
      throw new Error('Thread is closed');
    }

    // Verify role safety
    if (params.senderRole !== 'patient' && params.senderRole !== 'doctor') {
      throw new Error('Forbidden: Only patient and doctor roles may send clinical messages');
    }

    // Verify sender boundary
    if (params.senderRole === 'patient' && thread.patient_id !== params.senderUid) {
      throw new Error('Forbidden: Sender does not belong to thread');
    }
    if (params.senderRole === 'doctor' && thread.doctor_id !== params.senderUid) {
      throw new Error('Forbidden: Sender does not belong to thread');
    }

    const trimmed = (params.text || '').trim();
    if (trimmed.length === 0 || trimmed.length > 5000) {
      throw new Error('Invalid message length: Must be between 1 and 5000 characters');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    // 1. Insert message
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        id: messageId,
        thread_id: params.threadId,
        sender_uid: params.senderUid,
        sender_role: params.senderRole,
        message_text: trimmed,
        legacy_message_id: params.legacyMessageId || null,
        created_at: now,
      });

    if (msgError) {
      throw new Error(`Failed to append message: ${msgError.message}`);
    }

    // 2. Update thread counts and summary
    const isPatient = params.senderRole === 'patient';
    const updates: Record<string, any> = {
      last_message_preview: trimmed.substring(0, 100),
      last_message_at: now,
      updated_at: now,
    };

    if (isPatient) {
      updates.doctor_unread_count = (thread.doctor_unread_count || 0) + 1;
    } else {
      updates.patient_unread_count = (thread.patient_unread_count || 0) + 1;
    }

    const { error: threadError } = await supabaseAdmin
      .from('message_threads')
      .update(updates)
      .eq('id', params.threadId);

    if (threadError) {
      console.warn(`[MessageRepository] Failed to update thread counter:`, threadError.message);
    }

    return { messageId, createdAt: now };
  }

  async markAsRead(threadId: string, readerUid: string, readerRole: UserRole): Promise<void> {
    const thread = await this.getThread(threadId);
    if (!thread) {
      throw new Error('Message thread not found');
    }

    if (readerRole === 'patient') {
      if (thread.patient_id !== readerUid) {
        throw new Error('Forbidden: You are not a participant in this message thread');
      }
    } else if (readerRole === 'doctor') {
      if (thread.doctor_id !== readerUid) {
        throw new Error('Forbidden: You are not a participant in this message thread');
      }
    } else {
      throw new Error('Forbidden: Role not authorized for message threads');
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (readerRole === 'patient') {
      updates.patient_unread_count = 0;
    } else if (readerRole === 'doctor') {
      updates.doctor_unread_count = 0;
    }

    await supabaseAdmin
      .from('message_threads')
      .update(updates)
      .eq('id', threadId);

    // Mark unread messages as read
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('messages')
      .update({ read_at: now })
      .eq('thread_id', threadId)
      .neq('sender_uid', readerUid)
      .is('read_at', null);
  }

  async listMessages(threadId: string, limit = 50): Promise<DbMessage[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error(`[MessageRepository] listMessages failed:`, error.message);
      return [];
    }
    return (data || []) as DbMessage[];
  }
}

export const messageRepository = new MessageRepository();
