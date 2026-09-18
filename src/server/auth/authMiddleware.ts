import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken } from './firebaseAuth';
import { verifySupabaseAccessToken } from './supabaseAuth';
import { AuthenticatedUser, UserRole } from './types';

/**
 * Authenticates an incoming request from the Authorization Bearer header.
 * Primary: Firebase ID Token (active production).
 * Secondary: Supabase Access Token (prepared for phased cutover).
 */
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // 1. Primary: Verify Firebase ID Token
  const firebaseUser = await verifyFirebaseIdToken(token);
  if (firebaseUser) {
    return firebaseUser;
  }

  // 2. Secondary fallback: Check if token is a Supabase Access Token
  const supabaseUser = await verifySupabaseAccessToken(token);
  if (supabaseUser) {
    return supabaseUser;
  }

  return null;
}

/**
 * Middleware ensuring the request is authenticated by either Firebase or Supabase.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authUser = await authenticateRequest(req);

  if (!authUser) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication session' });
    return;
  }

  // Attach normalized user with backwards compatibility for legacy token consumers
  (req as any).user = {
    ...authUser,
    // Preserve legacy fields consumed in existing route handlers:
    sub: authUser.uid,
    admin: authUser.role === 'admin',
  };

  next();
}

/**
 * Guard middleware verifying user has one of the allowed roles.
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
