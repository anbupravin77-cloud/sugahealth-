import { Router, Request, Response } from 'express';
import { requireClinicalAuth as requireAuth, requireClinicalDoctorAuth as requireDoctorAuth } from '../auth/authMiddleware';
import { clinicalWorkflowService } from '../services/clinicalWorkflowService';

const router = Router();

// ============================================================================
// PATIENT CONSULTATION ENDPOINTS
// ============================================================================

/**
 * GET /api/clinical/consultations/draft
 * Retrieve active draft consultation for current patient.
 */
router.get('/consultations/draft', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'patient') {
      res.status(403).json({ error: 'Forbidden: Draft endpoints are restricted to patients.' });
      return;
    }
    const draft = await clinicalWorkflowService.getDraft(user.uid);
    res.json({ draft });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error getting draft:', err.message);
    res.status(500).json({ error: err.message || 'Failed to retrieve consultation draft' });
  }
});

/**
 * POST /api/clinical/consultations/draft
 * Save or update consultation draft.
 */
router.post('/consultations/draft', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'patient') {
      res.status(403).json({ error: 'Forbidden: Draft endpoints are restricted to patients.' });
      return;
    }
    const { primaryConcern, responses, draftId } = req.body;

    const result = await clinicalWorkflowService.saveDraft(
      user.uid,
      primaryConcern || 'weight',
      responses || {},
      draftId
    );

    res.json({ success: true, draftId: result.id });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error saving draft:', err.message);
    res.status(400).json({ error: err.message || 'Failed to save draft' });
  }
});

/**
 * POST /api/clinical/consultations/:id/submit
 * Patient submits consultation: updates status, assigns eligible doctor, creates doctor notification.
 */
router.post('/consultations/:id/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'patient') {
      res.status(403).json({ error: 'Forbidden: Only patients can submit consultations.' });
      return;
    }
    const { id } = req.params;

    const result = await clinicalWorkflowService.submitConsultation(id, user.uid);
    res.json(result);
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error submitting consultation:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ error: err.message || 'Failed to submit consultation' });
  }
});

/**
 * GET /api/clinical/consultations/patient
 * Retrieve all consultations for the authenticated patient.
 */
router.get('/consultations/patient', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'patient') {
      res.status(403).json({ error: 'Forbidden: Patient endpoints are restricted to patients.' });
      return;
    }
    const consultations = await clinicalWorkflowService.listPatientConsultations(user.uid);
    res.json({ consultations });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error fetching patient consultations:', err.message);
    res.status(500).json({ error: err.message || 'Failed to retrieve patient consultations' });
  }
});

/**
 * GET /api/clinical/consultations/:id
 * Retrieve full consultation details (patient or doctor view).
 */
router.get('/consultations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const details = await clinicalWorkflowService.getConsultationDetails(id, user);
    res.json(details);
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error fetching consultation details:', err.message);
    const status = err.message.includes('Forbidden') ? 403 : 404;
    res.status(status).json({ error: err.message || 'Consultation not found' });
  }
});

/**
 * POST /api/clinical/consultations/:id/select-option
 * Patient selects one offered medication option (does not mutate clinical Rx; sets Ready for Pharmacy).
 */
router.post('/consultations/:id/select-option', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'patient') {
      res.status(403).json({ error: 'Forbidden: Only patients can select medication options.' });
      return;
    }

    const { id } = req.params;
    const { prescriptionItemId } = req.body;

    if (!prescriptionItemId || typeof prescriptionItemId !== 'string' || !prescriptionItemId.trim()) {
      res.status(400).json({ error: 'Valid prescriptionItemId is required for medication selection.' });
      return;
    }

    const result = await clinicalWorkflowService.selectMedicationOption(id, user.uid, {
      prescriptionItemId: prescriptionItemId.trim(),
    });
    res.json(result);
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error selecting option:', err.message);
    res.status(400).json({ error: err.message || 'Failed to select medication option' });
  }
});

// ============================================================================
// DOCTOR CLINICAL WORKSPACE ENDPOINTS
// ============================================================================

/**
 * GET /api/clinical/doctor/patients/:patientId
 * Retrieve canonical patient record / consultation details for a patient assigned to the authenticated doctor.
 */
router.get('/doctor/patients/:patientId', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { patientId } = req.params;

    // List doctor's consultations where assigned_to = user.uid AND patient_id = patientId
    const consultations = await clinicalWorkflowService.listDoctorConsultations(user.uid, 'all');
    const matching = consultations.filter((c: any) => c.patient_id === patientId && c.assigned_to === user.uid);

    if (matching.length === 0) {
      res.status(404).json({ error: 'No consultation record found for this patient assigned to you.' });
      return;
    }

    matching.sort((a: any, b: any) => new Date(b.created_at || b.submitted_at || 0).getTime() - new Date(a.created_at || a.submitted_at || 0).getTime());
    const targetConsultationId = matching[0].id;

    const details = await clinicalWorkflowService.getConsultationDetails(targetConsultationId, user);
    res.json(details);
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error fetching doctor patient record:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : 404;
    res.status(status).json({ error: err.message || 'Patient record not found' });
  }
});

/**
 * GET /api/clinical/doctor/consultations
 * Doctor retrieves active consultations queue / assigned cases.
 */
router.get('/doctor/consultations', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const filter = (req.query.filter as any) || 'all';

    const consultations = await clinicalWorkflowService.listDoctorConsultations(user.uid, filter);
    res.json({ consultations });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error listing doctor consultations:', err.message);
    res.status(500).json({ error: err.message || 'Failed to list consultations' });
  }
});

/**
 * GET /api/clinical/doctor/prescriptions
 * Retrieve prescriptions authored by authenticated doctor.
 */
router.get('/doctor/prescriptions', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const prescriptions = await clinicalWorkflowService.getDoctorPrescriptions(user.uid);
    res.json({ prescriptions });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error listing doctor prescriptions:', err.message);
    res.status(500).json({ error: err.message || 'Failed to list doctor prescriptions' });
  }
});

/**
 * POST /api/clinical/consultations/:id/claim
 * Doctor explicitly claims an unassigned consultation for clinical review.
 */
router.post('/consultations/:id/claim', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const result = await clinicalWorkflowService.claimConsultation(id, user.uid);
    res.json(result);
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error claiming consultation:', err.message);
    res.status(400).json({ error: err.message || 'Failed to claim consultation' });
  }
});

/**
 * POST /api/clinical/consultations/:id/notes
 * Doctor adds or updates clinical note (SOAP / assessment).
 */
router.post('/consultations/:id/notes', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { content, subjective, objective, assessment, plan, noteId } = req.body;

    const result = await clinicalWorkflowService.saveClinicalNote(id, user.uid, {
      content,
      subjective,
      objective,
      assessment,
      plan,
      noteId,
    });

    res.json({ success: true, noteId: result.id });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error saving clinical note:', err.message);
    res.status(400).json({ error: err.message || 'Failed to save clinical note' });
  }
});

/**
 * POST /api/clinical/consultations/:id/prescription
 * Doctor saves draft prescription and offered medication options.
 */
router.post('/consultations/:id/prescription', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { directions, refillCount, refillIntervalDays, medicationOptions, customClinicianMessage } = req.body;

    const result = await clinicalWorkflowService.savePrescriptionWithOptions(id, user.uid, {
      directions,
      refillCount,
      refillIntervalDays,
      medicationOptions: medicationOptions || [],
      customClinicianMessage,
    });

    res.json({ success: true, prescriptionId: result.prescriptionId });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error saving prescription with options:', err.message);
    res.status(400).json({ error: err.message || 'Failed to save prescription options' });
  }
});

/**
 * POST /api/clinical/consultations/:id/approve
 * Doctor approves consultation and signs off. Creates patient notification.
 */
router.post('/consultations/:id/approve', requireDoctorAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { clinicianAttestation, doctorNotes, treatmentSummary } = req.body;

    if (clinicianAttestation !== true) {
      res.status(400).json({ error: 'Clinician attestation must be accepted before approving.' });
      return;
    }

    const result = await clinicalWorkflowService.approveConsultation(id, user.uid, {
      clinicianAttestation,
      doctorNotes,
      treatmentSummary,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error approving consultation:', err.message);
    res.status(400).json({ error: err.message || 'Failed to approve consultation' });
  }
});

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

/**
 * GET /api/clinical/notifications
 * Retrieve all in-app notifications for authenticated user.
 */
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const notifications = await clinicalWorkflowService.getUserNotifications(user.uid, user.role);
    res.json({ notifications });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error fetching notifications:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/clinical/notifications/:id/read
 * Mark notification as read.
 */
router.patch('/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const success = await clinicalWorkflowService.markNotificationRead(id, user.uid);
    res.json({ success });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error marking notification read:', err.message);
    const status = err.message?.includes('Forbidden') ? 403 : 500;
    res.status(status).json({ error: err.message || 'Failed to mark notification read' });
  }
});

/**
 * PATCH /api/clinical/notifications/read-all
 * Mark all notifications as read for the user.
 */
router.patch('/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const success = await clinicalWorkflowService.markAllNotificationsRead(user.uid);
    res.json({ success });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error marking all notifications read:', err.message);
    res.status(500).json({ error: err.message || 'Failed to mark all notifications read' });
  }
});

/**
 * POST /api/clinical/notifications/read-all
 * Mark all notifications as read for the user.
 */
router.post('/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const success = await clinicalWorkflowService.markAllNotificationsRead(user.uid);
    res.json({ success });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error marking all notifications read:', err.message);
    res.status(500).json({ error: err.message || 'Failed to mark all notifications read' });
  }
});

// ============================================================================
// CANONICAL SUPABASE MESSAGING API
// ============================================================================

/**
 * GET /api/messages/threads
 * List conversation threads for authenticated user (doctor or patient) from Supabase.
 */
router.get('/messages/threads', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const threads = await clinicalWorkflowService.listUserThreads(user.uid, user.role);
    res.json({ threads });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error fetching threads:', err.message);
    res.status(500).json({ error: err.message || 'Failed to list message threads' });
  }
});

/**
 * GET /api/messages/threads/:threadId/messages
 * List messages in a thread from Supabase.
 */
router.get('/messages/threads/:threadId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { threadId } = req.params;
    const messages = await clinicalWorkflowService.getThreadMessages(threadId, user.uid, user.role);
    res.json({ messages });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error fetching thread messages:', err.message);
    const status = err.message.includes('Forbidden') ? 403 : 404;
    res.status(status).json({ error: err.message || 'Failed to retrieve messages' });
  }
});

/**
 * POST /api/messages/threads/:threadId/send
 * Send a message to a thread in Supabase.
 */
router.post('/messages/threads/:threadId/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { threadId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const result = await clinicalWorkflowService.sendMessageToThread(threadId, user.uid, user.role, text.trim());
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error sending message:', err.message);
    const status = err.message.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ error: err.message || 'Failed to send message' });
  }
});

/**
 * POST /api/messages/threads/:threadId/read
 * Mark thread messages as read in Supabase.
 */
router.post('/messages/threads/:threadId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { threadId } = req.params;

    await clinicalWorkflowService.markThreadRead(threadId, user.uid, user.role);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error marking thread read:', err.message);
    const msg = err.message || '';
    const status = msg.includes('Forbidden') ? 403 : msg.includes('not found') ? 404 : 500;
    res.status(status).json({ error: msg || 'Failed to mark thread read' });
  }
});

/**
 * GET /api/messages/consultations/:consultationId/thread
 * Retrieve or resolve canonical thread for a consultation.
 */
router.get('/messages/consultations/:consultationId/thread', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { consultationId } = req.params;
    const { messageRepository } = await import('../repositories/messageRepository');

    const thread = await messageRepository.getThreadByConsultationId(consultationId);
    if (!thread) {
      res.json({ thread: null });
      return;
    }

    // Verify user authorization for thread (strictly patient or assigned doctor)
    const isParticipant = (user.role === 'patient' && thread.patient_id === user.uid) ||
      (user.role === 'doctor' && thread.doctor_id === user.uid);

    if (!isParticipant) {
      res.status(403).json({ error: 'Forbidden: You are not a participant in this conversation.' });
      return;
    }

    res.json({ thread });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error resolving consultation thread:', err.message);
    res.status(500).json({ error: err.message || 'Failed to resolve consultation thread' });
  }
});

/**
 * POST /api/messages/consultations/:consultationId/thread
 * Ensure a canonical thread exists for a consultation.
 */
router.post('/messages/consultations/:consultationId/thread', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { consultationId } = req.params;
    const { messageRepository } = await import('../repositories/messageRepository');

    const details = await clinicalWorkflowService.getConsultationDetails(consultationId, user);
    const consultation = details.consultation;

    if (!consultation.assigned_to) {
      res.status(400).json({ error: 'Consultation is unassigned. A clinician must claim the consultation before initiating messages.' });
      return;
    }

    const threadId = await messageRepository.ensureThread(consultation.patient_id, consultation.assigned_to, consultationId);
    res.json({ success: true, threadId });
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error ensuring consultation thread:', err.message);
    res.status(400).json({ error: err.message || 'Failed to create consultation thread' });
  }
});

export default router;
