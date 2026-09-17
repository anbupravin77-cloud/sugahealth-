import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "smiling-bazaar-08chg",
  appId: "1:667732108458:web:ff386218817f66d925dcd3",
  apiKey: "AIzaSyCAHC2eD7jcxbmvqaSth5LJQWboW6bYyOw",
  authDomain: "smiling-bazaar-08chg.firebaseapp.com",
  storageBucket: "smiling-bazaar-08chg.firebasestorage.app",
  messagingSenderId: "667732108458"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-remixsugahealth-b05c6986-a23f-4f33-b4cc-80ef5d9319fa");
export const googleProvider = new GoogleAuthProvider();
