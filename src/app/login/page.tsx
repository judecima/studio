
"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulation of firebase login
    setTimeout(() => {
      setLoading(false);
      router.push('/admin');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-headline font-bold text-xl">T</span>
            </div>
            <span className="font-headline font-bold text-2xl tracking-tight">
              Tableros<span className="text-primary">Pro</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Acceso Administrativo</h1>
          <p className="text-muted-foreground mt-2">Ingresa tus credenciales para gestionar el sistema.</p>
        </div>

        <Card className="border-none shadow-xl">
          <form onSubmit={handleLogin}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
              <CardDescription>Usa tu cuenta de empleado autorizada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@tablerospro.com.ar" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Button variant="link" className="p-0 h-auto text-xs">¿Olvidaste tu contraseña?</Button>
                </div>
                <Input id="password" type="password" required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full gap-2 h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Ingresar al Dashboard
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes acceso? <Button variant="link" className="p-0 h-auto">Contacta a Soporte IT</Button>
        </p>
      </div>
    </div>
  );
}
