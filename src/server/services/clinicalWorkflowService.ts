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
   * Fetch full consultation details for doctor or owning patient.
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
    const isAssignedDoctor = authUser.uid === consultation.assigned_to;
    const isDoctorRole = authUser.role === 'doctor';
    const isAdmin = authUser.role === 'admin';

    if (!isPatientOwner && !isAssignedDoctor && !isDoctorRole && !isAdmin) {
      throw new Error('Forbidden: You do not have permission to view this clinical consultation.');
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

    return {
      consultation,
      patient: patientProfile,
      doctor: doctorProfile,
      clinicalNotes: notes || [],
      prescription: prescription ? { ...prescription, items: prescriptionItems } : null,
      medicationOptions: consultation.responses?.medicationOptions || null,
      selectedOption: consultation.responses?.patient_selected_option || null,
      pharmacyHandoffStatus: consultation.responses?.pharmacy_handoff_status || null,
      signingStatus: consultation.responses?.signing_status || (consultation.status === 'completed' ? 'approved' : null),
    };
  }

  /**
   * List doctor's consultations (both assigned and unassigned submitted queue).
   */
  async listDoctorConsultations(doctorId: string, filter: 'all' | 'assigned' | 'queue' | 'completed' = 'all'): Promise<any[]> {
    let query = supabaseAdmin
      .from('consultations')
      .select('id, patient_id, assigned_to, status, primary_concern, responses, submitted_at, completed_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (filter === 'assigned') {
      query = query.eq('assigned_to', doctorId);
    } else if (filter === 'queue') {
      query = query.or(`assigned_to.is.null,assigned_to.eq.${doctorId}`).in('status', ['submitted', 'assigned', 'under_review']);
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed');
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list doctor consultations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Save doctor clinical note (SOAP / assessment).
   */
  async saveClinicalNote(consultationId: string, doctorId: string, note: { content?: string; subjective?: string; objective?: string; assessment?: string; plan?: string; noteId?: string }): Promise<{ id: string }> {
    const timestamp = new Date().toISOString();

    // Ensure doctor is assigned
    await supabaseAdmin
      .from('consultations')
      .update({ assigned_to: doctorId, status: 'under_review', updated_at: timestamp })
      .eq('id', consultationId)
      .eq('status', 'assigned');

    if (note.noteId) {
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
        .eq('id', note.noteId)
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

    // Fetch consultation
    const { data: consultation, error: cErr } = await supabaseAdmin
      .from('consultations')
      .select('patient_id, responses')
      .eq('id', consultationId)
      .single();

    if (cErr || !consultation) {
      throw new Error('Consultation not found.');
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

    // 2. Save medication options to consultation responses metadata
    const updatedResponses = {
      ...(consultation.responses || {}),
      medicationOptions: {
        options: payload.medicationOptions,
        customClinicianMessage: payload.customClinicianMessage || 'These options correspond to your approved treatment plan. Please review the available choices.',
        updatedAt: timestamp,
      },
    };

    await supabaseAdmin
      .from('consultations')
      .update({
        responses: updatedResponses,
        updated_at: timestamp,
      })
      .eq('id', consultationId);

    // 3. Upsert first option as primary prescription item
    if (payload.medicationOptions.length > 0) {
      const primary = payload.medicationOptions[0];
      await supabaseAdmin
        .from('prescription_items')
        .delete()
        .eq('prescription_id', prescriptionId);

      await supabaseAdmin
        .from('prescription_items')
        .insert(
          payload.medicationOptions.map(opt => ({
            prescription_id: prescriptionId,
            medication_name: opt.name,
            strength: opt.strength || 'Standard',
            dosage_form: opt.dosageForm || 'Oral',
            quantity: 30,
            unit_price: opt.priceInr || 0,
            created_at: timestamp,
          }))
        );
    }

    return { prescriptionId };
  }

  /**
   * Doctor approves consultation:
   * 1. Updates consultation status to 'completed'.
   * 2. Sets electronic signature placeholder status.
   * 3. Creates exactly ONE patient notification in Supabase public.notifications.
   */
  async approveConsultation(
    consultationId: string,
    doctorId: string,
    signOffData: {
      clinicianAttestation: boolean;
      doctorNotes?: string;
      treatmentSummary?: string;
    }
  ): Promise<{ success: boolean; status: string; signatureStatus: string }> {
    const timestamp = new Date().toISOString();

    const { data: consultation, error: cErr } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();

    if (cErr || !consultation) {
      throw new Error('Consultation not found.');
    }

    // Update consultation status and sign-off metadata
    const updatedResponses = {
      ...(consultation.responses || {}),
      signOff: {
        doctorId,
        approvedAt: timestamp,
        clinicianAttestation: signOffData.clinicianAttestation,
        signaturePlaceholder: 'Electronic signature integration pending provider configuration',
        signing_status: 'ready_for_signature',
        treatmentSummary: signOffData.treatmentSummary || '',
      },
      signing_status: 'ready_for_signature',
    };

    const { error: upConsultErr } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'completed',
        completed_at: timestamp,
        assigned_to: doctorId,
        responses: updatedResponses,
        updated_at: timestamp,
      })
      .eq('id', consultationId);

    if (upConsultErr) {
      throw new Error(`Failed to approve consultation: ${upConsultErr.message}`);
    }

    // Finalize prescription status if draft exists
    await supabaseAdmin
      .from('prescriptions')
      .update({
        status: 'finalized',
        finalized_at: timestamp,
        updated_at: timestamp,
      })
      .eq('consultation_id', consultationId);

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
   * Patient selects a medication option:
   * Saves patient choice separately from clinical prescription.
   * Sets status to 'Ready for Pharmacy'.
   */
  async selectMedicationOption(
    consultationId: string,
    patientId: string,
    selectedOption: MedicationOptionItem
  ): Promise<{ success: boolean; pharmacyHandoffStatus: string }> {
    const timestamp = new Date().toISOString();

    const { data: consultation, error: cErr } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();

    if (cErr || !consultation) {
      throw new Error('Consultation not found.');
    }

    if (consultation.patient_id !== patientId) {
      throw new Error('Forbidden: You can only select options for your own consultation.');
    }

    const updatedResponses = {
      ...(consultation.responses || {}),
      patient_selected_option: {
        ...selectedOption,
        selectedAt: timestamp,
      },
      pharmacy_handoff_status: 'ready_for_pharmacy',
    };

    const { error: upErr } = await supabaseAdmin
      .from('consultations')
      .update({
        responses: updatedResponses,
        updated_at: timestamp,
      })
      .eq('id', consultationId);

    if (upErr) {
      throw new Error(`Failed to save selected medication option: ${upErr.message}`);
    }

    return {
      success: true,
      pharmacyHandoffStatus: 'ready_for_pharmacy',
    };
  }

  /**
   * Retrieve in-app notifications for authenticated user.
   */
  async getUserNotifications(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ClinicalWorkflow] Error fetching notifications:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Mark notification as read.
   */
  async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('patient_id', userId);

    return !error;
  }
}

export const clinicalWorkflowService = new ClinicalWorkflowService();
