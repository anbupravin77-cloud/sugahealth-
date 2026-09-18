import { supabaseAdmin } from '../supabaseAdmin';
import { UserRole } from './types';

export interface DesignatedTestAccount {
  email: string;
  defaultRole: UserRole;
  displayName: string;
  envVar: string;
  specialties?: string[];
}

/**
 * Returns the exact allowlisted test accounts configured in environment variables.
 * Each must be a real mailbox controlled by the developer/test owner.
 * Never hardcodes arbitrary real customer emails into source code.
 */
export function getConfiguredTestAccounts(): DesignatedTestAccount[] {
  const accounts: DesignatedTestAccount[] = [];

  if (process.env.TEST_PATIENT_EMAIL && process.env.TEST_PATIENT_EMAIL.trim()) {
    accounts.push({
      email: process.env.TEST_PATIENT_EMAIL.trim().toLowerCase(),
      defaultRole: 'patient',
      displayName: 'Designated Test Patient',
      envVar: 'TEST_PATIENT_EMAIL',
    });
  }

  if (process.env.TEST_DOCTOR_EMAIL && process.env.TEST_DOCTOR_EMAIL.trim()) {
    accounts.push({
      email: process.env.TEST_DOCTOR_EMAIL.trim().toLowerCase(),
      defaultRole: 'doctor',
      displayName: 'Dr. Test Physician MD',
      envVar: 'TEST_DOCTOR_EMAIL',
      specialties: ['General Medicine', 'Telehealth Consultation'],
    });
  }

  if (process.env.TEST_PHARMACIST_EMAIL && process.env.TEST_PHARMACIST_EMAIL.trim()) {
    accounts.push({
      email: process.env.TEST_PHARMACIST_EMAIL.trim().toLowerCase(),
      defaultRole: 'pharmacist',
      displayName: 'Marcus Test RPh',
      envVar: 'TEST_PHARMACIST_EMAIL',
    });
  }

  if (process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_EMAIL.trim()) {
    accounts.push({
      email: process.env.TEST_ADMIN_EMAIL.trim().toLowerCase(),
      defaultRole: 'admin',
      displayName: 'Suga System Admin Tester',
      envVar: 'TEST_ADMIN_EMAIL',
    });
  }

  return accounts;
}

/**
 * Validates whether an email exactly matches one of the explicitly configured test accounts.
 *
 * CRITICAL SECURITY INVARIANTS:
 * - NO wildcard domains (e.g. gmail.com, outlook.com, sugahealth.test).
 * - NO arbitrary user emails.
 * - MUST match an exact configured test address.
 */
export function isAllowlistedTestEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  const configured = getConfiguredTestAccounts();
  return configured.some(acc => acc.email === normalized);
}

/**
 * Provisions a designated test account strictly on the server side using the
 * privileged Supabase Admin client. Sets tamper-proof app_metadata.role and
 * synchronizes profiles and staff_profiles tables.
 */
export async function provisionDesignatedTestAccount(email: string, password: string): Promise<{ success: boolean; userId: string; role: UserRole }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isAllowlistedTestEmail(normalizedEmail)) {
    throw new Error(
      `Email "${normalizedEmail}" is not an explicitly configured test account. Only configured test addresses (TEST_PATIENT_EMAIL, TEST_DOCTOR_EMAIL, etc.) can be provisioned.`
    );
  }

  const spec = getConfiguredTestAccounts().find(a => a.email === normalizedEmail);
  if (!spec) {
    throw new Error(`No designated test specification found for "${normalizedEmail}".`);
  }

  // 1. Check if user already exists in Supabase Auth
  const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Failed to query Supabase Auth users: ${listError.message}`);
  }

  let user = (userList?.users || []).find((u: any) => u.email?.toLowerCase() === normalizedEmail);

  if (!user) {
    // Create new test user with confirmed email and tamper-proof app_metadata role
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      app_metadata: {
        role: spec.defaultRole,
        test_account: true,
      },
      user_metadata: {
        display_name: spec.displayName,
      },
    });

    if (createError || !created.user) {
      throw new Error(`Failed to create test user: ${createError?.message || 'Unknown error'}`);
    }

    user = created.user;
  } else {
    // Update existing user password and role metadata
    const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: {
        ...user.app_metadata,
        role: spec.defaultRole,
        test_account: true,
      },
    });

    if (updateError || !updated.user) {
      throw new Error(`Failed to update test user: ${updateError?.message || 'Unknown error'}`);
    }
    user = updated.user;
  }

  // 2. Synchronize public.profiles
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: user.id,
      email: normalizedEmail,
      display_name: spec.displayName,
      role: spec.defaultRole,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileError) {
    console.warn(`[TestAccounts] Warning syncing profiles for ${normalizedEmail}:`, profileError.message);
  }

  // 3. Synchronize public.staff_profiles if staff role
  if (spec.defaultRole !== 'patient') {
    const { error: staffError } = await supabaseAdmin
      .from('staff_profiles')
      .upsert({
        id: user.id,
        email: normalizedEmail,
        role: spec.defaultRole,
        active: true,
        onboarding_status: 'completed',
        display_name: spec.displayName,
        specialties: spec.specialties || [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (staffError) {
      console.warn(`[TestAccounts] Warning syncing staff_profiles for ${normalizedEmail}:`, staffError.message);
    }
  }

  return {
    success: true,
    userId: user.id,
    role: spec.defaultRole,
  };
}
