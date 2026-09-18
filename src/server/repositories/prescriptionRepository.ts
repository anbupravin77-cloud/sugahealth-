import { supabaseAdmin } from '../supabaseAdmin';
import { DbPrescription, DbPrescriptionItem } from './types';
import { consultationRepository } from './consultationRepository';

export interface PrescriptionWithItems extends DbPrescription {
  items: DbPrescriptionItem[];
}

export class PrescriptionRepository {
  async getById(id: string): Promise<PrescriptionWithItems | null> {
    const { data: prescription, error: rxError } = await supabaseAdmin
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (rxError || !prescription) {
      return null;
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('prescription_items')
      .select('*')
      .eq('prescription_id', id);

    if (itemsError) {
      console.error(`[PrescriptionRepository] Failed to fetch items for ${id}:`, itemsError.message);
    }

    return {
      ...(prescription as DbPrescription),
      items: (items || []) as DbPrescriptionItem[],
    };
  }

  async getByConsultationId(consultationId: string): Promise<PrescriptionWithItems[]> {
    const { data: prescriptions, error } = await supabaseAdmin
      .from('prescriptions')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false });

    if (error || !prescriptions) {
      return [];
    }

    const results: PrescriptionWithItems[] = [];
    for (const rx of prescriptions) {
      const { data: items } = await supabaseAdmin
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', rx.id);

      results.push({
        ...(rx as DbPrescription),
        items: (items || []) as DbPrescriptionItem[],
      });
    }

    return results;
  }

  async listEligibleForRefill(patientId: string): Promise<PrescriptionWithItems[]> {
    const now = new Date().toISOString();
    const { data: prescriptions, error } = await supabaseAdmin
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'finalized')
      .gt('refill_count', 0)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('issued_at', { ascending: false });

    if (error || !prescriptions) {
      return [];
    }

    const results: PrescriptionWithItems[] = [];
    for (const rx of prescriptions) {
      const { data: items } = await supabaseAdmin
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', rx.id);

      results.push({
        ...(rx as DbPrescription),
        items: (items || []) as DbPrescriptionItem[],
      });
    }

    return results;
  }

  /**
   * Saves or creates a draft prescription with items.
   * Only the assigned doctor or admin can author prescriptions.
   */
  async saveDraft(params: {
    consultationId: string;
    doctorId: string;
    patientId: string;
    directions?: string;
    refillCount?: number;
    refillIntervalDays?: number;
    items: Omit<DbPrescriptionItem, 'id' | 'prescription_id' | 'created_at'>[];
    legacyDocumentId?: string;
  }): Promise<PrescriptionWithItems> {
    const consultation = await consultationRepository.getById(params.consultationId);
    if (!consultation) {
      throw new Error('Consultation not found');
    }
    if (consultation.patient_id !== params.patientId) {
      throw new Error('Patient mismatch with consultation record');
    }
    if (consultation.assigned_to && consultation.assigned_to !== params.doctorId) {
      throw new Error('Forbidden: Doctor is not assigned to this consultation');
    }

    const now = new Date().toISOString();

    // 1. Insert prescription header
    const { data: rx, error: rxError } = await supabaseAdmin
      .from('prescriptions')
      .insert({
        consultation_id: params.consultationId,
        patient_id: params.patientId,
        doctor_id: params.doctorId,
        status: 'draft',
        directions: params.directions || null,
        refill_count: params.refillCount ?? 0,
        refill_interval_days: params.refillIntervalDays ?? 30,
        legacy_document_id: params.legacyDocumentId || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (rxError || !rx) {
      throw new Error(`Failed to create prescription draft: ${rxError?.message}`);
    }

    // 2. Insert items
    const insertedItems: DbPrescriptionItem[] = [];
    if (params.items && params.items.length > 0) {
      const itemsToInsert = params.items.map((item) => ({
        prescription_id: rx.id,
        medication_name: item.medication_name,
        active_ingredient: item.active_ingredient || null,
        strength: item.strength,
        dosage_form: item.dosage_form,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0.0,
        sig: item.sig || null,
        created_at: now,
      }));

      const { data: savedItems, error: itemError } = await supabaseAdmin
        .from('prescription_items')
        .insert(itemsToInsert)
        .select();

      if (itemError) {
        throw new Error(`Failed to insert prescription items: ${itemError.message}`);
      }
      insertedItems.push(...((savedItems || []) as DbPrescriptionItem[]));
    }

    return {
      ...(rx as DbPrescription),
      items: insertedItems,
    };
  }

  /**
   * Finalizes a prescription.
   * Crucial invariant: Once finalized, a prescription is IMMUTABLE.
   */
  async finalize(id: string, doctorId: string): Promise<PrescriptionWithItems> {
    const rx = await this.getById(id);
    if (!rx) {
      throw new Error('Prescription not found');
    }
    if (rx.doctor_id !== doctorId) {
      throw new Error('Forbidden: Only the issuing doctor can finalize this prescription');
    }
    if (rx.status === 'finalized') {
      throw new Error('Prescription is already finalized and cannot be modified');
    }
    if (rx.status === 'cancelled') {
      throw new Error('Cannot finalize a cancelled prescription');
    }
    if (!rx.items || rx.items.length === 0) {
      throw new Error('Cannot finalize prescription with no medication items');
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1-year clinical expiration

    const { data: updatedRx, error } = await supabaseAdmin
      .from('prescriptions')
      .update({
        status: 'finalized',
        issued_at: now.toISOString(),
        finalized_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft') // Enforce optimistic lock
      .select()
      .single();

    if (error || !updatedRx) {
      throw new Error(`Failed to finalize prescription: ${error?.message}`);
    }

    return {
      ...(updatedRx as DbPrescription),
      items: rx.items,
    };
  }

  /**
   * Cancels a prescription.
   */
  async cancel(id: string, doctorId: string): Promise<DbPrescription> {
    const rx = await this.getById(id);
    if (!rx) {
      throw new Error('Prescription not found');
    }
    if (rx.doctor_id !== doctorId) {
      throw new Error('Forbidden: Only the issuing doctor can cancel this prescription');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel prescription: ${error.message}`);
    }
    return data as DbPrescription;
  }
}

export const prescriptionRepository = new PrescriptionRepository();
