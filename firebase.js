import { initializeApp, getApps } from "firebase/app";
import { GoogleAuthProvider, browserLocalPersistence, getAuth, inMemoryPersistence, initializeAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (hasFirebaseConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  try {
    auth = initializeAuth(app, {
      persistence: [browserLocalPersistence, inMemoryPersistence],
    });
  } catch {
    auth = getAuth(app);
  }
  try {
    db = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch {
    db = getFirestore(app);
  }
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope("profile");
  googleProvider.addScope("email");
}

export { app, auth, db, googleProvider };
