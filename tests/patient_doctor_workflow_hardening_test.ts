/**
 * SUGA.HEALTH V20 — PATIENT + DOCTOR WORKFLOW HARDENING TEST SUITE
 * 
 * Verifies:
 * 1. Consultation lifecycle and state transitions:
 *    draft -> submitted -> assigned -> under_review -> completed
 * 2. Clinical Mutation Guards:
 *    - Notes cannot be written while status is merely 'assigned'
 *    - Prescriptions cannot be created/modified while status is merely 'assigned'
 *    - Approval cannot occur directly from 'assigned' (must be 'under_review')
 * 3. Doctor Claim Requirement:
 *    - Unlocks clinical mutations once status transitions to 'under_review'
 *    - Re-claiming is idempotent
 *    - Unassigned or other doctors cannot claim an already claimed consultation
 * 4. Prescription Atomicity & Finalized Immutability:
 *    - Prescriptions can be saved with options atomically
 *    - Finalized prescriptions reject any edits or item replacements
 * 5. Medication Option Selection:
 *    - Only valid items belonging to finalized prescriptions can be selected
 *    - Selection transitions to 'selected_pending_payment'
 */

import { clinicalWorkflowService } from '../src/server/services/clinicalWorkflowService';
import { supabaseAdmin, getSupabaseAdmin } from '../src/server/supabaseAdmin';

async function runPatientDoctorWorkflowTests() {
  console.log('\n==================================================');
  console.log('PATIENT + DOCTOR WORKFLOW HARDENING TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const testPatientId = '00000000-0000-0000-0000-000000000001';
  const testDoctorId = '00000000-0000-0000-0000-000000000002';
  const otherDoctorId = '00000000-0000-0000-0000-000000000003';
  const testConsultationId = '11111111-1111-1111-1111-111111111111';

  // In-memory state store to simulate database tables cleanly
  let dbState = {
    consultation: {
      id: testConsultationId,
      patient_id: testPatientId,
      assigned_to: testDoctorId,
      status: 'assigned', // Initial state upon doctor assignment
      responses: {
        fullName: 'Test Patient',
        chiefComplaint: 'Weight Management Assessment',
        signing_status: 'unsigned',
      },
      submitted_at: new Date().toISOString(),
      completed_at: null as string | null,
    },
    clinicalNotes: [] as any[],
    prescriptions: [] as any[],
    prescriptionItems: [] as any[],
    notifications: [] as any[],
    threads: [] as any[],
  };

  const adminClient = getSupabaseAdmin();
  const originalFrom = adminClient.from.bind(adminClient);
  const originalRpc = adminClient.rpc.bind(adminClient);

  adminClient.from = ((table: string): any => {
    if (table === 'consultations') {
      return {
        select: (cols: string) => ({
          eq: (field: string, val: any) => ({
            single: async () => ({
              data: dbState.consultation.id === val ? { ...dbState.consultation } : null,
              error: dbState.consultation.id === val ? null : { message: 'Not found' },
            }),
            maybeSingle: async () => ({
              data: dbState.consultation.id === val ? { ...dbState.consultation } : null,
              error: null,
            }),
          }),
        }),
        update: (values: any) => ({
          eq: (field: string, val: any) => {
            if (dbState.consultation.id === val) {
              Object.assign(dbState.consultation, values);
              return Promise.resolve({ data: dbState.consultation, error: null });
            }
            return Promise.resolve({ data: null, error: { message: 'Not found' } });
          },
        }),
      };
    }

    if (table === 'clinical_notes') {
      return {
        select: () => ({
          eq: (field: string, val: any) => ({
            eq: (f2: string, v2: any) => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: dbState.clinicalNotes[0] || null,
                    error: null,
                  }),
                }),
              }),
            }),
            maybeSingle: async () => ({
              data: dbState.clinicalNotes.find((n) => n.id === val) || null,
              error: null,
            }),
          }),
        }),
        insert: (vals: any) => ({
          select: () => ({
            single: async () => {
              const note = { id: 'note-uuid-1', ...vals };
              dbState.clinicalNotes.push(note);
              return { data: note, error: null };
            },
          }),
        }),
        update: (vals: any) => ({
          eq: (field: string, val: any) => {
            const note = dbState.clinicalNotes.find((n) => n.id === val);
            if (note) Object.assign(note, vals);
            return {
              select: () => ({
                single: async () => ({ data: note, error: null }),
              }),
            };
          },
        }),
      };
    }

    if (table === 'prescriptions') {
      return {
        select: () => ({
          eq: (field: string, val: any) => ({
            maybeSingle: async () => ({
              data: dbState.prescriptions.find((p) => p.consultation_id === val) || null,
              error: null,
            }),
          }),
        }),
        insert: (vals: any) => ({
          select: () => ({
            single: async () => {
              const rx = { id: 'rx-uuid-1', ...vals };
              dbState.prescriptions.push(rx);
              return { data: rx, error: null };
            },
          }),
        }),
        update: (vals: any) => ({
          eq: (field: string, val: any) => {
            const rx = dbState.prescriptions.find((p) => p.id === val);
            if (rx) Object.assign(rx, vals);
            return Promise.resolve({ data: rx, error: null });
          },
        }),
      };
    }

    if (table === 'prescription_items') {
      return {
        delete: () => ({
          eq: (field: string, val: any) => {
            dbState.prescriptionItems = dbState.prescriptionItems.filter((i) => i.prescription_id !== val);
            return Promise.resolve({ error: null });
          },
        }),
        insert: async (items: any[]) => {
          items.forEach((it, idx) => {
            dbState.prescriptionItems.push({ id: `item-uuid-${idx + 1}`, ...it });
          });
          return { error: null };
        },
      };
    }

    return (originalFrom as any).call(adminClient, table);
  }) as any;

  // Mock RPC calls to simulate Postgres functions
  adminClient.rpc = (async (fnName: string, params: any) => {
    if (fnName === 'fn_claim_consultation') {
      const { p_consultation_id, p_doctor_id } = params;
      if (p_consultation_id !== dbState.consultation.id) {
        return { data: null, error: { message: 'Consultation not found.' } };
      }
      if (dbState.consultation.assigned_to && dbState.consultation.assigned_to !== p_doctor_id) {
        return { data: null, error: { message: 'Forbidden: Consultation is assigned to another clinician.' } };
      }
      if (dbState.consultation.status === 'under_review' && dbState.consultation.assigned_to === p_doctor_id) {
        return { data: { success: true, alreadyClaimed: true, status: 'under_review' }, error: null };
      }
      if (!['submitted', 'assigned'].includes(dbState.consultation.status)) {
        return { data: null, error: { message: `Cannot claim consultation with status: ${dbState.consultation.status}.` } };
      }
      dbState.consultation.status = 'under_review';
      dbState.consultation.assigned_to = p_doctor_id;
      return { data: { success: true, status: 'under_review', assignedTo: p_doctor_id }, error: null };
    }

    if (fnName === 'fn_save_prescription_with_options') {
      const { p_consultation_id, p_doctor_id, p_items, p_clinician_message } = params;
      if (dbState.consultation.status !== 'under_review') {
        return { data: null, error: { message: `Forbidden: Consultation must be under_review before prescribing medication. Current status: ${dbState.consultation.status}.` } };
      }
      const existingRx = dbState.prescriptions.find((p) => p.consultation_id === p_consultation_id);
      if (existingRx && existingRx.status === 'finalized') {
        return { data: null, error: { message: 'Forbidden: Prescription is finalized and cannot be modified.' } };
      }
      let rxId = existingRx?.id || 'rx-uuid-1';
      if (!existingRx) {
        dbState.prescriptions.push({
          id: rxId,
          consultation_id: p_consultation_id,
          patient_id: dbState.consultation.patient_id,
          doctor_id: p_doctor_id,
          status: 'draft',
          clinician_message: p_clinician_message,
        });
      }
      dbState.prescriptionItems = (p_items || []).map((it: any, idx: number) => ({
        id: `item-uuid-${idx + 1}`,
        prescription_id: rxId,
        medication_name: it.name,
        active_ingredient: it.activeIngredient,
        strength: it.strength,
        dosage_form: it.dosageForm,
        unit_price: it.priceInr,
        is_recommended: it.isRecommended,
      }));
      return { data: { success: true, prescriptionId: rxId }, error: null };
    }

    if (fnName === 'fn_approve_consultation') {
      const { p_consultation_id, p_doctor_id, p_attestation, p_summary } = params;
      if (p_consultation_id !== dbState.consultation.id) {
        return { data: null, error: { message: 'Consultation not found.' } };
      }
      if (dbState.consultation.assigned_to !== p_doctor_id) {
        return { data: null, error: { message: 'Forbidden: Consultation must be claimed and assigned to you before approving.' } };
      }
      // Strictly require under_review (direct approval from assigned is prohibited)
      if (dbState.consultation.status !== 'under_review') {
        return { data: null, error: { message: `Cannot approve consultation with status: ${dbState.consultation.status}. Consultation must be under_review before approval.` } };
      }
      if (!p_attestation) {
        return { data: null, error: { message: 'Validation failed: Clinician attestation check is required.' } };
      }
      if (dbState.clinicalNotes.length === 0 && !p_summary) {
        return { data: null, error: { message: 'Validation failed: A meaningful clinical assessment is required before approval.' } };
      }
      if (dbState.prescriptions.length === 0 || dbState.prescriptionItems.length === 0) {
        return { data: null, error: { message: 'Validation failed: At least one canonical medication option must be prescribed.' } };
      }
      dbState.consultation.status = 'completed';
      dbState.consultation.completed_at = new Date().toISOString();
      if (dbState.prescriptions[0]) {
        dbState.prescriptions[0].status = 'finalized';
      }
      return {
        data: {
          success: true,
          status: 'completed',
          signatureStatus: 'ready_for_signature',
          prescriptionId: dbState.prescriptions[0]?.id,
          threadId: `thread_${p_consultation_id}`,
        },
        error: null,
      };
    }

    if (fnName === 'fn_select_medication_option') {
      const { p_consultation_id, p_patient_id, p_prescription_item_id } = params;
      if (dbState.consultation.status !== 'completed') {
        return { data: null, error: { message: 'Consultation is not in a completed state for medication selection.' } };
      }
      if (dbState.consultation.patient_id !== p_patient_id) {
        return { data: null, error: { message: 'Forbidden: You can only select options for your own consultation.' } };
      }
      const item = dbState.prescriptionItems.find((i) => i.id === p_prescription_item_id);
      if (!item) {
        return { data: null, error: { message: 'Invalid medication selection. Selected item ID is not in the offered clinical prescription.' } };
      }
      dbState.prescriptions[0].selected_item_id = item.id;
      return {
        data: {
          success: true,
          selectedOption: {
            id: item.id,
            name: item.medication_name,
            strength: item.strength,
            priceInr: item.unit_price,
          },
          selectionStatus: 'selected_pending_payment',
        },
        error: null,
      };
    }

    return (originalRpc as any).call(supabaseAdmin, fnName, params);
  }) as any;

  try {
    // ----------------------------------------------------
    // TEST 1: Clinical Note Blocked When Status is 'assigned'
    // ----------------------------------------------------
    console.log('\n--- 1. CLINICAL NOTE BLOCKED BEFORE DOCTOR CLAIM ---');
    dbState.consultation.status = 'assigned';
    let noteErrorAssigned: string | null = null;
    try {
      await clinicalWorkflowService.saveClinicalNote(testConsultationId, testDoctorId, {
        subjective: 'Patient reports mild symptoms.',
        objective: 'Vitals stable.',
        assessment: 'Normal clinical evaluation.',
        plan: 'Initiate dietary coaching.',
      });
    } catch (e: any) {
      noteErrorAssigned = e.message;
    }
    assert(
      noteErrorAssigned !== null && noteErrorAssigned.includes('must be under_review before writing clinical notes'),
      'saveClinicalNote is blocked while consultation status is merely "assigned"',
      noteErrorAssigned || ''
    );

    // ----------------------------------------------------
    // TEST 2: Prescription Creation Blocked When Status is 'assigned'
    // ----------------------------------------------------
    console.log('\n--- 2. PRESCRIPTION CREATION BLOCKED BEFORE DOCTOR CLAIM ---');
    let rxErrorAssigned: string | null = null;
    try {
      await clinicalWorkflowService.savePrescriptionWithOptions(testConsultationId, testDoctorId, {
        medicationOptions: [
          {
            id: 'opt_1',
            name: 'Semaglutide Compounded',
            strength: '0.25mg/mL',
            dosageForm: 'Subcutaneous Solution',
            priceInr: 2499,
            description: 'Starting dose for metabolic management',
            isRecommended: true,
          },
        ],
        customClinicianMessage: 'Prescribed therapeutic option.',
      });
    } catch (e: any) {
      rxErrorAssigned = e.message;
    }
    assert(
      rxErrorAssigned !== null && rxErrorAssigned.includes('must be under_review before prescribing medication'),
      'savePrescriptionWithOptions is blocked while consultation status is merely "assigned"',
      rxErrorAssigned || ''
    );

    // ----------------------------------------------------
    // TEST 3: Direct Approval Blocked From 'assigned' State
    // ----------------------------------------------------
    console.log('\n--- 3. DIRECT APPROVAL BLOCKED FROM ASSIGNED STATE ---');
    let approveErrorAssigned: string | null = null;
    try {
      await clinicalWorkflowService.approveConsultation(testConsultationId, testDoctorId, {
        clinicianAttestation: true,
        treatmentSummary: 'Premature approval attempt without claim.',
      });
    } catch (e: any) {
      approveErrorAssigned = e.message;
    }
    assert(
      approveErrorAssigned !== null && approveErrorAssigned.includes('Consultation must be under_review before approval'),
      'fn_approve_consultation strictly rejects direct approval when status is "assigned"',
      approveErrorAssigned || ''
    );

    // ----------------------------------------------------
    // TEST 4: Doctor Claims Consultation
    // ----------------------------------------------------
    console.log('\n--- 4. DOCTOR CLAIMS CONSULTATION ---');
    // Cannot be claimed by a different doctor
    let otherDoctorClaimError: string | null = null;
    try {
      await clinicalWorkflowService.claimConsultation(testConsultationId, otherDoctorId);
    } catch (e: any) {
      otherDoctorClaimError = e.message;
    }
    assert(
      otherDoctorClaimError !== null && otherDoctorClaimError.includes('assigned to another clinician'),
      'Other doctor cannot claim a consultation assigned to doctor A',
      otherDoctorClaimError || ''
    );

    // Assigned doctor claims consultation
    const claimRes = await clinicalWorkflowService.claimConsultation(testConsultationId, testDoctorId);
    assert(claimRes.status === 'under_review', 'Consultation status transitions to "under_review"');
    assert(dbState.consultation.status === 'under_review', 'Database state is updated to "under_review"');

    // Claiming again is idempotent
    const idempotentClaim = await clinicalWorkflowService.claimConsultation(testConsultationId, testDoctorId);
    assert(idempotentClaim.alreadyClaimed === true, 'Subsequent claim is idempotent (alreadyClaimed: true)');

    // ----------------------------------------------------
    // TEST 5: Doctor Saves SOAP Note While 'under_review'
    // ----------------------------------------------------
    console.log('\n--- 5. DOCTOR SAVES CLINICAL NOTE POST-CLAIM ---');
    const noteRes = await clinicalWorkflowService.saveClinicalNote(testConsultationId, testDoctorId, {
      subjective: 'Patient seeks medically supervised weight loss guidance.',
      objective: 'BMI: 29.4, blood pressure 120/78 mmHg.',
      assessment: 'Clinically appropriate candidate for GLP-1 therapy.',
      plan: 'Initiate Semaglutide 0.25mg titration with monthly clinical check-ins.',
    });
    assert(noteRes.id !== undefined, 'Clinical note created successfully post-claim');
    assert(dbState.clinicalNotes.length === 1, 'Clinical note recorded in database');

    // ----------------------------------------------------
    // TEST 6: Doctor Saves Prescription With Options (Atomic Save)
    // ----------------------------------------------------
    console.log('\n--- 6. DOCTOR SAVES PRESCRIPTION CHOICES ATOMICALLY ---');
    const rxRes = await clinicalWorkflowService.savePrescriptionWithOptions(testConsultationId, testDoctorId, {
      directions: 'Inject 0.25mg once weekly as directed.',
      refillCount: 2,
      refillIntervalDays: 30,
      customClinicianMessage: 'Reviewed metabolic profile. Both options are clinically appropriate.',
      medicationOptions: [
        {
          id: 'opt_1',
          name: 'Semaglutide 0.25mg Starter',
          strength: '0.25mg/mL',
          dosageForm: 'Prefilled Pen',
          priceInr: 2999,
          description: 'Option 1: Compounded formulation with vitamin B6',
          isRecommended: true,
        },
        {
          id: 'opt_2',
          name: 'Tirzepatide 2.5mg Starter',
          strength: '2.5mg/0.5mL',
          dosageForm: 'Prefilled Pen',
          priceInr: 4499,
          description: 'Option 2: Dual GIP/GLP-1 agonist formulation',
          isRecommended: false,
        },
      ],
    });
    assert(rxRes.prescriptionId !== undefined, 'Prescription saved atomically');
    assert(dbState.prescriptions.length === 1, 'Prescription record created');
    assert(dbState.prescriptionItems.length === 2, 'Both medication options saved atomically in prescription_items');

    // ----------------------------------------------------
    // TEST 7: Doctor Approves Consultation & Finalizes Treatment
    // ----------------------------------------------------
    console.log('\n--- 7. DOCTOR APPROVES CONSULTATION & FINALIZES TREATMENT ---');
    const approveRes = await clinicalWorkflowService.approveConsultation(testConsultationId, testDoctorId, {
      clinicianAttestation: true,
      treatmentSummary: 'Patient thoroughly evaluated and approved for personalized treatment regimen.',
    });
    assert(approveRes.success === true, 'Consultation approved successfully');
    assert(approveRes.status === 'completed', 'Consultation status is "completed"');
    assert(dbState.consultation.status === 'completed', 'Consultation status recorded as completed in DB');
    assert(dbState.prescriptions[0].status === 'finalized', 'Prescription status finalized upon approval');

    // ----------------------------------------------------
    // TEST 8: Finalized Prescription Immutability
    // ----------------------------------------------------
    console.log('\n--- 8. FINALIZED PRESCRIPTION IMMUTABILITY ---');
    let rxEditError: string | null = null;
    try {
      await clinicalWorkflowService.savePrescriptionWithOptions(testConsultationId, testDoctorId, {
        directions: 'Modified post-finalization attempt.',
        medicationOptions: [
          {
            id: 'opt_tamper',
            name: 'Tampered Medication',
            strength: '10mg',
            dosageForm: 'Oral',
            priceInr: 100,
            description: 'Unauthorized edit attempt',
          },
        ],
      });
    } catch (e: any) {
      rxEditError = e.message;
    }
    assert(
      rxEditError !== null && (rxEditError.includes('Prescription is finalized') || rxEditError.includes('must be under_review')),
      'Doctor is strictly forbidden from editing prescription after finalization',
      rxEditError || ''
    );

    // Also note cannot be modified once consultation is completed
    let noteEditError: string | null = null;
    try {
      await clinicalWorkflowService.saveClinicalNote(testConsultationId, testDoctorId, {
        content: 'Post-completion tampering.',
      });
    } catch (e: any) {
      noteEditError = e.message;
    }
    assert(
      noteEditError !== null && noteEditError.includes('must be under_review'),
      'Doctor is strictly forbidden from editing clinical notes after consultation completion',
      noteEditError || ''
    );

    // ----------------------------------------------------
    // TEST 9: Patient Selects Medication Option
    // ----------------------------------------------------
    console.log('\n--- 9. PATIENT SELECTS MEDICATION OPTION ---');
    // Another patient cannot select
    let wrongPatientError: string | null = null;
    try {
      await clinicalWorkflowService.selectMedicationOption(testConsultationId, 'wrong-patient-id', {
        prescriptionItemId: 'item-uuid-1',
      });
    } catch (e: any) {
      wrongPatientError = e.message;
    }
    assert(
      wrongPatientError !== null && wrongPatientError.includes('only select options for your own consultation'),
      'Wrong patient is blocked from selecting medication options',
      wrongPatientError || ''
    );

    // Invalid item ID rejected
    let invalidItemError: string | null = null;
    try {
      await clinicalWorkflowService.selectMedicationOption(testConsultationId, testPatientId, {
        prescriptionItemId: 'non-existent-item-id',
      });
    } catch (e: any) {
      invalidItemError = e.message;
    }
    assert(
      invalidItemError !== null && invalidItemError.includes('Invalid medication selection'),
      'Selection rejected if item is not part of the finalized prescription',
      invalidItemError || ''
    );

    // Valid selection succeeds
    const selectRes = await clinicalWorkflowService.selectMedicationOption(testConsultationId, testPatientId, {
      prescriptionItemId: 'item-uuid-1',
    });
    assert(selectRes.success === true, 'Patient successfully selects valid medication option');
    assert(selectRes.selectionStatus === 'selected_pending_payment', 'Selection status is "selected_pending_payment"');
    assert(selectRes.selectedOption.name === 'Semaglutide 0.25mg Starter', 'Selected option reflects clinician-prescribed medication');
    assert(dbState.prescriptions[0].selected_item_id === 'item-uuid-1', 'selected_item_id recorded in database');

  } finally {
    // Restore mocks
    adminClient.from = originalFrom;
    adminClient.rpc = originalRpc;
  }

  console.log('\n==================================================');
  console.log(`PATIENT + DOCTOR WORKFLOW TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPatientDoctorWorkflowTests().catch((err) => {
  console.error('Fatal workflow test error:', err);
  process.exit(1);
});
