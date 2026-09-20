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
   * Adds an immutable message to a thread atomically using fn_send_message RPC.
   */
  async addMessage(params: {
    threadId: string;
    senderUid: string;
    senderRole: UserRole;
    text: string;
    legacyMessageId?: string;
  }): Promise<{ messageId: string; createdAt: string }> {
    const trimmed = (params.text || '').trim();
    if (trimmed.length === 0 || trimmed.length > 5000) {
      throw new Error('Invalid message length: Must be between 1 and 5000 characters');
    }

    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('fn_send_message', {
      p_thread_id: params.threadId,
      p_sender_uid: params.senderUid,
      p_sender_role: params.senderRole,
      p_message_text: trimmed,
    });

    if (rpcErr) {
      throw new Error(`Failed to append message: ${rpcErr.message}`);
    }

    if (!rpcRes || !rpcRes.success) {
      throw new Error('Failed to append message: Transaction RPC returned unsuccessful status.');
    }

    return {
      messageId: rpcRes.messageId,
      createdAt: rpcRes.createdAt,
    };
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

    const { error: threadError } = await supabaseAdmin
      .from('message_threads')
      .update(updates)
      .eq('id', threadId);

    if (threadError) {
      throw new Error(`Failed to reset thread unread count: ${threadError.message}`);
    }

    // Mark unread messages as read
    const now = new Date().toISOString();
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .update({ read_at: now })
      .eq('thread_id', threadId)
      .neq('sender_uid', readerUid)
      .is('read_at', null);

    if (msgError) {
      throw new Error(`Failed to mark messages as read: ${msgError.message}`);
    }
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
