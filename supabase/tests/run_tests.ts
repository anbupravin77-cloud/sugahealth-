import fs from 'fs';
import path from 'path';

/**
 * Validates the SQL syntax structure, schema definitions, security assertions,
 * and view configurations across all migration and test files.
 */
function validateSqlFiles() {
  const initialMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918000000_initial_schema.sql');
  const hardeningMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918010000_security_hardening.sql');
  const viewRefinementPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918020000_view_security_refinement.sql');
  const phase5hMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918030000_phase5h_schema_integrity.sql');
  const phase5iMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260918040000_phase5i_schema_fix.sql');
  const testPath = path.join(process.cwd(), 'supabase', 'tests', 'rls_test.sql');

  if (!fs.existsSync(initialMigrationPath)) {
    throw new Error(`Initial migration file not found at ${initialMigrationPath}`);
  }
  if (!fs.existsSync(hardeningMigrationPath)) {
    throw new Error(`Hardening migration file not found at ${hardeningMigrationPath}`);
  }
  if (!fs.existsSync(viewRefinementPath)) {
    throw new Error(`View refinement migration file not found at ${viewRefinementPath}`);
  }
  if (!fs.existsSync(phase5hMigrationPath)) {
    throw new Error(`Phase 5H migration file not found at ${phase5hMigrationPath}`);
  }
  if (!fs.existsSync(phase5iMigrationPath)) {
    throw new Error(`Phase 5I migration file not found at ${phase5iMigrationPath}`);
  }
  if (!fs.existsSync(testPath)) {
    throw new Error(`Test file not found at ${testPath}`);
  }

  const initialMigrationContent = fs.readFileSync(initialMigrationPath, 'utf8');
  const hardeningMigrationContent = fs.readFileSync(hardeningMigrationPath, 'utf8');
  const viewRefinementContent = fs.readFileSync(viewRefinementPath, 'utf8');
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

  // 3. Verify non-recursive get_current_role definition
  if (!initialMigrationContent.includes('CREATE OR REPLACE FUNCTION public.get_current_role()')) {
    throw new Error('Missing get_current_role() security function definition');
  }

  // 4. Verify storage bucket setup
  if (!initialMigrationContent.includes('clinical-documents')) {
    throw new Error('Missing private bucket definition for clinical-documents');
  }

  // 5. Verify Security Hardening Migration components
  console.log('[Security Hardening Validation] Verifying hardening policies and views...');
  const hardeningChecks = [
    'consultations_patient_update',
    'consultations_patient_insert',
    'consultations_admin_update',
    'consultations_no_client_delete',
    'clinical_notes_no_client_insert',
    'clinical_notes_no_client_update',
    'clinical_notes_no_client_delete',
    'v_unassigned_consultation_queue',
    'v_doctor_directory',
    'enforce_notification_update_safety',
    'notifications_patient_update',
    'prescriptions_no_client_insert',
    'prescriptions_no_client_update',
    'prescriptions_no_client_delete',
    'orders_no_client_insert',
    'orders_no_client_update',
    'orders_no_client_delete',
    'clinical_documents_no_client_insert',
    'clinical_documents_no_client_update',
    'clinical_documents_no_client_delete',
    'audit_logs_no_client_insert',
    'audit_logs_no_client_update',
    'audit_logs_no_client_delete',
  ];

  for (const check of hardeningChecks) {
    if (!hardeningMigrationContent.includes(check)) {
      throw new Error(`Missing security hardening component: ${check}`);
    }
  }

  // 6. Verify View Security Refinement Migration (20260918020000_view_security_refinement.sql)
  console.log('[View Security Refinement Validation] Checking refined view definitions...');
  
  // Verify preferred_dosage was removed from unassigned queue view
  if (viewRefinementContent.includes('c.preferred_dosage')) {
    throw new Error('Violation: preferred_dosage is still present in refined v_unassigned_consultation_queue definition');
  }
  if (!viewRefinementContent.includes('c.primary_concern') || !viewRefinementContent.includes('c.submitted_at')) {
    throw new Error('Missing essential triage columns in refined v_unassigned_consultation_queue');
  }

  // Verify doctor directory fields are patient-safe
  const forbiddenDoctorFields = [
    'p.email',
    'p.phone',
    'p.shipping_address',
    'p.date_of_birth',
    'sp.license_number',
    'sp.npi_number',
    'sp.signature_url',
    'sp.firebase_uid',
    'sp.audit',
  ];
  for (const forbidden of forbiddenDoctorFields) {
    if (viewRefinementContent.includes(forbidden)) {
      throw new Error(`Security Violation: ${forbidden} exposed in v_doctor_directory`);
    }
  }

  // Verify security_barrier is enabled for both views
  const queueBarrierCheck = /CREATE\s+VIEW\s+public\.v_unassigned_consultation_queue\s+WITH\s*\(\s*security_barrier\s*=\s*true\s*\)/i;
  const docBarrierCheck = /CREATE\s+VIEW\s+public\.v_doctor_directory\s+WITH\s*\(\s*security_barrier\s*=\s*true\s*\)/i;
  if (!queueBarrierCheck.test(viewRefinementContent)) {
    throw new Error('Missing WITH (security_barrier = true) on v_unassigned_consultation_queue in refinement migration');
  }
  if (!docBarrierCheck.test(viewRefinementContent)) {
    throw new Error('Missing WITH (security_barrier = true) on v_doctor_directory in refinement migration');
  }

  // 7. Verify specific test scenarios in RLS test suite
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
  console.log('✅ Comprehensive RLS security test suite verified.');
}

validateSqlFiles();
