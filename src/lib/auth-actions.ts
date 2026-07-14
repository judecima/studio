'use server'

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './firebase-admin';
import { logActivity } from './activity-actions';
import type { UserRole } from './auth-config';

const SESSION_COOKIE = 'session';

type SessionData = {
  uid: string;
  username: string;
  role: UserRole;
};

/**
 * Verifica el ID token de Firebase (emitido tras signInWithEmailAndPassword en el
 * cliente), carga el rol desde Firestore y establece la cookie de sesión httpOnly.
 */
export async function establishSession(idToken: string) {
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch (e) {
    console.error('Token inválido en establishSession:', e);
    return { success: false as const, error: 'Sesión inválida. Volvé a iniciar sesión.' };
  }

  const uid = decoded.uid;
  const profileSnap = await adminDb().collection('users').doc(uid).get();

  if (!profileSnap.exists) {
    return { success: false as const, error: 'El usuario no tiene un perfil asignado.' };
  }

  const profile = profileSnap.data() as { username: string; role: UserRole };

  const session: SessionData = {
    uid,
    username: profile.username,
    role: profile.role,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 semana
    path: '/',
  });

  await logActivity(profile.username, 'login');

  return { success: true as const, role: profile.role, username: profile.username };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { success: true };
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session) return null;
  try {
    return JSON.parse(session.value) as SessionData;
  } catch (e) {
    console.error('Error al parsear sesión:', e);
    return null;
  }
}
