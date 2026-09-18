import { supabaseAdmin } from '../supabaseAdmin';
import { DbConsultation, ConsultationStatus } from './types';

export class ConsultationRepository {
  async getById(id: string): Promise<DbConsultation | null> {
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[ConsultationRepository] getById failed:`, error.message);
      return null;
    }
    return data as DbConsultation;
  }

  async getByLegacyId(legacyId: string): Promise<DbConsultation | null> {
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('legacy_document_id', legacyId)
      .maybeSingle();

    if (error) {
      console.error(`[ConsultationRepository] getByLegacyId failed:`, error.message);
      return null;
    }
    return data as DbConsultation;
  }

  async listByPatient(patientId: string): Promise<DbConsultation[]> {
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[ConsultationRepository] listByPatient failed:`, error.message);
      return [];
    }
    return (data || []) as DbConsultation[];
  }

  async listAssignedToDoctor(doctorId: string, statusFilter?: ConsultationStatus): Promise<DbConsultation[]> {
    let query = supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('assigned_to', doctorId)
      .order('updated_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[ConsultationRepository] listAssignedToDoctor failed:`, error.message);
      return [];
    }
    return (data || []) as DbConsultation[];
  }

  /**
   * Minimal operational queue surface for unassigned consultations.
   * Returns non-sensitive operational fields only.
   */
  async listUnassignedQueue(): Promise<Partial<DbConsultation>[]> {
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('id, primary_concern, status, submitted_at, schema_version, created_at')
      .eq('status', 'submitted')
      .is('assigned_to', null)
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error(`[ConsultationRepository] listUnassignedQueue failed:`, error.message);
      return [];
    }
    return (data || []) as Partial<DbConsultation>[];
  }

  /**
   * Creates a new consultation in 'draft' status.
   * Patients can only initiate drafts. Server enforces patient ownership.
   */
  async createDraft(params: {
    patientId: string;
    primaryConcern: string;
    responses: Record<string, any>;
    schemaVersion?: number;
    legacyDocumentId?: string;
  }): Promise<DbConsultation> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .insert({
        patient_id: params.patientId,
        primary_concern: params.primaryConcern,
        responses: params.responses || {},
        schema_version: params.schemaVersion || 1,
        status: 'draft',
        legacy_document_id: params.legacyDocumentId || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create consultation draft: ${error.message}`);
    }
    return data as DbConsultation;
  }

  /**
   * Patient update of their OWN draft consultation.
   * Explicitly forbidden from updating assigned_to, completed_at, submitted_at, or status.
   */
  async updateDraft(
    id: string,
    patientId: string,
    updates: { primaryConcern?: string; responses?: Record<string, any> }
  ): Promise<DbConsultation> {
    // 1. Verify consultation exists, belongs to patient, and is still in draft
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Consultation not found');
    }
    if (existing.patient_id !== patientId) {
      throw new Error('Forbidden: Cannot modify another patient’s consultation');
    }
    if (existing.status !== 'draft') {
      throw new Error('Forbidden: Only draft consultations can be modified by patients');
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.primaryConcern !== undefined) {
      updatePayload.primary_concern = updates.primaryConcern;
    }
    if (updates.responses !== undefined) {
      updatePayload.responses = updates.responses;
    }

    const { data, error } = await supabaseAdmin
      .from('consultations')
      .update(updatePayload)
      .eq('id', id)
      .eq('patient_id', patientId)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update consultation draft: ${error.message}`);
    }
    return data as DbConsultation;
  }

  /**
   * Submits a draft consultation for review.
   * Enforces server timestamp and transitions status to 'submitted'.
   */
  async submitConsultation(id: string, patientId: string): Promise<DbConsultation> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Consultation not found');
    }
    if (existing.patient_id !== patientId) {
      throw new Error('Forbidden: Cannot submit another patient’s consultation');
    }
    if (existing.status !== 'draft') {
      throw new Error('Consultation has already been submitted or completed');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'submitted',
        submitted_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq('patient_id', patientId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit consultation: ${error.message}`);
    }
    return data as DbConsultation;
  }

  /**
   * Server-controlled doctor assignment (Admin or automated dispatcher).
   */
  async assignDoctor(id: string, doctorId: string): Promise<DbConsultation> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Consultation not found');
    }
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new Error(`Cannot assign a doctor to a ${existing.status} consultation`);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .update({
        assigned_to: doctorId,
        status: 'assigned',
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign doctor: ${error.message}`);
    }
    return data as DbConsultation;
  }

  /**
   * Transitions consultation to 'under_review' when the assigned doctor logs review.
   */
  async logReview(id: string, doctorId: string): Promise<DbConsultation> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Consultation not found');
    }
    if (existing.assigned_to !== doctorId) {
      throw new Error('Forbidden: Doctor is not assigned to this consultation');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'under_review',
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update consultation status: ${error.message}`);
    }
    return data as DbConsultation;
  }

  /**
   * Completes the consultation. Only permitted by assigned doctor or admin.
   */
  async completeConsultation(id: string, doctorId: string): Promise<DbConsultation> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Consultation not found');
    }
    if (existing.assigned_to !== doctorId) {
      throw new Error('Forbidden: Only the assigned doctor can complete this consultation');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'completed',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to complete consultation: ${error.message}`);
    }
    return data as DbConsultation;
  }

  /**
   * Cancels the consultation.
   */
  async cancelConsultation(id: string): Promise<DbConsultation> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel consultation: ${error.message}`);
    }
    return data as DbConsultation;
  }
}

export const consultationRepository = new ConsultationRepository();
