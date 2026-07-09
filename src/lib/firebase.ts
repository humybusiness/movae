// Initialisation Firebase — optionnelle.
//
// Si les variables d'environnement VITE_FIREBASE_* ne sont pas définies,
// `isFirebaseConfigured` vaut false : l'application fonctionne alors en mode
// local (sans compte, données dans le navigateur), exactement comme avant.
// Dès que la configuration est fournie, la connexion Google / e-mail et la
// synchronisation cloud s'activent automatiquement.

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(config as Required<typeof config>);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (err) {
    console.warn("[Movaé] Initialisation Firebase impossible :", err);
  }
}

export const auth = authInstance;
export const db = dbInstance;
