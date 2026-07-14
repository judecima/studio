/**
 * Da de alta en Firebase (Auth + Firestore) los usuarios definidos en
 * src/lib/auth-data.json, con sus mismos roles y contraseñas.
 *
 * Es idempotente: si un usuario ya existe, actualiza su contraseña/rol.
 *
 * Requiere credenciales de Admin SDK. Resuelve, en orden:
 *   1. process.env.GOOGLE_APPLICATION_CREDENTIALS (ruta a un JSON)
 *   2. ./serviceAccount.json en la raíz del proyecto
 *
 * Uso:
 *   npx tsx scripts/seed-firebase-users.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'studio-5733239027-4f570';
const EMAIL_DOMAIN = 'arquimax.app';

type AuthUser = { username: string; password: string; role: 'usuario' | 'administrador' };

function resolveCredential() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  const localPath = path.join(process.cwd(), 'serviceAccount.json');
  if (fs.existsSync(localPath)) {
    return cert(JSON.parse(fs.readFileSync(localPath, 'utf8')));
  }
  throw new Error(
    'No se encontraron credenciales. Definí GOOGLE_APPLICATION_CREDENTIALS ' +
      'o colocá serviceAccount.json en la raíz del proyecto.'
  );
}

function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

async function main() {
  initializeApp({ credential: resolveCredential(), projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();

  const dataPath = path.join(process.cwd(), 'src', 'lib', 'auth-data.json');
  const users: AuthUser[] = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  console.log(`Sembrando ${users.length} usuarios en el proyecto ${PROJECT_ID}...\n`);

  for (const u of users) {
    const username = u.username.trim().toLowerCase();
    const email = usernameToEmail(username);
    let uid: string;

    try {
      const created = await auth.createUser({ email, password: u.password });
      uid = created.uid;
      console.log(`✓ Creado    ${username.padEnd(22)} (${u.role})`);
    } catch (e: any) {
      const code = e?.errorInfo?.code || e?.code;
      if (code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
        await auth.updateUser(uid, { password: u.password });
        console.log(`↻ Actualizado ${username.padEnd(20)} (${u.role})`);
      } else {
        console.error(`✗ Error con ${username}:`, e?.message || e);
        continue;
      }
    }

    await db.collection('users').doc(uid).set(
      {
        uid,
        username,
        email,
        role: u.role,
        disabled: false,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  console.log('\n✅ Listo. Usuarios dados de alta en Firebase Auth + Firestore.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
