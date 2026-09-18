import { supabaseAdmin } from '../supabaseAdmin';
import { DbClinicalDocument, DocumentType } from './types';

export class DocumentRepository {
  async getById(id: string): Promise<DbClinicalDocument | null> {
    const { data, error } = await supabaseAdmin
      .from('clinical_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[DocumentRepository] getById failed:`, error.message);
      return null;
    }
    return data as DbClinicalDocument;
  }

  async getByLegacyId(legacyId: string): Promise<DbClinicalDocument | null> {
    const { data, error } = await supabaseAdmin
      .from('clinical_documents')
      .select('*')
      .eq('legacy_document_id', legacyId)
      .maybeSingle();

    if (error) {
      console.error(`[DocumentRepository] getByLegacyId failed:`, error.message);
      return null;
    }
    return data as DbClinicalDocument;
  }

  async listByConsultation(consultationId: string): Promise<DbClinicalDocument[]> {
    const { data, error } = await supabaseAdmin
      .from('clinical_documents')
      .select('*')
      .eq('source_entity_id', consultationId)
      .eq('document_type', 'consultation')
      .order('version', { ascending: false });

    if (error) {
      console.error(`[DocumentRepository] listByConsultation failed:`, error.message);
      return [];
    }
    return (data || []) as DbClinicalDocument[];
  }

  async listByPrescription(prescriptionId: string): Promise<DbClinicalDocument[]> {
    const { data, error } = await supabaseAdmin
      .from('clinical_documents')
      .select('*')
      .eq('source_entity_id', prescriptionId)
      .eq('document_type', 'prescription')
      .order('version', { ascending: false });

    if (error) {
      console.error(`[DocumentRepository] listByPrescription failed:`, error.message);
      return [];
    }
    return (data || []) as DbClinicalDocument[];
  }

  async listByPatient(patientId: string): Promise<DbClinicalDocument[]> {
    const { data, error } = await supabaseAdmin
      .from('clinical_documents')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[DocumentRepository] listByPatient failed:`, error.message);
      return [];
    }
    return (data || []) as DbClinicalDocument[];
  }

  async recordDocument(documentData: Omit<DbClinicalDocument, 'id' | 'created_at'>): Promise<DbClinicalDocument> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('clinical_documents')
      .insert({
        ...documentData,
        created_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record clinical document metadata: ${error?.message}`);
    }
    return data as DbClinicalDocument;
  }

  /**
   * Archives previous versions of a document to maintain single active clinical version.
   */
  async archiveOlderVersions(sourceEntityId: string, docType: DocumentType): Promise<void> {
    const { error } = await supabaseAdmin
      .from('clinical_documents')
      .update({ status: 'archived' })
      .eq('source_entity_id', sourceEntityId)
      .eq('document_type', docType)
      .eq('status', 'active');

    if (error) {
      console.error(`[DocumentRepository] Failed to archive older versions:`, error.message);
    }
  }
}

export const documentRepository = new DocumentRepository();
