import { Request, Response, NextFunction } from 'express';
import { verifySupabaseAccessToken } from './supabaseAuth';
import { AuthenticatedUser, UserRole } from './types';

/**
 * Canonical authentication for clinical and general endpoints.
 *
 * STRICT CANONICAL DIRECTIVE:
 * - Supabase Auth is the CANONICAL identity for all Suga.Health workflows.
 * - Requires a valid Supabase Access Token directly verified via Supabase Auth API.
 * - No Firebase fallback.
 * - Enforces: ONE REQUEST -> ONE SUPABASE IDENTITY -> ONE AUTHORIZATION DECISION.
 */
export async function authenticateClinicalRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // Direct Supabase verification only. Never silently substitute or fallback to Firebase.
  const supabaseUser = await verifySupabaseAccessToken(token);
  if (supabaseUser) {
    return supabaseUser;
  }

  return null;
}

/**
 * Middleware ensuring the request is authenticated via canonical Supabase Auth.
 * Used for /api/clinical/* and /api/messages/* endpoints.
 */
export async function requireClinicalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authUser = await authenticateClinicalRequest(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized: Missing, invalid, or expired Supabase clinical session' });
    return;
  }

  (req as any).user = {
    ...authUser,
    sub: authUser.uid,
    admin: authUser.role === 'admin',
  };

  next();
}

/**
 * Guard middleware verifying that a Supabase-authenticated user has one of the allowed clinical roles.
 */
export function requireClinicalRoles(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authUser = await authenticateClinicalRequest(req);

    if (!authUser) {
      res.status(401).json({ error: 'Unauthorized: Valid Supabase authentication required' });
      return;
    }

    if (!allowedRoles.includes(authUser.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions for this clinical resource' });
      return;
    }

    (req as any).user = {
      ...authUser,
      sub: authUser.uid,
      admin: authUser.role === 'admin',
    };

    next();
  };
}

export const requireClinicalDoctorAuth = requireClinicalRoles('doctor', 'admin');
export const requireClinicalPatientAuth = requireClinicalRoles('patient');

/**
 * Authenticates an incoming request.
 * Supabase Access Token (canonical identity).
 */
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  return verifySupabaseAccessToken(token);
}

/**
 * General authentication middleware using Supabase auth.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authUser = await authenticateRequest(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication session' });
    return;
  }

  (req as any).user = {
    ...authUser,
    sub: authUser.uid,
    admin: authUser.role === 'admin',
  };

  next();
}

/**
 * Legacy guard middleware verifying user has one of the allowed roles.
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authUser = await authenticateRequest(req);

    if (!authUser) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (!allowedRoles.includes(authUser.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions for this resource' });
      return;
    }

    (req as any).user = {
      ...authUser,
      sub: authUser.uid,
      admin: authUser.role === 'admin',
    };

    next();
  };
}

export const requireAdminAuth = requireRoles('admin');
export const requireDoctorAuth = requireRoles('doctor', 'admin');
export const requirePharmacistAuth = requireRoles('pharmacist', 'admin');
export const requireStaffAuth = requireRoles('doctor', 'pharmacist', 'admin');

