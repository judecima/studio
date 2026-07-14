'use client'

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import logo from '@/app/logo.png';
import { registerUser, ensureGoogleUser } from '@/lib/user-actions';
import { establishSession } from '@/lib/auth-actions';
import { isValidPhone } from '@/lib/auth-config';
import { initializeFirebase, useFirebase } from '@/firebase';
import { GoogleIcon } from '@/components/GoogleIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, Phone } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setSession } = useFirebase();

  const goAfterSession = (result: { success: boolean; username?: string; role?: any }) => {
    if (result.success) {
      setSession({ username: result.username }, result.role);
      router.push('/');
      router.refresh();
    } else {
      router.push('/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Ingresá un número de teléfono válido.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerUser(email, password, phone);
      if (!result.success) {
        setError(result.error || 'No se pudo completar el registro.');
        return;
      }

      const { firebaseApp } = initializeFirebase();
      const auth = getAuth(firebaseApp);
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const idToken = await cred.user.getIdToken();
      const session = await establishSession(idToken);
      goAfterSession(session);
    } catch (err) {
      setError('Ocurrió un error al registrarte. Intentá nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    if (!isValidPhone(phone)) {
      setError('Ingresá tu número de teléfono antes de continuar con Google.');
      return;
    }

    setIsLoading(true);
    try {
      const { firebaseApp } = initializeFirebase();
      const auth = getAuth(firebaseApp);
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();

      const ensured = await ensureGoogleUser(idToken, phone);
      if (!ensured.success) {
        setError(ensured.error || 'No se pudo completar el registro con Google.');
        return;
      }

      const session = await establishSession(idToken);
      goAfterSession(session);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setError('No se pudo registrar con Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src={logo}
            alt="RedArquimax"
            className="mb-4 h-12 w-12 scale-[1.65] object-contain"
            priority
          />
          <h1 className="text-2xl font-headline font-bold tracking-tight text-slate-900">
            Red<span className="text-primary">Arquimax</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Sistema de Gestión Industrial</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-headline">Crear Cuenta</CardTitle>
            <CardDescription>
              Registrate con tu email y teléfono. Las cuentas nuevas tienen rol de usuario.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+54 11 1234 5678"
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
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
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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
                    Creando cuenta...
                  </>
                ) : (
                  'Crear Cuenta'
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
                Registrarse con Google
              </Button>
              <p className="text-[11px] text-slate-400 text-center">
                Completá tu teléfono arriba antes de usar Google.
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
