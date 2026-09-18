import { adminDb as db } from './firebaseAdmin';
import { NotificationService } from './notifications';

export class MessagingService {
  async ensureThread(patientId: string, doctorId: string, consultationId: string) {
    // Check if an open thread already exists for this consultation
    const existingSnap = await db.collection('message_threads')
      .where('consultationId', '==', consultationId)
      .where('status', '==', 'open')
      .limit(1)
      .get();
      
    if (!existingSnap.empty) {
      return existingSnap.docs[0].id;
    }

    // Create a new thread
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    await db.collection('message_threads').doc(threadId).set({
      threadId,
      patientId,
      doctorId,
      consultationId,
      status: 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
      patientUnreadCount: 0,
      doctorUnreadCount: 0,
      lastMessagePreview: 'Conversation started.',
      lastMessageAt: timestamp
    });
    
    await db.collection('audit_logs').add({
      action: 'MESSAGE_THREAD_CREATED',
      actorUid: 'system',
      threadId,
      patientId,
      doctorId,
      consultationId,
      timestamp
    });

    return threadId;
  }

  async sendMessage(threadId: string, senderUid: string, senderRole: 'patient' | 'doctor', text: string) {
    const threadRef = db.collection('message_threads').doc(threadId);
    
    const threadSnap = await threadRef.get();
    if (!threadSnap.exists) {
      throw new Error('Thread not found');
    }
    
    const threadData = threadSnap.data() as any;
    if (threadData.status !== 'open') {
      throw new Error('Thread is closed');
    }

    // Verify sender
    if (senderRole === 'patient' && threadData.patientId !== senderUid) {
      throw new Error('Forbidden');
    }
    if (senderRole === 'doctor' && threadData.doctorId !== senderUid) {
      throw new Error('Forbidden');
    }
    if (!text || text.trim().length === 0 || text.trim().length > 5000) {
      throw new Error('Invalid message length');
    }

    const timestamp = new Date().toISOString();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Append message
    await threadRef.collection('messages').doc(messageId).set({
      messageId,
      threadId,
      senderUid,
      senderRole,
      messageText: text.trim(),
      createdAt: timestamp,
      readAt: null
    });

    // Update thread summary and unread counts
    const isPatient = senderRole === 'patient';
    await threadRef.update({
      updatedAt: timestamp,
      lastMessageAt: timestamp,
      lastMessagePreview: text.trim().substring(0, 100),
      // increment recipient unread count
      patientUnreadCount: isPatient ? threadData.patientUnreadCount : (threadData.patientUnreadCount || 0) + 1,
      doctorUnreadCount: isPatient ? (threadData.doctorUnreadCount || 0) + 1 : threadData.doctorUnreadCount
    });

    // Audit log (metadata only)
    await db.collection('audit_logs').add({
      action: 'MESSAGE_SENT',
      actorUid: senderUid,
      threadId,
      messageId,
      timestamp
    });

    // Notification
    const notifService = new NotificationService();
    const recipientId = isPatient ? threadData.doctorId : threadData.patientId;
    
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

    return { messageId, timestamp };
  }

  async markAsRead(threadId: string, readerUid: string, readerRole: 'patient' | 'doctor') {
    const threadRef = db.collection('message_threads').doc(threadId);
    
    const timestamp = new Date().toISOString();
    
    await db.runTransaction(async (t) => {
      const doc = await t.get(threadRef);
      if (!doc.exists) return;
      
      const updateData: any = {};
      if (readerRole === 'patient') {
        updateData.patientUnreadCount = 0;
      } else {
        updateData.doctorUnreadCount = 0;
      }
      
      t.update(threadRef, updateData);
    });

    // Bulk update unread messages in the collection
    const unreadSnap = await threadRef.collection('messages')
      .where('senderRole', '!=', readerRole)
      .where('readAt', '==', null)
      .get();
      
    if (!unreadSnap.empty) {
      const batch = db.batch();
      unreadSnap.docs.forEach(doc => {
        batch.update(doc.ref, { readAt: timestamp });
      });
      await batch.commit();

      await db.collection('audit_logs').add({
        action: 'MESSAGE_READ',
        actorUid: readerUid,
        threadId,
        timestamp,
        metadata: { count: unreadSnap.size }
      });
    }
  }
}
