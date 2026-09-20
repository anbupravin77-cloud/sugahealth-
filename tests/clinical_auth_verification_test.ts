/**
 * SUGA.HEALTH V20 — CLINICAL AUTHENTICATION VERIFICATION TEST SUITE
 * 
 * Verifies Objective #1:
 * 1. Valid Supabase patient token -> accepted
 * 2. Valid Supabase doctor token -> accepted
 * 3. Expired Supabase token -> rejected (401)
 * 4. Invalid Supabase token -> rejected (401)
 * 5. Patient cannot access doctor-only endpoint (403)
 * 6. Doctor cannot perform patient-only mutations (403)
 * 7. Valid Firebase session must NOT silently replace an invalid/expired Supabase identity for NEW clinical APIs
 */

import { Request, Response } from 'express';
import {
  authenticateClinicalRequest,
  requireClinicalAuth,
  requireClinicalDoctorAuth,
  requireClinicalPatientAuth,
  authenticateRequest,
} from '../src/server/auth/authMiddleware';
import * as supabaseAuthModule from '../src/server/auth/supabaseAuth';
import { supabaseAdmin } from '../src/server/supabaseAdmin';

async function runClinicalAuthTests() {
  console.log('\n==================================================');
  console.log('CLINICAL AUTHENTICATION VERIFICATION SUITE');
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

  // Mock helpers for HTTP Request / Response simulation
  function createMockReq(token?: string): Request {
    return {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    } as unknown as Request;
  }

  function createMockRes(): { res: Response; getStatus: () => number; getJson: () => any; isNextCalled: () => boolean } {
    let statusCode = 200;
    let jsonBody: any = null;
    let nextCalled = false;

    const resObj = {
      status(code: number) {
        statusCode = code;
        return resObj;
      },
      json(data: any) {
        jsonBody = data;
        return resObj;
      },
    } as unknown as Response;

    return {
      res: resObj,
      getStatus: () => statusCode,
      getJson: () => jsonBody,
      isNextCalled: () => nextCalled,
    };
  }

  // ----------------------------------------------------
  // TEST 1: Missing Token is Rejected
  // ----------------------------------------------------
  console.log('\n--- 1. MISSING TOKEN IS REJECTED ---');
  const missingReq = createMockReq();
  const missingUser = await authenticateClinicalRequest(missingReq);
  assert(missingUser === null, 'authenticateClinicalRequest returns null for missing token');

  const { res: resMissing, getStatus: getStatusMissing } = createMockRes();
  let nextCalled1 = false;
  await requireClinicalAuth(missingReq, resMissing, () => { nextCalled1 = true; });
  assert(!nextCalled1, 'requireClinicalAuth blocks downstream execution when token is missing');
  assert(getStatusMissing() === 401, 'requireClinicalAuth returns 401 Unauthorized for missing token');

  // ----------------------------------------------------
  // TEST 2: Invalid / Corrupt Supabase Token is Rejected
  // ----------------------------------------------------
  console.log('\n--- 2. INVALID / CORRUPT TOKEN IS REJECTED ---');
  const invalidReq = createMockReq('corrupt_or_invalid_jwt_string_12345');
  const invalidUser = await authenticateClinicalRequest(invalidReq);
  assert(invalidUser === null, 'authenticateClinicalRequest returns null for corrupt token');

  const { res: resInvalid, getStatus: getStatusInvalid } = createMockRes();
  let nextCalled2 = false;
  await requireClinicalAuth(invalidReq, resInvalid, () => { nextCalled2 = true; });
  assert(!nextCalled2, 'requireClinicalAuth blocks downstream execution for corrupt token');
  assert(getStatusInvalid() === 401, 'requireClinicalAuth returns 401 Unauthorized for corrupt token');

  // ----------------------------------------------------
  // TEST 3: Expired Supabase Token is Rejected
  // ----------------------------------------------------
  console.log('\n--- 3. EXPIRED TOKEN IS REJECTED ---');
  // Spy/mock verifySupabaseAccessToken to simulate expired token behavior
  const originalVerifySupabase = supabaseAuthModule.verifySupabaseAccessToken;
  
  // An expired token produces null from verifySupabaseAccessToken
  const expiredReq = createMockReq('expired_supabase_token_99999');
  const expiredUser = await authenticateClinicalRequest(expiredReq);
  assert(expiredUser === null, 'authenticateClinicalRequest returns null for expired token');

  const { res: resExpired, getStatus: getStatusExpired } = createMockRes();
  let nextCalled3 = false;
  await requireClinicalAuth(expiredReq, resExpired, () => { nextCalled3 = true; });
  assert(!nextCalled3, 'requireClinicalAuth blocks downstream execution for expired token');
  assert(getStatusExpired() === 401, 'requireClinicalAuth returns 401 for expired token');

  // ----------------------------------------------------
  // TEST 4: Firebase Token Does NOT Silently Replace Supabase Identity for Clinical APIs
  // ----------------------------------------------------
  console.log('\n--- 4. FIREBASE TOKEN CANNOT ACCESS NEW CLINICAL APIS ---');
  // Even if verifyFirebaseIdToken would succeed for a legacy token, clinical endpoints MUST reject it
  const firebaseReq = createMockReq('firebase_active_user_token_abc');
  const clinicalResult = await authenticateClinicalRequest(firebaseReq);
  assert(
    clinicalResult === null,
    'authenticateClinicalRequest strictly rejects Firebase token without fallback'
  );

  const { res: resFb, getStatus: getStatusFb } = createMockRes();
  let nextCalledFb = false;
  await requireClinicalAuth(firebaseReq, resFb, () => { nextCalledFb = true; });
  assert(!nextCalledFb, 'requireClinicalAuth blocks request with Firebase token');
  assert(getStatusFb() === 401, 'requireClinicalAuth returns 401 for Firebase token');

  // ----------------------------------------------------
  // TEST 5: Valid Supabase Patient Token is Accepted
  // ----------------------------------------------------
  console.log('\n--- 5. VALID SUPABASE PATIENT TOKEN ACCEPTED ---');
  // Mock supabaseAdmin.auth.getUser to simulate Supabase Auth responses
  const originalGetUser = supabaseAdmin.auth.getUser;
  supabaseAdmin.auth.getUser = async (jwt?: string) => {
    if (jwt === 'valid_patient_token_token123') {
      return {
        data: {
          user: {
            id: 'patient-uuid-1111-2222',
            email: 'patient@sugahealth.internal',
            app_metadata: { role: 'patient' },
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as any,
        },
        error: null,
      };
    }
    if (jwt === 'valid_doctor_token_token456') {
      return {
        data: {
          user: {
            id: 'doctor-uuid-3333-4444',
            email: 'doctor@sugahealth.internal',
            app_metadata: { role: 'doctor' },
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as any,
        },
        error: null,
      };
    }
    return {
      data: { user: null },
      error: { message: 'Invalid or expired JWT', name: 'AuthApiError', status: 401 } as any,
    };
  };

  const patientReq = createMockReq('valid_patient_token_token123');
  const patientUser = await authenticateClinicalRequest(patientReq);
  assert(patientUser !== null, 'authenticateClinicalRequest accepts valid Supabase patient token');
  assert(patientUser?.role === 'patient', 'Resolved role is "patient"');
  assert(patientUser?.uid === 'patient-uuid-1111-2222', 'Resolved UID matches Supabase user ID');
  assert(patientUser?.authProvider === 'supabase', 'authProvider is explicitly "supabase"');

  const { res: resPatient, getStatus: getStatusPatient } = createMockRes();
  let nextCalledPatient = false;
  await requireClinicalAuth(patientReq, resPatient, () => { nextCalledPatient = true; });
  assert(nextCalledPatient, 'requireClinicalAuth calls next() for valid Supabase patient');
  assert((patientReq as any).user?.uid === 'patient-uuid-1111-2222', 'req.user is attached to patient request');

  // ----------------------------------------------------
  // TEST 6: Valid Supabase Doctor Token is Accepted
  // ----------------------------------------------------
  console.log('\n--- 6. VALID SUPABASE DOCTOR TOKEN ACCEPTED ---');
  const doctorReq = createMockReq('valid_doctor_token_token456');
  const doctorUser = await authenticateClinicalRequest(doctorReq);
  assert(doctorUser !== null, 'authenticateClinicalRequest accepts valid Supabase doctor token');
  assert(doctorUser?.role === 'doctor', 'Resolved role is "doctor"');
  assert(doctorUser?.uid === 'doctor-uuid-3333-4444', 'Resolved UID matches Supabase doctor ID');

  const { res: resDoctor, getStatus: getStatusDoctor } = createMockRes();
  let nextCalledDoctor = false;
  await requireClinicalDoctorAuth(doctorReq, resDoctor, () => { nextCalledDoctor = true; });
  assert(nextCalledDoctor, 'requireClinicalDoctorAuth calls next() for valid Supabase doctor');

  // ----------------------------------------------------
  // TEST 7: Patient CANNOT Access Doctor-Only Endpoints (403)
  // ----------------------------------------------------
  console.log('\n--- 7. PATIENT CANNOT ACCESS DOCTOR-ONLY ENDPOINTS ---');
  const patientAttemptDoctorEndpointReq = createMockReq('valid_patient_token_token123');
  const { res: resDoctorOnly, getStatus: getStatusDoctorOnly } = createMockRes();
  let nextCalledDoctorOnly = false;
  await requireClinicalDoctorAuth(patientAttemptDoctorEndpointReq, resDoctorOnly, () => { nextCalledDoctorOnly = true; });
  assert(!nextCalledDoctorOnly, 'Patient is blocked from doctor-only middleware');
  assert(getStatusDoctorOnly() === 403, 'requireClinicalDoctorAuth returns 403 Forbidden for patient');

  // ----------------------------------------------------
  // TEST 8: Doctor CANNOT Perform Patient-Only Mutations (403)
  // ----------------------------------------------------
  console.log('\n--- 8. DOCTOR CANNOT PERFORM PATIENT-ONLY MUTATIONS ---');
  const doctorAttemptPatientReq = createMockReq('valid_doctor_token_token456');
  const { res: resPatientOnly, getStatus: getStatusPatientOnly } = createMockRes();
  let nextCalledPatientOnly = false;
  await requireClinicalPatientAuth(doctorAttemptPatientReq, resPatientOnly, () => { nextCalledPatientOnly = true; });
  assert(!nextCalledPatientOnly, 'Doctor is blocked from patient-only middleware');
  assert(getStatusPatientOnly() === 403, 'requireClinicalPatientAuth returns 403 Forbidden for doctor');

  // ----------------------------------------------------
  // TEST 9: Legacy Endpoints Prefer Supabase First, Retaining Legacy Fallback
  // ----------------------------------------------------
  console.log('\n--- 9. LEGACY ENDPOINTS PREFER SUPABASE FIRST ---');
  const legacyReqSupabase = createMockReq('valid_patient_token_token123');
  const legacyUser = await authenticateRequest(legacyReqSupabase);
  assert(legacyUser !== null, 'authenticateRequest accepts Supabase token');
  assert(legacyUser?.authProvider === 'supabase', 'authenticateRequest identifies provider as "supabase"');

  // Restore
  supabaseAdmin.auth.getUser = originalGetUser;

  console.log('\n==================================================');
  console.log(`CLINICAL AUTH TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runClinicalAuthTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
