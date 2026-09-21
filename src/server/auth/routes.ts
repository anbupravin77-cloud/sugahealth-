import { Router, Request, Response } from 'express';
import { bootstrapUserProfile } from './profileBootstrap';
import { provisionDesignatedTestAccount, isAllowlistedTestEmail, getConfiguredTestAccounts } from './testAccounts';
import { resetDesignatedTestAccount, isTestResetAllowed } from './testReset';
import { authenticateRequest } from './authMiddleware';
import { resolveSupabaseUserRole } from './roleResolution';
import { supabaseAdmin } from '../supabaseAdmin';

export const authRouter = Router();

/**
 * Bootstraps a public.profiles record for a newly authenticated Supabase user.
 * Enforces role = 'patient' (unless privileged app_metadata.role is already set).
 */
authRouter.post('/bootstrap-profile', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const profile = await bootstrapUserProfile(token, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      displayName: req.body.displayName,
    });
    res.json({ success: true, profile });
  } catch (err: any) {
    console.error('[AuthRoutes] bootstrap-profile error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error during profile bootstrap' });
  }
});

/**
 * Returns current authenticated user profile and roles.
 */
authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authUser = await authenticateRequest(req);
  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Fetch full profile from Supabase profiles table
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', authUser.uid)
    .maybeSingle();

  let completeProfile: any = profile || {
    id: authUser.uid,
    uid: authUser.uid,
    email: authUser.email,
    role: authUser.role,
    display_name: authUser.supabaseUser?.user_metadata?.display_name || authUser.email?.split('@')[0] || 'User',
    first_name: authUser.supabaseUser?.user_metadata?.first_name || '',
    last_name: authUser.supabaseUser?.user_metadata?.last_name || '',
  };

  if (authUser.role !== 'patient') {
    const { data: staff } = await supabaseAdmin
      .from('staff_profiles')
      .select('*')
      .eq('id', authUser.uid)
      .maybeSingle();
    if (staff) completeProfile = { ...completeProfile, ...staff, role: authUser.role };
  }

  res.json({ success: true, user: authUser, profile: completeProfile });
});

/**
 * Development / Test Account Provisioning Endpoint.
 * Available only in development/test or staging mode.
 * Strictly limited to allowlisted test domains (@sugahealth.test).
 */
authRouter.post('/test/provision', async (req: Request, res: Response): Promise<void> => {
  if (!isTestResetAllowed()) {
    res.status(403).json({ error: 'Test account provisioning is strictly forbidden in production mode.' });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  if (!isAllowlistedTestEmail(email)) {
    res.status(400).json({ error: `Security boundary violation: Only configured test accounts can be provisioned. "${email}" was rejected.` });
    return;
  }

  try {
    const result = await provisionDesignatedTestAccount(email, password);
    res.json(result);
  } catch (err: any) {
    console.error('[AuthRoutes] test/provision error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to provision test account' });
  }
});

/**
 * Destructive Test Account Reset Endpoint.
 * Permanently deletes only the specified test account and its application records.
 * Fails closed in production.
 */
authRouter.post('/test/reset', async (req: Request, res: Response): Promise<void> => {
  if (!isTestResetAllowed()) {
    res.status(403).json({ error: 'Test account reset is strictly forbidden in production mode.' });
    return;
  }

  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email parameter is required.' });
    return;
  }

  if (!isAllowlistedTestEmail(email)) {
    res.status(400).json({ error: `Security boundary violation: Only explicitly configured test accounts can be reset. "${email}" was rejected.` });
    return;
  }

  try {
    const result = await resetDesignatedTestAccount(email);
    res.json(result);
  } catch (err: any) {
    console.error('[AuthRoutes] test/reset error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to reset test account' });
  }
});

/**
 * Returns list of designated test accounts specification.
 */
authRouter.get('/test/accounts', (req: Request, res: Response): void => {
  if (!isTestResetAllowed()) {
    res.status(403).json({ error: 'Forbidden in production mode.' });
    return;
  }

  const accounts = getConfiguredTestAccounts();
  res.json({
    success: true,
    configured: accounts.length > 0,
    accounts: accounts.map(a => ({
      email: a.email,
      role: a.defaultRole,
      displayName: a.displayName,
      envVar: a.envVar,
    })),
  });
});

/**
 * Server-side auto-provision and login helper for designated test doctor.
 * Validates credentials strictly against server environment variables.
 * Never leaks TEST_DOCTOR_PASSWORD to the client.
 */
authRouter.post('/doctor-login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  // Otherwise, attempt standard Supabase password authentication
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid clinical credentials.' });
      return;
    }

    // Verify role using canonical server-authoritative role resolution
    const role = await resolveSupabaseUserRole(data.user);

    if (role !== 'doctor' && role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Account does not have clinical doctor authorization.' });
      return;
    }

    res.json({
      success: true,
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role,
      },
    });
  } catch (err: any) {
    console.error('[AuthRoutes] doctor-login standard auth error:', err.message);
    res.status(401).json({ error: 'Invalid clinical credentials.' });
  }
});