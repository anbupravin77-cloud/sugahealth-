import { generateConsultationPdfBuffer, generatePrescriptionPdfBuffer } from './pdfGenerator';
import { uploadPdf, downloadPdf } from './storageHelper';
import { randomUUID } from 'node:crypto';
import { consultationRepository } from './repositories/consultationRepository';
import { prescriptionRepository } from './repositories/prescriptionRepository';
import { profileRepository } from './repositories/profileRepository';
import { documentRepository } from './repositories/documentRepository';
import { auditRepository } from './repositories/auditRepository';

export async function generateConsultationDocument(db: any, consultationId: string, actorUid: string) {
  const consultation = await consultationRepository.getById(consultationId);
  if (!consultation) throw new Error(`Consultation ${consultationId} not found in Supabase`);

  const patient = await profileRepository.getProfileById(consultation.patient_id);
  if (!patient) throw new Error(`Patient ${consultation.patient_id} not found in Supabase`);

  // Map database format to expected generator layout
  const mappedConsultation = {
    id: consultation.id,
    patientId: consultation.patient_id,
    assignedTo: consultation.assigned_to,
    primaryConcern: consultation.primary_concern,
    responses: consultation.responses,
    status: consultation.status,
    createdAt: consultation.created_at,
    updatedAt: consultation.updated_at,
  };

  const mappedPatient = {
    id: patient.id,
    email: patient.email,
    displayName: patient.display_name,
    firstName: patient.first_name,
    lastName: patient.last_name,
    dateOfBirth: patient.date_of_birth,
    sex: patient.sex,
    phone: patient.phone_number,
    shippingAddress: patient.shipping_address,
  };

  // Generate PDF buffer
  const pdfBuffer = await generateConsultationPdfBuffer(mappedConsultation, mappedPatient);
  
  // Create document metadata
  const docId = randomUUID();
  const storagePath = `consultations/${consultationId}/consultation_${docId}.pdf`;
  
  await uploadPdf(storagePath, pdfBuffer);

  const timestamp = new Date().toISOString();
  
  // Record metadata to Supabase clinical_documents
  try {
    await documentRepository.recordDocument({
      legacy_document_id: docId,
      document_type: 'consultation',
      source_entity_id: consultationId,
      patient_id: consultation.patient_id,
      doctor_id: consultation.assigned_to || null,
      storage_path: storagePath,
      file_size: pdfBuffer.length,
      version: 1,
      status: 'active',
      generated_by: actorUid,
    });
  } catch (err: any) {
    console.error('[DocumentService] Failed to record consultation document on Supabase:', err.message);
    throw err;
  }

  try {
    await auditRepository.log({
      action: 'CONSULTATION_DOCUMENT_GENERATED',
      actorUid,
      consultationId,
      documentId: docId,
      metadata: { storagePath, fileSize: pdfBuffer.length },
    });
  } catch (err: any) {
    console.warn('[DocumentService] Supabase audit log error:', err.message);
  }

  return docId;
}


export async function generatePrescriptionDocument(db: any, prescriptionId: string, actorUid: string) {
  const prescription = await prescriptionRepository.getById(prescriptionId);
  if (!prescription) throw new Error(`Prescription ${prescriptionId} not found in Supabase`);

  if (prescription.status !== 'finalized') {
    throw new Error('Prescription must be finalized before generating document');
  }

  const consultationId = prescription.consultation_id;
  const consultation = await consultationRepository.getById(consultationId);
  if (!consultation) throw new Error(`Consultation ${consultationId} not found in Supabase`);

  const patient = await profileRepository.getProfileById(prescription.patient_id);
  if (!patient) throw new Error(`Patient ${prescription.patient_id} not found in Supabase`);

  const doctor = await profileRepository.getStaffProfileById(prescription.doctor_id);
  if (!doctor) throw new Error(`Doctor ${prescription.doctor_id} not found in Supabase`);

  // Map to format expected by generator
  const mappedPrescription = {
    id: prescription.id,
    patientId: prescription.patient_id,
    doctorId: prescription.doctor_id,
    consultationId: prescription.consultation_id,
    status: prescription.status,
    directions: prescription.directions,
    refillCount: prescription.refill_count,
    refillIntervalDays: prescription.refill_interval_days,
    issuedAt: prescription.issued_at,
    finalizedAt: prescription.finalized_at,
    expiresAt: prescription.expires_at,
    items: prescription.items.map(item => ({
      id: item.id,
      medicationName: item.medication_name,
      dosage: item.strength,
      quantity: item.quantity,
      unit: item.dosage_form,
    })),
  };

  const mappedConsultation = {
    id: consultation.id,
    patientId: consultation.patient_id,
    assignedTo: consultation.assigned_to,
    primaryConcern: consultation.primary_concern,
    responses: consultation.responses,
    status: consultation.status,
    createdAt: consultation.created_at,
    updatedAt: consultation.updated_at,
  };

  const mappedPatient = {
    id: patient.id,
    email: patient.email,
    displayName: patient.display_name,
    firstName: patient.first_name,
    lastName: patient.last_name,
    dateOfBirth: patient.date_of_birth,
    sex: patient.sex,
    phone: patient.phone_number,
    shippingAddress: patient.shipping_address,
  };

  const docAny = doctor as any;
  const mappedDoctor = {
    uid: doctor.id,
    id: doctor.id,
    email: doctor.email,
    displayName: `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Doctor',
    role: doctor.role,
    active: doctor.active,
    onboardingCompleted: doctor.onboarding_status === 'completed',
    signatureUrl: docAny.signature_url || docAny.signatureUrl || null,
    licenseNumber: docAny.license_number || docAny.licenseNumber || null,
    registrationNumber: docAny.registration_number || docAny.registrationNumber || null,
  };

  // Generate PDF buffer
  const pdfBuffer = await generatePrescriptionPdfBuffer(mappedPrescription, mappedConsultation, mappedPatient, mappedDoctor);
  
  const docId = randomUUID();
  const storagePath = `prescriptions/${prescriptionId}/prescription_${docId}.pdf`;
  
  await uploadPdf(storagePath, pdfBuffer);

  const timestamp = new Date().toISOString();
  
  // Archiving older active prescription documents
  let nextVersion = 1;
  try {
    const existingDocs = await documentRepository.listByPrescription(prescriptionId);
    const activeDocs = existingDocs.filter(d => d.status === 'active');
    activeDocs.forEach(d => {
      if (d.version >= nextVersion) {
        nextVersion = d.version + 1;
      }
    });
    await documentRepository.archiveOlderVersions(prescriptionId, 'prescription');
  } catch (err: any) {
    console.warn('[DocumentService] Failed to archive older versions on Supabase:', err.message);
  }

  // Record metadata to Supabase clinical_documents
  try {
    await documentRepository.recordDocument({
      legacy_document_id: docId,
      document_type: 'prescription',
      source_entity_id: prescriptionId,
      patient_id: prescription.patient_id,
      doctor_id: prescription.doctor_id,
      storage_path: storagePath,
      file_size: pdfBuffer.length,
      version: nextVersion,
      status: 'active',
      generated_by: actorUid,
    });
  } catch (err: any) {
    console.error('[DocumentService] Failed to record prescription document on Supabase:', err.message);
    throw err;
  }

  try {
    await auditRepository.log({
      action: nextVersion > 1 ? 'PRESCRIPTION_DOCUMENT_REGENERATED' : 'PRESCRIPTION_DOCUMENT_GENERATED',
      actorUid,
      consultationId,
      prescriptionId,
      documentId: docId,
      metadata: { storagePath, fileSize: pdfBuffer.length, version: nextVersion },
    });
  } catch (err: any) {
    console.warn('[DocumentService] Supabase audit log error:', err.message);
  }

  return docId;
}

export async function getDocumentStream(db: any, documentId: string) {
  let docData: any = null;

  try {
    const supabaseDoc = await documentRepository.getById(documentId) || await documentRepository.getByLegacyId(documentId);
    if (supabaseDoc) {
      docData = {
        documentType: supabaseDoc.document_type,
        sourceEntityId: supabaseDoc.source_entity_id,
        patientId: supabaseDoc.patient_id,
        doctorId: supabaseDoc.doctor_id,
        storagePath: supabaseDoc.storage_path,
        fileSize: supabaseDoc.file_size,
        status: supabaseDoc.status,
      };
    }
  } catch (err: any) {
    console.warn('[DocumentService] Supabase getDocumentStream check failed:', err.message);
  }

  if (!docData) {
    throw new Error('Document not found');
  }
  
  const buffer = await downloadPdf(docData.storagePath);
  return { buffer, metadata: docData };
}
