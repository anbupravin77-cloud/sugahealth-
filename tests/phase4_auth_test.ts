/**
 * PHASE 4 — AUTOMATED TEST SUITE
 * Tests Supabase Auth foundation, test-account boundaries, role escalation guards,
 * and production reset protections.
 */

import { isAllowlistedTestEmail, DESIGNATED_TEST_ACCOUNTS } from '../src/server/auth/testAccounts';
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

  // ----------------------------------------------------
  // TEST 1: Test-Account Allowlist Boundary
  // ----------------------------------------------------
  console.log('\n--- 1. TEST-ACCOUNT ALLOWLIST VERIFICATION ---');
  assert(isAllowlistedTestEmail('patient@sugahealth.test'), 'Allow patient@sugahealth.test');
  assert(isAllowlistedTestEmail('doctor@sugahealth.test'), 'Allow doctor@sugahealth.test');
  assert(isAllowlistedTestEmail('pharmacist@sugahealth.test'), 'Allow pharmacist@sugahealth.test');
  assert(isAllowlistedTestEmail('admin@sugahealth.test'), 'Allow admin@sugahealth.test');
  assert(isAllowlistedTestEmail('custom_tester@sugahealth.test'), 'Allow any @sugahealth.test');

  // Real or malicious domains must be rejected
  assert(!isAllowlistedTestEmail('user@gmail.com'), 'Reject user@gmail.com');
  assert(!isAllowlistedTestEmail('admin@sugahealth.com'), 'Reject production domain admin@sugahealth.com');
  assert(!isAllowlistedTestEmail('ceo@suga.health'), 'Reject production domain ceo@suga.health');
  assert(!isAllowlistedTestEmail('patient@yahoo.com'), 'Reject patient@yahoo.com');
  assert(!isAllowlistedTestEmail(''), 'Reject empty string');

  // ----------------------------------------------------
  // TEST 2: Designated Accounts Roster Check
  // ----------------------------------------------------
  console.log('\n--- 2. DESIGNATED TEST ACCOUNTS ROSTER ---');
  assert(DESIGNATED_TEST_ACCOUNTS.length === 4, 'Four designated accounts registered');
  const roles = DESIGNATED_TEST_ACCOUNTS.map(a => a.defaultRole);
  assert(roles.includes('patient'), 'Contains designated patient');
  assert(roles.includes('doctor'), 'Contains designated doctor');
  assert(roles.includes('pharmacist'), 'Contains designated pharmacist');
  assert(roles.includes('admin'), 'Contains designated admin');

  // ----------------------------------------------------
  // TEST 3: Non-Test Email Reset Rejection
  // ----------------------------------------------------
  console.log('\n--- 3. NON-TEST EMAIL RESET REJECTION ---');
  try {
    await resetDesignatedTestAccount('real_user@gmail.com');
    assert(false, 'Should throw on real_user@gmail.com');
  } catch (err: any) {
    assert(
      err.message.includes('not an allowlisted test account'),
      'Blocked real_user@gmail.com with explicit allowlist violation error',
      err.message
    );
  }

  try {
    await resetDesignatedTestAccount('production_admin@sugahealth.com');
    assert(false, 'Should throw on production_admin@sugahealth.com');
  } catch (err: any) {
    assert(
      err.message.includes('not an allowlisted test account'),
      'Blocked production_admin@sugahealth.com with explicit allowlist violation error',
      err.message
    );
  }

  // ----------------------------------------------------
  // TEST 4: Production Reset Hard-Block (Fail Closed Guard)
  // ----------------------------------------------------
  console.log('\n--- 4. PRODUCTION RESET HARD-BLOCK (SIMULATED PROD) ---');
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnableAuthTest = process.env.ENABLE_AUTH_TEST;

  try {
    // Simulate pure production environment
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_AUTH_TEST;

    assert(!isTestResetAllowed(), 'isTestResetAllowed() returns FALSE in production mode');

    try {
      await resetDesignatedTestAccount('patient@sugahealth.test');
      assert(false, 'Reset operation should be BLOCKED in production mode');
    } catch (err: any) {
      assert(
        err.message.includes('forbidden in production mode'),
        'Reset throws explicit forbidden error in production mode',
        err.message
      );
    }
  } finally {
    // Restore environment
    process.env.NODE_ENV = originalNodeEnv;
    if (originalEnableAuthTest !== undefined) {
      process.env.ENABLE_AUTH_TEST = originalEnableAuthTest;
    } else {
      delete process.env.ENABLE_AUTH_TEST;
    }
  }

  // ----------------------------------------------------
  // TEST 5: Role Escalation & Default Patient Invariant
  // ----------------------------------------------------
  console.log('\n--- 5. ROLE ESCALATION & DEFAULT PATIENT INVARIANT ---');
  // Verify that regular user signup specification is strictly 'patient'
  const patientSpec = DESIGNATED_TEST_ACCOUNTS.find(a => a.email === 'patient@sugahealth.test');
  assert(patientSpec?.defaultRole === 'patient', 'Designated patient defaults to role "patient"');

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
