import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance: App | null = null;

function getAdminApp(): App | null {
  if (!appInstance) {
    if (!getApps().length) {
      try {
        appInstance = initializeApp({
          projectId: firebaseConfig.projectId,
        });
      } catch (err) {
        console.warn('[Firebase Admin] Warning initializing app:', err);
      }
    } else {
      appInstance = getApps()[0];
    }
  }
  return appInstance;
}

let cachedAuth: Auth | null = null;
export function getAdminAuth(): Auth {
  if (!cachedAuth) {
    getAdminApp();
    try {
      cachedAuth = getAuth();
    } catch (err) {
      console.warn('[Firebase Admin] Warning getting Auth:', err);
      return {} as Auth;
    }
  }
  return cachedAuth;
}

let cachedDb: Firestore | null = null;
export function getAdminDb(): Firestore {
  if (!cachedDb) {
    getAdminApp();
    try {
      cachedDb = getFirestore(firebaseConfig.firestoreDatabaseId);
    } catch (err) {
      console.warn('[Firebase Admin] Warning getting Firestore:', err);
      return {} as Firestore;
    }
  }
  return cachedDb;
}

export const adminAuth = new Proxy({} as Auth, {
  get(target, prop, receiver) {
    const auth = getAdminAuth();
    const value = Reflect.get(auth, prop, receiver);
    return typeof value === 'function' ? value.bind(auth) : value;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(target, prop, receiver) {
    const db = getAdminDb();
    const value = Reflect.get(db, prop, receiver);
    return typeof value === 'function' ? value.bind(db) : value;
  },
});

export default adminDb;

