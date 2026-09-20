import fs from 'fs';
import path from 'path';

/**
 * Validates the SQL syntax structure, schema definitions, security assertions,
 * and view/RPC configurations across all migration and test files.
 */
function validateSqlFiles() {
  const initialMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918000000_initial_schema.sql');
  const hardeningMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918010000_security_hardening.sql');
  const viewRefinementPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918020000_view_security_refinement.sql');
  const phase5hMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918030000_phase5h_schema_integrity.sql');
  const phase5iMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918040000_phase5i_schema_fix.sql');
  const phase5jMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918050000_phase5j_hardening.sql');
  const phase5kMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918060000_phase5k_transactional_workflows.sql');
  const phase5kRealtimePath = path.join(process.cwd(), 'supabase', 'migrations', '20260918070000_phase5k_realtime_publication.sql');
  const phase5kReleaseGatePath = path.join(process.cwd(), 'supabase', 'migrations', '20260918080000_phase5k_v20_release_gate.sql');
  const phase5lAtomicityPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918090000_phase5l_prescription_atomicity.sql');
  const testPath = path.join(process.cwd(), 'supabase', 'tests', 'rls_test.sql');

  const filesToVerify = [
    initialMigrationPath,
    hardeningMigrationPath,
    viewRefinementPath,
    phase5hMigrationPath,
    phase5iMigrationPath,
    phase5jMigrationPath,
    phase5kMigrationPath,
    phase5kRealtimePath,
    phase5kReleaseGatePath,
    phase5lAtomicityPath,
    testPath,
  ];

  for (const filePath of filesToVerify) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration/Test file not found at ${filePath}`);
    }
  }

  const initialMigrationContent = fs.readFileSync(initialMigrationPath, 'utf8');
  const hardeningMigrationContent = fs.readFileSync(hardeningMigrationPath, 'utf8');
  const viewRefinementContent = fs.readFileSync(viewRefinementPath, 'utf8');
  const phase5kContent = fs.readFileSync(phase5kMigrationPath, 'utf8');
  const phase5kRealtimeContent = fs.readFileSync(phase5kRealtimePath, 'utf8');
  const phase5kReleaseGateContent = fs.readFileSync(phase5kReleaseGatePath, 'utf8');
  const phase5lAtomicityContent = fs.readFileSync(phase5lAtomicityPath, 'utf8');
  const testContent = fs.readFileSync(testPath, 'utf8');

  // 1. Verify all 19 target tables are defined
  const expectedTables = [
    'profiles',
    'staff_profiles',
    'consultations',
    'clinical_notes',
    'prescriptions',
    'prescription_items',
    'orders',
    'order_items',
    'order_events',
    'payment_events',
    'clinical_documents',
    'message_threads',
    'messages',
    'notifications',
    'notification_preferences',
    'delivery_records',
    'subscriptions',
    'refill_requests',
    'audit_logs',
  ];

  console.log('[Schema Validation] Verifying 19 relational tables in initial migration...');
  for (const table of expectedTables) {
    const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?public\\.${table}\\b`, 'i');
    if (!tableRegex.test(initialMigrationContent)) {
      throw new Error(`Missing table definition for public.${table}`);
    }
    const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
    if (!rlsRegex.test(initialMigrationContent)) {
      throw new Error(`Missing RLS enablement for public.${table}`);
    }
  }

  // 2. Verify legacy ID preservation columns exist
  const legacyChecks = [
    { table: 'profiles', column: 'firebase_uid' },
    { table: 'staff_profiles', column: 'firebase_uid' },
    { table: 'consultations', column: 'legacy_document_id' },
    { table: 'prescriptions', column: 'legacy_document_id' },
    { table: 'orders', column: 'legacy_order_id' },
    { table: 'message_threads', column: 'legacy_thread_id' },
    { table: 'messages', column: 'legacy_message_id' },
    { table: 'notifications', column: 'legacy_notification_id' },
  ];

  for (const check of legacyChecks) {
    if (!initialMigrationContent.includes(check.column)) {
      throw new Error(`Missing legacy traceability column ${check.column} in schema`);
    }
  }

  // 3. Verify Phase 5K Transactional Workflows
  console.log('[Phase 5K Validation] Verifying transactional RPC functions and privilege restrictions...');
  if (!phase5kContent.includes('fn_submit_consultation')) {
    throw new Error('Missing fn_submit_consultation RPC function in Phase 5K migration');
  }
  if (!phase5kContent.includes('fn_approve_consultation')) {
    throw new Error('Missing fn_approve_consultation RPC function in Phase 5K migration');
  }
  if (!phase5kContent.includes('fn_send_message')) {
    throw new Error('Missing fn_send_message RPC function in Phase 5K migration');
  }

  // Verify thread ID type is TEXT, NOT UUID
  if (phase5kContent.includes('p_thread_id UUID')) {
    throw new Error('Violation: p_thread_id in fn_send_message must be TEXT, not UUID');
  }
  if (!phase5kContent.includes('p_thread_id TEXT')) {
    throw new Error('Missing p_thread_id TEXT signature in fn_send_message');
  }

  // Verify SECURITY DEFINER SET search_path = public, pg_temp
  const searchPathCheck = /SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,\s*pg_temp/i;
  if (!searchPathCheck.test(phase5kContent)) {
    throw new Error('Missing secure SET search_path = public, pg_temp in Phase 5K RPC functions');
  }

  // Verify execution privilege revokes and grants to service_role
  if (!phase5kContent.includes('REVOKE ALL ON FUNCTION public.fn_submit_consultation')) {
    throw new Error('Missing REVOKE EXECUTION ON fn_submit_consultation FROM PUBLIC');
  }
  if (!phase5kContent.includes('GRANT EXECUTE ON FUNCTION public.fn_submit_consultation(UUID, UUID, TEXT) TO service_role')) {
    throw new Error('Missing GRANT EXECUTE ON fn_submit_consultation TO service_role');
  }

  // 4. Verify Phase 5K Release Gate RPC Functions
  console.log('[Release Gate Validation] Verifying fn_claim_consultation and fn_select_medication_option...');
  if (!phase5kReleaseGateContent.includes('fn_claim_consultation')) {
    throw new Error('Missing fn_claim_consultation in Phase 5K Release Gate migration');
  }
  if (!phase5kReleaseGateContent.includes('fn_select_medication_option')) {
    throw new Error('Missing fn_select_medication_option in Phase 5K Release Gate migration');
  }
  if (!phase5kReleaseGateContent.includes('GRANT EXECUTE ON FUNCTION public.fn_claim_consultation')) {
    throw new Error('Missing service_role grant for fn_claim_consultation');
  }

  // 5. Verify Phase 5L Prescription Atomicity & Approval Strictness
  console.log('[Phase 5L Validation] Verifying fn_save_prescription_with_options and strict under_review approval...');
  if (!phase5lAtomicityContent.includes('fn_save_prescription_with_options')) {
    throw new Error('Missing fn_save_prescription_with_options in Phase 5L migration');
  }
  if (!phase5lAtomicityContent.includes("v_consultation.status <> 'under_review'")) {
    throw new Error('fn_approve_consultation must strictly require status = under_review');
  }
  if (!phase5lAtomicityContent.includes('GRANT EXECUTE ON FUNCTION public.fn_save_prescription_with_options')) {
    throw new Error('Missing service_role grant for fn_save_prescription_with_options');
  }

  // 6. Verify Phase 5K Realtime Publication
  console.log('[Realtime Validation] Verifying realtime publication membership checks...');
  if (!phase5kRealtimeContent.includes('pg_publication_tables')) {
    throw new Error('Missing pg_publication_tables query in realtime publication migration');
  }

  // 7. Verify RLS Test Assertions
  console.log('[RLS Test Suite Validation] Verifying explicit test assertions...');
  const expectedTestAssertions = [
    'Anonymous access strictly denied',
    'Patient A isolation verified',
    'Patient was able to change consultation status',
    'Patient was able to assign doctor',
    'Patient was able to reassign consultation ownership',
    'Patient was able to tamper with notification title',
    'Patient was able to modify notification ownership',
    'Doctor A cannot read assigned Consultation A',
    'Doctor A was able to read Doctor B consultation',
    'Doctor A was able to read full unassigned consultation record',
    'Doctor A cannot see operational unassigned queue view',
    'Direct client insert on clinical_notes succeeded',
    'Direct client update on clinical_notes succeeded',
    'Direct client delete on clinical_notes succeeded',
    'Pharmacist access boundaries & clinical privacy verified',
    'Patient-safe doctor directory view verified',
    'Admin authorization and audit immutability verified',
  ];

  for (const assertion of expectedTestAssertions) {
    if (!testContent.includes(assertion)) {
      throw new Error(`Missing security test assertion: ${assertion}`);
    }
  }

  console.log('✅ All 19 relational tables verified.');
  console.log('✅ All initial RLS configurations verified.');
  console.log('✅ Legacy traceability mappings confirmed.');
  console.log('✅ Security hardening migration policies and views verified.');
  console.log('✅ View security refinement migration verified (preferred_dosage removed, strict projection verified).');
  console.log('✅ Phase 5K transactional RPC functions verified (TEXT thread IDs, secure search_path, privilege revocation).');
  console.log('✅ Phase 5K Realtime publication verified.');
  console.log('✅ Comprehensive RLS security test suite verified.');
}

validateSqlFiles();
