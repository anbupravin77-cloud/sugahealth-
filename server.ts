import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { defaultContent } from './src/data/defaultContent';
import { SugaWebsiteContent } from './src/types/content';
import { adminDb as db, adminAuth } from './src/server/firebaseAdmin';
import { generateConsultationDocument, generatePrescriptionDocument, getDocumentStream } from './src/server/documentService';
import { calculateOrderTotals, StripePaymentProvider } from './src/server/commerce';
import { authRouter } from './src/server/auth/routes';
import clinicalRouter from './src/server/routes/clinicalRoutes';
import { supabaseAdmin } from './src/server/supabaseAdmin';

interface StorageSchema {
  published: SugaWebsiteContent;
  draft: SugaWebsiteContent;
  lastPublishedAt: string;
  lastDraftSavedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'cms_content.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure storage directories exist safely (non-blocking for read-only serverless filesystems)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  // Read-only filesystem in Vercel / serverless runtime
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
    console.warn('Failed to parse persistent storage, falling back to defaults:', err);
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
    // In serverless / read-only filesystem environments, preserve data in-memory without crashing
    storage = data;
  }
}

// Initialize storage in memory safely
try {
  storage = loadStorage();
} catch (err) {
  storage = {
    published: defaultContent,
    draft: defaultContent,
    lastPublishedAt: new Date().toISOString(),
    lastDraftSavedAt: new Date().toISOString(),
  };
}

// Normalized, server-controlled authentication & role authorization middleware
import {
  requireAuth,
  requireClinicalAuth,
  requireAdminAuth,
  requireDoctorAuth,
  requirePharmacistAuth,
  requireStaffAuth,
} from './src/server/auth';


import { config, validateProductionConfig } from './src/server/config';

validateProductionConfig();

if (process.env.NODE_ENV !== 'production' && !process.env.AUTH_TEST_ENABLED) {
  process.env.AUTH_TEST_ENABLED = 'true';
}

export const app = express();
const PORT = 3000;

  app.use(express.json({ 
    limit: '15mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  // Serve static uploads
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health check (supports both /api/health and /health)
  app.get(['/api/health', '/health'], (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Supabase Auth & Test accounts layer
  app.use('/api/auth', authRouter);
  // CANONICAL API ROUTER MOUNT: /api/clinical (Patient + Doctor Clinical Workflows)
  app.use('/api/clinical', clinicalRouter);
  // LEGACY ALIAS MOUNT: /api (Preserved strictly for legacy backward compatibility)
  app.use('/api', clinicalRouter);

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
      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'CONTENT_RESET_TO_DEFAULTS',
        actorUid: decodedToken?.uid || 'admin'
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
      
      // Restrict role to 'doctor' | 'pharmacist' (forbid 'admin' provisioning here)
      if (!email || !role || !['doctor', 'pharmacist'].includes(role)) {
        res.status(400).json({ error: 'Valid email and clinical staff role (doctor or pharmacist) are required' });
        return;
      }

      if (!firstName || !lastName || typeof firstName !== 'string' || typeof lastName !== 'string') {
        res.status(400).json({ error: 'First name and last name are required for clinical staff provisioning' });
        return;
      }

      const decodedToken = (req as any).user;
      const adminUid = decodedToken?.uid || 'admin';
      const timestamp = new Date().toISOString();
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim() || email;
      const formattedSpecialties = role === 'doctor' ? (Array.isArray(specialties) ? specialties : []) : null;

      let targetUid = '';
      let setupLink = '';
      let isNewlyCreated = false;

      // 1. Provision user via canonical Supabase Auth Admin API
      try {
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            displayName,
            role,
          },
          app_metadata: {
            role,
          },
        });

        if (createError) {
          // If user already exists in Supabase Auth, find and update metadata
          if (createError.message?.toLowerCase().includes('already') || createError.message?.toLowerCase().includes('exists')) {
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (existingUser) {
              targetUid = existingUser.id;
              await supabaseAdmin.auth.admin.updateUserById(targetUid, {
                app_metadata: { role },
                user_metadata: { role, first_name: firstName.trim(), last_name: lastName.trim(), displayName },
              });
            } else {
              throw createError;
            }
          } else {
            throw createError;
          }
        } else if (createData?.user) {
          targetUid = createData.user.id;
          isNewlyCreated = true;
        }

        // Generate password reset / magic link for initial access
        if (targetUid) {
          try {
            const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email,
            });
            if (linkData?.properties?.action_link) {
              setupLink = linkData.properties.action_link;
            }
          } catch {}
        }
      } catch (authErr: any) {
        console.warn('Supabase Auth user creation error:', authErr.message);
        res.status(400).json({ error: authErr.message || 'Failed to provision staff auth account' });
        return;
      }

      if (!targetUid) {
        res.status(500).json({ error: 'Failed to establish staff account identifier' });
        return;
      }

      if (!setupLink) {
        setupLink = `${req.protocol}://${req.get('host') || 'suga.health'}/doctor/login`;
      }

      // 2. Persist in canonical Supabase public.profiles table
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: targetUid,
        email,
        role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: displayName,
        created_at: timestamp,
        updated_at: timestamp,
      });

      if (profileError) {
        console.error('Supabase staff profile upsert error:', profileError.message);
        if (isNewlyCreated) {
          await supabaseAdmin.auth.admin.deleteUser(targetUid).catch(() => {});
        }
        res.status(500).json({ error: 'Failed to persist staff profile in database', details: profileError.message });
        return;
      }

      // 3. Persist in canonical Supabase public.staff_profiles table
      const { error: staffError } = await supabaseAdmin.from('staff_profiles').upsert({
        id: targetUid,
        email,
        role,
        active: true,
        onboarding_status: 'completed',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        specialties: formattedSpecialties,
        created_at: timestamp,
        updated_at: timestamp,
      });

      if (staffError) {
        console.error('Supabase staff_profiles upsert error:', staffError.message);
        if (isNewlyCreated) {
          await supabaseAdmin.auth.admin.deleteUser(targetUid).catch(() => {});
        }
        res.status(500).json({ error: 'Failed to persist clinical staff profile in database', details: staffError.message });
        return;
      }

      const staffProfile = {
        uid: targetUid,
        id: targetUid,
        email,
        role,
        active: true,
        onboardingStatus: 'completed',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName,
        specialties: formattedSpecialties || [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // 4. Audit Log Event
      try {
        await supabaseAdmin.from('audit_logs').insert({
          action: 'STAFF_PROVISIONED',
          actor_uid: adminUid,
          metadata: { targetUid, role, email, specialties: formattedSpecialties },
          created_at: timestamp,
        });
      } catch {}

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
      const staffMap = new Map<string, any>();

      // 1. Fetch from canonical Supabase staff_profiles table
      const { data: sbStaff, error: sbStaffError } = await supabaseAdmin
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (sbStaffError) {
        console.error('Supabase staff_profiles query error:', sbStaffError);
        return res.status(500).json({ error: `Failed to fetch staff directory: ${sbStaffError.message}` });
      }

      if (sbStaff) {
        sbStaff.forEach((s: any) => {
          staffMap.set(s.id, {
            uid: s.id,
            id: s.id,
            email: s.email,
            role: s.role,
            active: s.active !== false,
            onboardingStatus: s.onboarding_status || 'completed',
            firstName: s.first_name,
            lastName: s.last_name,
            displayName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email,
            specialties: Array.isArray(s.specialties) ? s.specialties : [],
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          });
        });
      }

      // 2. Fetch profiles with staff roles to ensure complete directory
      const { data: sbProfiles, error: sbError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('role', ['doctor', 'pharmacist', 'admin']);

      if (sbError) {
        console.warn('Supabase staff profiles lookup warning:', sbError);
      } else if (sbProfiles) {
        sbProfiles.forEach(p => {
          if (!staffMap.has(p.id)) {
            staffMap.set(p.id, {
              uid: p.id,
              id: p.id,
              email: p.email,
              role: p.role,
              active: true,
              onboardingStatus: 'completed',
              firstName: p.first_name,
              lastName: p.last_name,
              displayName: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
              specialties: [],
              createdAt: p.created_at,
              updatedAt: p.updated_at,
            });
          }
        });
      }

      const staffList = Array.from(staffMap.values());
      res.json({ success: true, staff: staffList });
    } catch (err: any) {
      console.error('Error fetching staff:', err);
      res.status(500).json({ error: 'Internal server error while fetching staff directory', message: err.message });
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

      const decodedToken = (req as any).user;
      const adminUid = decodedToken?.uid || 'admin';
      const timestamp = new Date().toISOString();

      // 1. Update canonical Supabase public.staff_profiles record
      const { error: sbUpdateErr } = await supabaseAdmin
        .from('staff_profiles')
        .update({ active, updated_at: timestamp })
        .eq('id', uid);

      if (sbUpdateErr) {
        console.error('Supabase staff_profiles status update error:', sbUpdateErr.message);
        return res.status(500).json({ error: 'Failed to update staff status in database', details: sbUpdateErr.message });
      }

      // 2. Audit log
      try {
        await supabaseAdmin.from('audit_logs').insert({
          action: active ? 'STAFF_ACCOUNT_ACTIVATED' : 'STAFF_ACCOUNT_DEACTIVATED',
          actor_uid: adminUid,
          metadata: { targetUid: uid, active },
          created_at: timestamp,
        });
      } catch {}

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

      const { profileRepository } = await import('./src/server/repositories/profileRepository');
      await profileRepository.updateStaffOnboarding(uid, {
        first_name: firstName,
        last_name: lastName,
        initials,
        phone_number: phoneNumber,
        professional_address: professionalAddress,
        onboarding_status: 'completed'
      });
      
      await profileRepository.updateProfile(uid, {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        display_name: `${firstName} ${lastName}`.trim()
      });

      // Audit log
      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        actorUid: uid,
        action: 'ONBOARDING_COMPLETED',
        metadata: { targetUid: uid }
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
      
      const { clinicalWorkflowService } = await import('./src/server/services/clinicalWorkflowService');
      const result = await clinicalWorkflowService.submitConsultation(id, decodedToken.uid);
      res.json(result);
    } catch (err: any) {
      console.error('Error submitting consultation:', err);
      const status = err.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ error: err.message || 'Internal Error' });
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
      
      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consult = await consultationRepository.getById(id);
      if (!consult) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const prevDoctor = consult.assigned_to || null;
      const timestamp = new Date().toISOString();
      
      const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
      await supabaseAdmin
        .from('consultations')
        .update({
          assigned_to: assignedTo,
          status: 'assigned',
          updated_at: timestamp
        })
        .eq('id', id);
      
      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'CONSULTATION_REASSIGNED',
        actorUid: decodedToken.uid,
        consultationId: id,
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
      
      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      if (!consultData) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      
      const isAssigned = consultData.assigned_to === decodedToken.uid;
      const isUnassigned = !consultData.assigned_to;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      const timestamp = new Date().toISOString();
      const updates: Record<string, any> = {};

      if (isUnassigned && decodedToken.role === 'doctor') {
        updates.assigned_to = decodedToken.uid;
      }

      if ((consultData.status === 'assigned' || consultData.status === 'submitted') && decodedToken.role === 'doctor') {
        updates.status = 'under_review';
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = timestamp;
        const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
        await supabaseAdmin
          .from('consultations')
          .update(updates)
          .eq('id', id);
      }
      
      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'CONSULTATION_REVIEWED',
        actorUid: decodedToken.uid,
        consultationId: id
      });
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error logging review:', err);
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
      
      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const isAssigned = consultData.assigned_to === decodedToken.uid;
      const isUnassigned = !consultData.assigned_to;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const { clinicalNoteRepository } = await import('./src/server/repositories/clinicalNoteRepository');
      const dbNotes = await clinicalNoteRepository.getByConsultationId(id, decodedToken.uid, decodedToken.role);
      
      const notes = dbNotes.map(n => ({
        id: n.id,
        consultationId: n.consultation_id,
        doctorId: n.doctor_id,
        text: n.content || '',
        createdAt: n.created_at,
        updatedAt: n.updated_at
      }));

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
      
      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const isAssigned = consultData.assigned_to === decodedToken.uid;
      const isUnassigned = !consultData.assigned_to;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const timestamp = new Date().toISOString();

      if (isUnassigned && decodedToken.role === 'doctor') {
        const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
        await supabaseAdmin
          .from('consultations')
          .update({
            assigned_to: decodedToken.uid,
            updated_at: timestamp
          })
          .eq('id', id);
      }

      let finalNoteId = noteId;
      const { clinicalNoteRepository } = await import('./src/server/repositories/clinicalNoteRepository');

      if (noteId) {
        await clinicalNoteRepository.updateNote(noteId, decodedToken.uid, {
          content: text
        });
      } else {
        const note = await clinicalNoteRepository.saveNote({
          consultationId: id,
          doctorId: decodedToken.uid,
          content: text
        });
        finalNoteId = note.id;
      }

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: noteId ? 'CLINICAL_NOTE_UPDATED' : 'CLINICAL_NOTE_CREATED',
        actorUid: decodedToken.uid,
        consultationId: id,
        metadata: { noteId: finalNoteId }
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

      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }

      const isAssigned = consultData.assigned_to === decodedToken.uid;
      const isUnassigned = !consultData.assigned_to;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const { prescriptionRepository } = await import('./src/server/repositories/prescriptionRepository');
      const rxs = await prescriptionRepository.getByConsultationId(id);
      
      if (rxs.length === 0) {
        res.json({ prescription: null });
        return;
      }
      
      const p = rxs[0];

      const prescription = {
        id: p.id,
        consultationId: p.consultation_id,
        patientId: p.patient_id,
        doctorId: p.doctor_id,
        status: p.status,
        directions: p.directions,
        refillEligible: p.refill_count > 0,
        refillCount: p.refill_count,
        refillIntervalDays: p.refill_interval_days,
        treatmentCategory: consultData.primary_concern || '',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        medications: p.items.map(item => ({
          medicationName: item.medication_name,
          activeIngredient: item.active_ingredient,
          strength: item.strength,
          dosageForm: item.dosage_form,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          sig: item.sig
        }))
      };

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
      
      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      
      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const isAssigned = consultData.assigned_to === decodedToken.uid;
      const isUnassigned = !consultData.assigned_to;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const timestamp = new Date().toISOString();

      if (isUnassigned && decodedToken.role === 'doctor') {
        const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
        await supabaseAdmin
          .from('consultations')
          .update({
            assigned_to: decodedToken.uid,
            updated_at: timestamp
          })
          .eq('id', id);
      }

      let finalPrescriptionId = prescriptionId;
      const { prescriptionRepository } = await import('./src/server/repositories/prescriptionRepository');

      if (prescriptionId) {
        // Ensure not finalized
        const existing = await prescriptionRepository.getById(prescriptionId);
        if (!existing) {
          res.status(404).json({ error: 'Prescription not found' });
          return;
        }
        if (existing.status !== 'draft') {
          res.status(400).json({ error: 'Cannot edit finalized prescription' });
          return;
        }

        const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
        await supabaseAdmin
          .from('prescriptions')
          .update({
            directions: medications?.[0]?.sig || '',
            refill_count: refillEligible ? (req.body.refillCount || 5) : 0,
            refill_interval_days: refillIntervalDays || 30,
            treatment_category: treatmentCategory || '',
            updated_at: timestamp
          })
          .eq('id', prescriptionId);

        // Delete existing items and insert new ones
        await supabaseAdmin
          .from('prescription_items')
          .delete()
          .eq('prescription_id', prescriptionId);

        if (medications && medications.length > 0) {
          const itemsToInsert = medications.map((m: any) => ({
            prescription_id: prescriptionId,
            medication_name: m.medicationName || m.medication_name,
            active_ingredient: m.activeIngredient || m.active_ingredient || null,
            strength: m.strength || '',
            dosage_form: m.dosageForm || m.dosage_form || 'tablet',
            quantity: m.quantity || 1,
            unit_price: m.unitPrice || m.unit_price || 0.0,
            sig: m.sig || null,
            created_at: timestamp,
          }));
          await supabaseAdmin
            .from('prescription_items')
            .insert(itemsToInsert);
        }
      } else {
        const refillCountVal = refillEligible ? (req.body.refillCount || 5) : 0;
        const items = (medications || []).map((m: any) => ({
          medication_name: m.medicationName || m.medication_name,
          active_ingredient: m.activeIngredient || m.active_ingredient || null,
          strength: m.strength || '',
          dosage_form: m.dosageForm || m.dosage_form || 'tablet',
          quantity: m.quantity || 1,
          unit_price: m.unitPrice || m.unit_price || 0.0,
          sig: m.sig || null,
        }));

        const rx = await prescriptionRepository.saveDraft({
          consultationId: id,
          doctorId: decodedToken.uid,
          patientId: consultData.patient_id,
          directions: items?.[0]?.sig || '',
          refillCount: refillCountVal,
          refillIntervalDays: refillIntervalDays || 30,
          items,
        });
        finalPrescriptionId = rx.id;
        
        // Also write treatment category
        const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
        await supabaseAdmin
          .from('prescriptions')
          .update({ treatment_category: treatmentCategory || '' })
          .eq('id', rx.id);
      }

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: prescriptionId ? 'PRESCRIPTION_UPDATED' : 'PRESCRIPTION_CREATED',
        actorUid: decodedToken.uid,
        consultationId: id,
        metadata: { prescriptionId: finalPrescriptionId }
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

      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }

      const isAssigned = consultData.assigned_to === decodedToken.uid;
      const isUnassigned = !consultData.assigned_to;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      if (isUnassigned && decodedToken.role === 'doctor') {
        const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
        await supabaseAdmin
          .from('consultations')
          .update({
            assigned_to: decodedToken.uid,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      }

      const { prescriptionRepository } = await import('./src/server/repositories/prescriptionRepository');
      const rx = await prescriptionRepository.getById(prescriptionId);
      if (!rx) {
        res.status(404).json({ error: 'Prescription not found' });
        return;
      }
      
      if (rx.status !== 'draft') {
        res.status(400).json({ error: 'Prescription is already finalized or cancelled' });
        return;
      }

      await prescriptionRepository.finalize(prescriptionId, decodedToken.uid);

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'PRESCRIPTION_FINALIZED',
        actorUid: decodedToken.uid,
        consultationId: id,
        metadata: { prescriptionId }
      });
      
      // Auto-generate the prescription document
      try {
        await generatePrescriptionDocument(null, prescriptionId, decodedToken.uid);
      } catch (docErr) {
        console.error('Error auto-generating prescription document:', docErr);
      }

      // Timeline & Notification
      try {
        const { NotificationService } = await import('./src/server/notifications');
        const notifService = new NotificationService();
        await notifService.createNotification({
          patientId: consultData.patient_id,
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

      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      const isAssigned = consultData.assigned_to === decodedToken.uid;
      const isUnassigned = !consultData.assigned_to;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
      const timestamp = new Date().toISOString();
      await supabaseAdmin
        .from('prescriptions')
        .update({
          status: 'cancelled',
          updated_at: timestamp
        })
        .eq('id', prescriptionId);

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'PRESCRIPTION_CANCELLED',
        actorUid: decodedToken.uid,
        consultationId: id,
        metadata: { prescriptionId }
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

      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);

      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }

      if (consultData.assigned_to !== decodedToken.uid && decodedToken.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: You are not assigned to this consultation' });
        return;
      }

      const timestamp = new Date().toISOString();
      const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
      await supabaseAdmin
        .from('consultations')
        .update({
          status: 'completed',
          completed_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', id);

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'CONSULTATION_COMPLETED',
        actorUid: decodedToken.uid,
        consultationId: id
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

        if (consultData.patient_id) {
          await notifService.createNotification({
            patientId: consultData.patient_id,
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
      
      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const isAssigned = consultData.assigned_to === decodedToken.uid;
      const isUnassigned = !consultData.assigned_to;
      const isAdmin = decodedToken.role === 'admin';

      if (!isAssigned && !isUnassigned && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { generateConsultationDocument } = await import('./src/server/documentService');
      const documentId = await generateConsultationDocument(null, id, decodedToken.uid);
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

      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const rxConsultData = await consultationRepository.getById(id);
      if (!rxConsultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }
      
      const isRxAssigned = rxConsultData.assigned_to === decodedToken.uid;
      const isRxUnassigned = !rxConsultData.assigned_to;
      const isRxAdmin = decodedToken.role === 'admin';

      if (!isRxAssigned && !isRxUnassigned && !isRxAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { generatePrescriptionDocument } = await import('./src/server/documentService');
      const documentId = await generatePrescriptionDocument(null, prescriptionId, decodedToken.uid);
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
      
      const { consultationRepository } = await import('./src/server/repositories/consultationRepository');
      const consultData = await consultationRepository.getById(id);
      if (!consultData) {
        res.status(404).json({ error: 'Consultation not found' });
        return;
      }

      const isPatient = decodedToken.uid === consultData.patient_id;
      const isAssignedDoctor = decodedToken.uid === consultData.assigned_to;
      const isDoctorRole = decodedToken.role === 'doctor';
      const isAdmin = decodedToken.role === 'admin';

      if (!isPatient && !isAssignedDoctor && !isDoctorRole && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { documentRepository } = await import('./src/server/repositories/documentRepository');
      const { prescriptionRepository } = await import('./src/server/repositories/prescriptionRepository');

      const consultDocs = await documentRepository.listByConsultation(id);
      const activeConsultDocs = consultDocs.filter(d => d.status === 'active');

      const prescriptions = await prescriptionRepository.getByConsultationId(id);
      let rxDocs: any[] = [];
      for (const rx of prescriptions) {
        const rxDocsForId = await documentRepository.listByPrescription(rx.id);
        rxDocs = rxDocs.concat(rxDocsForId.filter(d => d.status === 'active'));
      }

      const documents = [...activeConsultDocs, ...rxDocs].map(doc => ({
        id: doc.legacy_document_id || doc.id,
        legacyDocumentId: doc.legacy_document_id,
        documentType: doc.document_type,
        sourceEntityId: doc.source_entity_id,
        patientId: doc.patient_id,
        doctorId: doc.doctor_id,
        storagePath: doc.storage_path,
        fileSize: doc.file_size,
        version: doc.version,
        status: doc.status,
        createdAt: doc.created_at,
        generatedBy: doc.generated_by
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
      
      const { documentRepository } = await import('./src/server/repositories/documentRepository');
      let docRecord = await documentRepository.getById(id) || await documentRepository.getByLegacyId(id);
      if (!docRecord) {
        const { prescriptionRepository } = await import('./src/server/repositories/prescriptionRepository');
        const rx = await prescriptionRepository.getById(id);
        if (rx) {
          const docs = await documentRepository.listByPrescription(id);
          docRecord = docs[0] || null;
        } else {
          const docs = await documentRepository.listByConsultation(id);
          docRecord = docs[0] || null;
        }
      }

      if (!docRecord) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      const isPatient = decodedToken.uid === docRecord.patient_id;
      const isAssignedDoctor = decodedToken.uid === docRecord.doctor_id;
      const isAdmin = decodedToken.role === 'admin';
      const isPharmacist = decodedToken.role === 'pharmacist';

      if (!isPatient && !isAssignedDoctor && !isAdmin && !isPharmacist) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { getDocumentStream } = await import('./src/server/documentService');
      const { buffer, metadata } = await getDocumentStream(null, docRecord.legacy_document_id || docRecord.id);

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'DOCUMENT_ACCESSED',
        actorUid: decodedToken.uid,
        metadata: { documentId: docRecord.id }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${metadata.documentType}_${docRecord.id}.pdf"`);
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
      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const dbOrders = await orderRepository.listByPatient(decodedToken.uid);

      const orders = dbOrders.map(order => ({
        id: order.id,
        legacyOrderId: order.legacy_order_id,
        patientId: order.patient_id,
        prescriptionId: order.prescription_id,
        subtotal: order.subtotal,
        shippingAmount: order.shipping_amount,
        taxAmount: order.tax_amount,
        totalAmount: order.total_amount,
        status: order.fulfillment_status === 'unfulfilled' && order.payment_status === 'pending' ? 'pending_payment' : order.fulfillment_status,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        shippingAddress: order.shipping_address,
        carrier: order.carrier,
        trackingNumber: order.tracking_number,
        paidAt: order.paid_at,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        medications: (order.items || []).map(item => ({
          medicationName: item.medication_name,
          activeIngredient: item.active_ingredient,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      }));

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
 
      const { prescriptionRepository } = await import('./src/server/repositories/prescriptionRepository');
      const prescription = await prescriptionRepository.getById(prescriptionId);
      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
      }
 
      if (prescription.patient_id !== decodedToken.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
 
      if (prescription.status !== 'finalized') {
        return res.status(400).json({ error: 'Cannot create order from an unfinalized prescription' });
      }
 
      // Check if an order already exists for this prescription
      const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('prescription_id', prescriptionId)
        .maybeSingle();
 
      if (existingOrder) {
        const { orderRepository } = await import('./src/server/repositories/orderRepository');
        const fullOrder = await orderRepository.getById(existingOrder.id);
        if (fullOrder) {
          const mapped = {
            id: fullOrder.id,
            legacyOrderId: fullOrder.legacy_order_id,
            patientId: fullOrder.patient_id,
            prescriptionId: fullOrder.prescription_id,
            subtotal: fullOrder.subtotal,
            shippingAmount: fullOrder.shipping_amount,
            taxAmount: fullOrder.tax_amount,
            totalAmount: fullOrder.total_amount,
            paymentStatus: fullOrder.payment_status,
            fulfillmentStatus: fullOrder.fulfillment_status,
            shippingAddress: fullOrder.shipping_address,
            createdAt: fullOrder.created_at,
            updatedAt: fullOrder.updated_at,
            medications: (fullOrder.items || []).map(item => ({
              medicationName: item.medication_name,
              activeIngredient: item.active_ingredient,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              totalPrice: item.total_price
            }))
          };
          return res.json({ success: true, orderId: fullOrder.id, order: mapped });
        }
      }
 
      // Fetch patient's shipping address
      const { profileRepository } = await import('./src/server/repositories/profileRepository');
      const profile = await profileRepository.getProfileById(decodedToken.uid);
      const shippingAddress = profile?.shipping_address || {};
      
      // Calculate totals
      const mappedMedications = (prescription.items || []).map(item => ({
        medicationName: item.medication_name,
        activeIngredient: item.active_ingredient || '',
        strength: item.strength || '',
        dosageForm: item.dosage_form || 'tablet',
        quantity: item.quantity,
        unitPrice: Number(item.unit_price)
      }));

      const totals = calculateOrderTotals(mappedMedications);
      const timestamp = new Date().toISOString();
      const newOrderId = `ord_${Math.random().toString(36).substring(2, 11)}`;
 
      const newDbOrder = {
        id: newOrderId,
        patient_id: decodedToken.uid,
        prescription_id: prescriptionId,
        subtotal: totals.subtotal,
        shipping_amount: totals.shippingAmount,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        payment_status: 'pending' as const,
        fulfillment_status: 'unfulfilled' as const,
        shipping_address: shippingAddress,
      };

      const itemsToInsert = (prescription.items || []).map(item => ({
        medication_name: item.medication_name,
        active_ingredient: item.active_ingredient,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total_price: item.quantity * Number(item.unit_price)
      }));
 
      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const created = await orderRepository.createOrder(newDbOrder, itemsToInsert);
 
      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'ORDER_CREATED',
        actorUid: decodedToken.uid,
        consultationId: prescription.consultation_id || undefined,
        metadata: { orderId: created.id, prescriptionId }
      });
 
      const mappedOrder = {
        id: created.id,
        patientId: created.patient_id,
        prescriptionId: created.prescription_id,
        subtotal: created.subtotal,
        shippingAmount: created.shipping_amount,
        taxAmount: created.tax_amount,
        totalAmount: created.total_amount,
        paymentStatus: created.payment_status,
        fulfillmentStatus: created.fulfillment_status,
        shippingAddress: created.shipping_address,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
        medications: (created.items || []).map(item => ({
          medicationName: item.medication_name,
          activeIngredient: item.active_ingredient,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      };

      res.json({ success: true, orderId: created.id, order: mappedOrder });
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
 
      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const order = await orderRepository.getById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
 
      if (order.patient_id !== decodedToken.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
 
      if (order.payment_status === 'paid') {
        return res.status(400).json({ error: 'Order is already paid' });
      }
 
      // Stripe expects orderData in camelCase format
      const orderDataForStripe = {
        subtotal: order.subtotal,
        shippingAmount: order.shipping_amount,
        taxAmount: order.tax_amount,
        totalAmount: order.total_amount,
        lineItems: (order.items || []).map(item => ({
          medicationName: item.medication_name,
          activeIngredient: item.active_ingredient,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      };

      const paymentProvider = new StripePaymentProvider();
      const session = await paymentProvider.createPaymentSession(id, orderDataForStripe);
 
      // Update payment reference
      const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
      await supabaseAdmin
        .from('orders')
        .update({
          payment_reference: session.paymentReference,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
 
      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'PAYMENT_CHECKOUT_CREATED',
        actorUid: decodedToken.uid,
        metadata: { orderId: id }
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
      const { paymentEventRepository } = await import('./src/server/repositories/paymentEventRepository');
      const existingEvent = await paymentEventRepository.getEventByProviderEventId(eventId);
      if (existingEvent) {
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
          
          await paymentEventRepository.recordPaymentEvent({
            event_id: eventId,
            event_type: eventType,
            status: 'processed',
            metadata: {
              processedAt: new Date().toISOString(),
              subscriptionId
            }
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
        await paymentEventRepository.recordPaymentEvent({
          event_id: eventId,
          event_type: eventType,
          status: 'processed',
          metadata: {
            processedAt: new Date().toISOString(),
            subscriptionId
          }
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
        await paymentEventRepository.recordPaymentEvent({
          event_id: eventId,
          event_type: eventType,
          status: 'processed',
          metadata: {
            processedAt: new Date().toISOString(),
            subscriptionId
          }
        });
        return res.json({ received: true });
      }

      if (eventType === 'customer.subscription.deleted' || (eventType === 'customer.subscription.updated' && event.data.object.status === 'canceled')) {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.id;
        await subService.handleSubscriptionCancelled(subscriptionId);
        await paymentEventRepository.recordPaymentEvent({
          event_id: eventId,
          event_type: eventType,
          status: 'processed',
          metadata: {
            processedAt: new Date().toISOString(),
            subscriptionId
          }
        });
        return res.json({ received: true });
      }

      // Ordinary Order processing
      let orderId = event.data?.object?.metadata?.orderId; 

      if (!orderId) {
        return res.json({ received: true }); // Ignore irrelevant webhooks silently
      }

      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const orderData = await orderRepository.getById(orderId);
      
      if (!orderData) {
        return res.status(404).send('Order not found');
      }

      const timestamp = new Date().toISOString();
      const { supabaseAdmin } = await import('./src/server/supabaseAdmin');

      if (orderData.payment_status !== 'paid' && orderData.payment_status !== 'refunded') {
        if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded' || eventType === 'mock.payment.success') {
          await supabaseAdmin.from('orders').update({
            payment_status: 'paid',
            fulfillment_status: 'processing', // Move to processing once paid
            updated_at: timestamp
          }).eq('id', orderId);

          await paymentEventRepository.recordPaymentEvent({
            event_id: eventId,
            event_type: eventType,
            order_id: orderId,
            status: 'processed',
            metadata: { processedAt: timestamp }
          });

          const { auditRepository } = await import('./src/server/repositories/auditRepository');
          await auditRepository.log({
            action: 'PAYMENT_CONFIRMED',
            actorUid: 'system',
            metadata: { orderId, eventId }
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
              patientId: orderData.patient_id,
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
        await supabaseAdmin.from('orders').update({
          payment_status: 'refunded',
          fulfillment_status: 'cancelled',
          updated_at: timestamp
        }).eq('id', orderId);

        await paymentEventRepository.recordPaymentEvent({
          event_id: eventId,
          event_type: eventType,
          order_id: orderId,
          status: 'processed',
          metadata: { processedAt: timestamp }
        });

        const { auditRepository } = await import('./src/server/repositories/auditRepository');
        await auditRepository.log({
          action: 'PAYMENT_REFUNDED',
          actorUid: 'system',
          metadata: { orderId, eventId }
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
        await supabaseAdmin.from('orders').update({
          payment_status: 'failed',
          updated_at: timestamp
        }).eq('id', orderId);

        await paymentEventRepository.recordPaymentEvent({
          event_id: eventId,
          event_type: eventType,
          order_id: orderId,
          status: 'processed',
          metadata: { processedAt: timestamp }
        });

        const { auditRepository } = await import('./src/server/repositories/auditRepository');
        await auditRepository.log({
          action: 'PAYMENT_FAILED',
          actorUid: 'system',
          metadata: { orderId, eventId }
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
      const { NotificationRepository } = await import('./src/server/repositories/notificationRepository');
      const notifRepo = new NotificationRepository();
      const prefs = await notifRepo.getPreferences(decodedToken.uid);
      res.json({ email: prefs.email, sms: prefs.sms, inApp: prefs.in_app });
    } catch (err: any) {
      console.warn('Error fetching notification preferences, using defaults:', err);
      res.json({ email: true, sms: false, inApp: true });
    }
  });

  app.patch('/api/notifications/preferences', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { email, sms, inApp } = req.body;
      const { NotificationRepository } = await import('./src/server/repositories/notificationRepository');
      const notifRepo = new NotificationRepository();
      
      const updates: any = {};
      if (typeof email === 'boolean') updates.email = email;
      if (typeof sms === 'boolean') updates.sms = sms;
      if (typeof inApp === 'boolean') updates.in_app = inApp;

      await notifRepo.updatePreferences(decodedToken.uid, updates);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error updating notification preferences:', err);
      res.status(500).json({ error: 'Failed to update notification preferences', message: err.message });
    }
  });

  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;
      const { NotificationRepository } = await import('./src/server/repositories/notificationRepository');
      const notifRepo = new NotificationRepository();
      
      const notifications = await notifRepo.listForPatient(uid, 50);
      res.json(notifications.map(n => ({
        id: n.id,
        patientId: n.patient_id,
        type: n.type,
        title: n.title,
        message: n.short_message,
        shortMessage: n.short_message,
        status: n.status,
        relatedEntityId: n.related_entity_id,
        relatedEntityType: n.related_entity_type,
        createdAt: n.created_at,
        readAt: (n as any).read_at,
      })));
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      res.status(500).json({ error: 'Failed to fetch notifications', message: err.message });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;
      const { NotificationRepository } = await import('./src/server/repositories/notificationRepository');
      const notifRepo = new NotificationRepository();

      await notifRepo.markRead(id, uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error marking notification read:', err);
      res.status(500).json({ error: 'Failed to mark notification as read', message: err.message });
    }
  });

  app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;
      const { NotificationRepository } = await import('./src/server/repositories/notificationRepository');
      const notifRepo = new NotificationRepository();

      await notifRepo.markAllRead(uid);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error marking all notifications read:', err);
      res.status(500).json({ error: 'Failed to mark all notifications as read', message: err.message });
    }
  });

  // -------------- USER PROFILE API -------------- //
  app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;

      // 1. Fetch from canonical Supabase public.profiles table
      const { data: profile, error: sbError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (profile) {
        return res.json({
          id: profile.id,
          uid: profile.id,
          email: profile.email,
          displayName: profile.display_name,
          firstName: profile.first_name,
          lastName: profile.last_name,
          dateOfBirth: profile.date_of_birth,
          sex: profile.sex,
          phone: profile.phone_number,
          phoneNumber: profile.phone_number,
          shippingAddress: profile.shipping_address,
          role: profile.role,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        });
      }

      // 3. Fallback to token information if newly authenticated
      res.json({
        id: uid,
        uid: uid,
        email: decodedToken.email || null,
        displayName: decodedToken.displayName || null,
        role: decodedToken.role || 'patient',
      });
    } catch (err: any) {
      console.error('[API /api/user/profile GET] Safe diagnostic:', {
        status: 500,
        path: '/api/user/profile',
        safeMessage: err.message,
      });
      res.status(500).json({ error: 'Internal Error', message: err.message });
    }
  });

  app.patch('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;
      const { firstName, lastName, dateOfBirth, sex, shippingAddress, phone, phoneNumber } = req.body;

      // Helper for normalizing Indian mobile numbers server-side
      const normalizePhone = (input: any): { normalized: string | null; isValid: boolean } => {
        if (input === null || input === undefined || (typeof input === 'string' && !input.trim())) {
          return { normalized: null, isValid: true };
        }
        if (typeof input !== 'string') {
          return { normalized: null, isValid: false };
        }
        const raw = input.trim();
        let digits = raw.replace(/\D/g, '');
        if (digits.length === 12 && digits.startsWith('91')) {
          digits = digits.slice(2);
        } else if (digits.length === 11 && digits.startsWith('0')) {
          digits = digits.slice(1);
        }
        if (digits.length === 10) {
          return { normalized: `+91${digits}`, isValid: true };
        }
        return { normalized: null, isValid: false };
      };

      // Build canonical Supabase profile updates
      const supabaseUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (firstName !== undefined) {
        supabaseUpdates.first_name = typeof firstName === 'string' ? firstName.trim() : null;
      }
      if (lastName !== undefined) {
        supabaseUpdates.last_name = typeof lastName === 'string' ? lastName.trim() : null;
      }
      if (firstName !== undefined || lastName !== undefined) {
        const currentFirst = firstName !== undefined && firstName !== null ? firstName : '';
        const currentLast = lastName !== undefined && lastName !== null ? lastName : '';
        const derivedDisplay = `${currentFirst} ${currentLast}`.trim();
        if (derivedDisplay) {
          supabaseUpdates.display_name = derivedDisplay;
        }
      }
      if (dateOfBirth !== undefined) {
        // Postgres DATE column rejects empty string ("") - must be YYYY-MM-DD or null
        if (typeof dateOfBirth === 'string' && dateOfBirth.trim().length > 0) {
          supabaseUpdates.date_of_birth = dateOfBirth.trim();
        } else {
          supabaseUpdates.date_of_birth = null;
        }
      }
      if (sex !== undefined) {
        const validSexes = ['male', 'female', 'other', 'prefer-not-to-say', ''];
        supabaseUpdates.sex = validSexes.includes(sex) ? sex : null;
      }

      if ('phone' in req.body || 'phoneNumber' in req.body) {
        const rawPhone = phone !== undefined ? phone : phoneNumber;
        const { normalized, isValid } = normalizePhone(rawPhone);
        if (!isValid) {
          return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
        }
        supabaseUpdates.phone_number = normalized;
      }

      if (shippingAddress !== undefined && typeof shippingAddress === 'object' && shippingAddress !== null) {
        let shippingPhone = shippingAddress.phoneNumber;
        if (shippingPhone !== undefined) {
          const { normalized, isValid } = normalizePhone(shippingPhone);
          if (!isValid) {
            return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
          }
          shippingPhone = normalized;
        } else {
          shippingPhone = supabaseUpdates.phone_number !== undefined ? supabaseUpdates.phone_number : null;
        }

        supabaseUpdates.shipping_address = {
          recipientName: shippingAddress.recipientName || '',
          line1: shippingAddress.line1 || shippingAddress.street || '',
          line2: shippingAddress.line2 || shippingAddress.apartment || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          postalCode: shippingAddress.postalCode || shippingAddress.zip || '',
          country: shippingAddress.country || 'India',
          phoneNumber: shippingPhone,
        };
      }

      // Check if profile exists in Supabase public.profiles
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('id', uid)
        .maybeSingle();

      if (checkError) {
        console.error('[API /api/user/profile PATCH] Supabase lookup error:', {
          status: 500,
          errorCode: checkError.code,
          safeMessage: checkError.message,
          path: '/api/user/profile',
        });
        return res.status(500).json({
          error: 'Failed to access database',
          details: checkError.message,
          code: checkError.code,
        });
      }

      let updatedProfile: any = null;

      if (existingProfile) {
        // Update canonical profile row strictly for authenticated user id
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(supabaseUpdates)
          .eq('id', uid)
          .select()
          .single();

        if (updateError) {
          console.error('[API /api/user/profile PATCH] Supabase update error:', {
            status: 500,
            errorCode: updateError.code,
            safeMessage: updateError.message,
            path: '/api/user/profile',
          });
          return res.status(500).json({
            error: 'Failed to save profile in database',
            details: updateError.message,
            code: updateError.code,
          });
        }
        updatedProfile = updated;
      } else {
        // Bootstrap / Insert new canonical profile
        const newProfile = {
          id: uid,
          email: decodedToken.email || null,
          role: decodedToken.role || 'patient',
          created_at: new Date().toISOString(),
          ...supabaseUpdates,
        };

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (insertError) {
          console.error('[API /api/user/profile PATCH] Supabase insert error:', {
            status: 500,
            errorCode: insertError.code,
            safeMessage: insertError.message,
            path: '/api/user/profile',
          });
          return res.status(500).json({
            error: 'Failed to create profile in database',
            details: insertError.message,
            code: insertError.code,
          });
        }
        updatedProfile = inserted;
      }

      // Record audit log entry in Supabase repository
      try {
        await supabaseAdmin.from('audit_logs').insert({
          action: 'USER_PROFILE_UPDATED',
          actor_uid: uid,
          metadata: {
            fieldsUpdated: Object.keys(supabaseUpdates).filter(k => k !== 'updated_at'),
          },
          created_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        console.warn('[AuditLog] Warning recording profile audit log:', auditErr);
      }

      const p = updatedProfile || {};
      res.json({
        success: true,
        profile: {
          id: p.id || uid,
          uid: p.id || uid,
          email: p.email || decodedToken.email || null,
          displayName: p.display_name || null,
          firstName: p.first_name || null,
          lastName: p.last_name || null,
          dateOfBirth: p.date_of_birth || null,
          sex: p.sex || null,
          phone: p.phone_number || null,
          phoneNumber: p.phone_number || null,
          shippingAddress: p.shipping_address || null,
          role: p.role || decodedToken.role || 'patient',
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('[API /api/user/profile PATCH] Unhandled error:', {
        status: 500,
        safeMessage: err.message,
        path: '/api/user/profile',
      });
      res.status(500).json({ error: 'Failed to update profile', message: err.message });
    }
  });

  app.get('/api/orders/:id/timeline', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;
      
      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const order = await orderRepository.getById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (order.patient_id !== decodedToken.uid && decodedToken.role !== 'admin') {
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
      const uid = decodedToken.uid;
      const eligibleList: any[] = [];

      const { data: sbPres, error: sbErr } = await supabaseAdmin
        .from('prescriptions')
        .select('*')
        .eq('patient_id', uid)
        .eq('refill_eligible', true)
        .in('status', ['finalized', 'active']);

      if (sbPres && !sbErr) {
        sbPres.forEach(p => {
          eligibleList.push({
            id: p.id,
            patientId: p.patient_id,
            doctorId: p.doctor_id,
            treatmentCategory: p.treatment_category || 'General Refill',
            medications: p.medications || [],
            refillIntervalDays: p.refill_interval_days || 30,
            refillEligible: true,
            status: p.status,
            createdAt: p.created_at,
          });
        });
      }

      res.json(eligibleList);
    } catch (error) {
      console.error('Error fetching eligible prescriptions:', error);
      res.json([]);
    }
  });

  app.get('/api/subscriptions', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const uid = decodedToken.uid;

      const { data: sbSubs, error: sbErr } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('patient_id', uid)
        .order('created_at', { ascending: false });

      if (sbErr) {
        console.error('Supabase subscriptions query error:', sbErr);
        return res.status(500).json({ error: `Failed to fetch subscriptions: ${sbErr.message}` });
      }

      const subsList = (sbSubs || []).map(s => ({
        id: s.id,
        subscriptionId: s.provider_subscription_id || s.id,
        patientId: s.patient_id,
        treatmentName: s.treatment_category || s.treatment_name || 'Treatment Subscription',
        status: s.status,
        billingInterval: s.billing_interval || 'month',
        intervalCount: s.interval_count || 1,
        nextBillingAt: s.next_billing_at,
        createdAt: s.created_at,
      }));

      res.json(subsList);
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ error: 'Failed to fetch subscriptions', message: error.message });
    }
  });

  app.post('/api/subscriptions/checkout', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { prescriptionId } = req.body;
      
      const { data: pData, error: pError } = await supabaseAdmin
        .from('prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .maybeSingle();

      if (pError || !pData) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      if (pData.patient_id !== decodedToken.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      if (!pData.refill_eligible || pData.status === 'cancelled') {
        return res.status(400).json({ error: 'Prescription is not eligible for subscription' });
      }

      const { data: existingSub, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('source_prescription_id', prescriptionId)
        .in('status', ['active', 'past_due', 'paused']);
         
      if (subError) {
        console.error('Error checking existing subscription:', subError);
        return res.status(500).json({ error: 'Internal Error' });
      }

      if (existingSub && existingSub.length > 0) {
        return res.status(400).json({ error: 'Subscription already exists' });
      }

      const pDataMapped = {
        id: pData.id,
        patientId: pData.patient_id,
        refillIntervalDays: pData.refill_interval_days,
        refillEligible: pData.refill_eligible,
        status: pData.status,
        medications: (pData.medications || []).map((m: any) => ({
          medicationName: m.medicationName || m.medication_name,
          activeIngredient: m.activeIngredient || m.active_ingredient,
          quantity: m.quantity,
          unitPrice: m.unitPrice || m.unit_price
        }))
      };

      const paymentProvider = new StripePaymentProvider();
      const session = await paymentProvider.createSubscriptionSession(decodedToken.uid, decodedToken.email || '', prescriptionId, pDataMapped);
      
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
      
      const { data: subData, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (subError || !subData) {
        return res.status(404).json({ error: 'Not found' });
      }
      
      if (subData.patient_id !== decodedToken.uid && decodedToken.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!config.stripe.isConfigured || !config.stripe.secretKey) {
        return res.status(503).json({ error: 'Stripe not configured' });
      }
      const Stripe = require('stripe').default || require('stripe');
      const stripe = new Stripe(config.stripe.secretKey);
      
      await stripe.subscriptions.cancel(subData.provider_subscription_id);
      
      res.json({ success: true, message: 'Cancellation requested' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.get('/api/refill-requests', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      let data;
      if (decodedToken.role === 'doctor') {
        const { data: list, error } = await supabaseAdmin
          .from('refill_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = list || [];
      } else {
        const { data: list, error } = await supabaseAdmin
          .from('refill_requests')
          .select('*')
          .eq('patient_id', decodedToken.uid)
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = list || [];
      }
      
      const mapped = data.map(r => ({
        id: r.id,
        patientId: r.patient_id,
        sourcePrescriptionId: r.source_prescription_id,
        subscriptionId: r.subscription_id,
        status: r.status,
        decisionReason: r.decision_reason,
        resultingOrderId: r.resulting_order_id,
        idempotencyKey: r.idempotency_key,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at,
        createdAt: r.created_at
      }));
      res.json(mapped);
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

      const reqSnap = await supabaseAdmin
        .from('refill_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (reqSnap.error || !reqSnap.data) return res.status(404).json({ error: 'Not found' });
      const reqData = reqSnap.data;
      
      if (reqData.status !== 'pending_review') {
        return res.status(400).json({ error: 'Request is not pending review' });
      }

      const { data: pData, error: pError } = await supabaseAdmin
        .from('prescriptions')
        .select('*')
        .eq('id', reqData.source_prescription_id)
        .maybeSingle();

      if (pError || !pData) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      const timestamp = new Date().toISOString();
      let resultingOrderId = null;

      if (action === 'approve') {
        // Create new order
        const newOrderId = `ord_${Date.now()}`;
        const medicationsMapped = (pData.medications || []).map((m: any) => ({
          medicationName: m.medicationName || m.medication_name,
          activeIngredient: m.activeIngredient || m.active_ingredient,
          quantity: m.quantity,
          unitPrice: m.unitPrice || m.unit_price
        }));

        const { totalAmount, subtotal, taxAmount, shippingAmount, lineItems } = calculateOrderTotals(medicationsMapped);
        
        const { data: userData } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', reqData.patient_id)
          .maybeSingle();

        const isPrepaid = !!reqData.billing_payment_id || !!reqData.subscription_invoice_paid;
        const initialPaymentStatus = isPrepaid ? 'paid' : 'pending';
        const initialStatus = isPrepaid ? 'processing' : 'unfulfilled';
        const initialFulfillmentStatus = isPrepaid ? 'processing' : 'unfulfilled';

        const { orderRepository } = await import('./src/server/repositories/orderRepository');
        await orderRepository.createOrder({
          id: newOrderId,
          patient_id: reqData.patient_id,
          prescription_id: reqData.source_prescription_id,
          payment_status: initialPaymentStatus as any,
          fulfillment_status: initialFulfillmentStatus as any,
          shipping_address: userData?.shipping_address || {},
          subtotal,
          tax_amount: taxAmount,
          shipping_amount: shippingAmount,
          total_amount: totalAmount,
        }, lineItems.map((li: any) => ({
          medication_name: li.medicationName,
          active_ingredient: li.activeIngredient || null,
          quantity: li.quantity,
          unit_price: li.unitPrice,
          total_price: li.totalPrice
        })));

        resultingOrderId = newOrderId;

        const { auditRepository } = await import('./src/server/repositories/auditRepository');
        await auditRepository.log({
          action: 'REFILL_ORDER_CREATED',
          actorUid: decodedToken.uid,
          orderId: newOrderId,
          metadata: {
            refillRequestId: id,
            paymentStatus: initialPaymentStatus,
            status: initialStatus
          }
        });
      }

      const newStatus = action === 'approve' ? 'approved' : 'denied';

      await supabaseAdmin
        .from('refill_requests')
        .update({
          status: newStatus,
          reviewed_at: timestamp,
          reviewed_by: decodedToken.uid,
          decision_reason: decisionReason || null,
          resulting_order_id: resultingOrderId
        })
        .eq('id', id);

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: action === 'approve' ? 'REFILL_APPROVED' : 'REFILL_DENIED',
        actorUid: decodedToken.uid,
        metadata: { refillRequestId: id }
      });

      // Notification
      const { NotificationService } = await import('./src/server/notifications');
      const notif = new NotificationService();
      await notif.createNotification({
        patientId: reqData.patient_id,
        type: 'CONSULTATION_SUBMITTED',
        title: `Refill Request ${action === 'approve' ? 'Approved' : 'Denied'}`,
        shortMessage: `Your refill request for ${pData.treatment_category || 'medication'} has been ${newStatus}.`,
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

  app.post('/api/messages/threads/:threadId/send', requireClinicalAuth, async (req, res) => {
    try {
      const { threadId } = req.params;
      const { text } = req.body;
      const decodedToken = (req as any).user;
      const role = decodedToken.role === 'doctor' ? 'doctor' : 'patient';
      
      const { messageRepository } = await import('./src/server/repositories/messageRepository');
      const result = await messageRepository.addMessage({
        threadId,
        senderUid: decodedToken.uid,
        senderRole: role,
        text,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Error sending message:', err);
      res.status(err.message?.includes('Forbidden') ? 403 : 400).json({ error: err.message || 'Internal Error' });
    }
  });

  app.post('/api/messages/threads/:threadId/read', requireClinicalAuth, async (req, res) => {
    try {
      const { threadId } = req.params;
      const decodedToken = (req as any).user;
      const role = decodedToken.role === 'doctor' ? 'doctor' : 'patient';
      
      const { messageRepository } = await import('./src/server/repositories/messageRepository');
      await messageRepository.markAsRead(threadId, decodedToken.uid, role);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error marking read:', err);
      res.status(err.message?.includes('Forbidden') ? 403 : 500).json({ error: err.message || 'Internal Error' });
    }
  });

  // Safe Messaging Participant Lookup
  app.get('/api/messaging/participant/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const decodedToken = (req as any).user;

      let isAuthorized = decodedToken.uid === id || ['doctor', 'pharmacist', 'admin'].includes(decodedToken.role);
      if (!isAuthorized) {
        const { data: threads1 } = await supabaseAdmin
          .from('message_threads')
          .select('id')
          .eq('patient_id', decodedToken.uid)
          .eq('doctor_id', id)
          .limit(1);
          
        if (threads1 && threads1.length > 0) {
          isAuthorized = true;
        } else {
          const { data: threads2 } = await supabaseAdmin
            .from('message_threads')
            .select('id')
            .eq('doctor_id', decodedToken.uid)
            .eq('patient_id', id)
            .limit(1);
          if (threads2 && threads2.length > 0) isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Fetch from unified profiles table (which contains both patient and staff profiles)
      const { data: profile, error: pError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`id.eq.${id},firebase_uid.eq.${id}`)
        .maybeSingle();

      if (profile && !pError) {
        const displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.display_name || 'User';
        return res.json({
          id: profile.id,
          displayName,
          role: profile.role,
          avatarUrl: (profile as any).avatar_url || null
        });
      }

      // If not in general profiles, check staff_profiles explicitly
      const { data: staffProfile, error: spError } = await supabaseAdmin
        .from('staff_profiles')
        .select('*')
        .or(`id.eq.${id},firebase_uid.eq.${id}`)
        .maybeSingle();

      if (staffProfile && !spError) {
        const displayName = `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim() || 'Staff';
        return res.json({
          id: staffProfile.id,
          displayName,
          role: staffProfile.role,
          avatarUrl: (staffProfile as any).avatar_url || null
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
      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const dbOrders = await orderRepository.listForPharmacist();
      const orders = dbOrders.map(order => ({
        id: order.id,
        legacyOrderId: order.legacy_order_id,
        patientId: order.patient_id,
        prescriptionId: order.prescription_id,
        subtotal: order.subtotal,
        shippingAmount: order.shipping_amount,
        taxAmount: order.tax_amount,
        totalAmount: order.total_amount,
        status: order.fulfillment_status === 'unfulfilled' && order.payment_status === 'pending' ? 'pending_payment' : order.fulfillment_status,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        shippingAddress: order.shipping_address,
        carrier: order.carrier,
        trackingNumber: order.tracking_number,
        paidAt: order.paid_at,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        medications: (order.items || []).map(item => ({
          medicationName: item.medication_name,
          activeIngredient: item.active_ingredient,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      }));
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
      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const fullOrder = await orderRepository.getById(id);
      if (!fullOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      const mapped = {
        id: fullOrder.id,
        legacyOrderId: fullOrder.legacy_order_id,
        patientId: fullOrder.patient_id,
        prescriptionId: fullOrder.prescription_id,
        subtotal: fullOrder.subtotal,
        shippingAmount: fullOrder.shipping_amount,
        taxAmount: fullOrder.tax_amount,
        totalAmount: fullOrder.total_amount,
        status: fullOrder.fulfillment_status === 'unfulfilled' && fullOrder.payment_status === 'pending' ? 'pending_payment' : fullOrder.fulfillment_status,
        paymentStatus: fullOrder.payment_status,
        fulfillmentStatus: fullOrder.fulfillment_status,
        shippingAddress: fullOrder.shipping_address,
        carrier: fullOrder.carrier,
        trackingNumber: fullOrder.tracking_number,
        paidAt: fullOrder.paid_at,
        shippedAt: fullOrder.shipped_at,
        deliveredAt: fullOrder.delivered_at,
        createdAt: fullOrder.created_at,
        updatedAt: fullOrder.updated_at,
        medications: (fullOrder.items || []).map(item => ({
          medicationName: item.medication_name,
          activeIngredient: item.active_ingredient,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        }))
      };
      res.json({ order: mapped });
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

      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const order = await orderRepository.getById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.payment_status !== 'paid') {
        return res.status(400).json({ error: 'Cannot fulfill unpaid order. Payment must be confirmed first.' });
      }

      const timestamp = new Date().toISOString();
      const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
      await supabaseAdmin.from('orders').update({
        fulfillment_status: status,
        updated_at: timestamp
      }).eq('id', id);

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'ORDER_FULFILLMENT_STATUS_UPDATED',
        actorUid: decodedToken.uid,
        metadata: { orderId: id, status }
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

      const { orderRepository } = await import('./src/server/repositories/orderRepository');
      const order = await orderRepository.getById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.payment_status !== 'paid') {
        return res.status(400).json({ error: 'Cannot ship unpaid order. Payment must be confirmed first.' });
      }

      const timestamp = new Date().toISOString();
      const trackingNumber = `940011189956${Math.floor(10000000 + Math.random() * 90000000)}`;
      const shipment = {
        trackingNumber,
        carrier: 'USPS Priority Mail',
        shippedAt: timestamp
      };

      const { supabaseAdmin } = await import('./src/server/supabaseAdmin');
      await supabaseAdmin.from('orders').update({
        fulfillment_status: 'shipped',
        carrier: shipment.carrier,
        tracking_number: shipment.trackingNumber,
        shipped_at: shipment.shippedAt,
        updated_at: timestamp
      }).eq('id', id);

      const { auditRepository } = await import('./src/server/repositories/auditRepository');
      await auditRepository.log({
        action: 'ORDER_SHIPPED',
        actorUid: decodedToken.uid,
        metadata: { orderId: id, trackingNumber }
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
          patientId: order.patient_id,
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

  // Standalone server lifecycle (for AI Studio preview & Cloud Run container)
  if (process.env.VERCEL !== '1') {
    if (process.env.NODE_ENV !== 'production') {
      import('vite')
        .then(({ createServer: createViteServer }) => {
          return createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
          });
        })
        .then((vite) => {
          app.use(vite.middlewares);
          app.listen(PORT, '0.0.0.0', () => {
            console.log(`Suga.health full-stack server running on http://0.0.0.0:${PORT}`);
          });
        })
        .catch((err) => {
          console.error('Failed to start Vite dev server:', err);
        });
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Suga.health full-stack server running on http://0.0.0.0:${PORT}`);
      });
    }
  }

export default app;
