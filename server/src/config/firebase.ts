import * as admin from 'firebase-admin';
import { env } from './environment';
import fs from 'fs';

let firebaseInitialized = false;

try {
  if (admin.apps.length > 0) {
    firebaseInitialized = true;
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS)) {
    admin.initializeApp({
      credential: admin.credential.cert(env.GOOGLE_APPLICATION_CREDENTIALS),
    });
    firebaseInitialized = true;
  } else if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
  } else {
    // Development fallback without credentials (e.g. when emulator or mock is used)
    admin.initializeApp({
      projectId: env.FIREBASE_PROJECT_ID || 'securechat-dev',
    });
    firebaseInitialized = true;
    console.warn('⚠️ Firebase Admin initialized without service account credentials (Dev/Emulator mode)');
  }
} catch (error) {
  console.warn('⚠️ Firebase Admin initialization deferred:', error instanceof Error ? error.message : error);
}

export const firebaseAdmin = admin;
export const firestore = admin.firestore();
export const firebaseAuth = admin.auth();
export const isFirebaseConfigured = () => firebaseInitialized;
