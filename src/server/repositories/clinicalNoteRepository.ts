import { supabaseAdmin } from '../supabaseAdmin';
import { DbClinicalNote } from './types';
import { consultationRepository } from './consultationRepository';

export class ClinicalNoteRepository {
  /**
   * Retrieves clinical notes for a consultation.
   * Access requires caller to be the assigned doctor or an authorized admin.
   */
  async getByConsultationId(consultationId: string, actorUid: string, actorRole: string): Promise<DbClinicalNote[]> {
    // 1. Verify consultation and authorization
    const consultation = await consultationRepository.getById(consultationId);
    if (!consultation) {
      throw new Error('Consultation not found');
    }

    if (actorRole !== 'admin' && consultation.assigned_to !== actorUid) {
      throw new Error('Forbidden: Only the assigned doctor or admin can access clinical notes');
    }

    const { data, error } = await supabaseAdmin
      .from('clinical_notes')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[ClinicalNoteRepository] getByConsultationId failed:`, error.message);
      return [];
    }
    return (data || []) as DbClinicalNote[];
  }

  /**
   * Saves or appends a clinical note.
   * Must be written by the assigned doctor or admin.
   */
  async saveNote(params: {
    consultationId: string;
    doctorId: string;
    content?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    legacyDocumentId?: string;
  }): Promise<DbClinicalNote> {
    const consultation = await consultationRepository.getById(params.consultationId);
    if (!consultation) {
      throw new Error('Consultation not found');
    }

    if (consultation.assigned_to && consultation.assigned_to !== params.doctorId) {
      throw new Error('Forbidden: Doctor is not assigned to this consultation');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('clinical_notes')
      .insert({
        consultation_id: params.consultationId,
        doctor_id: params.doctorId,
        content: params.content || null,
        subjective: params.subjective || null,
        objective: params.objective || null,
        assessment: params.assessment || null,
        plan: params.plan || null,
        legacy_document_id: params.legacyDocumentId || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save clinical note: ${error.message}`);
    }
    return data as DbClinicalNote;
  }

  /**
   * Updates an existing clinical note by ID.
   */
  async updateNote(
    noteId: string,
    doctorId: string,
    updates: Partial<Pick<DbClinicalNote, 'content' | 'subjective' | 'objective' | 'assessment' | 'plan'>>
  ): Promise<DbClinicalNote> {
    const { data, error } = await supabaseAdmin
      .from('clinical_notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update clinical note: ${error.message}`);
    }
    return data as DbClinicalNote;
  }
}

export const clinicalNoteRepository = new ClinicalNoteRepository();
