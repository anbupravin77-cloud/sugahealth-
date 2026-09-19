import { supabaseAdmin } from '../supabaseAdmin';
import { AuthenticatedUser } from '../auth/types';
import { DbConsultation, DbClinicalNote, DbPrescription } from '../repositories/types';
import { isAllowlistedTestEmail, getConfiguredTestAccounts } from '../auth/testAccounts';

export interface MedicationOptionItem {
  id: string;
  name: string;
  strength: string;
  dosageForm: string;
  priceInr: number;
  description: string;
  isRecommended?: boolean;
  activeIngredient?: string;
  quantity?: number;
}

export interface MedicationOptionsPayload {
  options: MedicationOptionItem[];
  customClinicianMessage?: string;
}

export class ClinicalWorkflowService {
  /**
   * Save or update draft consultation for the authenticated patient in Supabase.
   */
  async saveDraft(patientId: string, primaryConcern: string, responses: Record<string, any>, draftId?: string): Promise<{ id: string }> {
    const timestamp = new Date().toISOString();

    if (draftId) {
      // Update existing draft if owned by patient
      const { data: existing, error: findError } = await supabaseAdmin
        .from('consultations')
        .select('id, patient_id, status')
        .eq('id', draftId)
        .maybeSingle();

      if (findError || !existing) {
        throw new Error('Consultation draft not found.');
      }
      if (existing.patient_id !== patientId) {
        throw new Error('Forbidden: You do not own this consultation draft.');
      }
      if (existing.status !== 'draft') {
        throw new Error('Cannot modify a consultation that has already been submitted.');
      }

      const { data, error } = await supabaseAdmin
        .from('consultations')
        .update({
          primary_concern: primaryConcern,
          responses,
          updated_at: timestamp,
        })
        .eq('id', draftId)
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to update consultation draft: ${error.message}`);
      }
      return { id: data.id };
    } else {
      // Find if an active draft already exists for this patient
      const { data: activeDraft } = await supabaseAdmin
        .from('consultations')
        .select('id')
        .eq('patient_id', patientId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeDraft?.id) {
        const { data, error } = await supabaseAdmin
          .from('consultations')
          .update({
            primary_concern: primaryConcern,
            responses,
            updated_at: timestamp,
          })
          .eq('id', activeDraft.id)
          .select('id')
          .single();

        if (error) {
          throw new Error(`Failed to update draft: ${error.message}`);
        }
        return { id: data.id };
      }

      // Create new draft
      const { data, error } = await supabaseAdmin
        .from('consultations')
        .insert({
          patient_id: patientId,
          status: 'draft',
          primary_concern: primaryConcern || 'weight',
          responses,
          schema_version: 1,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create consultation draft: ${error.message}`);
      }
      return { id: data.id };
    }
  }

  /**
   * Get active draft for the current patient.
   */
  async getDraft(patientId: string): Promise<DbConsultation | null> {
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[ClinicalWorkflow] Error fetching draft:', error.message);
      return null;
    }
    return data;
  }

  /**
   * Submits patient consultation:
   * 1. Updates status to 'submitted' / 'assigned'.
   * 2. Selects an active doctor (preferring configured test doctor or active staff).
   * 3. Assigns consultation to that doctor.
   * 4. Creates exactly ONE doctor notification in Supabase public.notifications.
   */
  async submitConsultation(consultationId: string, patientId: string): Promise<{ success: boolean; consultationId: string; assignedDoctorId?: string }> {
    const timestamp = new Date().toISOString();

    // 1. Fetch consultation
    const { data: consultation, error: fetchErr } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .maybeSingle();

    if (fetchErr || !consultation) {
      throw new Error('Consultation not found.');
    }
    if (consultation.patient_id !== patientId) {
      throw new Error('Forbidden: You can only submit your own consultation.');
    }
    if (consultation.status !== 'draft') {
      return { success: true, consultationId: consultation.id, assignedDoctorId: consultation.assigned_to };
    }

    // 2. Resolve eligible doctor from staff_profiles
    let assignedDoctorId: string | null = null;

    // Check if test doctor is in staff_profiles
    const testDoctorEmail = process.env.TEST_DOCTOR_EMAIL?.trim().toLowerCase();
    if (testDoctorEmail) {
      const { data: testDoc } = await supabaseAdmin
        .from('staff_profiles')
        .select('id')
        .eq('email', testDoctorEmail)
        .eq('active', true)
        .maybeSingle();

      if (testDoc?.id) {
        assignedDoctorId = testDoc.id;
      }
    }

    // If test doctor not matched, find any active doctor
    if (!assignedDoctorId) {
      const { data: anyDoctor } = await supabaseAdmin
        .from('staff_profiles')
        .select('id')
        .eq('role', 'doctor')
        .eq('active', true)
        .limit(1)
        .maybeSingle();

      if (anyDoctor?.id) {
        assignedDoctorId = anyDoctor.id;
      }
    }

    // 3. Update consultation status
    const nextStatus = assignedDoctorId ? 'assigned' : 'submitted';
    const { error: updateErr } = await supabaseAdmin
      .from('consultations')
      .update({
        status: nextStatus,
        assigned_to: assignedDoctorId,
        submitted_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', consultationId);

    if (updateErr) {
      throw new Error(`Failed to submit consultation: ${updateErr.message}`);
    }

    // 4. Create doctor notification if assigned
    if (assignedDoctorId) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const idempotencyKey = `consultation_submit_${consultationId}`;
      const patientName = consultation.responses?.fullName || 'Patient';
      const concern = consultation.primary_concern || 'Intake';

      const { error: notifErr } = await supabaseAdmin
        .from('notifications')
        .upsert({
          id: notifId,
          patient_id: assignedDoctorId, // Recipient is the doctor's user id
          type: 'CONSULTATION_SUBMITTED',
          title: 'New consultation requires review',
          short_message: `New intake for ${patientName} (${concern}) is ready for clinician evaluation.`,
          related_entity_id: consultationId,
          related_entity_type: 'consultation',
          status: 'unread',
          idempotency_key: idempotencyKey,
          created_at: timestamp,
        }, { onConflict: 'idempotency_key' });

      if (notifErr) {
        console.warn('[ClinicalWorkflow] Warning creating doctor notification:', notifErr.message);
      }
    }

    return {
      success: true,
      consultationId,
      assignedDoctorId: assignedDoctorId || undefined,
    };
  }

  /**
   * Fetch consultation details.
   * Patient: own consultation only.
   * Doctor: full clinical record only if assigned_to = doctor.uid. If unassigned, returns triage-only metadata.
   * Admin: full operational access.
   */
  async getConsultationDetails(consultationId: string, authUser: AuthenticatedUser): Promise<any> {
    const { data: consultation, error: consultErr } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .maybeSingle();

    if (consultErr || !consultation) {
      throw new Error('Consultation not found.');
    }

    const isPatientOwner = authUser.uid === consultation.patient_id;
    const isAssignedDoctor = Boolean(consultation.assigned_to && authUser.uid === consultation.assigned_to);
    const isDoctorRole = authUser.role === 'doctor';
    const isAdmin = authUser.role === 'admin';

    if (!isPatientOwner && !isAssignedDoctor && !isDoctorRole && !isAdmin) {
      throw new Error('Forbidden: You do not have permission to view this clinical consultation.');
    }

    // If another doctor is assigned, forbid non-assigned doctor
    if (isDoctorRole && !isAdmin && consultation.assigned_to && !isAssignedDoctor) {
      throw new Error('Forbidden: You are not the assigned clinician for this consultation.');
    }

    // If consultation is unassigned and requester is a doctor, only expose triage metadata (no full chart access)
    if (isDoctorRole && !isAdmin && !consultation.assigned_to) {
      return {
        consultation: {
          id: consultation.id,
          patient_id: consultation.patient_id,
          assigned_to: null,
          status: consultation.status,
          primary_concern: consultation.primary_concern,
          submitted_at: consultation.submitted_at,
          created_at: consultation.created_at,
          updated_at: consultation.updated_at,
        },
        patient: {
          id: consultation.patient_id,
          first_name: consultation.responses?.fullName ? consultation.responses.fullName.split(' ')[0] : 'Patient',
          last_name: '',
          sex: consultation.responses?.sex || null,
        },
        doctor: null,
        clinicalNotes: [],
        prescription: null,
        medicationOptions: null,
        selectedOption: null,
        pharmacyHandoffStatus: null,
        signingStatus: null,
        isTriageOnly: true,
        isClaimable: true,
      };
    }

    // Fetch patient profile
    const { data: patientProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, first_name, last_name, phone_number, date_of_birth, sex, created_at')
      .eq('id', consultation.patient_id)
      .maybeSingle();

    // Fetch assigned doctor profile if available
    let doctorProfile: any = null;
    if (consultation.assigned_to) {
      const { data: doc } = await supabaseAdmin
        .from('staff_profiles')
        .select('id, email, display_name, first_name, last_name, initials, specialties')
        .eq('id', consultation.assigned_to)
        .maybeSingle();
      doctorProfile = doc;
    }

    // Fetch clinical notes
    const { data: notes } = await supabaseAdmin
      .from('clinical_notes')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false });

    // Fetch prescription and prescription items
    const { data: prescription } = await supabaseAdmin
      .from('prescriptions')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let prescriptionItems: any[] = [];
    if (prescription?.id) {
      const { data: items } = await supabaseAdmin
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', prescription.id);
      prescriptionItems = items || [];
    }

    // Assemble canonical medication options from prescription_items
    let canonicalMedicationOptions = consultation.responses?.medicationOptions || null;
    if (prescriptionItems.length > 0) {
      const optionsList = prescriptionItems.map((item: any) => ({
        id: item.id,
        name: item.medication_name,
        strength: item.strength,
        dosageForm: item.dosage_form,
        priceInr: item.unit_price || 0,
        description: item.description || item.directions || 'Clinical therapeutic regimen',
        isRecommended: item.is_recommended ?? false,
      }));
      optionsList.sort((a, b) => (b.priceInr || 0) - (a.priceInr || 0));

      canonicalMedicationOptions = {
        options: optionsList,
        customClinicianMessage: consultation.responses?.medicationOptions?.customClinicianMessage || 'These options correspond to your approved treatment plan.',
        updatedAt: prescription?.updated_at || consultation.updated_at,
      };
    }

    // Resolve selected option directly from prescription_items using prescriptions.selected_item_id
    let selectedOptionDto: any = null;
    const selectedItemId = prescription?.selected_item_id;
    if (selectedItemId && prescriptionItems.length > 0) {
      const matchedItem = prescriptionItems.find((item: any) => item.id === selectedItemId);
      if (matchedItem) {
        selectedOptionDto = {
          id: matchedItem.id,
          name: matchedItem.medication_name,
          strength: matchedItem.strength,
          dosageForm: matchedItem.dosage_form,
          priceInr: matchedItem.unit_price || 0,
          description: matchedItem.description || matchedItem.directions || '',
          isRecommended: matchedItem.is_recommended ?? false,
          selectedAt: prescription?.selected_at || null,
        };
      }
    }

    return {
      consultation,
      patient: patientProfile,
      doctor: doctorProfile,
      clinicalNotes: notes || [],
      prescription: prescription ? { ...prescription, items: prescriptionItems } : null,
      medicationOptions: canonicalMedicationOptions,
      selectedOption: selectedOptionDto,
      selectionStatus: selectedItemId ? 'selected_pending_payment' : null,
      pharmacyHandoffStatus: null,
      signingStatus: consultation.responses?.signing_status || (consultation.status === 'completed' ? 'ready_for_signature' : null),
      isTriageOnly: false,
      isClaimable: false,
    };
  }

  /**
   * Explicitly claim an unassigned consultation for review.
   * Sets assigned_to = doctor.uid and status = 'under_review'.
   * Disallows implicit claiming or hijacking.
   */
  async claimConsultation(consultationId: string, doctorId: string): Promise<{ success: boolean; assignedTo: string; status: string }> {
    const timestamp = new Date().toISOString();

    const { data: consultation, error: fetchErr } = await supabaseAdmin
      .from('consultations')
      .select('id, assigned_to, status')
      .eq('id', consultationId)
      .maybeSingle();

    if (fetchErr || !consultation) {
      throw new Error('Consultation not found.');
    }

    if (consultation.assigned_to && consultation.assigned_to !== doctorId) {
      throw new Error('Forbidden: Consultation is already assigned to another clinician.');
    }

    const { error: upErr } = await supabaseAdmin
      .from('consultations')
      .update({
        assigned_to: doctorId,
        status: 'under_review',
        updated_at: timestamp,
      })
      .eq('id', consultationId);

    if (upErr) {
      throw new Error(`Failed to claim consultation: ${upErr.message}`);
    }

    return {
      success: true,
      assignedTo: doctorId,
      status: 'under_review',
    };
  }

  /**
   * List doctor's consultations (both assigned and unassigned submitted queue).
   * For unassigned queue items, only exposes triage metadata.
   */
  async listDoctorConsultations(doctorId: string, filter: 'all' | 'assigned' | 'queue' | 'completed' = 'all'): Promise<any[]> {
    let query = supabaseAdmin
      .from('consultations')
      .select('id, patient_id, assigned_to, status, primary_concern, responses, submitted_at, completed_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (filter === 'assigned') {
      query = query.eq('assigned_to', doctorId);
    } else if (filter === 'queue') {
      query = query.or(`assigned_to.eq.${doctorId},and(assigned_to.is.null,status.eq.submitted)`);
    } else if (filter === 'completed') {
      query = query.eq('assigned_to', doctorId).eq('status', 'completed');
    } else {
      query = query.or(`assigned_to.eq.${doctorId},and(assigned_to.is.null,status.eq.submitted)`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list doctor consultations: ${error.message}`);
    }

    // Sanitize sensitive intake details for consultations not assigned to doctorId
    const sanitized = (data || []).map((c: any) => {
      if (c.assigned_to === doctorId) {
        return c;
      }
      // Unassigned or assigned elsewhere: provide triage summary only
      return {
        id: c.id,
        patient_id: c.patient_id,
        assigned_to: c.assigned_to,
        status: c.status,
        primary_concern: c.primary_concern,
        submitted_at: c.submitted_at,
        created_at: c.created_at,
        updated_at: c.updated_at,
        responses: {
          fullName: c.responses?.fullName || 'Patient Intake',
          sex: c.responses?.sex || null,
          age: c.responses?.age || null,
        },
      };
    });

    return sanitized;
  }

  /**
   * Save doctor clinical note (SOAP / assessment).
   * Strictly requires consultation already assigned to this doctor.
   */
  async saveClinicalNote(consultationId: string, doctorId: string, note: { content?: string; subjective?: string; objective?: string; assessment?: string; plan?: string; noteId?: string }): Promise<{ id: string }> {
    const timestamp = new Date().toISOString();

    // Check consultation assignment
    const { data: consultation, error: fetchErr } = await supabaseAdmin
      .from('consultations')
      .select('id, assigned_to, status')
      .eq('id', consultationId)
      .maybeSingle();

    if (fetchErr || !consultation) {
      throw new Error('Consultation not found.');
    }

    if (!consultation.assigned_to || consultation.assigned_to !== doctorId) {
      throw new Error('Forbidden: Consultation must be claimed and assigned to you before writing clinical notes.');
    }

    if (consultation.status === 'completed') {
      throw new Error('Forbidden: Consultation is finalized and clinical notes cannot be modified.');
    }

    let targetNoteId = note.noteId;

    // If noteId is provided, validate ownership
    if (targetNoteId) {
      const { data: existingNote } = await supabaseAdmin
        .from('clinical_notes')
        .select('id, consultation_id, doctor_id')
        .eq('id', targetNoteId)
        .maybeSingle();

      if (!existingNote || existingNote.consultation_id !== consultationId || existingNote.doctor_id !== doctorId) {
        throw new Error('Forbidden: Clinical note ownership or consultation mismatch.');
      }
    } else {
      // Find latest note for this consultation + doctor to prevent duplicate rows
      const { data: latestNote } = await supabaseAdmin
        .from('clinical_notes')
        .select('id')
        .eq('consultation_id', consultationId)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestNote) {
        targetNoteId = latestNote.id;
      }
    }

    if (targetNoteId) {
      const { data, error } = await supabaseAdmin
        .from('clinical_notes')
        .update({
          content: note.content || null,
          subjective: note.subjective || null,
          objective: note.objective || null,
          assessment: note.assessment || null,
          plan: note.plan || null,
          updated_at: timestamp,
        })
        .eq('id', targetNoteId)
        .select('id')
        .single();

      if (error) throw new Error(`Failed to update clinical note: ${error.message}`);
      return { id: data.id };
    } else {
      const { data, error } = await supabaseAdmin
        .from('clinical_notes')
        .insert({
          consultation_id: consultationId,
          doctor_id: doctorId,
          content: note.content || null,
          subjective: note.subjective || null,
          objective: note.objective || null,
          assessment: note.assessment || null,
          plan: note.plan || null,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select('id')
        .single();

      if (error) throw new Error(`Failed to create clinical note: ${error.message}`);
      return { id: data.id };
    }
  }

  /**
   * Save draft prescription with offered medication choices.
   * Strictly requires consultation already assigned to this doctor.
   * Stores canonical medication options in prescriptions and prescription_items.
   */
  async savePrescriptionWithOptions(
    consultationId: string,
    doctorId: string,
    payload: {
      directions?: string;
      refillCount?: number;
      refillIntervalDays?: number;
      medicationOptions: MedicationOptionItem[];
      customClinicianMessage?: string;
    }
  ): Promise<{ prescriptionId: string }> {
    const timestamp = new Date().toISOString();

    // 0. Server-side medication option validation
    if (!Array.isArray(payload.medicationOptions)) {
      throw new Error('Medication options must be an array.');
    }

    for (const opt of payload.medicationOptions) {
      if (!opt.name || typeof opt.name !== 'string' || !opt.name.trim()) {
        throw new Error('Every medication option must have a non-empty name.');
      }
      if (!opt.strength || typeof opt.strength !== 'string' || !opt.strength.trim()) {
        throw new Error('Every medication option must have a non-empty strength.');
      }
      if (!opt.dosageForm || typeof opt.dosageForm !== 'string' || !opt.dosageForm.trim()) {
        throw new Error('Every medication option must have a non-empty dosage form.');
      }
      if (typeof opt.priceInr !== 'number' || !Number.isFinite(opt.priceInr) || opt.priceInr < 0) {
        throw new Error('Every medication option must have a valid non-negative price.');
      }
    }

    // Fetch consultation
    const { data: consultation, error: cErr } = await supabaseAdmin
      .from('consultations')
      .select('patient_id, assigned_to, responses, status')
      .eq('id', consultationId)
      .single();

    if (cErr || !consultation) {
      throw new Error('Consultation not found.');
    }

    if (!consultation.assigned_to || consultation.assigned_to !== doctorId) {
      throw new Error('Forbidden: Consultation must be claimed and assigned to you before prescribing medication.');
    }

    if (consultation.status === 'completed') {
      throw new Error('Forbidden: Consultation is finalized and prescription choices cannot be modified.');
    }

    // 1. Create or update prescription record
    const { data: existingRx } = await supabaseAdmin
      .from('prescriptions')
      .select('id, status')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    let prescriptionId: string;

    if (existingRx?.id) {
      prescriptionId = existingRx.id;
      const { error: rxUpErr } = await supabaseAdmin
        .from('prescriptions')
        .update({
          doctor_id: doctorId,
          directions: payload.directions || null,
          refill_count: payload.refillCount || 0,
          refill_interval_days: payload.refillIntervalDays || 30,
          updated_at: timestamp,
        })
        .eq('id', prescriptionId);

      if (rxUpErr) throw new Error(`Failed to update prescription: ${rxUpErr.message}`);
    } else {
      const { data: newRx, error: rxInErr } = await supabaseAdmin
        .from('prescriptions')
        .insert({
          consultation_id: consultationId,
          patient_id: consultation.patient_id,
          doctor_id: doctorId,
          status: 'draft',
          directions: payload.directions || null,
          refill_count: payload.refillCount || 0,
          refill_interval_days: payload.refillIntervalDays || 30,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select('id')
        .single();

      if (rxInErr) throw new Error(`Failed to create prescription: ${rxInErr.message}`);
      prescriptionId = newRx.id;
    }

    // 2. Synchronize prescription items cleanly (always delete old items first)
    const { error: delErr } = await supabaseAdmin
      .from('prescription_items')
      .delete()
      .eq('prescription_id', prescriptionId);

    if (delErr) {
      throw new Error(`Failed to synchronize prescription items: ${delErr.message}`);
    }

    if (payload.medicationOptions.length > 0) {
      const itemsToInsert = payload.medicationOptions.map((opt) => ({
        prescription_id: prescriptionId,
        medication_name: opt.name.trim(),
        active_ingredient: (opt.activeIngredient || opt.name).trim(),
        strength: opt.strength.trim(),
        dosage_form: opt.dosageForm.trim(),
        quantity: opt.quantity || 30,
        unit_price: opt.priceInr,
        description: (opt.description || '').trim() || null,
        is_recommended: Boolean(opt.isRecommended),
        sig: (payload.directions || '').trim() || null,
        created_at: timestamp,
      }));

      const { error: insErr } = await supabaseAdmin
        .from('prescription_items')
        .insert(itemsToInsert);

      if (insErr) {
        throw new Error(`Failed to insert canonical prescription items: ${insErr.message}`);
      }
    }

    // 3. Save lightweight reference in consultation responses
    const updatedResponses = {
      ...(consultation.responses || {}),
      medicationOptions: {
        prescriptionId,
        customClinicianMessage: payload.customClinicianMessage || 'These options correspond to your approved treatment plan. Please review the available choices.',
        updatedAt: timestamp,
      },
    };

    const { error: respUpErr } = await supabaseAdmin
      .from('consultations')
      .update({
        responses: updatedResponses,
        updated_at: timestamp,
      })
      .eq('id', consultationId);

    if (respUpErr) {
      throw new Error(`Failed to update consultation responses: ${respUpErr.message}`);
    }

    return { prescriptionId };
  }

  /**
   * Doctor approves consultation:
   * Strictly requires all 11 approval preconditions.
   * Idempotent: repeated approvals return existing success without duplicate side effects.
   */
  async approveConsultation(
    consultationId: string,
    doctorId: string,
    signOffData: {
      clinicianAttestation: boolean;
      doctorNotes?: string;
      treatmentSummary?: string;
    }
  ): Promise<{ success: boolean; status: string; signatureStatus: string; alreadyCompleted?: boolean }> {
    const timestamp = new Date().toISOString();

    // 1. Consultation exists
    const { data: consultation, error: cErr } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();

    if (cErr || !consultation) {
      throw new Error('Consultation not found.');
    }

    // 2. Doctor assigned check
    if (!consultation.assigned_to || consultation.assigned_to !== doctorId) {
      throw new Error('Forbidden: Consultation must be claimed and assigned to you before approving.');
    }

    // 3. Idempotent completion check
    if (consultation.status === 'completed') {
      return {
        success: true,
        alreadyCompleted: true,
        status: 'completed',
        signatureStatus: 'ready_for_signature',
      };
    }

    // 4. Clinician attestation check
    if (signOffData.clinicianAttestation !== true) {
      throw new Error('Validation failed: Clinician attestation check is required.');
    }

    // 5 & 6. Meaningful assessment and plan check in clinical notes
    const { data: notes } = await supabaseAdmin
      .from('clinical_notes')
      .select('*')
      .eq('consultation_id', consultationId)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    const latestNote = notes?.[0];
    const assessmentText = (latestNote?.assessment || signOffData.treatmentSummary || '').trim();
    const planText = (latestNote?.plan || '').trim();

    if (!assessmentText) {
      throw new Error('Validation failed: A meaningful clinical assessment is required before approval.');
    }
    if (!planText) {
      throw new Error('Validation failed: A meaningful clinical treatment plan is required before approval.');
    }

    // 7, 8, 9, 10. Prescription preconditions check
    const { data: prescription } = await supabaseAdmin
      .from('prescriptions')
      .select('id, doctor_id')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    if (!prescription?.id) {
      throw new Error('Validation failed: A prescription must be saved before approving consultation.');
    }
    if (prescription.doctor_id !== doctorId) {
      throw new Error('Validation failed: Prescription belongs to a different doctor.');
    }

    const { data: items } = await supabaseAdmin
      .from('prescription_items')
      .select('id')
      .eq('prescription_id', prescription.id);

    if (!items || items.length === 0) {
      throw new Error('Validation failed: Prescription must contain at least one offered medication option before approval.');
    }

    // Finalize prescription status
    const { error: rxUpErr } = await supabaseAdmin
      .from('prescriptions')
      .update({
        status: 'finalized',
        finalized_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', prescription.id);

    if (rxUpErr) {
      throw new Error(`Failed to finalize prescription: ${rxUpErr.message}`);
    }

    // Update consultation status to completed
    const updatedResponses = {
      ...(consultation.responses || {}),
      signOff: {
        doctorId,
        approvedAt: timestamp,
        clinicianAttestation: true,
        signaturePlaceholder: 'Electronic signature integration pending provider configuration',
        signing_status: 'ready_for_signature',
        treatmentSummary: assessmentText,
      },
      signing_status: 'ready_for_signature',
    };

    const { error: upConsultErr } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'completed',
        completed_at: timestamp,
        responses: updatedResponses,
        updated_at: timestamp,
      })
      .eq('id', consultationId);

    if (upConsultErr) {
      throw new Error(`Failed to update consultation status to completed: ${upConsultErr.message}`);
    }

    // Create exactly ONE patient notification in public.notifications
    const patientId = consultation.patient_id;
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const idempotencyKey = `consultation_approved_${consultationId}`;

    const { error: notifErr } = await supabaseAdmin
      .from('notifications')
      .upsert({
        id: notifId,
        patient_id: patientId,
        type: 'CONSULTATION_APPROVED',
        title: 'Your consultation has been reviewed',
        short_message: 'Your physician has reviewed your intake and approved clinical treatment options.',
        related_entity_id: consultationId,
        related_entity_type: 'consultation',
        status: 'unread',
        idempotency_key: idempotencyKey,
        created_at: timestamp,
      }, { onConflict: 'idempotency_key' });

    if (notifErr) {
      console.warn('[ClinicalWorkflow] Warning creating patient notification:', notifErr.message);
    }

    return {
      success: true,
      status: 'completed',
      signatureStatus: 'ready_for_signature',
    };
  }

  /**
   * List all consultations for the authenticated patient.
   */
  async listPatientConsultations(patientId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('id, patient_id, assigned_to, status, primary_concern, responses, submitted_at, completed_at, created_at, updated_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ClinicalWorkflow] Error fetching patient consultations:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Patient selects a medication option:
   * Accepts ONLY payload { prescriptionItemId: "<UUID>" }.
   * Validates option strictly against canonical offered options in prescription_items.
   * Updates canonical prescriptions table (selected_item_id, selected_at).
   */
  async selectMedicationOption(
    consultationId: string,
    patientId: string,
    payload: { prescriptionItemId?: string }
  ): Promise<{
    success: boolean;
    selectedOption: any;
    selectionStatus: string;
  }> {
    const timestamp = new Date().toISOString();

    const targetId = payload?.prescriptionItemId;
    if (!targetId || typeof targetId !== 'string' || !targetId.trim()) {
      throw new Error('Valid medication prescriptionItemId is required for selection.');
    }

    const { data: consultation, error: cErr } = await supabaseAdmin
      .from('consultations')
      .select('id, patient_id, status, responses')
      .eq('id', consultationId)
      .single();

    if (cErr || !consultation) {
      throw new Error('Consultation not found.');
    }

    if (consultation.patient_id !== patientId) {
      throw new Error('Forbidden: You can only select options for your own consultation.');
    }

    if (consultation.status !== 'completed') {
      throw new Error('Consultation is not in a completed state for medication selection.');
    }

    // Fetch canonical prescription
    const { data: prescription } = await supabaseAdmin
      .from('prescriptions')
      .select('id, status')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    if (!prescription?.id) {
      throw new Error('No clinical prescription found for this consultation.');
    }

    if (prescription.status !== 'finalized') {
      throw new Error('Prescription is not finalized by physician yet.');
    }

    const { data: items, error: itemErr } = await supabaseAdmin
      .from('prescription_items')
      .select('*')
      .eq('prescription_id', prescription.id);

    const offeredItems = items || [];
    if (itemErr || offeredItems.length === 0) {
      throw new Error('No offered medication items found for this prescription.');
    }

    const matchedItem = offeredItems.find((item) => item.id === targetId.trim());

    if (!matchedItem) {
      throw new Error('Invalid medication selection. Selected item ID is not in the offered clinical prescription.');
    }

    // Update canonical selection on prescriptions table
    const { error: rxUpErr } = await supabaseAdmin
      .from('prescriptions')
      .update({
        selected_item_id: matchedItem.id,
        selected_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', prescription.id);

    if (rxUpErr) {
      throw new Error(`Failed to save selected medication option in prescription: ${rxUpErr.message}`);
    }

    // Clean legacy selection fields from consultations.responses if present
    const currentResponses = { ...(consultation.responses || {}) };
    delete currentResponses.patient_selected_option;
    delete currentResponses.patient_selected_prescription_item_id;
    delete currentResponses.patient_selected_at;
    delete currentResponses.pharmacy_handoff_status;

    await supabaseAdmin
      .from('consultations')
      .update({
        responses: currentResponses,
        updated_at: timestamp,
      })
      .eq('id', consultationId);

    const selectedOptionDto = {
      id: matchedItem.id,
      name: matchedItem.medication_name,
      strength: matchedItem.strength,
      dosageForm: matchedItem.dosage_form,
      priceInr: matchedItem.unit_price || 0,
      description: matchedItem.description || matchedItem.directions || 'Clinical therapeutic regimen',
      isRecommended: matchedItem.is_recommended ?? false,
    };

    return {
      success: true,
      selectedOption: selectedOptionDto,
      selectionStatus: 'selected_pending_payment',
    };
  }

  /**
   * Retrieve in-app notifications for authenticated user.
   * Maps fields to ensure frontend receives read, message, action_url, related_entity_id.
   * Deep links respect the recipient role: doctors open /doctor/consultations/:id, patients open /account or /consultation.
   */
  async getUserNotifications(userId: string, role?: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ClinicalWorkflow] Error fetching notifications:', error.message);
      return [];
    }

    const isDoctor = role === 'doctor';

    return (data || []).map((n: any) => {
      let actionUrl = isDoctor ? '/doctor/work-queue' : '/account';
      if (n.related_entity_type === 'consultation' && n.related_entity_id) {
        actionUrl = isDoctor
          ? `/doctor/consultations/${n.related_entity_id}`
          : `/consultation?id=${n.related_entity_id}`;
      } else if (n.related_entity_type === 'thread' || n.related_entity_type === 'message') {
        actionUrl = isDoctor ? '/doctor/messages' : '/messages';
      } else if (n.related_entity_type === 'order') {
        actionUrl = '/account';
      }

      return {
        id: n.id,
        patient_id: n.patient_id,
        type: n.type,
        title: n.title,
        message: n.short_message || '',
        short_message: n.short_message || '',
        status: n.status,
        read: n.status === 'read' || Boolean(n.read_at),
        related_entity_id: n.related_entity_id,
        related_entity_type: n.related_entity_type,
        action_url: actionUrl,
        created_at: n.created_at,
        read_at: n.read_at,
      };
    });
  }

  /**
   * List message threads for a user (doctor or patient) from Supabase message_threads table.
   * Attaches participant metadata (names, avatar).
   */
  async listUserThreads(userId: string, role: string): Promise<any[]> {
    const { messageRepository } = await import('../repositories/messageRepository');
    const threads = await messageRepository.listThreadsForUser(userId, role as any);

    // Fetch participant info for all threads
    const enrichedThreads = await Promise.all(
      threads.map(async (t) => {
        const otherId = role === 'doctor' ? t.patient_id : t.doctor_id;
        let participantName = 'User';
        let participantMrn = '';

        if (role === 'doctor') {
          // Fetch patient profile
          const { data: pProfile } = await supabaseAdmin
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', otherId)
            .maybeSingle();

          if (pProfile) {
            participantName = `${pProfile.first_name || ''} ${pProfile.last_name || ''}`.trim() || pProfile.email || 'Patient';
          }
          if (t.consultation_id) {
            participantMrn = `MRN-${t.consultation_id.slice(0, 6).toUpperCase()}`;
          }
        } else {
          // Fetch doctor staff profile
          const { data: sProfile } = await supabaseAdmin
            .from('staff_profiles')
            .select('display_name, first_name, last_name, specialty')
            .eq('id', otherId)
            .maybeSingle();

          if (sProfile) {
            participantName = sProfile.display_name || `Dr. ${sProfile.first_name || ''} ${sProfile.last_name || ''}`.trim();
          } else {
            const { data: bProfile } = await supabaseAdmin
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', otherId)
              .maybeSingle();
            if (bProfile) {
              participantName = `Dr. ${bProfile.first_name || ''} ${bProfile.last_name || ''}`.trim();
            }
          }
        }

        return {
          id: t.id,
          consultationId: t.consultation_id,
          patientId: t.patient_id,
          doctorId: t.doctor_id,
          patientName: role === 'doctor' ? participantName : undefined,
          doctorName: role !== 'doctor' ? participantName : undefined,
          patientMrn: participantMrn,
          subject: t.consultation_id ? `Consultation #${t.consultation_id.slice(0, 8)}` : 'Care Team Consultation',
          status: t.status,
          unread: role === 'doctor' ? (t.doctor_unread_count || 0) > 0 : (t.patient_unread_count || 0) > 0,
          patientUnreadCount: t.patient_unread_count || 0,
          doctorUnreadCount: t.doctor_unread_count || 0,
          lastMessageSnippet: t.last_message_preview || 'No messages yet',
          lastMessagePreview: t.last_message_preview || 'No messages yet',
          lastMessageTime: t.last_message_at ? new Date(t.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          lastMessageAt: t.last_message_at || t.created_at,
          priority: 'normal' as const,
        };
      })
    );

    return enrichedThreads;
  }

  /**
   * List messages in a specific thread from Supabase messages table.
   * Enforces participant authorization.
   */
  async getThreadMessages(threadId: string, userId: string, role: string): Promise<any[]> {
    const { messageRepository } = await import('../repositories/messageRepository');
    const thread = await messageRepository.getThread(threadId);

    if (!thread) {
      throw new Error('Message thread not found');
    }

    if (role === 'doctor' && thread.doctor_id !== userId) {
      throw new Error('Forbidden: You are not a participant in this conversation');
    }
    if (role === 'patient' && thread.patient_id !== userId) {
      throw new Error('Forbidden: You are not a participant in this conversation');
    }

    const messages = await messageRepository.listMessages(threadId, 100);

    return messages.map((m) => ({
      id: m.id,
      threadId: m.thread_id,
      sender: m.sender_role,
      senderUid: m.sender_uid,
      senderName: m.sender_role === 'doctor' ? 'Attending Physician' : 'Patient',
      text: m.message_text,
      createdAt: m.created_at,
      timestamp: m.created_at,
      timeFormatted: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
  }

  /**
   * Send a message to a thread and create recipient notification.
   */
  async sendMessageToThread(threadId: string, senderUid: string, senderRole: string, text: string): Promise<{ messageId: string; createdAt: string }> {
    if (senderRole !== 'doctor' && senderRole !== 'patient') {
      throw new Error('Forbidden: Unsupported messaging role');
    }

    const { messageRepository } = await import('../repositories/messageRepository');
    const thread = await messageRepository.getThread(threadId);

    if (!thread) {
      throw new Error('Message thread not found');
    }

    if (senderRole === 'patient' && thread.patient_id !== senderUid) {
      throw new Error('Forbidden: You are not a participant in this message thread');
    }
    if (senderRole === 'doctor' && thread.doctor_id !== senderUid) {
      throw new Error('Forbidden: You are not a participant in this message thread');
    }

    const result = await messageRepository.addMessage({
      threadId,
      senderUid,
      senderRole: senderRole as any,
      text,
    });

    // Create a notification for the recipient
    try {
      const recipientId = senderRole === 'doctor' ? thread.patient_id : thread.doctor_id;
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const idempotencyKey = `msg_notif_${result.messageId}`;

      const { error: notifErr } = await supabaseAdmin
        .from('notifications')
        .upsert({
          id: notifId,
          patient_id: recipientId,
          type: 'NEW_MESSAGE',
          title: senderRole === 'doctor' ? 'New Message from Physician' : 'New Patient Message',
          short_message: text.length > 80 ? `${text.slice(0, 77)}...` : text,
          related_entity_id: threadId,
          related_entity_type: 'thread',
          status: 'unread',
          idempotency_key: idempotencyKey,
          created_at: result.createdAt,
        }, { onConflict: 'idempotency_key' });

      if (notifErr) {
        console.error('[ClinicalWorkflow] Failed to create message recipient notification:', notifErr.message);
      }
    } catch (notifErr: any) {
      console.error('[ClinicalWorkflow] Error sending message notification:', notifErr?.message || notifErr);
    }

    return result;
  }

  /**
   * Mark thread as read for the user.
   */
  async markThreadRead(threadId: string, readerUid: string, role: string): Promise<void> {
    const { messageRepository } = await import('../repositories/messageRepository');
    await messageRepository.markAsRead(threadId, readerUid, role as any);
  }

  /**
   * Retrieve prescriptions authored or managed by the authenticated doctor.
   */
  async getDoctorPrescriptions(doctorId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .select(`
        *,
        items:prescription_items(*),
        consultation:consultations(id, responses, patient_id, status)
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ClinicalWorkflow] Error fetching doctor prescriptions:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Mark notification as read.
   */
  async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    const { data: notif } = await supabaseAdmin
      .from('notifications')
      .select('patient_id')
      .eq('id', notificationId)
      .maybeSingle();

    if (!notif) {
      throw new Error('Notification not found.');
    }

    if (notif.patient_id !== userId) {
      throw new Error('Forbidden: You are not authorized to update this notification.');
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to update notification: ${error.message}`);
    }

    return true;
  }

  /**
   * Mark all unread notifications as read for user.
   */
  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('patient_id', userId)
      .eq('status', 'unread');

    return !error;
  }
}

export const clinicalWorkflowService = new ClinicalWorkflowService();
