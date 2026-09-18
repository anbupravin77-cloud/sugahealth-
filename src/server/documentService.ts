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

  await db.collection('audit_logs').add({
    action: 'CONSULTATION_DOCUMENT_GENERATED',
    actorUid,
    consultationId,
    documentId: docId,
    timestamp
  });

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

  await db.collection('audit_logs').add({
    action: nextVersion > 1 ? 'PRESCRIPTION_DOCUMENT_REGENERATED' : 'PRESCRIPTION_DOCUMENT_GENERATED',
    actorUid,
    consultationId,
    prescriptionId,
    documentId: docId,
    timestamp
  });

  return docId;
}

export async function getDocumentStream(db: FirebaseFirestore.Firestore, documentId: string) {
  const docSnap = await db.collection('documents').doc(documentId).get();
  if (!docSnap.exists) throw new Error('Document not found');
  
  const docData = docSnap.data() as any;
  const buffer = await downloadPdf(docData.storagePath);
  return { buffer, metadata: docData };
}
