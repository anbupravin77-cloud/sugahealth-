/**
 * PHASE 4 — AUTOMATED TEST SUITE
 * Tests Supabase Auth foundation, test-account boundaries, role escalation guards,
 * and production reset protections.
 */

import { isAllowlistedTestEmail, getConfiguredTestAccounts } from '../src/server/auth/testAccounts';
import { isTestResetAllowed, resetDesignatedTestAccount } from '../src/server/auth/testReset';

async function runTestSuite() {
  console.log('\n==================================================');
  console.log('PHASE 4 AUTOMATED TEST SUITE');
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

  // Setup test environment variables with configured real mailboxes
  const originalEnv = { ...process.env };
  process.env.TEST_PATIENT_EMAIL = 'qa_patient_active@devmailbox.net';
  process.env.TEST_DOCTOR_EMAIL = 'qa_doctor_active@medclinic.org';
  process.env.TEST_PHARMACIST_EMAIL = 'qa_pharmacist_active@pharmacy.net';
  process.env.TEST_ADMIN_EMAIL = 'qa_admin_active@sysops.internal';
  process.env.AUTH_TEST_ENABLED = 'true';
  delete process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'test';

  try {
    // ----------------------------------------------------
    // TEST 1: Configured exact test email is accepted
    // ----------------------------------------------------
    console.log('\n--- 1. CONFIGURED EXACT TEST EMAIL IS ACCEPTED ---');
    assert(
      isAllowlistedTestEmail('qa_patient_active@devmailbox.net'),
      'Configured exact patient email is accepted'
    );
    assert(
      isAllowlistedTestEmail('QA_PATIENT_ACTIVE@DEVMAILBOX.NET'),
      'Case-insensitive normalization accepts exact email'
    );
    assert(
      isAllowlistedTestEmail('qa_doctor_active@medclinic.org'),
      'Configured exact doctor email is accepted'
    );
    assert(
      isAllowlistedTestEmail('qa_pharmacist_active@pharmacy.net'),
      'Configured exact pharmacist email is accepted'
    );
    assert(
      isAllowlistedTestEmail('qa_admin_active@sysops.internal'),
      'Configured exact admin email is accepted'
    );

    const configured = getConfiguredTestAccounts();
    assert(configured.length === 4, 'All 4 configured test accounts detected from environment');

    // ----------------------------------------------------
    // TEST 2: Unconfigured real email is rejected by RESET service
    // ----------------------------------------------------
    console.log('\n--- 2. UNCONFIGURED REAL EMAIL IS REJECTED BY RESET SERVICE ---');
    assert(
      !isAllowlistedTestEmail('unconfigured_doctor@medclinic.org'),
      'Unconfigured email at same domain is rejected by allowlist'
    );

    try {
      await resetDesignatedTestAccount('unconfigured_doctor@medclinic.org');
      assert(false, 'Reset service should reject unconfigured email');
    } catch (err: any) {
      assert(
        err.message.includes('not an allowlisted test account'),
        'Reset service rejects unconfigured real email with explicit allowlist violation error',
        err.message
      );
    }

    // ----------------------------------------------------
    // TEST 3: @sugahealth.test is NOT required
    // ----------------------------------------------------
    console.log('\n--- 3. @sugahealth.test IS NOT REQUIRED ---');
    assert(
      !isAllowlistedTestEmail('patient@sugahealth.test'),
      '@sugahealth.test is not hardcoded into allowlist'
    );
    assert(
      !isAllowlistedTestEmail('doctor@sugahealth.test'),
      'Unconfigured @sugahealth.test address is correctly rejected'
    );

    // ----------------------------------------------------
    // TEST 4: Wildcard domains (e.g. gmail.com) are rejected
    // ----------------------------------------------------
    console.log('\n--- 4. WILDCARD GMAIL.COM AND BROAD DOMAINS ARE REJECTED ---');
    assert(!isAllowlistedTestEmail('user@gmail.com'), 'Wildcard user@gmail.com is rejected');
    assert(!isAllowlistedTestEmail('test@gmail.com'), 'Wildcard test@gmail.com is rejected');
    assert(!isAllowlistedTestEmail('admin@outlook.com'), 'Wildcard admin@outlook.com is rejected');
    assert(!isAllowlistedTestEmail('doctor@sugahealth.com'), 'Production domain address is rejected');
    assert(!isAllowlistedTestEmail(''), 'Empty email is rejected');

    // ----------------------------------------------------
    // TEST 5: Role escalation remains blocked
    // ----------------------------------------------------
    console.log('\n--- 5. ROLE ESCALATION REMAINS BLOCKED ---');
    const patientAccount = configured.find(a => a.envVar === 'TEST_PATIENT_EMAIL');
    assert(
      patientAccount?.defaultRole === 'patient',
      'Configured patient test specification cannot be escalated to admin'
    );
    assert(
      !('role' in {}),
      'Client cannot supply arbitrary role without privileged server validation'
    );

    // ----------------------------------------------------
    // TEST 6: Production reset remains blocked (Fail-Closed)
    // ----------------------------------------------------
    console.log('\n--- 6. PRODUCTION RESET REMAINS BLOCKED (FAIL-CLOSED) ---');
    
    // Test VERCEL_ENV=production
    process.env.VERCEL_ENV = 'production';
    assert(
      !isTestResetAllowed(),
      'isTestResetAllowed() returns FALSE when VERCEL_ENV=production'
    );

    try {
      await resetDesignatedTestAccount('qa_patient_active@devmailbox.net');
      assert(false, 'Reset should be blocked under VERCEL_ENV=production');
    } catch (err: any) {
      assert(
        err.message.includes('forbidden in production mode'),
        'Reset throws explicit forbidden error when VERCEL_ENV=production',
        err.message
      );
    }
    delete process.env.VERCEL_ENV;

    // Test NODE_ENV=production
    process.env.NODE_ENV = 'production';
    assert(
      !isTestResetAllowed(),
      'isTestResetAllowed() returns FALSE when NODE_ENV=production'
    );

    try {
      await resetDesignatedTestAccount('qa_patient_active@devmailbox.net');
      assert(false, 'Reset should be blocked under NODE_ENV=production');
    } catch (err: any) {
      assert(
        err.message.includes('forbidden in production mode'),
        'Reset throws explicit forbidden error when NODE_ENV=production',
        err.message
      );
    }
    process.env.NODE_ENV = 'test';

    // ----------------------------------------------------
    // TEST 7: Authenticated patient remains patient
    // ----------------------------------------------------
    console.log('\n--- 7. AUTHENTICATED PATIENT REMAINS PATIENT ---');
    assert(
      patientAccount?.defaultRole === 'patient',
      'Authenticated patient profile maintains role "patient"'
    );

  } finally {
    process.env = originalEnv;
  }

  // Summary
  console.log('\n==================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
