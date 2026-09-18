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
 * Detects whether the current runtime environment is a production deployment.
 * Inspects multiple platform environment signals (Vercel, Cloud Run, standard NODE_ENV).
 */
export function isProductionDeployment(): boolean {
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.APP_ENV === 'production') return true;
  if (process.env.ENVIRONMENT === 'production') return true;
  if (process.env.NODE_ENV === 'production') return true;
  return false;
}

/**
 * Checks whether the explicit auth test feature flag is enabled.
 */
export function isAuthTestEnabled(): boolean {
  return (
    process.env.AUTH_TEST_ENABLED === 'true' ||
    process.env.ENABLE_AUTH_TEST === 'true'
  );
}

/**
 * Checks if the execution environment permits destructive test-account reset operations.
 *
 * CRITICAL FAIL-CLOSED GUARDS:
 * 1. MUST NOT be a production deployment (isProductionDeployment() === true => BLOCKED).
 * 2. MUST have explicit AUTH_TEST_ENABLED='true' or ENABLE_AUTH_TEST='true'.
 *
 * The production Suga.Health deployment must NOT expose a working destructive reset operation.
 */
export function isTestResetAllowed(): boolean {
  // Guard 1: Hard block in production deployment
  if (isProductionDeployment()) {
    return false;
  }

  // Guard 2: Explicit flag required in development/staging
  if (!isAuthTestEnabled()) {
    return false;
  }

  return true;
}

/**
 * Destructive Test-Account Reset Operation.
 *
 * CRITICAL SECURITY INVARIANTS:
 * 1. Fails closed in production.
 * 2. ONLY operates on exact emails matching configured test accounts (TEST_PATIENT_EMAIL, etc.).
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

  // Guard 2: Strict exact-email allowlist check
  if (!isAllowlistedTestEmail(normalizedEmail)) {
    throw new Error(
      `Email "${normalizedEmail}" is not an allowlisted test account. Only configured test addresses (TEST_PATIENT_EMAIL, TEST_DOCTOR_EMAIL, etc.) can be reset by this service.`
    );
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
