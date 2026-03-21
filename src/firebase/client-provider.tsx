'use client';

import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';

interface ClientFirebaseProviderProps {
  children: ReactNode;
}

export function ClientFirebaseProvider({ children }: ClientFirebaseProviderProps) {
  return (
    <FirebaseProvider>
      {children}
    </FirebaseProvider>
  );
}