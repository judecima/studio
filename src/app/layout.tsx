import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ClientFirebaseProvider } from '@/firebase/client-provider';
import { AuthGuard } from '@/components/AuthGuard';
import { cn } from '@/lib/utils';

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: 'RedArquimax | Gestión de Paneles MDF y MDF',
  description: 'Plataforma profesional para la comercialización de tableros de madera en Argentina.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <ClientFirebaseProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </ClientFirebaseProvider>
        <Toaster />
      </body>
    </html>
  );
}
