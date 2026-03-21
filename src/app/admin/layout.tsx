"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  LogOut, 
  ChevronRight,
  Home,
  FileUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase/provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isUserLoading } = useUser();

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin", roles: ["vendedor", "administrador", "admin"] },
    { label: "Paneles", icon: Package, href: "/admin/panels", roles: ["vendedor", "administrador", "admin"] },
    { label: "Importar Catálogo", icon: FileUp, href: "/admin/import", roles: ["administrador", "admin"] },
    { label: "Usuarios", icon: Settings, href: "/admin/users", roles: ["admin"] },
  ];

  useEffect(() => {
    if (!isUserLoading && (!user || role === 'cliente')) {
      router.push('/');
    }
  }, [user, role, isUserLoading, router]);

  if (isUserLoading || !user || role === 'cliente') {
    return <div className="min-h-screen flex items-center justify-center">Cargando permisos...</div>;
  }

  // Filter allowed paths for the current view
  const accessDenied = pathname.includes('/admin/import') && !['administrador', 'admin'].includes(role as string) || 
                       pathname.includes('/admin/users') && role !== 'admin';

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-white shrink-0 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-headline font-bold">T</span>
          </div>
          <span className="font-headline font-bold text-xl tracking-tight">
            Admin<span className="text-primary">Panel</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems
            .filter((item) => item.roles.includes(role as string))
            .map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                pathname === item.href 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-4 w-4", pathname === item.href ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </div>
              {pathname === item.href && <ChevronRight className="h-4 w-4" />}
            </Link>
          ))}
        </nav>

        <div className="pt-6 border-t mt-6 space-y-2">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-primary">
              <Home className="h-4 w-4" /> Ver Web Pública
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-4 w-4" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {accessDenied ? (
             <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
               <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso Restringido ⛔</h2>
               <p className="text-slate-600">No tienes permisos suficientes para visualizar este módulo. Necesitas un rango superior asignado por el administrador general.</p>
             </div>
          ) : children}
        </div>
      </main>
    </div>
  );
}
