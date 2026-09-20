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
        .eq('patient_id', patientId)
        .eq('status', 'draft')
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to update consultation draft: ${error.message}`);
      }
      return { id: data.id };
    } else {
      // Find if an active draft already exists for this patient
      const { data: activeDraft, error: draftError } = await supabaseAdmin
        .from('consultations')
        .select('id')
        .eq('patient_id', patientId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draftError) {
        throw new Error(`Failed to retrieve consultation draft: ${draftError.message}`);
      }

      if (activeDraft?.id) {
        const { data, error } = await supabaseAdmin
          .from('consultations')
          .update({
            primary_concern: primaryConcern,
            responses,
            updated_at: timestamp,
          })
          .eq('id', activeDraft.id)
          .eq('patient_id', patientId)
          .eq('status', 'draft')
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
      throw new Error(`Failed to retrieve consultation draft: ${error.message}`);
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
    const testDoctorEmail = process.env.TEST_DOCTOR_EMAIL?.trim().toLowerCase() || null;

    // Execute atomic Postgres RPC exclusively
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('fn_submit_consultation', {
      p_consultation_id: consultationId,
      p_patient_id: patientId,
      p_test_doctor_email: testDoctorEmail,
    });

    if (rpcErr) {
      throw new Error(`Failed to submit consultation: ${rpcErr.message}`);
    }

    if (!rpcRes || !rpcRes.success) {
      throw new Error('Failed to submit consultation: Transaction RPC returned unsuccessful status.');
    }

    return {
      success: true,
      consultationId: rpcRes.consultationId || consultationId,
      assignedDoctorId: rpcRes.assignedDoctorId || undefined,
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
    const requesterRole = authUser.role;

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
        .select('id, email, first_name, last_name, initials, specialties')
        .eq('id', consultation.assigned_to)
        .maybeSingle();

      if (doc) {
        const displayName = `${doc.first_name || ''} ${doc.last_name || ''}`.trim() || doc.initials || 'Attending Physician';
        doctorProfile = {
          ...doc,
          display_name: displayName,
        };
      }
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

    // Assemble canonical medication options strictly from prescription_items
    let canonicalMedicationOptions: any = null;
    const customClinicianMessage = prescription?.clinician_message || 'These options correspond to your approved treatment plan.';

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
        prescriptionId: prescription?.id,
        options: optionsList,
        customClinicianMessage,
        updatedAt: prescription?.updated_at || consultation.updated_at,
      };
    } else {
      canonicalMedicationOptions = {
        prescriptionId: prescription?.id || null,
        options: [],
        customClinicianMessage,
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

    const isPatientRole = requesterRole === 'patient';

    // If patient requesting non-completed consultation, sanitize response (no internal notes, no draft prescriptions)
    if (isPatientRole && consultation.status !== 'completed') {
      return {
        consultation,
        patient: patientProfile,
        doctor: doctorProfile,
        clinicalNotes: [],
        prescription: null,
        medicationOptions: null,
        selectedOption: null,
        selectionStatus: null,
        pharmacyHandoffStatus: null,
        signingStatus: null,
        isTriageOnly: false,
        isClaimable: false,
      };
    }

    const clinicalSummary = notes && notes.length > 0 ? (notes[0].assessment || notes[0].plan || 'Treatment plan issued.') : 'Clinical evaluation complete.';

    return {
      consultation,
      patient: patientProfile,
      doctor: doctorProfile,
      clinicalSummary,
      clinicalNotes: isPatientRole ? [] : (notes || []),
      prescription: prescription ? { ...prescription, items: prescriptionItems } : null,
      prescriptionItems,
      medicationOptions: canonicalMedicationOptions,
      selectedOption: selectedOptionDto,
      selectionStatus: selectedItemId ? 'selected_pending_payment' : null,
      clinicianMessage: customClinicianMessage,
      pharmacyHandoffStatus: null,
      signingStatus: consultation.responses?.signing_status || (consultation.status === 'completed' ? 'ready_for_signature' : null),
      isTriageOnly: false,
      isClaimable: ['submitted', 'assigned'].includes(consultation.status) && (consultation.assigned_to === authUser.uid || !consultation.assigned_to),
    };
  }

  /**
   * Explicitly claim an unassigned or assigned consultation for review.
   * Sets assigned_to = doctor.uid and status = 'under_review'.
   * Uses fn_claim_consultation RPC.
   */
  async claimConsultation(consultationId: string, doctorId: string): Promise<{ success: boolean; assignedTo: string; status: string; alreadyClaimed?: boolean }> {
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('fn_claim_consultation', {
      p_consultation_id: consultationId,
      p_doctor_id: doctorId,
    });

    if (rpcErr) {
      throw new Error(`Failed to claim consultation: ${rpcErr.message}`);
    }

    if (!rpcRes || !rpcRes.success) {
      throw new Error('Failed to claim consultation: Transaction RPC returned unsuccessful status.');
    }

    return {
      success: true,
      assignedTo: rpcRes.assignedTo || doctorId,
      status: rpcRes.status || 'under_review',
      alreadyClaimed: Boolean(rpcRes.alreadyClaimed),
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

    if (consultation.status !== 'under_review') {
      throw new Error(`Forbidden: Consultation must be under_review before writing clinical notes. Current status: ${consultation.status}`);
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

    if (consultation.status !== 'under_review') {
      throw new Error(`Forbidden: Consultation must be under_review before prescribing medication. Current status: ${consultation.status}`);
    }

    // 1. Create or update prescription record
    const { data: existingRx } = await supabaseAdmin
      .from('prescriptions')
      .select('id, status, doctor_id')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    if (existingRx?.doctor_id && existingRx.doctor_id !== doctorId) {
      throw new Error('Forbidden: Prescription belongs to a different doctor and cannot be modified.');
    }

    if (existingRx?.status === 'finalized') {
      throw new Error('Forbidden: Prescription is finalized and cannot be modified.');
    }

    const rpcItems = (payload.medicationOptions || []).map((opt, idx) => ({
      id: opt.id || `opt_${idx + 1}`,
      name: opt.name,
      strength: opt.strength,
      dosageForm: opt.dosageForm,
      priceInr: opt.priceInr,
      description: opt.description || '',
      isRecommended: Boolean(opt.isRecommended),
      activeIngredient: opt.activeIngredient || '',
      quantity: opt.quantity || 1,
      medication_name: opt.name,
      dosage_form: opt.dosageForm,
      price_inr: opt.priceInr,
      is_recommended: Boolean(opt.isRecommended),
      active_ingredient: opt.activeIngredient || '',
    }));

    // Call canonical atomic Postgres RPC transaction exclusively (fail-closed, no non-atomic fallback)
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('fn_save_prescription_with_options', {
      p_consultation_id: consultationId,
      p_doctor_id: doctorId,
      p_directions: payload.directions || null,
      p_refill_count: payload.refillCount || 0,
      p_refill_interval_days: payload.refillIntervalDays || 30,
      p_clinician_message: payload.customClinicianMessage || null,
      p_items: rpcItems,
    });

    if (rpcErr) {
      throw new Error(`Failed to save prescription atomically: ${rpcErr.message}`);
    }

    if (!rpcRes?.success || !rpcRes?.prescriptionId) {
      throw new Error('Failed to save prescription atomically: RPC returned unsuccessful status.');
    }

    return { prescriptionId: rpcRes.prescriptionId };
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
    // Execute atomic Postgres RPC exclusively
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('fn_approve_consultation', {
      p_consultation_id: consultationId,
      p_doctor_id: doctorId,
      p_attestation: signOffData.clinicianAttestation,
      p_summary: signOffData.treatmentSummary || signOffData.doctorNotes || null,
    });

    if (rpcErr) {
      throw new Error(`Failed to approve consultation: ${rpcErr.message}`);
    }

    if (!rpcRes || !rpcRes.success) {
      throw new Error('Failed to approve consultation: Transaction RPC returned unsuccessful status.');
    }

    return rpcRes;
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
   * Calls fn_select_medication_option RPC for atomic, row-locked selection.
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
    const targetId = payload?.prescriptionItemId;
    if (!targetId || typeof targetId !== 'string' || !targetId.trim()) {
      throw new Error('Valid medication prescriptionItemId is required for selection.');
    }

    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('fn_select_medication_option', {
      p_consultation_id: consultationId,
      p_patient_id: patientId,
      p_prescription_item_id: targetId.trim(),
    });

    if (rpcErr) {
      throw new Error(`Failed to select medication option: ${rpcErr.message}`);
    }

    if (!rpcRes || !rpcRes.success) {
      throw new Error(rpcRes?.error || 'Failed to select medication option.');
    }

    return {
      success: true,
      selectedOption: rpcRes.selectedOption,
      selectionStatus: rpcRes.selectionStatus || 'selected_pending_payment',
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
            .select('first_name, last_name, initials, specialties')
            .eq('id', otherId)
            .maybeSingle();

          if (sProfile) {
            participantName = `Dr. ${sProfile.first_name || ''} ${sProfile.last_name || ''}`.trim();
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
   * Enforces participant authorization (patient/doctor only).
   */
  async getThreadMessages(threadId: string, userId: string, role: string): Promise<any[]> {
    if (role !== 'doctor' && role !== 'patient') {
      throw new Error('Forbidden: Only patient and doctor participants can access message threads');
    }

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

    // Execute atomic Postgres RPC exclusively
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('fn_send_message', {
      p_thread_id: threadId,
      p_sender_uid: senderUid,
      p_sender_role: senderRole,
      p_message_text: text,
    });

    if (rpcErr) {
      throw new Error(`Failed to send message: ${rpcErr.message}`);
    }

    if (!rpcRes || !rpcRes.success || !rpcRes.messageId) {
      throw new Error('Failed to send message: Transaction RPC returned unsuccessful status.');
    }

    return {
      messageId: rpcRes.messageId,
      createdAt: rpcRes.createdAt,
    };
  }

  /**
   * Mark thread as read for the user.
   */
  async markThreadRead(threadId: string, readerUid: string, role: string): Promise<void> {
    if (role !== 'doctor' && role !== 'patient') {
      throw new Error('Forbidden: Only patient and doctor participants can update thread read status');
    }
    const { messageRepository } = await import('../repositories/messageRepository');
    const thread = await messageRepository.getThread(threadId);
    if (!thread) {
      throw new Error('Message thread not found');
    }
    if (role === 'patient' && thread.patient_id !== readerUid) {
      throw new Error('Forbidden: You are not a participant in this message thread');
    }
    if (role === 'doctor' && thread.doctor_id !== readerUid) {
      throw new Error('Forbidden: You are not a participant in this message thread');
    }

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
