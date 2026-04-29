import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

/**
 * @fileOverview Inicialización universal de Firebase.
 */

if (typeof process !== 'undefined' && typeof process.setMaxListeners === 'function') {
  process.setMaxListeners(20);
}

let cachedApp: FirebaseApp | null = null;

export function initializeFirebase() {
  if (cachedApp) return getSdks(cachedApp);

  const apps = getApps();
  if (apps.length > 0) {
    cachedApp = apps[0];
    return getSdks(cachedApp);
  }

  try {
    cachedApp = initializeApp(firebaseConfig);
    return getSdks(cachedApp);
  } catch (e) {
    console.error('Firebase initialization error', e);
    throw e;
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
