
'use client';

import { useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

/**
 * Componente que asegura que haya una sesión de Firebase activa.
 * Inicia sesión anónima si no hay un usuario autenticado.
 */
export function AuthInitializer() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      console.log('Iniciando sesión anónima para habilitar acceso a Firestore...');
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  return null;
}
