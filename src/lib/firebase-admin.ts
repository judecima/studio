import {
  initializeApp,
  getApps,
  getApp,
  cert,
  applicationDefault,
  type App,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * @fileOverview Inicialización del Firebase Admin SDK (solo servidor).
 *
 * Resuelve las credenciales en este orden:
 *  1. FIREBASE_SERVICE_ACCOUNT       → JSON de la cuenta de servicio (string).
 *  2. GOOGLE_APPLICATION_CREDENTIALS → ruta a un archivo (lo lee el SDK solo).
 *  3. ./serviceAccount.json          → archivo local en la raíz (dev).
 *  4. applicationDefault()           → credenciales automáticas (App Hosting/prod).
 */

function resolveCredential() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawJson) {
    try {
      return cert(JSON.parse(rawJson));
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido:', e);
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // El SDK lee esta variable automáticamente vía applicationDefault().
    return applicationDefault();
  }

  const localPath = path.join(process.cwd(), 'serviceAccount.json');
  if (fs.existsSync(localPath)) {
    try {
      const json = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      return cert(json);
    } catch (e) {
      console.error('No se pudo leer ./serviceAccount.json:', e);
    }
  }

  // Producción (Firebase App Hosting): credenciales del entorno.
  return applicationDefault();
}

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }
  adminApp = initializeApp({
    credential: resolveCredential(),
    projectId: firebaseConfig.projectId,
  });
  return adminApp;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
