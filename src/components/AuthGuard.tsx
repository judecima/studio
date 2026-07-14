'use client'

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { role, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    console.log(`AuthGuard: Path=${pathname}, Role=${role}, Loading=${isUserLoading}`);
    
    if (isUserLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';

    // Administrators have full access to everything (except auth pages when logged in)
    if (role === 'administrador' && !isAuthPage) {
      return;
    }

    // Global restrictions for non-admins (e.g. removed features)
    if (role !== 'administrador' && pathname === '/customizer') {
      router.replace('/');
      return;
    }

    // If not logged in and not on an auth page, redirect to login
    if (!role && !isAuthPage) {
      router.replace('/login');
      return;
    }

    // If logged in and on an auth page, redirect to appropriate start page
    if (role && isAuthPage) {
      if ((role as any) === 'administrador') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
      return;
    }

    // Role restrictions
    // 'usuario' can only see root ('/') and panels
    const isPublicPath = pathname === '/' || pathname.startsWith('/panels/');
    if (role === 'usuario' && !isPublicPath) {
      console.warn('Access restricted for "usuario" role. Redirecting to root.');
      router.replace('/');
      return;
    }

  }, [role, isUserLoading, pathname, router]);

  if (isUserLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 z-[9999]">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
           <div className="w-6 h-6 bg-primary rounded-lg animate-spin" />
        </div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Verificando sesión segura...</p>
      </div>
    );
  }

  // Administrators always pass
  if (role === 'administrador') {
    return <>{children}</>;
  }

  // Final check for 'usuario' role to prevent flash of content on restricted routes
  const isPublicPath = pathname === '/' || pathname.startsWith('/panels/');
  if (role === 'usuario' && !isPublicPath) {
    return null;
  }

  // If not logged in and on protected route, show nothing while redirecting
  if (!role && pathname !== '/login' && pathname !== '/register') {
    console.log('AuthGuard: Blocking protected route (no role)');
    return null;
  }

  console.log('AuthGuard: Allowing access');
  return <>{children}</>;
}
