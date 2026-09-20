import { messageRepository } from './repositories/messageRepository';
import { auditRepository } from './repositories/auditRepository';
import { NotificationService } from './notifications';
import { UserRole } from './auth/types';

export class MessagingService {
  async ensureThread(patientId: string, doctorId: string, consultationId: string) {
    try {
      const threadId = await messageRepository.ensureThread(patientId, doctorId, consultationId);
      
      await auditRepository.log({
        action: 'MESSAGE_THREAD_CREATED',
        actorUid: 'system',
        threadId,
        consultationId,
        metadata: { patientId, doctorId }
      });

      return threadId;
    } catch (err: any) {
      console.error('[MessagingService] Failed to ensure message thread:', err.message);
      throw err;
    }
  }

  async sendMessage(threadId: string, senderUid: string, senderRole: 'patient' | 'doctor', text: string) {
    const thread = await messageRepository.getThread(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }
    if (thread.status !== 'open') {
      throw new Error('Thread is closed');
    }

    // Verify sender
    if (senderRole === 'patient' && thread.patient_id !== senderUid) {
      throw new Error('Forbidden');
    }
    if (senderRole === 'doctor' && thread.doctor_id !== senderUid) {
      throw new Error('Forbidden');
    }
    
    const trimmed = (text || '').trim();
    if (trimmed.length === 0 || trimmed.length > 5000) {
      throw new Error('Invalid message length');
    }

    try {
      const { messageId, createdAt } = await messageRepository.addMessage({
        threadId,
        senderUid,
        senderRole: senderRole as UserRole,
        text: trimmed,
      });

      // Audit log (metadata only)
      await auditRepository.log({
        action: 'MESSAGE_SENT',
        actorUid: senderUid,
        threadId,
        metadata: { messageId }
      });

      // Notification
      const notifService = new NotificationService();
      const isPatient = senderRole === 'patient';
      const recipientId = isPatient ? thread.doctor_id : thread.patient_id;
      
      // Only send if it's going to patient, for doctor we might use a different mechanism or same
      if (!isPatient) {
        await notifService.createNotification({
          patientId: recipientId,
          type: 'NEW_MESSAGE',
          title: 'New Message',
          shortMessage: 'You have a new message from your care team.',
          relatedEntityId: threadId,
          relatedEntityType: 'thread',
          idempotencyKey: `msg_notif_${messageId}`
        });
      }

      return { messageId, timestamp: createdAt };
    } catch (err: any) {
      console.error('[MessagingService] Failed to send message:', err.message);
      throw err;
    }
  }

  async markAsRead(threadId: string, readerUid: string, readerRole: 'patient' | 'doctor') {
    try {
      await messageRepository.markAsRead(threadId, readerUid, readerRole as UserRole);

      await auditRepository.log({
        action: 'MESSAGE_READ',
        actorUid: readerUid,
        threadId,
      });
    } catch (err: any) {
      console.error('[MessagingService] Failed to mark messages read:', err.message);
      throw err;
    }
  }
}
