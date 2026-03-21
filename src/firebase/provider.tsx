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
  user: null;
  role: 'admin'; 
  isUserLoading: boolean; 
  userError: Error | null;
  areServicesAvailable: boolean;
};

const FirebaseContext = createContext<FirebaseContextType>({
  firebaseApp: null,
  firestore: null,
  storage: null,
  auth: null,
  db: null,
  user: null,
  role: 'admin',
  isUserLoading: true,
  userError: null,
  areServicesAvailable: false
});

export const useFirebase = () => useContext(FirebaseContext);

export const useAuth = () => null;

export const useUser = () => {
  const context = useFirebase();
  return {
    user: context.user,
    role: context.role,
    isUserLoading: context.isUserLoading,
    userError: context.userError
  };
};

export const useFirestore = () => {
  const context = useFirebase();
  return context.firestore;
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

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [contextState, setContextState] = useState<Partial<FirebaseContextType>>({
    isUserLoading: true,
    role: 'admin'
  });

  useEffect(() => {
    let app, fs;
    try {
      const initResult = initializeFirebase();
      app = initResult.firebaseApp;
      fs = initResult.firestore;
      
      setContextState({
        firebaseApp: app,
        firestore: fs,
        db: fs,
        storage: null,
        auth: null,
        user: null,
        role: 'admin',
        isUserLoading: false,
        userError: null,
        areServicesAvailable: true
      });

    } catch (error: any) {
      console.error("Firebase Initialization Error:", error);
      setContextState(prev => ({ ...prev, isUserLoading: false, userError: error, areServicesAvailable: false }));
    }
  }, []);

  return (
    <FirebaseContext.Provider 
      value={{
        firebaseApp: contextState.firebaseApp || null,
        firestore: contextState.firestore || null,
        storage: contextState.storage || null,
        db: contextState.firestore || null,
        auth: null,
        user: null,
        role: contextState.role || 'admin',
        isUserLoading: contextState.isUserLoading ?? false,
        userError: contextState.userError || null,
        areServicesAvailable: contextState.areServicesAvailable ?? false
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}