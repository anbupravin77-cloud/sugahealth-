import { supabaseAdmin } from '../supabaseAdmin';
import { UserRole } from './types';

export interface DesignatedTestAccount {
  email: string;
  defaultRole: UserRole;
  displayName: string;
  specialties?: string[];
}

export const DESIGNATED_TEST_ACCOUNTS: ReadonlyArray<DesignatedTestAccount> = [
  {
    email: 'patient@sugahealth.test',
    defaultRole: 'patient',
    displayName: 'Test Patient',
  },
  {
    email: 'doctor@sugahealth.test',
    defaultRole: 'doctor',
    displayName: 'Dr. Sarah Test MD',
    specialties: ['General Medicine', 'Telehealth Consultation'],
  },
  {
    email: 'pharmacist@sugahealth.test',
    defaultRole: 'pharmacist',
    displayName: 'Marcus Test RPh',
  },
  {
    email: 'admin@sugahealth.test',
    defaultRole: 'admin',
    displayName: 'Suga System Admin Tester',
  },
];

const ALLOWED_TEST_DOMAINS = ['@sugahealth.test'];

/**
 * Validates whether an email falls strictly within the test-account boundary.
 */
export function isAllowlistedTestEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_TEST_DOMAINS.some(domain => normalized.endsWith(domain));
}

/**
 * Provisions a designated test account strictly on the server side using the
 * privileged Supabase Admin client. Sets tamper-proof app_metadata.role and
 * synchronizes profiles and staff_profiles tables.
 */
export async function provisionDesignatedTestAccount(email: string, password: string): Promise<{ success: boolean; userId: string; role: UserRole }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isAllowlistedTestEmail(normalizedEmail)) {
    throw new Error(`Email "${normalizedEmail}" is not an allowlisted test account. Only @sugahealth.test addresses are allowed.`);
  }

  const spec = DESIGNATED_TEST_ACCOUNTS.find(a => a.email === normalizedEmail) || {
    email: normalizedEmail,
    defaultRole: 'patient' as UserRole,
    displayName: 'Test User',
  };

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
