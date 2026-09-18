import { generateConsultationPdfBuffer, generatePrescriptionPdfBuffer } from './pdfGenerator';
import { uploadPdf, downloadPdf } from './storageHelper';
import { v4 as uuidv4 } from 'uuid';

export async function generateConsultationDocument(db: FirebaseFirestore.Firestore, consultationId: string, actorUid: string) {
  const consultSnap = await db.collection('consultations').doc(consultationId).get();
  if (!consultSnap.exists) throw new Error('Consultation not found');
  const consultation = { id: consultSnap.id, ...consultSnap.data() } as any;

  const patientSnap = await db.collection('patients').doc(consultation.patientId).get();
  const patient = { id: patientSnap.id, ...patientSnap.data() } as any;

  // Generate PDF buffer
  const pdfBuffer = await generateConsultationPdfBuffer(consultation, patient);
  
  // Create document metadata
  const docId = uuidv4();
  const storagePath = `consultations/${consultationId}/consultation_${docId}.pdf`;
  
  await uploadPdf(storagePath, pdfBuffer);

  const timestamp = new Date().toISOString();
  
  const docRef = db.collection('documents').doc(docId);
  await docRef.set({
    documentType: 'consultation',
    sourceEntityId: consultationId,
    patientId: consultation.patientId,
    doctorId: consultation.assignedTo || null,
    generatedAt: timestamp,
    generatedBy: actorUid,
    version: 1, // Deterministic versioning can be added later
    status: 'active',
    storagePath,
    fileSize: pdfBuffer.length
  });

  // Dual-write metadata to Supabase clinical_documents
  try {
    const { documentRepository } = await import('./repositories/documentRepository');
    await documentRepository.recordDocument({
      legacy_document_id: docId,
      document_type: 'consultation',
      source_entity_id: consultationId,
      patient_id: consultation.patientId,
      doctor_id: consultation.assignedTo || null,
      storage_path: storagePath,
      file_size: pdfBuffer.length,
      version: 1,
      status: 'active',
      generated_by: actorUid,
    });
  } catch (err: any) {
    console.warn('[DocumentService] Supabase document record fallback:', err.message);
  }

  await db.collection('audit_logs').add({
    action: 'CONSULTATION_DOCUMENT_GENERATED',
    actorUid,
    consultationId,
    documentId: docId,
    timestamp
  });

  try {
    const { auditRepository } = await import('./repositories/auditRepository');
    await auditRepository.log({
      action: 'CONSULTATION_DOCUMENT_GENERATED',
      actorUid,
      consultationId,
      documentId: docId,
      metadata: { storagePath, fileSize: pdfBuffer.length },
    });
  } catch (err: any) {
    console.warn('[DocumentService] Supabase audit log fallback:', err.message);
  }

  return docId;
}


export async function generatePrescriptionDocument(db: FirebaseFirestore.Firestore, prescriptionId: string, actorUid: string) {
  const rxSnap = await db.collection('prescriptions').doc(prescriptionId).get();
  if (!rxSnap.exists) throw new Error('Prescription not found');
  const prescription = { id: rxSnap.id, ...rxSnap.data() } as any;

  if (prescription.status !== 'finalized') {
    throw new Error('Prescription must be finalized before generating document');
  }

  const consultationId = prescription.consultationId;
  const consultSnap = await db.collection('consultations').doc(consultationId).get();
  const consultation = { id: consultSnap.id, ...consultSnap.data() } as any;

  const patientSnap = await db.collection('patients').doc(prescription.patientId).get();
  const patient = { id: patientSnap.id, ...patientSnap.data() } as any;

  const docSnap = await db.collection('staff').doc(prescription.doctorId).get();
  const doctor = { uid: docSnap.id, ...docSnap.data() } as any;

  // Generate PDF buffer
  const pdfBuffer = await generatePrescriptionPdfBuffer(prescription, consultation, patient, doctor);
  
  const docId = uuidv4();
  const storagePath = `prescriptions/${prescriptionId}/prescription_${docId}.pdf`;
  
  await uploadPdf(storagePath, pdfBuffer);

  const timestamp = new Date().toISOString();
  
  // Archiving older active prescription documents
  const oldDocs = await db.collection('documents')
    .where('sourceEntityId', '==', prescriptionId)
    .where('documentType', '==', 'prescription')
    .where('status', '==', 'active')
    .get();

  const batch = db.batch();
  let nextVersion = 1;

  oldDocs.docs.forEach(d => {
    batch.update(d.ref, { status: 'archived' });
    if (d.data().version >= nextVersion) {
      nextVersion = d.data().version + 1;
    }
  });

  const docRef = db.collection('documents').doc(docId);
  batch.set(docRef, {
    documentType: 'prescription',
    sourceEntityId: prescriptionId,
    patientId: prescription.patientId,
    doctorId: prescription.doctorId,
    generatedAt: timestamp,
    generatedBy: actorUid,
    version: nextVersion,
    status: 'active',
    storagePath,
    fileSize: pdfBuffer.length
  });

  await batch.commit();

  // Dual-write metadata to Supabase clinical_documents
  try {
    const { documentRepository } = await import('./repositories/documentRepository');
    await documentRepository.archiveOlderVersions(prescriptionId, 'prescription');
    await documentRepository.recordDocument({
      legacy_document_id: docId,
      document_type: 'prescription',
      source_entity_id: prescriptionId,
      patient_id: prescription.patientId,
      doctor_id: prescription.doctorId,
      storage_path: storagePath,
      file_size: pdfBuffer.length,
      version: nextVersion,
      status: 'active',
      generated_by: actorUid,
    });
  } catch (err: any) {
    console.warn('[DocumentService] Supabase prescription document record fallback:', err.message);
  }

  await db.collection('audit_logs').add({
    action: nextVersion > 1 ? 'PRESCRIPTION_DOCUMENT_REGENERATED' : 'PRESCRIPTION_DOCUMENT_GENERATED',
    actorUid,
    consultationId,
    prescriptionId,
    documentId: docId,
    timestamp
  });

  try {
    const { auditRepository } = await import('./repositories/auditRepository');
    await auditRepository.log({
      action: nextVersion > 1 ? 'PRESCRIPTION_DOCUMENT_REGENERATED' : 'PRESCRIPTION_DOCUMENT_GENERATED',
      actorUid,
      consultationId,
      prescriptionId,
      documentId: docId,
      metadata: { storagePath, fileSize: pdfBuffer.length, version: nextVersion },
    });
  } catch (err: any) {
    console.warn('[DocumentService] Supabase audit log fallback:', err.message);
  }

  return docId;
}

export async function getDocumentStream(db: FirebaseFirestore.Firestore, documentId: string) {
  let docData: any = null;

  const docSnap = await db.collection('documents').doc(documentId).get();
  if (docSnap.exists) {
    docData = docSnap.data();
  } else {
    // Check Supabase clinical_documents
    try {
      const { documentRepository } = await import('./repositories/documentRepository');
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
  }

  if (!docData) {
    throw new Error('Document not found');
  }
  
  const buffer = await downloadPdf(docData.storagePath);
  return { buffer, metadata: docData };
}

