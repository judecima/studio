'use client'

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import logo from '@/app/logo.png';
import { establishSession } from '@/lib/auth-actions';
import { resolveLoginEmail } from '@/lib/auth-config';
import { initializeFirebase } from '@/firebase';
import { GoogleIcon } from '@/components/GoogleIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, User, Layers3, Search, RefreshCw, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useFirebase } from '@/firebase';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const { setSession } = useFirebase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { firebaseApp } = initializeFirebase();
      const auth = getAuth(firebaseApp);
      const cred = await signInWithEmailAndPassword(auth, resolveLoginEmail(username), password);
      const idToken = await cred.user.getIdToken();

      const result = await establishSession(idToken);
      if (result.success) {
        setSession({ username: result.username }, result.role);
        if (result.role === 'administrador') {
          router.push('/admin');
        } else {
          router.push('/');
        }
        router.refresh();
      } else {
        setError(result.error || 'Credenciales inválidas');
      }
    } catch (err: any) {
      const code = err?.code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        setError('Credenciales inválidas');
      } else {
        setError('Ocurrió un error al iniciar sesión');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    const value = username.trim();
    if (!value.includes('@')) {
      setError('Para recuperar tu contraseña, ingresá tu email en el campo de arriba.');
      return;
    }
    try {
      const { firebaseApp } = initializeFirebase();
      const auth = getAuth(firebaseApp);
      await sendPasswordResetEmail(auth, value.toLowerCase());
      toast({
        title: 'Email enviado',
        description: 'Si el email existe, vas a recibir un enlace para restablecer tu contraseña.',
      });
    } catch (err) {
      // No revelamos si el email existe o no.
      toast({
        title: 'Email enviado',
        description: 'Si el email existe, vas a recibir un enlace para restablecer tu contraseña.',
      });
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { firebaseApp } = initializeFirebase();
      const auth = getAuth(firebaseApp);
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();

      const result = await establishSession(idToken);
      if (result.success) {
        setSession({ username: result.username }, result.role);
        router.push(result.role === 'administrador' ? '/admin' : '/');
        router.refresh();
      } else {
        // La cuenta de Google no tiene perfil todavía → completar registro (teléfono).
        setError('Tu cuenta de Google no está registrada. Registrate para continuar.');
        router.push('/register');
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError('No se pudo iniciar sesión con Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* ============ PANEL IZQUIERDO — MARKETING ============ */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary p-12 text-white">
        {/* Blobs decorativos */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-secondary/40 blur-3xl" />

        {/* Marca */}
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Image src={logo} alt="RedArquimax" className="h-8 w-8 scale-[1.6] object-contain" priority />
          </span>
          <span className="font-headline text-2xl font-bold tracking-tight">RedArquimax</span>
        </div>

        {/* Propuesta de valor */}
        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
            <Layers3 className="h-3.5 w-3.5" /> Equivalencias de tableros
          </span>
          <h2 className="mt-6 font-headline text-4xl font-bold leading-tight">
            Encontrá el tablero equivalente en segundos.
          </h2>
          <p className="mt-4 text-lg text-white/80">
            El sistema que compara placas y tapacantos entre <strong className="text-white">Egger, Faplac, Arauco</strong> y
            más. Ingresá o registrate para acceder al catálogo completo.
          </p>

          {/* Swatches de tableros */}
          <div className="mt-8 flex gap-2">
            {['#c9a06b', '#8a5a34', '#e6dcc8', '#3f3b38', '#b7c2b0', '#d9c2a3'].map((c) => (
              <span
                key={c}
                className="h-10 w-10 rounded-lg border border-white/20 shadow-lg"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Features */}
          <ul className="mt-8 space-y-3">
            {[
              { icon: Layers3, text: 'Equivalencias reales entre marcas y materiales (MDF / MDP).' },
              { icon: Search, text: 'Catálogo con colores, texturas y especificaciones técnicas.' },
              { icon: RefreshCw, text: 'Stock y novedades siempre actualizados.' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-white/90">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© 2024 RedArquimax Argentina. Acceso exclusivo para clientes y equipo.</p>
      </aside>

      {/* ============ PANEL DERECHO — FORMULARIO ============ */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Marca compacta (solo mobile) */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Image src={logo} alt="RedArquimax" className="mb-3 h-12 w-12 scale-[1.65] object-contain" priority />
            <h1 className="font-headline text-2xl font-bold tracking-tight text-slate-900">
              Red<span className="text-primary">Arquimax</span>
            </h1>
          </div>

          {/* Aviso comercial de acceso */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
            <Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-slate-600">
              Iniciá sesión o <Link href="/register" className="font-semibold text-primary hover:underline">registrate gratis</Link> para
              acceder a nuestro <strong className="text-slate-800">sistema de equivalencias de tableros</strong>.
            </p>
          </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-headline">Bienvenido de nuevo</CardTitle>
            <CardDescription>
              Ingresá tus credenciales para acceder al catálogo.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario o Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    placeholder="Tu usuario o email"
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  'Ingresar al Catálogo'
                )}
              </Button>

              <div className="flex items-center gap-3 w-full py-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] uppercase tracking-wider text-slate-400">o</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full h-11 gap-2 font-semibold"
              >
                <GoogleIcon className="h-4 w-4" />
                Continuar con Google
              </Button>
            </CardFooter>
          </form>
        </Card>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Registrate gratis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400 lg:hidden">
            © 2024 RedArquimax Argentina. Acceso restringido.
          </p>
        </div>
      </main>
    </div>
  );
}
