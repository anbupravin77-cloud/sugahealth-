/**
 * PHASE 4 — SERVER INTEGRATION TESTS
 * Tests HTTP endpoints against the live running server instance (port 3000).
 */

async function runServerTests() {
  console.log('\n==================================================');
  console.log('PHASE 4 SERVER INTEGRATION TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;
  const baseUrl = 'http://127.0.0.1:3000';

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // Test 1: Health check remains intact
  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
  const healthBody = await healthRes.json();
  assert(healthBody.status === 'ok', 'GET /api/health body.status === "ok"');

  // Test 2: Unauthenticated /api/auth/me returns 401
  const meRes = await fetch(`${baseUrl}/api/auth/me`);
  assert(meRes.status === 401, 'GET /api/auth/me without token returns 401 Unauthorized');

  // Test 3: Unauthenticated /api/auth/bootstrap-profile returns 401
  const bootRes = await fetch(`${baseUrl}/api/auth/bootstrap-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName: 'Test' }),
  });
  assert(bootRes.status === 401, 'POST /api/auth/bootstrap-profile without token returns 401 Unauthorized');

  // Test 4: Reset with non-test email returns 400
  const resetBadRes = await fetch(`${baseUrl}/api/auth/test/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'attacker@evil.com' }),
  });
  assert(resetBadRes.status === 400, 'POST /api/auth/test/reset with non-test email returns 400 Bad Request');
  const resetBadBody = await resetBadRes.json();
  assert(resetBadBody.error.includes('Security boundary violation'), 'Error message states security boundary violation');

  // Test 5: Fetch test accounts specs
  const accountsRes = await fetch(`${baseUrl}/api/auth/test/accounts`);
  assert(accountsRes.status === 200, 'GET /api/auth/test/accounts returns 200 OK');
  const accountsBody = await accountsRes.json();
  assert(accountsBody.accounts?.length === 4, '4 test accounts returned');

  console.log('\n==================================================');
  console.log(`SERVER INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runServerTests().catch(err => {
  console.error('Server test runner fatal error:', err);
  process.exit(1);
});
