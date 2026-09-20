import { adminAuth } from '../firebaseAdmin';
import { AuthenticatedUser } from './types';

/**
 * Legacy Firebase ID token verification (compatibility stub).
 */
export async function verifyFirebaseIdToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: 'patient',
      authProvider: 'firebase',
      firebaseToken: decodedToken,
    };
  } catch (err: any) {
    return null;
  }
}
