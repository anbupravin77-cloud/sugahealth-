import { Router, Request, Response } from 'express';
import { requireAuth, requireDoctorAuth } from '../auth/authMiddleware';
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
    const { id } = req.params;

    const result = await clinicalWorkflowService.submitConsultation(id, user.uid);
    res.json(result);
  } catch (err: any) {
    console.error('[ClinicalRoutes] Error submitting consultation:', err.message);
    res.status(400).json({ error: err.message || 'Failed to submit consultation' });
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
    const { id } = req.params;
    const { selectedOption } = req.body;

    if (!selectedOption || !selectedOption.id) {
      res.status(400).json({ error: 'Valid medication option is required' });
      return;
    }

    const result = await clinicalWorkflowService.selectMedicationOption(id, user.uid, selectedOption);
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
    const notifications = await clinicalWorkflowService.getUserNotifications(user.uid);
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
    res.status(500).json({ error: err.message || 'Failed to mark notification read' });
  }
});

export default router;
