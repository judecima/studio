'use server'

import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './firebase-admin';
import { getSession } from './auth-actions';
import {
  normalizeUsername,
  usernameToEmail,
  isEmail,
  isValidPhone,
  type UserRole,
} from './auth-config';

export type ManagedUser = {
  uid: string;
  username: string;
  email: string;
  phone: string | null;
  role: UserRole;
  provider: string;
  disabled: boolean;
  createdAt: number | null;
};

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

function validateUsername(username: string): string | null {
  if (!USERNAME_RE.test(username)) {
    return 'El usuario debe tener 3-32 caracteres (minúsculas, números, . _ -).';
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return null;
}

function mapAuthError(e: any): string {
  const code = e?.errorInfo?.code || e?.code;
  if (code === 'auth/email-already-exists') return 'Ese nombre de usuario ya existe.';
  if (code === 'auth/invalid-password') return 'La contraseña no es válida (mínimo 6 caracteres).';
  if (code === 'auth/user-not-found') return 'Usuario no encontrado.';
  console.error('Error de Firebase Admin:', e);
  return 'Ocurrió un error al procesar la operación.';
}

/**
 * Crea un registro de Auth + perfil en Firestore para cuentas INTERNAS
 * (username → email ficticio @arquimax.app). Lo usa el alta desde administración.
 */
async function createUserInternal(
  rawUsername: string,
  password: string,
  role: UserRole,
  phone?: string
): Promise<ActionResult<ManagedUser>> {
  const username = normalizeUsername(rawUsername);

  const usernameError = validateUsername(username);
  if (usernameError) return { success: false, error: usernameError };

  const passwordError = validatePassword(password);
  if (passwordError) return { success: false, error: passwordError };

  const email = usernameToEmail(username);

  try {
    const userRecord = await adminAuth().createUser({ email, password });

    const phoneValue = phone?.trim() || null;
    await adminDb().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      username,
      email,
      phone: phoneValue,
      role,
      provider: 'password',
      disabled: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      data: {
        uid: userRecord.uid,
        username,
        email,
        phone: phoneValue,
        role,
        provider: 'password',
        disabled: false,
        createdAt: null,
      },
    };
  } catch (e) {
    return { success: false, error: mapAuthError(e) };
  }
}

async function requireAdmin(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: 'No autenticado.' };
  if (session.role !== 'administrador') {
    return { success: false, error: 'Solo los administradores pueden realizar esta acción.' };
  }
  return { success: true };
}

/**
 * Registro público con email/contraseña. El identificador es un EMAIL REAL
 * y el teléfono es obligatorio. Siempre se crea con rol "usuario".
 */
export async function registerUser(
  email: string,
  password: string,
  phone: string
): Promise<ActionResult<ManagedUser>> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isEmail(normalizedEmail)) {
    return { success: false, error: 'Ingresá un email válido.' };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { success: false, error: passwordError };
  if (!isValidPhone(phone)) {
    return { success: false, error: 'Ingresá un número de teléfono válido.' };
  }

  try {
    const userRecord = await adminAuth().createUser({ email: normalizedEmail, password });

    const phoneValue = phone.trim();
    await adminDb().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      username: normalizedEmail,
      email: normalizedEmail,
      phone: phoneValue,
      role: 'usuario',
      provider: 'password',
      disabled: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      data: {
        uid: userRecord.uid,
        username: normalizedEmail,
        email: normalizedEmail,
        phone: phoneValue,
        role: 'usuario',
        provider: 'password',
        disabled: false,
        createdAt: null,
      },
    };
  } catch (e) {
    return { success: false, error: mapAuthError(e) };
  }
}

/**
 * Registro / alta de perfil para usuarios que inician con Google.
 * Google ya creó la cuenta en Firebase Auth; acá verificamos el token, exigimos
 * teléfono y creamos el perfil en Firestore si no existe (siempre rol "usuario").
 */
export async function ensureGoogleUser(
  idToken: string,
  phone: string
): Promise<ActionResult<{ isNew: boolean }>> {
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch (e) {
    return { success: false, error: 'Sesión de Google inválida.' };
  }

  const uid = decoded.uid;
  const email = (decoded.email || '').toLowerCase();
  const docRef = adminDb().collection('users').doc(uid);
  const snap = await docRef.get();

  if (snap.exists) {
    return { success: true, data: { isNew: false } };
  }

  if (!isValidPhone(phone)) {
    return { success: false, error: 'Ingresá un número de teléfono válido para completar el registro.' };
  }

  await docRef.set({
    uid,
    username: email || uid,
    email,
    phone: phone.trim(),
    role: 'usuario',
    provider: 'google',
    disabled: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, data: { isNew: true } };
}

/**
 * Creación desde el panel de administración. Solo un administrador puede crear
 * usuarios, y solo un administrador puede crear otros administradores.
 */
export async function adminCreateUser(
  usernameOrEmail: string,
  password: string,
  role: UserRole,
  phone?: string
): Promise<ActionResult<ManagedUser>> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  const safeRole: UserRole = role === 'administrador' ? 'administrador' : 'usuario';
  const value = usernameOrEmail.trim().toLowerCase();

  // Si el admin ingresa un email real, se crea una cuenta con ese email;
  // si ingresa un username, se usa el dominio interno @arquimax.app.
  if (isEmail(value)) {
    const passwordError = validatePassword(password);
    if (passwordError) return { success: false, error: passwordError };
    try {
      const userRecord = await adminAuth().createUser({ email: value, password });
      const phoneValue = phone?.trim() || null;
      await adminDb().collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        username: value,
        email: value,
        phone: phoneValue,
        role: safeRole,
        provider: 'password',
        disabled: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      return {
        success: true,
        data: {
          uid: userRecord.uid,
          username: value,
          email: value,
          phone: phoneValue,
          role: safeRole,
          provider: 'password',
          disabled: false,
          createdAt: null,
        },
      };
    } catch (e) {
      return { success: false, error: mapAuthError(e) };
    }
  }

  return createUserInternal(value, password, safeRole, phone);
}

/** Lista todos los usuarios (solo admin). */
export async function adminListUsers(): Promise<ActionResult<ManagedUser[]>> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  try {
    const snap = await adminDb().collection('users').get();
    const users: ManagedUser[] = snap.docs
      // Ignoramos documentos legacy de un esquema anterior (sin username / rol propio).
      .filter((doc) => {
        const d = doc.data();
        return typeof d.username === 'string' && (d.role === 'usuario' || d.role === 'administrador');
      })
      .map((doc) => {
        const d = doc.data();
        return {
          uid: doc.id,
          username: d.username as string,
          email: d.email,
          phone: d.phone ?? null,
          role: d.role as UserRole,
          provider: d.provider ?? 'password',
          disabled: !!d.disabled,
          createdAt: d.createdAt?.toMillis?.() ?? null,
        };
      })
      .sort((a, b) => a.username.localeCompare(b.username));
    return { success: true, data: users };
  } catch (e) {
    return { success: false, error: mapAuthError(e) };
  }
}

/** Actualiza username, contraseña y/o rol de un usuario (solo admin). */
export async function adminUpdateUser(
  uid: string,
  updates: { username?: string; password?: string; role?: UserRole; phone?: string }
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  try {
    const docRef = adminDb().collection('users').doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) return { success: false, error: 'Usuario no encontrado.' };

    const authUpdate: { email?: string; password?: string } = {};
    const docUpdate: Record<string, any> = {};

    if (updates.username !== undefined) {
      const raw = updates.username.trim().toLowerCase();
      if (isEmail(raw)) {
        // Cuenta con email real: el username ES el email.
        authUpdate.email = raw;
        docUpdate.username = raw;
        docUpdate.email = raw;
      } else {
        const username = normalizeUsername(raw);
        const usernameError = validateUsername(username);
        if (usernameError) return { success: false, error: usernameError };
        const email = usernameToEmail(username);
        authUpdate.email = email;
        docUpdate.username = username;
        docUpdate.email = email;
      }
    }

    if (updates.password !== undefined && updates.password !== '') {
      const passwordError = validatePassword(updates.password);
      if (passwordError) return { success: false, error: passwordError };
      authUpdate.password = updates.password;
    }

    if (updates.role !== undefined) {
      docUpdate.role = updates.role === 'administrador' ? 'administrador' : 'usuario';
    }

    if (updates.phone !== undefined) {
      docUpdate.phone = updates.phone.trim() || null;
    }

    if (Object.keys(authUpdate).length > 0) {
      await adminAuth().updateUser(uid, authUpdate);
    }
    if (Object.keys(docUpdate).length > 0) {
      await docRef.update(docUpdate);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: mapAuthError(e) };
  }
}

/**
 * Permite al usuario autenticado cambiar su propia contraseña.
 * Funciona para cualquier cuenta (incluidos los usuarios seed con email interno
 * y cuentas de Google, a las que les habilita además el ingreso por contraseña).
 */
export async function changeOwnPassword(newPassword: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: 'No autenticado.' };

  const passwordError = validatePassword(newPassword);
  if (passwordError) return { success: false, error: passwordError };

  try {
    await adminAuth().updateUser(session.uid, { password: newPassword });
    return { success: true };
  } catch (e) {
    return { success: false, error: mapAuthError(e) };
  }
}

/** Elimina un usuario de Auth y de Firestore (solo admin, no a sí mismo). */
export async function adminDeleteUser(uid: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  const session = await getSession();
  if (session?.uid === uid) {
    return { success: false, error: 'No podés eliminar tu propia cuenta.' };
  }

  try {
    await adminAuth().deleteUser(uid);
    await adminDb().collection('users').doc(uid).delete();
    return { success: true };
  } catch (e) {
    return { success: false, error: mapAuthError(e) };
  }
}
