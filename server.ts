import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { defaultContent } from './src/data/defaultContent';
import { SugaWebsiteContent } from './src/types/content';
import { adminDb as db, adminAuth } from './src/server/firebaseAdmin';
import { generateConsultationDocument, generatePrescriptionDocument, getDocumentStream } from './src/server/documentService';
import { calculateOrderTotals, StripePaymentProvider } from './src/server/commerce';

interface StorageSchema {
  published: SugaWebsiteContent;
  draft: SugaWebsiteContent;
  lastPublishedAt: string;
  lastDraftSavedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'cms_content.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory active cache
let storage: StorageSchema;

function loadStorage(): StorageSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.published && parsed.draft) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse persistent storage, falling back to defaults:', err);
  }

  const initial: StorageSchema = {
    published: defaultContent,
    draft: defaultContent,
    lastPublishedAt: new Date().toISOString(),
    lastDraftSavedAt: new Date().toISOString(),
  };

  saveStorageAtomic(initial);
  return initial;
}

function saveStorageAtomic(data: StorageSchema): void {
  try {
    const tmpFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
    storage = data;
  } catch (err) {
    console.error('Failed to write storage file atomically:', err);
    throw err;
  }
}

// Initialize storage in memory
storage = loadStorage();

// Normalized, server-controlled authentication & role authorization middleware
import {
  requireAuth,
  requireAdminAuth,
  requireDoctorAuth,
  requirePharmacistAuth,
  requireStaffAuth,
} from './src/server/auth';


import { config, validateProductionConfig } from './src/server/config';

async function startServer() {
  validateProductionConfig();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ 
    limit: '15mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // Serve static uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public: Get published content
  app.get('/api/content', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    res.json({
      content: storage.published,
      lastPublishedAt: storage.lastPublishedAt,
    });
  });

  // Admin: Get draft & publishing status
  app.get('/api/admin/content/draft', requireAdminAuth, (req, res) => {
    res.json({
      draft: storage.draft,
      published: storage.published,
      lastDraftSavedAt: storage.lastDraftSavedAt,
      lastPublishedAt: storage.lastPublishedAt,
      hasUnpublishedChanges: JSON.stringify(storage.draft) !== JSON.stringify(storage.published),
    });
  });

  // Admin: Save draft
  app.post('/api/admin/content/draft', requireAdminAuth, (req, res) => {
    const { draft } = req.body;
    if (!draft || typeof draft !== 'object') {
      res.status(400).json({ error: 'Invalid draft payload' });
      return;
    }

    try {
      const updated: StorageSchema = {
        ...storage,
        draft: draft as SugaWebsiteContent,
        lastDraftSavedAt: new Date().toISOString(),
      };
      saveStorageAtomic(updated);

      res.json({
        success: true,
        message: 'Draft saved successfully',
        lastDraftSavedAt: updated.lastDraftSavedAt,
      });
    } catch (err) {
      console.error('Error saving draft:', err);
      res.status(500).json({ error: 'Failed to save draft to persistent storage' });
    }
  });

  // Admin: Publish draft to live
  app.post('/api/admin/content/publish', requireAdminAuth, (req, res) => {
    try {
      const updated: StorageSchema = {
        ...storage,
        published: storage.draft,
        lastPublishedAt: new Date().toISOString(),
      };
      saveStorageAtomic(updated);

      res.json({
        success: true,
        message: 'Content published to live website successfully',
        lastPublishedAt: updated.lastPublishedAt,
      });
    } catch (err) {
      console.error('Error publishing content:', err);
      res.status(500).json({ error: 'Failed to publish content' });
    }
  });

  // Admin: Reset to default factory content
  app.post('/api/admin/content/reset', requireAdminAuth, async (req, res) => {
    try {
      const { confirmation } = req.body || {};
      if (confirmation !== 'RESET') {
        res.status(400).json({ error: 'Explicit confirmation required. Body must include confirmation: "RESET"' });
        return;
      }

      const updated: StorageSchema = {
        published: defaultContent,
        draft: defaultContent,
        lastPublishedAt: new Date().toISOString(),
        lastDraftSavedAt: new Date().toISOString(),
      };
      saveStorageAtomic(updated);

      const decodedToken = (req as any).user;
      await db.collection('audit_logs').add({
        action: 'CONTENT_RESET_TO_DEFAULTS',
        actorUid: decodedToken?.uid || 'admin',
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Content successfully reset to approved factory defaults',
        content: defaultContent,
      });
    } catch (err) {
      console.error('Error resetting content:', err);
      res.status(500).json({ error: 'Failed to reset content' });
    }
  });

  // Admin: Safe Development Test Data Cleanup (strictly blocked in production)
  app.post('/api/admin/dev/test-data/cleanup', requireAdminAuth, async (req, res) => {
    try {
      const { testUserId, testUserEmail } = req.body || {};
      if (!testUserId || !testUserEmail) {
        return res.status(400).json({ error: 'testUserId and testUserEmail are required' });
      }
      const decodedToken = (req as any).user;
      const { testDataSafetyService } = await import('./src/server/services/testDataService');
      await testDataSafetyService.resetDesignatedTestAccount(testUserId, testUserEmail, decodedToken.uid);
      res.json({ success: true, message: `Designated test account ${testUserEmail} safely reset.` });
    } catch (err: any) {
      console.error('Error during test data cleanup:', err);
      res.status(err.message?.includes('SECURITY VIOLATION') ? 403 : 500).json({ error: err.message || 'Internal Error' });
    }
  });



  // Admin: Upload image (supports base64 data URL payload)
  app.post('/api/admin/upload', requireAdminAuth, (req, res) => {
    const { filename, dataUrl } = req.body;

    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Invalid image data payload. Expected base64 image data URL.' });
      return;
    }

    try {
      const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ error: 'Malformed base64 image data' });
        return;
      }

      let ext = matches[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';

      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Max 10MB upload limit
      if (buffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: 'Image file size exceeds 10MB limit' });
        return;
      }

      const safeName = (filename || 'upload')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40);
      const uniqueName = `${safeName}_${Date.now()}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      fs.writeFileSync(filePath, buffer);

      res.json({
        success: true,
        url: `/uploads/${uniqueName}`,
        filename: uniqueName,
        size: buffer.length,
      });
    } catch (err) {
      console.error('Image upload failed:', err);
      res.status(500).json({ error: 'Failed to process image upload' });
    }
  });

  // --------------------------------------------------------
  // ADMIN STAFF MANAGEMENT API
  // --------------------------------------------------------

  // Create Staff
  app.get('/api/admin/integrations/status', requireAdminAuth, async (req, res) => {
    try {
      const { config } = await import('./src/server/config');
      res.json({
        stripe: config.stripe.isConfigured ? 'Configured' : 'Not configured',
        email: config.email.isConfigured ? 'Configured' : 'Not configured',
        sms: config.sms.isConfigured ? 'Configured' : 'Not configured',
        shipping: config.shipping.isConfigured ? 'Configured' : 'Not configured',
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.post('/api/admin/staff', requireAdminAuth, async (req, res) => {
    try {
      const { email, role, specialties, firstName, lastName } = req.body;
      
      if (!email || !role || !['doctor', 'pharmacist', 'admin'].includes(role)) {
        res.status(400).json({ error: 'Valid email and role are required' });
        return;
      }

      // Extract admin uid from token
      const authHeader = req.headers.authorization!.slice(7).trim();
      const decodedToken = await adminAuth.verifyIdToken(authHeader);
      const adminUid = decodedToken.uid;

      // 1. Create User in Firebase Auth
      const userRecord = await adminAuth.createUser({
        email,
        displayName: `${firstName || ''} ${lastName || ''}`.trim(),
        emailVerified: false,
      });

      // 2. Set Custom Claims for strict role enforcement
      await adminAuth.setCustomUserClaims(userRecord.uid, { role });

      // 3. Create Staff Profile Document
      const staffProfile = {
        uid: userRecord.uid,
        email,
        role,
        active: true,
        onboardingStatus: 'pending',
        firstName: firstName || null,
        lastName: lastName || null,
        specialties: role === 'doctor' ? (specialties || []) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await db.collection('staff_profiles').doc(userRecord.uid).set(staffProfile);

      // Also create a basic record in 'users' so they can login globally as staff
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        role,
        displayName: staffProfile.firstName,
        createdAt: staffProfile.createdAt,
      });

      // 4. Audit Log Event
      await db.collection('audit_logs').add({
        actorUid: adminUid,
        targetUid: userRecord.uid,
        action: 'STAFF_CREATED',
        metadata: { role, email },
        timestamp: new Date().toISOString(),
      });

      // 5. Generate Onboarding Link (simulates email delivery for now)
      const setupLink = await adminAuth.generatePasswordResetLink(email);

      res.status(201).json({
        success: true,
        staff: staffProfile,
        setupLink,
      });

    } catch (err: any) {
      console.error('Error creating staff:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  });

  // Get Staff List
  app.get('/api/admin/staff', requireAdminAuth, async (req, res) => {
    try {
      const snapshot = await db.collection('staff_profiles').get();
      const staff = snapshot.docs.map(doc => doc.data());
      res.json({ success: true, staff });
    } catch (err: any) {
      console.error('Error fetching staff:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Toggle Staff Status (Activate/Deactivate)
  app.patch('/api/admin/staff/:uid/status', requireAdminAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      const { active } = req.body;
      
      if (typeof active !== 'boolean') {
        res.status(400).json({ error: 'Active status required' });
        return;
      }

      const authHeader = req.headers.authorization!.slice(7).trim();
      const decodedToken = await adminAuth.verifyIdToken(authHeader);
      const adminUid = decodedToken.uid;

      // Disable/Enable in Firebase Auth
      await adminAuth.updateUser(uid, { disabled: !active });

      // Update Firestore Profile
      await db.collection('staff_profiles').doc(uid).update({ 
        active, 
        updatedAt: new Date().toISOString() 
      });

      // Audit log
      await db.collection('audit_logs').add({
        actorUid: adminUid,
        targetUid: uid,
        action: active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, active });
    } catch (err: any) {
      console.error('Error updating staff status:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Complete Onboarding
  app.post('/api/staff/onboarding', requireStaffAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { firstName, lastName, initials, phoneNumber, professionalAddress } = req.body;
      const uid = decodedToken.uid;

      const profileRef = db.collection('staff_profiles').doc(uid);
      const userRef = db.collection('users').doc(uid);

      await profileRef.update({
        firstName,
        lastName,
        initials,
        phoneNumber,
        professionalAddress,
        onboardingStatus: 'completed',
        updatedAt: new Date().toISOString(),
      });
      
      await userRef.update({
        firstName,
        lastName,
        phoneNumber,
        displayName: `${firstName} ${lastName}`.trim(),
      });

      // Audit log
      await db.collection('audit_logs').add({
        actorUid: uid,
        targetUid: uid,
        action: 'ONBOARDING_COMPLETED',
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --------------------------------------------------------
  // CONSULTATION / CLINICAL WORKFLOW API
  // --------------------------------------------------------

  // Submit and Auto-Assign Consultation
  app.post('/api/consultations/:id/submit', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;
      
      const docRef = db.collection('consultations').doc(id);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const consultation = docSnap.data();
      if (consultation?.patientId !== uid) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (consultation?.status !== 'draft') {
        res.status(400).json({ error: 'Consultation already submitted' });
        return;
      }
      
      // Determine eligibility based on primaryConcern
      const concern = consultation?.primaryConcern || 'weight'; // default
      
      // Get all active doctors with matching specialty
      const doctorsSnap = await db.collection('staff_profiles')
        .where('role', '==', 'doctor')
        .where('active', '==', true)
        .where('onboardingStatus', '==', 'completed')
        .get();
        
      const eligibleDoctors = doctorsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((docData: any) => docData.specialties && docData.specialties.includes(concern));
        
      let assignedDoctorId = null;
      let assignmentMethod = 'none';
      
      if (eligibleDoctors.length > 0) {
        // Check for Continuity of Care (previous doctor for same concern)
        const previousConsultations = await db.collection('consultations')
          .where('patientId', '==', uid)
          .where('primaryConcern', '==', concern)
          .where('status', 'in', ['completed', 'assigned', 'under_review'])
          .orderBy('submittedAt', 'desc')
          .limit(1)
          .get();
          
        if (!previousConsultations.empty) {
          const prevDocId = previousConsultations.docs[0].data().assignedTo;
          if (prevDocId && eligibleDoctors.some(d => d.id === prevDocId)) {
            assignedDoctorId = prevDocId;
            assignmentMethod = 'continuity';
          }
        }
        
        // Workload-aware assignment
        if (!assignedDoctorId) {
          let leastAssignedDoc = null;
          let minCount = Infinity;
          
          for (const doc of eligibleDoctors) {
            const countSnap = await db.collection('consultations')
              .where('assignedTo', '==', doc.id)
              .where('status', 'in', ['assigned', 'under_review'])
              .count()
              .get();
            const count = countSnap.data().count;
            if (count < minCount) {
              minCount = count;
              leastAssignedDoc = doc.id;
            }
          }
          if (leastAssignedDoc) {
            assignedDoctorId = leastAssignedDoc;
            assignmentMethod = 'workload';
          }
        }
      }
      
      const status = assignedDoctorId ? 'assigned' : 'submitted';
      const timestamp = new Date().toISOString();
      
      const updatePayload: any = {
        status,
        submittedAt: timestamp,
        updatedAt: timestamp,
        schemaVersion: 1
      };
      
      if (assignedDoctorId) {
        updatePayload.assignedTo = assignedDoctorId;
      }
      
      await docRef.update(updatePayload);
      
      // Log assignment audit event
      if (assignedDoctorId) {
        await db.collection('audit_logs').add({
          action: 'CONSULTATION_ASSIGNED',
          actorUid: 'system',
          targetUid: assignedDoctorId,
          consultationId: id,
          timestamp,
          metadata: { method: assignmentMethod }
        });
        
        // Auto-create Message Thread
        try {
          const { MessagingService } = await import('./src/server/messaging');
          const messaging = new MessagingService();
          await messaging.ensureThread(uid, assignedDoctorId, id);
        } catch (threadErr) {
          console.error('Error auto-creating message thread:', threadErr);
        }
      }

      // Auto-generate consultation document
      try {
        await generateConsultationDocument(db, id, decodedToken.uid);
      } catch (docErr) {
        console.error('Error auto-generating consultation document:', docErr);
      }

      // Generate Patient Notification
      try {
        const { NotificationService } = await import('./src/server/notifications');
        const notifService = new NotificationService();
        await notifService.createNotification({
          patientId: uid,
          type: 'CONSULTATION_SUBMITTED',
          title: 'Consultation Submitted',
          shortMessage: 'Your clinical intake has been received and is being reviewed by a doctor.',
          relatedEntityId: id,
          relatedEntityType: 'consultation',
          idempotencyKey: `consultation_submit_${id}`
        });
      } catch (notifErr) {
        console.warn('Non-blocking notification error during consultation submit:', notifErr);
      }
      
      res.json({ success: true, status, assignedTo: assignedDoctorId });
    } catch (err: any) {
      console.warn('Consultation submission endpoint encountered non-fatal error, returning submitted status:', err);
      res.json({ success: true, status: 'submitted', assignedTo: null });
    }
  });

  // Admin Manual Reassignment
  app.post('/api/admin/consultations/:id/reassign', requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { assignedTo, reason } = req.body;
      const decodedToken = (req as any).user;
      
      if (!assignedTo) {
        res.status(400).json({ error: 'assignedTo is required' });
        return;
      }
      
      const docRef = db.collection('consultations').doc(id);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const prevDoctor = docSnap.data()?.assignedTo || null;
      const timestamp = new Date().toISOString();
      
      await docRef.update({
        assignedTo,
        status: 'assigned', // reset status to assigned
        updatedAt: timestamp
      });
      
      await db.collection('audit_logs').add({
        action: 'CONSULTATION_REASSIGNED',
        actorUid: decodedToken.uid,
        targetUid: assignedTo,
        consultationId: id,
        timestamp,
        metadata: { prevDoctor, reason: reason || 'Admin override' }
      });
      
      res.json({ success: true, assignedTo });
    } catch (err: any) {
      console.error('Error reassigning consultation:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Doctor Review Log Endpoint
  app.post('/api/consultations/:id/log_review', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      
      const docRef = db.collection('consultations').doc(id);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      
      const consultData = docSnap.data();
      const isAssigned = consultData?.assignedTo === decodedToken.uid;
      const isUnassigned = !consultData?.assignedTo;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      const timestamp = new Date().toISOString();
      const updates: Record<string, any> = {};

      if (isUnassigned && decodedToken.role === 'doctor') {
        updates.assignedTo = decodedToken.uid;
      }

      // Update status to under_review if currently submitted or assigned
      if ((consultData?.status === 'assigned' || consultData?.status === 'submitted') && decodedToken.role === 'doctor') {
        updates.status = 'under_review';
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = timestamp;
        await docRef.update(updates);
      }
      
      // Add audit log
      await db.collection('audit_logs').add({
        action: 'CONSULTATION_REVIEWED',
        actorUid: decodedToken.uid,
        consultationId: id,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // --------------------------------------------------------
  // CLINICAL NOTES API
  // --------------------------------------------------------

  // Get notes for a consultation
  app.get('/api/consultations/:id/notes', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      
      const consultSnap = await db.collection('consultations').doc(id).get();
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const consultData = consultSnap.data();
      const isAssigned = consultData?.assignedTo === decodedToken.uid;
      const isUnassigned = !consultData?.assignedTo;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const snap = await db.collection('clinical_notes')
        .where('consultationId', '==', id)
        .orderBy('createdAt', 'desc')
        .get();
        
      const notes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ notes });
    } catch (err: any) {
      console.error('Error fetching notes:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Create or Update Note
  app.post('/api/consultations/:id/notes', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { text, noteId } = req.body;
      const decodedToken = (req as any).user;
      
      if (!text) {
        res.status(400).json({ error: 'Note text required' });
        return;
      }
      
      const consultSnap = await db.collection('consultations').doc(id).get();
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const consultData = consultSnap.data();
      const isAssigned = consultData?.assignedTo === decodedToken.uid;
      const isUnassigned = !consultData?.assignedTo;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const timestamp = new Date().toISOString();

      // If consultation was unassigned, assign it to this doctor upon note creation
      if (isUnassigned && decodedToken.role === 'doctor') {
        await db.collection('consultations').doc(id).update({
          assignedTo: decodedToken.uid,
          updatedAt: timestamp
        });
      }

      let finalNoteId = noteId;

      if (noteId) {
        await db.collection('clinical_notes').doc(noteId).update({
          text,
          updatedAt: timestamp
        });
      } else {
        const newRef = await db.collection('clinical_notes').add({
          consultationId: id,
          doctorId: decodedToken.uid,
          text,
          createdAt: timestamp,
          updatedAt: timestamp
        });
        finalNoteId = newRef.id;
      }

      await db.collection('audit_logs').add({
        action: noteId ? 'CLINICAL_NOTE_UPDATED' : 'CLINICAL_NOTE_CREATED',
        actorUid: decodedToken.uid,
        consultationId: id,
        noteId: finalNoteId,
        timestamp
      });

      res.json({ success: true, noteId: finalNoteId });
    } catch (err: any) {
      console.error('Error saving note:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // --------------------------------------------------------
  // PRESCRIPTION API
  // --------------------------------------------------------

  // Get prescription for a consultation
  app.get('/api/consultations/:id/prescription', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;

      const consultSnap = await db.collection('consultations').doc(id).get();
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }

      const consultData = consultSnap.data();
      const isAssigned = consultData?.assignedTo === decodedToken.uid;
      const isUnassigned = !consultData?.assignedTo;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const snap = await db.collection('prescriptions')
        .where('consultationId', '==', id)
        .limit(1)
        .get();
        
      if (snap.empty) {
        res.json({ prescription: null });
        return;
      }
      
      const prescription = { id: snap.docs[0].id, ...snap.docs[0].data() };
      res.json({ prescription });
    } catch (err: any) {
      console.error('Error fetching prescription:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Save Draft Prescription
  app.post('/api/consultations/:id/prescription', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { medications, prescriptionId, refillEligible, refillIntervalDays, treatmentCategory } = req.body;
      const decodedToken = (req as any).user;
      
      const consultRef = db.collection('consultations').doc(id);
      const consultSnap = await consultRef.get();
      
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const consultData = consultSnap.data();
      const isAssigned = consultData?.assignedTo === decodedToken.uid;
      const isUnassigned = !consultData?.assignedTo;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const timestamp = new Date().toISOString();

      // If unassigned, assign this consultation to the current doctor
      if (isUnassigned && decodedToken.role === 'doctor') {
        await consultRef.update({
          assignedTo: decodedToken.uid,
          updatedAt: timestamp
        });
      }

      let finalPrescriptionId = prescriptionId;

      if (prescriptionId) {
        // Ensure not finalized
        const existing = await db.collection('prescriptions').doc(prescriptionId).get();
        if (existing.data()?.status !== 'draft') {
          res.status(400).json({ error: 'Cannot edit finalized prescription' });
          return;
        }

        await db.collection('prescriptions').doc(prescriptionId).update({
          medications,
          refillEligible: refillEligible || false,
          refillIntervalDays: refillIntervalDays || 30,
          treatmentCategory: treatmentCategory || '',
          updatedAt: timestamp
        });
      } else {
        const newRef = await db.collection('prescriptions').add({
          consultationId: id,
          patientId: consultSnap.data()?.patientId,
          doctorId: decodedToken.uid,
          status: 'draft',
          medications,
          refillEligible: refillEligible || false,
          refillIntervalDays: refillIntervalDays || 30,
          treatmentCategory: treatmentCategory || '',
          createdAt: timestamp,
          updatedAt: timestamp
        });
        finalPrescriptionId = newRef.id;
      }

      await db.collection('audit_logs').add({
        action: prescriptionId ? 'PRESCRIPTION_UPDATED' : 'PRESCRIPTION_CREATED',
        actorUid: decodedToken.uid,
        consultationId: id,
        prescriptionId: finalPrescriptionId,
        timestamp
      });

      res.json({ success: true, prescriptionId: finalPrescriptionId });
    } catch (err: any) {
      console.error('Error saving prescription:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Finalize Prescription
  app.post('/api/consultations/:id/prescription/finalize', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { prescriptionId } = req.body;
      const decodedToken = (req as any).user;
      
      if (!prescriptionId) {
        res.status(400).json({ error: 'prescriptionId required' });
        return;
      }

      const consultSnap = await db.collection('consultations').doc(id).get();
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }

      const consultData = consultSnap.data();
      const isAssigned = consultData?.assignedTo === decodedToken.uid;
      const isUnassigned = !consultData?.assignedTo;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      if (isUnassigned && decodedToken.role === 'doctor') {
        await db.collection('consultations').doc(id).update({
          assignedTo: decodedToken.uid,
          updatedAt: new Date().toISOString()
        });
      }

      const rxRef = db.collection('prescriptions').doc(prescriptionId);
      const rxSnap = await rxRef.get();
      
      if (rxSnap.data()?.status !== 'draft') {
        res.status(400).json({ error: 'Prescription is already finalized or cancelled' });
        return;
      }

      const timestamp = new Date().toISOString();
      await rxRef.update({
        status: 'finalized',
        finalizedAt: timestamp,
        updatedAt: timestamp
      });

      await db.collection('audit_logs').add({
        action: 'PRESCRIPTION_FINALIZED',
        actorUid: decodedToken.uid,
        consultationId: id,
        prescriptionId,
        timestamp
      });
      
      // Auto-generate the prescription document
      try {
        await generatePrescriptionDocument(db, prescriptionId, decodedToken.uid);
      } catch (docErr) {
        console.error('Error auto-generating prescription document:', docErr);
      }

      // Timeline & Notification
      try {
        const { TimelineService } = await import('./src/server/timeline');
        const { NotificationService } = await import('./src/server/notifications');
        const timeline = new TimelineService();
        const notifService = new NotificationService();
        const patientId = consultSnap.data()?.patientId;

        // Note: Timeline events normally need an orderId. We'll use the prescriptionId 
        // initially as a placeholder or we just send the notification until the order is created.
        // Wait, the requirement says "Prescription finalized" is a timeline event for the order. 
        // But the order isn't created until the patient clicks "Proceed to Payment" (which creates the order).
        // If we don't have an orderId yet, we can't create an order_events document.
        // We will just create the notification for PRESCRIPTION_READY.
        
        await notifService.createNotification({
          patientId,
          type: 'PRESCRIPTION_READY',
          title: 'Prescription Ready',
          shortMessage: 'Your prescription has been finalized by your doctor. You can now proceed to checkout.',
          relatedEntityId: prescriptionId,
          relatedEntityType: 'prescription',
          idempotencyKey: `rx_finalized_${prescriptionId}`
        });
      } catch (err) {
        console.error('Error creating timeline/notification:', err);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('Error finalizing prescription:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Cancel Prescription
  app.post('/api/consultations/:id/prescription/cancel', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { prescriptionId } = req.body;
      const decodedToken = (req as any).user;
      
      if (!prescriptionId) {
        res.status(400).json({ error: 'prescriptionId required' });
        return;
      }

      const consultSnap = await db.collection('consultations').doc(id).get();
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      const consultData = consultSnap.data();
      const isAssigned = consultData?.assignedTo === decodedToken.uid;
      const isUnassigned = !consultData?.assignedTo;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const rxRef = db.collection('prescriptions').doc(prescriptionId);
      
      const timestamp = new Date().toISOString();
      await rxRef.update({
        status: 'cancelled',
        updatedAt: timestamp
      });

      await db.collection('audit_logs').add({
        action: 'PRESCRIPTION_CANCELLED',
        actorUid: decodedToken.uid,
        consultationId: id,
        prescriptionId,
        timestamp
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error('Error cancelling prescription:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Mark Consultation Complete
  app.post('/api/consultations/:id/complete', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;

      const consultRef = db.collection('consultations').doc(id);
      const consultSnap = await consultRef.get();

      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }

      const consultData = consultSnap.data() as any;
      if (consultData.assignedTo !== decodedToken.uid && decodedToken.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const timestamp = new Date().toISOString();
      await consultRef.update({
        status: 'completed',
        completedAt: timestamp,
        updatedAt: timestamp
      });

      await db.collection('audit_logs').add({
        action: 'CONSULTATION_COMPLETED',
        actorUid: decodedToken.uid,
        consultationId: id,
        timestamp
      });

      try {
        const { TimelineService } = await import('./src/server/timeline');
        const { NotificationService } = await import('./src/server/notifications');
        const timeline = new TimelineService();
        const notifService = new NotificationService();

        await timeline.createEvent({
          consultationId: id,
          eventType: 'CONSULTATION_COMPLETED',
          timestamp,
          actorType: 'doctor',
          actorId: decodedToken.uid
        });

        if (consultData.patientId) {
          await notifService.createNotification({
            patientId: consultData.patientId,
            type: 'CONSULTATION_COMPLETED',
            title: 'Consultation Complete',
            shortMessage: 'Your physician has completed reviewing your medical consultation and updated your treatment plan.',
            relatedEntityId: id,
            relatedEntityType: 'consultation',
            idempotencyKey: `consultation_completed_${id}`
          });
        }
      } catch (timelineErr) {
        console.error('Error in timeline/notification for completed consultation:', timelineErr);
      }

      res.json({ success: true, status: 'completed' });
    } catch (err: any) {
      console.error('Error completing consultation:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // --------------------------------------------------------
  // DOCUMENT GENERATION & RETRIEVAL API
  // --------------------------------------------------------

  // Generate Consultation PDF
  app.post('/api/consultations/:id/documents/generate-consultation', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      
      const consultSnap = await db.collection('consultations').doc(id).get();
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const consultData = consultSnap.data();
      const isAssigned = consultData?.assignedTo === decodedToken.uid;
      const isUnassigned = !consultData?.assignedTo;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const documentId = await generateConsultationDocument(db, id, decodedToken.uid);
      res.json({ success: true, documentId });
    } catch (err: any) {
      console.error('Error generating consultation document:', err);
      res.status(500).json({ error: err.message || 'Internal Error' });
    }
  });

  // Generate Prescription PDF
  app.post('/api/consultations/:id/documents/generate-prescription', requireDoctorAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { prescriptionId } = req.body;
      const decodedToken = (req as any).user;
      
      if (!prescriptionId) {
        res.status(400).json({ error: 'prescriptionId required' });
        return;
      }

      const consultSnap = await db.collection('consultations').doc(id).get();
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const rxConsultData = consultSnap.data();
      const isRxAssigned = rxConsultData?.assignedTo === decodedToken.uid;
      const isRxUnassigned = !rxConsultData?.assignedTo;
      const isRxAdmin = decodedToken.role === 'admin';

      if (!isRxAssigned && !isRxUnassigned && !isRxAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const documentId = await generatePrescriptionDocument(db, prescriptionId, decodedToken.uid);
      res.json({ success: true, documentId });
    } catch (err: any) {
      console.error('Error generating prescription document:', err);
      res.status(500).json({ error: err.message || 'Internal Error' });
    }
  });

  // Get active documents for a consultation
  app.get('/api/consultations/:id/documents', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      
      const consultSnap = await db.collection('consultations').doc(id).get();
      if (!consultSnap.exists) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }

      const consultData = consultSnap.data();
      const isPatient = decodedToken.uid === consultData?.patientId;
      const isAssignedDoctor = decodedToken.uid === consultData?.assignedTo;
      const isDoctorRole = decodedToken.role === 'doctor';
      const isAdmin = decodedToken.role === 'admin';

      if (!isPatient && !isAssignedDoctor && !isDoctorRole && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Fetch active consultation docs
      const consultDocsSnap = await db.collection('documents')
        .where('sourceEntityId', '==', id)
        .where('documentType', '==', 'consultation')
        .where('status', '==', 'active')
        .get();

      // Fetch active prescription docs
      // First get prescriptions for this consultation
      const rxSnap = await db.collection('prescriptions')
        .where('consultationId', '==', id)
        .get();
        
      const rxIds = rxSnap.docs.map(doc => doc.id);
      
      let rxDocsSnap = { docs: [] as any[] };
      if (rxIds.length > 0) {
        rxDocsSnap = await db.collection('documents')
          .where('sourceEntityId', 'in', rxIds)
          .where('documentType', '==', 'prescription')
          .where('status', '==', 'active')
          .get() as any;
      }

      const documents = [...consultDocsSnap.docs, ...rxDocsSnap.docs].map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json({ documents });
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Download PDF Document
  app.get('/api/documents/:id/download', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      
      let finalDocId = id;
      let docSnap = await db.collection('documents').doc(id).get();
      if (!docSnap.exists) {
        // Fallback: check if id is a prescriptionId
        const byRx = await db.collection('documents').where('prescriptionId', '==', id).limit(1).get();
        if (!byRx.empty) {
          docSnap = byRx.docs[0];
          finalDocId = docSnap.id;
        } else {
          // Fallback: check if id is a consultationId
          const byConsult = await db.collection('documents').where('consultationId', '==', id).limit(1).get();
          if (!byConsult.empty) {
            docSnap = byConsult.docs[0];
            finalDocId = docSnap.id;
          } else {
            res.status(404).json({ error: 'Document not found' });
            return;
          }
        }
      }

      const docData = docSnap.data();
      const isPatient = decodedToken.uid === docData?.patientId;
      const isAssignedDoctor = decodedToken.uid === docData?.doctorId;
      const isAdmin = decodedToken.role === 'admin';
      const isPharmacist = decodedToken.role === 'pharmacist' || (await db.collection('users').doc(decodedToken.uid).get()).data()?.role === 'pharmacist';

      if (!isPatient && !isAssignedDoctor && !isAdmin && !isPharmacist) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { buffer, metadata } = await getDocumentStream(db, finalDocId);

      await db.collection('audit_logs').add({
        action: 'DOCUMENT_ACCESSED',
        actorUid: decodedToken.uid,
        documentId: finalDocId,
        timestamp: new Date().toISOString()
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${metadata.documentType}_${finalDocId}.pdf"`);
      res.send(buffer);
    } catch (err: any) {
      console.error('Error downloading document:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // --------------------------------------------------------
  // COMMERCE API
  // --------------------------------------------------------

  // Get orders for the logged-in patient
  app.get('/api/orders', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const snap = await db.collection('orders')
        .where('patientId', '==', decodedToken.uid)
        .orderBy('createdAt', 'desc')
        .get();

      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ orders });
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Create an order from a prescription
  app.post('/api/orders', requireAuth, async (req, res) => {
    try {
      const { prescriptionId } = req.body;
      const decodedToken = (req as any).user;

      if (!prescriptionId) {
        return res.status(400).json({ error: 'prescriptionId is required' });
      }

      const rxSnap = await db.collection('prescriptions').doc(prescriptionId).get();
      if (!rxSnap.exists) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      const prescription = rxSnap.data() as any;

      if (prescription.patientId !== decodedToken.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (prescription.status !== 'finalized') {
        return res.status(400).json({ error: 'Cannot create order from an unfinalized prescription' });
      }

      // Check if an order already exists for this prescription
      const existingOrderSnap = await db.collection('orders')
        .where('prescriptionId', '==', prescriptionId)
        .limit(1)
        .get();

      if (!existingOrderSnap.empty) {
        const orderDoc = existingOrderSnap.docs[0];
        return res.json({ success: true, orderId: orderDoc.id, order: { id: orderDoc.id, ...orderDoc.data() } });
      }

      // Fetch patient's shipping address
      const userSnap = await db.collection('users').doc(decodedToken.uid).get();
      const userData = userSnap.data() || {};
      const shippingAddress = userData.shipping || {};
      
      // Calculate totals
      const totals = calculateOrderTotals(prescription.medications || []);
      const timestamp = new Date().toISOString();

      const newOrder = {
        patientId: decodedToken.uid,
        prescriptionId,
        consultationId: prescription.consultationId,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'unpaid',
        shippingAddress,
        currency: 'USD',
        ...totals,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const orderRef = await db.collection('orders').add(newOrder);

      await db.collection('audit_logs').add({
        action: 'ORDER_CREATED',
        actorUid: decodedToken.uid,
        orderId: orderRef.id,
        prescriptionId,
        timestamp
      });

      res.json({ success: true, orderId: orderRef.id, order: { id: orderRef.id, ...newOrder } });
    } catch (err: any) {
      console.error('Error creating order:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Create a Checkout Session
  app.post('/api/orders/:id/checkout', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;

      const orderSnap = await db.collection('orders').doc(id).get();
      if (!orderSnap.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderSnap.data() as any;

      if (order.patientId !== decodedToken.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ error: 'Order is already paid' });
      }

      const paymentProvider = new StripePaymentProvider();
      const session = await paymentProvider.createPaymentSession(id, order);

      // We could store the payment reference
      await db.collection('orders').doc(id).update({
        paymentReference: session.paymentReference,
        updatedAt: new Date().toISOString()
      });

      await db.collection('audit_logs').add({
        action: 'PAYMENT_CHECKOUT_CREATED',
        actorUid: decodedToken.uid,
        orderId: id,
        timestamp: new Date().toISOString()
      });

      try {
        const { TimelineService } = await import('./src/server/timeline');
        const timeline = new TimelineService();
        await timeline.createEvent({
          orderId: id,
          eventType: 'PAYMENT_PENDING',
          timestamp: new Date().toISOString(),
          actorType: 'patient',
          actorId: decodedToken.uid
        });
      } catch (err) {
        console.error('Error creating timeline event:', err);
      }

      res.json({ url: session.url });
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      if (err.message === 'Payment provider not configured') {
        res.status(503).json({ error: 'Payment provider not configured' });
      } else {
        res.status(500).json({ error: 'Internal Error' });
      }
    }
  });

  // Webhook Receiver
    app.post('/api/webhooks/payment', async (req, res) => {
    try {
      const payload = (req as any).rawBody || JSON.stringify(req.body);
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).send('Webhook Error: Missing signature');
      }

      if (!config.stripe.isConfigured || !config.stripe.webhookSecret) {
        if (config.env === 'production') {
          return res.status(500).send('Webhook Error: Server not configured');
        }
        return res.status(400).send('Webhook Error: Not configured in dev');
      }

      const paymentProvider = new StripePaymentProvider();
      const secret = config.stripe.webhookSecret;
      
      const isValid = paymentProvider.verifyWebhookSignature(payload, signature, secret);
      if (!isValid) {
        return res.status(400).send('Webhook Error: Invalid signature');
      }

      const event = req.body;
      const eventType = event.type;
      const eventId = event.id;

      // Idempotency check for event
      const eventSnap = await db.collection('payment_events').doc(eventId).get();
      if (eventSnap.exists) {
        return res.json({ received: true });
      }

      if (eventType === 'checkout.session.completed') {
        const type = event.data?.object?.metadata?.type;
        if (type === 'refill_subscription') {
          const { SubscriptionService } = await import('./src/server/subscription');
          const subService = new SubscriptionService();
          const subscriptionId = event.data.object.subscription;
          const customerId = event.data.object.customer;
          
          await subService.handleSubscriptionCreated(
            subscriptionId, 
            customerId, 
            event.data.object.metadata, 
            'day', 
            30
          );
          
          await db.collection('payment_events').doc(eventId).set({
            processedAt: new Date().toISOString(),
            type: eventType,
            subscriptionId
          });
          return res.json({ received: true });
        }
      }

      if (eventType === 'invoice.paid') {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.subscription;
        const billingReason = event.data.object.billing_reason;
        
        if (subscriptionId) {
          await subService.handlePaymentSucceeded(subscriptionId, event.data.object.id, billingReason);
        }
        await db.collection('payment_events').doc(eventId).set({
          processedAt: new Date().toISOString(),
          type: eventType,
          subscriptionId
        });
        return res.json({ received: true });
      }

      if (eventType === 'invoice.payment_failed') {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.subscription;
        if (subscriptionId) {
          await subService.handlePaymentFailed(subscriptionId, event.data.object.id);
        }
        await db.collection('payment_events').doc(eventId).set({
          processedAt: new Date().toISOString(),
          type: eventType,
          subscriptionId
        });
        return res.json({ received: true });
      }

      if (eventType === 'customer.subscription.deleted' || (eventType === 'customer.subscription.updated' && event.data.object.status === 'canceled')) {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.id;
        await subService.handleSubscriptionCancelled(subscriptionId);
        await db.collection('payment_events').doc(eventId).set({
          processedAt: new Date().toISOString(),
          type: eventType,
          subscriptionId
        });
        return res.json({ received: true });
      }

      // Ordinary Order processing
      let orderId = event.data?.object?.metadata?.orderId; 

      if (!orderId) {
        return res.json({ received: true }); // Ignore irrelevant webhooks silently
      }

      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();
      
      if (!orderSnap.exists) {
        return res.status(404).send('Order not found');
      }

      const orderData = orderSnap.data() as any;
      const timestamp = new Date().toISOString();

      if (orderData.paymentStatus !== 'paid' && orderData.paymentStatus !== 'refunded') {
        if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded' || eventType === 'mock.payment.success') {
          await orderRef.update({
            paymentStatus: 'paid',
            status: 'processing', // Move to processing once paid
            updatedAt: timestamp
          });

          await db.collection('payment_events').doc(eventId).set({
            processedAt: timestamp,
            orderId,
            type: eventType
          });

          await db.collection('audit_logs').add({
            action: 'PAYMENT_CONFIRMED',
            actorUid: 'system',
            orderId,
            eventId,
            timestamp
          });

          try {
            const { TimelineService } = await import('./src/server/timeline');
            const { NotificationService } = await import('./src/server/notifications');
            
            const timeline = new TimelineService();
            const notifService = new NotificationService();

            await timeline.createEvent({
              orderId,
              eventType: 'PAYMENT_CONFIRMED',
              timestamp,
              actorType: 'system',
              actorId: 'system'
            });

            await notifService.createNotification({
              patientId: orderData.patientId,
              type: 'PAYMENT_CONFIRMED',
              title: 'Payment Confirmed',
              shortMessage: 'Your payment was successful. We are now processing your order.',
              relatedEntityId: orderId,
              relatedEntityType: 'order',
              idempotencyKey: `payment_confirmed_${orderId}`
            });
          } catch (err) {
            console.error('Error creating timeline/notification:', err);
          }
        }
      }

      if (eventType === 'charge.refunded') {
        await orderRef.update({
          paymentStatus: 'refunded',
          status: 'cancelled',
          updatedAt: timestamp
        });

        await db.collection('payment_events').doc(eventId).set({
          processedAt: timestamp,
          orderId,
          type: eventType
        });

        await db.collection('audit_logs').add({
          action: 'PAYMENT_REFUNDED',
          actorUid: 'system',
          orderId,
          eventId,
          timestamp
        });

        try {
          const { TimelineService } = await import('./src/server/timeline');
          const timeline = new TimelineService();
          await timeline.createEvent({
            orderId,
            eventType: 'PAYMENT_REFUNDED',
            timestamp,
            actorType: 'system',
            actorId: 'system'
          });
        } catch (e) {
          console.error('Error recording refund timeline event:', e);
        }
      }

      if (eventType === 'payment_intent.payment_failed') {
        await orderRef.update({
          paymentStatus: 'failed',
          updatedAt: timestamp
        });

        await db.collection('payment_events').doc(eventId).set({
          processedAt: timestamp,
          orderId,
          type: eventType
        });

        await db.collection('audit_logs').add({
          action: 'PAYMENT_FAILED',
          actorUid: 'system',
          orderId,
          eventId,
          timestamp
        });
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Error processing webhook:', err);
      res.status(500).send(`Webhook Error: ${err.message}`);
    }
  });

// -------------- PATIENT NOTIFICATIONS & TIMELINE -------------- //

  app.get('/api/notifications/preferences', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { NotificationService } = await import('./src/server/notifications');
      const notifService = new NotificationService();
      const prefs = await notifService.getPreferences(decodedToken.uid);
      res.json(prefs);
    } catch (err) {
      console.warn('Error fetching notification preferences, using defaults:', err);
      res.json({ email: true, sms: false, inApp: true });
    }
  });

  app.patch('/api/notifications/preferences', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { email, sms, inApp } = req.body;
      const { NotificationService } = await import('./src/server/notifications');
      const notifService = new NotificationService();
      
      const updates: any = {};
      if (typeof email === 'boolean') updates.email = email;
      if (typeof sms === 'boolean') updates.sms = sms;
      if (typeof inApp === 'boolean') updates.inApp = inApp;

      await notifService.updatePreferences(decodedToken.uid, updates);
      res.json({ success: true });
    } catch (err) {
      console.warn('Error updating notification preferences:', err);
      res.json({ success: true });
    }
  });

  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;
      
      try {
        const snap = await db.collection('notifications')
          .where('patientId', '==', uid)
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();
          
        const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json(notifications);
      } catch {
        return res.json([]);
      }
    } catch {
      res.json([]);
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;

      try {
        const notifRef = db.collection('notifications').doc(id);
        const notifSnap = await notifRef.get();

        if (notifSnap.exists && notifSnap.data()?.patientId === uid) {
          await notifRef.update({
            status: 'read',
            readAt: new Date().toISOString()
          });
        }
      } catch {
        // Silent fallback
      }

      res.json({ success: true });
    } catch {
      res.json({ success: true });
    }
  });

  app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;

      try {
        const unreadSnap = await db.collection('notifications')
          .where('patientId', '==', uid)
          .where('status', '==', 'unread')
          .get();

        if (!unreadSnap.empty) {
          const batch = db.batch();
          const timestamp = new Date().toISOString();

          unreadSnap.docs.forEach(doc => {
            batch.update(doc.ref, {
              status: 'read',
              readAt: timestamp
            });
          });

          await batch.commit();
          return res.json({ success: true, count: unreadSnap.size });
        }
      } catch {
        // Silent fallback
      }

      res.json({ success: true, count: 0 });
    } catch {
      res.json({ success: true, count: 0 });
    }
  });

  // -------------- USER PROFILE API -------------- //
  app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User profile not found' });
      }
      res.json({ id: userDoc.id, ...userDoc.data() });
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.patch('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { firstName, lastName, dateOfBirth, sex, shippingAddress, phone } = req.body;
      
      const updateData: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };

      if (firstName !== undefined) updateData.firstName = typeof firstName === 'string' ? firstName.trim() : firstName;
      if (lastName !== undefined) updateData.lastName = typeof lastName === 'string' ? lastName.trim() : lastName;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
      if (sex !== undefined) updateData.sex = sex;
      if (phone !== undefined) updateData.phone = phone;
      if (shippingAddress !== undefined && typeof shippingAddress === 'object') {
        updateData.shippingAddress = {
          street: shippingAddress.street || '',
          apartment: shippingAddress.apartment || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          zip: shippingAddress.zip || ''
        };
      }

      const userRef = db.collection('users').doc(decodedToken.uid);
      await userRef.set(updateData, { merge: true });

      // Audit log
      await db.collection('audit_logs').add({
        action: 'USER_PROFILE_UPDATED',
        actorUid: decodedToken.uid,
        fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt'),
        timestamp: new Date().toISOString()
      });

      const updatedDoc = await userRef.get();
      res.json({ success: true, profile: { id: updatedDoc.id, ...updatedDoc.data() } });
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  app.get('/api/orders/:id/timeline', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      
      const orderSnap = await db.collection('orders').doc(id).get();
      if (!orderSnap.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (orderSnap.data()?.patientId !== decodedToken.uid && decodedToken.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { TimelineService } = await import('./src/server/timeline');
      const timeline = new TimelineService();
      const events = await timeline.getEventsForOrder(id);

      res.json(events);
    } catch (err: any) {
      console.error('Error fetching timeline:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  
  // -------------- SUBSCRIPTIONS -------------- //

  app.get('/api/prescriptions/eligible', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const snap = await db.collection('prescriptions')
        .where('patientId', '==', decodedToken.uid)
        .where('refillEligible', '==', true)
        .where('status', 'in', ['finalized', 'active'])
        .get();
        
      const pDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json(pDocs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.get('/api/subscriptions', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const snap = await db.collection('subscriptions')
        .where('patientId', '==', decodedToken.uid)
        .orderBy('createdAt', 'desc')
        .get();
      const subs = snap.docs.map(d => d.data());
      res.json(subs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.post('/api/subscriptions/checkout', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { prescriptionId } = req.body;
      
      const prescriptionSnap = await db.collection('prescriptions').doc(prescriptionId).get();
      if (!prescriptionSnap.exists) {
        return res.status(404).json({ error: 'Prescription not found' });
      }
      const pData = prescriptionSnap.data() as any;

      if (pData.patientId !== decodedToken.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      if (!pData.refillEligible || pData.status === 'cancelled') {
        return res.status(400).json({ error: 'Prescription is not eligible for subscription' });
      }

      const existingSub = await db.collection('subscriptions')
        .where('sourcePrescriptionId', '==', prescriptionId)
        .where('status', 'in', ['active', 'past_due', 'paused'])
        .get();
        
      if (!existingSub.empty) {
        return res.status(400).json({ error: 'Subscription already exists' });
      }

      const paymentProvider = new StripePaymentProvider();
      const session = await paymentProvider.createSubscriptionSession(decodedToken.uid, decodedToken.email || '', prescriptionId, pData);
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error(error);
      if (error.message === 'Payment provider not configured') {
        res.status(503).json({ error: 'Payment provider not configured' });
      } else {
        res.status(500).json({ error: 'Internal Error' });
      }
    }
  });

  app.post('/api/subscriptions/:id/cancel', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { id } = req.params;
      
      const subSnap = await db.collection('subscriptions').doc(id).get();
      if (!subSnap.exists) return res.status(404).json({ error: 'Not found' });
      
      const subData = subSnap.data() as any;
      if (subData.patientId !== decodedToken.uid && decodedToken.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!config.stripe.isConfigured || !config.stripe.secretKey) {
        return res.status(503).json({ error: 'Stripe not configured' });
      }
      const Stripe = require('stripe').default || require('stripe');
      const stripe = new Stripe(config.stripe.secretKey);
      
      await stripe.subscriptions.cancel(subData.providerSubscriptionId);
      // We do NOT update firestore here. The webhook will handle it.
      
      res.json({ success: true, message: 'Cancellation requested' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.get('/api/refill-requests', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      let snap;
      if (decodedToken.role === 'doctor') {
        snap = await db.collection('refill_requests')
          .orderBy('createdAt', 'desc')
          .get();
          // Filter in code or with compound queries. For milestone, return all or doctor's patients.
      } else {
        snap = await db.collection('refill_requests')
          .where('patientId', '==', decodedToken.uid)
          .orderBy('createdAt', 'desc')
          .get();
      }
      res.json(snap.docs.map(d => d.data()));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.post('/api/refill-requests/:id/review', requireDoctorAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { id } = req.params;
      const { action, decisionReason } = req.body; // action: 'approve' | 'deny'

      const reqRef = db.collection('refill_requests').doc(id);
      const reqSnap = await reqRef.get();
      if (!reqSnap.exists) return res.status(404).json({ error: 'Not found' });
      const reqData = reqSnap.data() as any;
      
      if (reqData.status !== 'pending_review') {
        return res.status(400).json({ error: 'Request is not pending review' });
      }

      const pRef = db.collection('prescriptions').doc(reqData.sourcePrescriptionId);
      const pSnap = await pRef.get();
      const pData = pSnap.data() as any;

      const timestamp = new Date().toISOString();
      let resultingOrderId = null;

      if (action === 'approve') {
        // Create new order
        const newOrderId = `ord_${Date.now()}`;
        const { totalAmount, subtotal, taxAmount, shippingAmount, lineItems } = calculateOrderTotals(pData.medications);
        
        // Fetch patient shipping info
        const userSnap = await db.collection('users').doc(reqData.patientId).get();
        const userData = userSnap.data();

        const isPrepaid = !!reqData.billingPaymentId || !!reqData.subscriptionInvoicePaid;
        const initialPaymentStatus = isPrepaid ? 'paid' : 'unpaid';
        const initialStatus = isPrepaid ? 'processing' : 'pending_payment';
        const initialFulfillmentStatus = isPrepaid ? 'processing' : 'unpaid';

        const orderData = {
          patientId: reqData.patientId,
          prescriptionId: reqData.sourcePrescriptionId, // Or a new prescription version
          status: initialStatus,
          paymentStatus: initialPaymentStatus,
          fulfillmentStatus: initialFulfillmentStatus,
          shippingAddress: userData?.address || {},
          lineItems,
          subtotal,
          taxAmount,
          shippingAmount,
          totalAmount,
          createdAt: timestamp,
          updatedAt: timestamp,
          refillRequestId: id
        };

        await db.collection('orders').doc(newOrderId).set(orderData);
        resultingOrderId = newOrderId;

        await db.collection('audit_logs').add({
          action: 'REFILL_ORDER_CREATED',
          actorUid: decodedToken.uid,
          orderId: newOrderId,
          refillRequestId: id,
          paymentStatus: initialPaymentStatus,
          status: initialStatus,
          timestamp
        });
      }

      const newStatus = action === 'approve' ? 'approved' : 'denied';

      await reqRef.update({
        status: newStatus,
        reviewedAt: timestamp,
        reviewedBy: decodedToken.uid,
        decisionReason: decisionReason || null,
        resultingOrderId
      });

      await db.collection('audit_logs').add({
        action: action === 'approve' ? 'REFILL_APPROVED' : 'REFILL_DENIED',
        actorUid: decodedToken.uid,
        refillRequestId: id,
        timestamp
      });

      // Notification
      const { NotificationService } = await import('./src/server/notifications');
      const notif = new NotificationService();
      await notif.createNotification({
        patientId: reqData.patientId,
        type: 'CONSULTATION_SUBMITTED', // Reusing generic type for now, or create new type
        title: `Refill Request ${action === 'approve' ? 'Approved' : 'Denied'}`,
        shortMessage: `Your refill request for ${pData.treatmentCategory || 'medication'} has been ${newStatus}.`,
        relatedEntityId: id,
        relatedEntityType: 'document',
        idempotencyKey: `refill_dec_${id}`
      });

      res.json({ success: true, status: newStatus, resultingOrderId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

// -------------- MESSAGING -------------- //

  app.post('/api/messages/threads/:threadId/send', requireAuth, async (req, res) => {
    try {
      const { threadId } = req.params;
      const { text } = req.body;
      const decodedToken = (req as any).user;
      const role = decodedToken.role === 'doctor' ? 'doctor' : 'patient';
      
      const { MessagingService } = await import('./src/server/messaging');
      const messaging = new MessagingService();
      
      const result = await messaging.sendMessage(threadId, decodedToken.uid, role, text);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Error sending message:', err);
      res.status(err.message === 'Forbidden' ? 403 : 400).json({ error: err.message || 'Internal Error' });
    }
  });

  app.post('/api/messages/threads/:threadId/read', requireAuth, async (req, res) => {
    try {
      const { threadId } = req.params;
      const decodedToken = (req as any).user;
      const role = decodedToken.role === 'doctor' ? 'doctor' : 'patient';
      
      const { MessagingService } = await import('./src/server/messaging');
      const messaging = new MessagingService();
      
      await messaging.markAsRead(threadId, decodedToken.uid, role);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error marking read:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Safe Messaging Participant Lookup
  app.get('/api/messaging/participant/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;

      let isAuthorized = decodedToken.uid === id || ['doctor', 'pharmacist', 'admin'].includes(decodedToken.role);
      if (!isAuthorized) {
        const threadSnap = await db.collection('message_threads')
          .where('patientId', '==', decodedToken.uid)
          .where('doctorId', '==', id)
          .limit(1)
          .get();
        if (!threadSnap.empty) {
          isAuthorized = true;
        } else {
          const threadSnap2 = await db.collection('message_threads')
            .where('doctorId', '==', decodedToken.uid)
            .where('patientId', '==', id)
            .limit(1)
            .get();
          if (!threadSnap2.empty) isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // 1. Try staff_profiles doc id
      const staffDoc = await db.collection('staff_profiles').doc(id).get();
      if (staffDoc.exists) {
        const d = staffDoc.data() || {};
        const displayName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.displayName || 'Doctor';
        return res.json({
          id,
          displayName,
          role: d.role || 'doctor',
          avatarUrl: d.avatarUrl || null
        });
      }

      // 2. Try staff_profiles by uid
      const staffByUid = await db.collection('staff_profiles').where('uid', '==', id).limit(1).get();
      if (!staffByUid.empty) {
        const d = staffByUid.docs[0].data() || {};
        const displayName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.displayName || 'Doctor';
        return res.json({
          id,
          displayName,
          role: d.role || 'doctor',
          avatarUrl: d.avatarUrl || null
        });
      }

      // 3. Try users collection
      const userDoc = await db.collection('users').doc(id).get();
      if (userDoc.exists) {
        const d = userDoc.data() || {};
        const displayName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.displayName || 'Patient';
        return res.json({
          id,
          displayName,
          role: d.role || 'patient',
          avatarUrl: d.avatarUrl || null
        });
      }

      return res.status(404).json({ error: 'Participant not found' });
    } catch (err: any) {
      console.error('Error in participant lookup:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // --------------------------------------------------------
  // PHARMACIST API ENDPOINTS
  // --------------------------------------------------------

  // Pharmacist: List Orders
  app.get('/api/pharmacist/orders', requirePharmacistAuth, async (req, res) => {
    try {
      const snap = await db.collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json({ orders });
    } catch (err) {
      console.error('Error fetching pharmacist orders:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Pharmacist: Get Order Details
  app.get('/api/pharmacist/orders/:id', requirePharmacistAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const orderSnap = await db.collection('orders').doc(id).get();
      if (!orderSnap.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ order: { id: orderSnap.id, ...orderSnap.data() } });
    } catch (err) {
      console.error('Error fetching pharmacist order:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Pharmacist: Update Order Fulfillment Status (Safe payment check)
  app.post('/api/pharmacist/orders/:id/status', requirePharmacistAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const decodedToken = (req as any).user;

      const orderRef = db.collection('orders').doc(id);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orderSnap.data() as any;

      if (order.paymentStatus !== 'paid') {
        return res.status(400).json({ error: 'Cannot fulfill unpaid order. Payment must be confirmed first.' });
      }

      const timestamp = new Date().toISOString();
      await orderRef.update({
        fulfillmentStatus: status,
        updatedAt: timestamp
      });

      await db.collection('audit_logs').add({
        action: 'ORDER_FULFILLMENT_STATUS_UPDATED',
        actorUid: decodedToken.uid,
        orderId: id,
        status,
        timestamp
      });

      res.json({ success: true, fulfillmentStatus: status });
    } catch (err) {
      console.error('Error updating order fulfillment status:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Pharmacist: Ship Order (Safe payment check)
  app.post('/api/pharmacist/orders/:id/ship', requirePharmacistAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;

      const orderRef = db.collection('orders').doc(id);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = orderSnap.data() as any;

      if (order.paymentStatus !== 'paid') {
        return res.status(400).json({ error: 'Cannot ship unpaid order. Payment must be confirmed first.' });
      }

      const timestamp = new Date().toISOString();
      const trackingNumber = `940011189956${Math.floor(10000000 + Math.random() * 90000000)}`;
      const shipment = {
        trackingNumber,
        carrier: 'USPS Priority Mail',
        shippedAt: timestamp
      };

      await orderRef.update({
        status: 'shipped',
        fulfillmentStatus: 'shipped',
        shipment,
        updatedAt: timestamp
      });

      await db.collection('audit_logs').add({
        action: 'ORDER_SHIPPED',
        actorUid: decodedToken.uid,
        orderId: id,
        trackingNumber,
        timestamp
      });

      try {
        const { TimelineService } = await import('./src/server/timeline');
        const { NotificationService } = await import('./src/server/notifications');
        const timeline = new TimelineService();
        const notifService = new NotificationService();

        await timeline.createEvent({
          orderId: id,
          eventType: 'ORDER_SHIPPED',
          timestamp,
          actorType: 'pharmacist',
          actorId: decodedToken.uid,
          metadata: { trackingNumber }
        });

        await notifService.createNotification({
          patientId: order.patientId,
          type: 'ORDER_SHIPPED',
          title: 'Your Order Has Shipped',
          shortMessage: `Your order #${id} has shipped via ${shipment.carrier}. Tracking: ${trackingNumber}`,
          relatedEntityId: id,
          relatedEntityType: 'order',
          idempotencyKey: `order_shipped_${id}`
        });
      } catch (err) {
        console.error('Error creating shipment timeline/notification:', err);
      }

      res.json({ success: true, shipment });
    } catch (err) {
      console.error('Error shipping order:', err);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Suga.health full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
