import { adminAuth } from '../firebaseAdmin';
import { AuthenticatedUser } from './types';
import { resolveFirebaseUserRole } from './roleResolution';

/**
 * Verifies a Firebase ID token and resolves the server-authenticated user profile.
 */
export async function verifyFirebaseIdToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const role = await resolveFirebaseUserRole(decodedToken);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      authProvider: 'firebase',
      firebaseToken: decodedToken,
    };
  } catch (err: any) {
    return null;
  }
}
