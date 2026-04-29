'use client'

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeFirebase } from './index';

type FirebaseContextType = {
  firebaseApp: any | null;
  firestore: any | null;
  storage: any | null;
  auth: null;
  db: any | null;
  
  // Mocks para evitar crasheos en componentes que leían el AuthState
  user: any | null;
  role: 'administrador' | 'usuario' | null; 
  isUserLoading: boolean; 
  userError: Error | null;
  areServicesAvailable: boolean;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  setSession: (user: any, role: any) => void;
};

const FirebaseContext = createContext<FirebaseContextType>({
  firebaseApp: null,
  firestore: null,
  storage: null,
  auth: null,
  db: null,
  user: null,
  role: null,
  isUserLoading: true,
  userError: null,
  areServicesAvailable: false,
  logout: async () => {},
  checkSession: async () => {},
  setSession: () => {}
});

export const useFirebase = () => useContext(FirebaseContext);

export const useAuth = () => null;

export const useUser = () => {
  const context = useFirebase();
  return {
    user: context.user,
    role: context.role,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    logout: context.logout
  };
};

export const useFirestore = () => {
  const context = useFirebase();
  return context.firestore;
};

export const useStorage = () => {
  const context = useFirebase();
  return context.storage;
};

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T & {__memo?: boolean} {
  const { areServicesAvailable } = useFirebase();
  // Only execute the query builder when Firebase guarantees readiness
  const result = React.useMemo(() => {
    if (!areServicesAvailable) return null;
    return factory();
  }, [areServicesAvailable, ...deps]) as any;
  
  if(result && typeof result === 'object') {
     result.__memo = true;
  }
  return result;
}

import { getSession, logout as serverLogout } from '@/lib/auth-actions';

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [contextState, setContextState] = useState<Partial<FirebaseContextType>>({
    isUserLoading: true,
    role: null
  });

  const logout = async () => {
    await serverLogout();
    setContextState(prev => ({ ...prev, user: null, role: null }));
    window.location.href = '/login';
  };

  const checkSession = async () => {
    const session = await getSession();
    setContextState(prev => ({
      ...prev,
      user: session ? { username: session.username } : null,
      role: session?.role || null,
      isUserLoading: false
    }));
  };

  const setSession = (user: any, role: any) => {
    setContextState(prev => ({
      ...prev,
      user,
      role,
      isUserLoading: false
    }));
  };

  useEffect(() => {
    const init = async () => {
      try {
        const initResult = initializeFirebase();
        const session = await getSession();
        
        setContextState({
          firebaseApp: initResult.firebaseApp,
          firestore: initResult.firestore,
          db: initResult.firestore,
          storage: initResult.storage,
          user: session ? { username: session.username } : null,
          role: session?.role || null,
          isUserLoading: false,
          userError: null,
          areServicesAvailable: true
        });

      } catch (error: any) {
        console.error("Firebase Initialization Error:", error);
        setContextState(prev => ({ ...prev, isUserLoading: false, userError: error, areServicesAvailable: false }));
      }
    };

    init();
  }, []);

  return (
    <FirebaseContext.Provider 
      value={{
        firebaseApp: contextState.firebaseApp || null,
        firestore: contextState.firestore || null,
        storage: contextState.storage || null,
        db: contextState.firestore || null,
        auth: null,
        user: contextState.user || null,
        role: contextState.role || null,
        isUserLoading: contextState.isUserLoading ?? false,
        userError: contextState.userError || null,
        areServicesAvailable: contextState.areServicesAvailable ?? false,
        logout,
        checkSession,
        setSession
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}