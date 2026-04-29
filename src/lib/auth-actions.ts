'use server'

import { cookies } from 'next/headers';
import authData from './auth-data.json';
import { logActivity } from './activity-actions';

export async function login(username: string, password: string) {
  console.log(`Intentando login para: ${username}`);
  const user = authData.find(u => u.username === username && u.password === password);

  if (user) {
    console.log(`Login exitoso para: ${username} con rol: ${user.role}`);
    await logActivity(username, 'login');
    const cookieStore = await cookies();
    
    // In a real app, you'd use a JWT or a session ID. 
    // For this simple implementation, we store the user info in a cookie.
    // NOTE: This is NOT secure for production as it can be easily spoofed if not signed.
    cookieStore.set('session', JSON.stringify({
      username: user.username,
      role: user.role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return { success: true, role: user.role };
  }

  return { success: false, error: 'Credenciales inválidas' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return { success: true };
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  console.log('Recuperando sesión:', session ? 'Encontrada' : 'No encontrada');
  if (session) {
    try {
      const data = JSON.parse(session.value);
      console.log('Datos de sesión:', data);
      return data;
    } catch (e) {
      console.error('Error al parsear sesión:', e);
      return null;
    }
  }
  return null;
}
