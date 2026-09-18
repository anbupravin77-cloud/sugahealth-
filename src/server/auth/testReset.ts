import { supabaseAdmin } from '../supabaseAdmin';
import { isAllowlistedTestEmail } from './testAccounts';

export interface ResetResult {
  success: boolean;
  email: string;
  userId?: string;
  recordsDeleted: {
    consultations: number;
    orders: number;
    subscriptions: number;
    staffProfiles: number;
    profiles: number;
    authUser: boolean;
  };
  message: string;
}

/**
 * Checks if the execution environment permits destructive test-account reset operations.
 * Fails closed in production unless explicit ENABLE_AUTH_TEST override is configured for staging.
 */
export function isTestResetAllowed(): boolean {
  // If explicitly disabled or in standard production without explicit auth test flag, reject
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_AUTH_TEST !== 'true') {
    return false;
  }
  return true;
}

/**
 * Destructive Test-Account Reset Operation.
 *
 * CRITICAL SECURITY INVARIANTS:
 * 1. Fails closed in production.
 * 2. ONLY operates on emails matching allowlist: `@sugahealth.test`.
 * 3. Never deletes all users or arbitrary users.
 * 4. Removes only test application records tied to the specific test user ID.
 * 5. Uses server-side admin client; credentials never reach the browser.
 */
export async function resetDesignatedTestAccount(email: string): Promise<ResetResult> {
  const normalizedEmail = email.trim().toLowerCase();

  // Guard 1: Environment check
  if (!isTestResetAllowed()) {
    throw new Error('Test reset operation is strictly forbidden in production mode.');
  }

  // Guard 2: Strict allowlist check
  if (!isAllowlistedTestEmail(normalizedEmail)) {
    throw new Error(`Email "${normalizedEmail}" is not an allowlisted test account. Real email addresses cannot be reset by this service.`);
  }

  // Step 1: Identify Auth user in Supabase
  const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Failed to query Supabase Auth users: ${listError.message}`);
  }

  const user = (userList?.users || []).find((u: any) => u.email?.toLowerCase() === normalizedEmail);

  if (!user) {
    return {
      success: true,
      email: normalizedEmail,
      recordsDeleted: {
        consultations: 0,
        orders: 0,
        subscriptions: 0,
        staffProfiles: 0,
        profiles: 0,
        authUser: false,
      },
      message: `Test account ${normalizedEmail} does not exist in Supabase Auth. Environment is already clean.`,
    };
  }

  const userId = user.id;
  const recordsDeleted = {
    consultations: 0,
    orders: 0,
    subscriptions: 0,
    staffProfiles: 0,
    profiles: 0,
    authUser: false,
  };

  // Step 2: Delete user-owned relational records in safe dependency order
  try {
    // Delete subscriptions
    const { count: subCount } = await supabaseAdmin
      .from('subscriptions')
      .delete({ count: 'exact' })
      .eq('patient_id', userId);
    recordsDeleted.subscriptions = subCount || 0;

    // Delete orders
    const { count: orderCount } = await supabaseAdmin
      .from('orders')
      .delete({ count: 'exact' })
      .eq('patient_id', userId);
    recordsDeleted.orders = orderCount || 0;

    // Delete consultations
    const { count: consultCount } = await supabaseAdmin
      .from('consultations')
      .delete({ count: 'exact' })
      .eq('patient_id', userId);
    recordsDeleted.consultations = consultCount || 0;

    // Delete staff_profiles (if applicable)
    const { count: staffCount } = await supabaseAdmin
      .from('staff_profiles')
      .delete({ count: 'exact' })
      .eq('id', userId);
    recordsDeleted.staffProfiles = staffCount || 0;

    // Delete profiles
    const { count: profileCount } = await supabaseAdmin
      .from('profiles')
      .delete({ count: 'exact' })
      .eq('id', userId);
    recordsDeleted.profiles = profileCount || 0;

    // Step 3: Delete Auth user via Supabase admin API
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      throw new Error(`Failed to delete Supabase Auth user: ${deleteAuthError.message}`);
    }
    recordsDeleted.authUser = true;

  } catch (err: any) {
    console.error(`[TestReset] Error during reset of ${normalizedEmail} (${userId}):`, err.message);
    throw new Error(`Reset execution failed: ${err.message}`);
  }

  return {
    success: true,
    email: normalizedEmail,
    userId,
    recordsDeleted,
    message: `Test account ${normalizedEmail} (${userId}) was completely purged and reset. Ready for fresh signup testing.`,
  };
}
