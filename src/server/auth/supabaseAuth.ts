import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';
import { AuthenticatedUser } from './types';
import { resolveSupabaseUserRole } from './roleResolution';

/**
 * Verifies a Supabase access token (JWT) provided by a client in the Authorization header.
 *
 * NOTE: This verifies the end-user's access token via Supabase Auth's official API `getUser(token)`.
 * It does NOT use or expose the Supabase publishable key or secret key.
 *
 * Returns a normalized AuthenticatedUser if valid, or null if invalid/expired.
 */
export async function verifySupabaseAccessToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Resolve verified role from server-controlled metadata / database
    const role = await resolveSupabaseUserRole(user);

    return {
      uid: user.id,
      email: user.email,
      role,
      authProvider: 'supabase',
      supabaseUser: user,
    };
  } catch (err: any) {
    console.error('[SupabaseAuth] Verification error:', err.message);
    return null;
  }
}

/**
 * Reusable Express middleware for routes that explicitly require Supabase JWT verification.
 * Prepared for staged migration; NOT activated globally in Phase 3.
 */
export async function requireSupabaseAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const authUser = await verifySupabaseAccessToken(token);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired Supabase session' });
    return;
  }

  (req as any).user = authUser;
  next();
}
