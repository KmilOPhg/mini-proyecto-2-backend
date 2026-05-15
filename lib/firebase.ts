import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin/app";

const globalForFirebase = globalThis as unknown as {
  firebaseApp?: admin.app.App;
};

/**
 * Inicializa Firebase Admin una sola vez.
 * - Producción / Render: variable `FIREBASE_SERVICE_ACCOUNT` con el JSON completo del service account (string).
 * - Local: archivo JSON y variable `GOOGLE_APPLICATION_CREDENTIALS` apuntando a la ruta, u opcionalmente `FIREBASE_SERVICE_ACCOUNT`.
 */
export function getFirebaseApp(): admin.app.App {
  if (globalForFirebase.firebaseApp) return globalForFirebase.firebaseApp;
  if (admin.apps.length > 0) {
    globalForFirebase.firebaseApp = admin.app();
    return globalForFirebase.firebaseApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) {
    const parsed = JSON.parse(raw) as ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(parsed) });
  } else {
    admin.initializeApp();
  }

  globalForFirebase.firebaseApp = admin.app();
  return globalForFirebase.firebaseApp;
}

export function getDb(): admin.firestore.Firestore {
  return admin.firestore(getFirebaseApp());
}
