"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  ChevronRight,
  Home,
  Menu,
  Users,
  UserCog,
  LogOut,
  Layers3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUser } from "@/firebase";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

function SidebarContent({ pathname, navigation }: { pathname: string, navigation: any[] }) {
  const { logout } = useUser();
  const [pwOpen, setPwOpen] = useState(false);
  return (
    <div className="border-r bg-white h-full p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-headline font-bold">T</span>
        </div>
        <span className="font-headline font-bold text-xl tracking-tight">
          Admin<span className="text-primary">Panel</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => (
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
        <Button
          variant="ghost"
          onClick={() => setPwOpen(true)}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-primary"
        >
          <KeyRound className="h-4 w-4" /> Cambiar Contraseña
        </Button>
        <Button
          variant="ghost"
          onClick={() => logout()}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        >
          <LogOut className="h-4 w-4" /> Cerrar Sesión
        </Button>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
    { label: "Tableros", icon: Package, href: "/admin/panels" },
    { label: "Equivalencias", icon: Layers3, href: "/admin/equivalence-groups" },
    { label: "Seguimiento", icon: Users, href: "/admin/users" },
    { label: "Usuarios", icon: UserCog, href: "/admin/accounts" },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-slate-50">
      {/* Sidebar Mobile */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden fixed top-4 left-4 z-50 rounded-full shadow-md bg-white">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 [&>button]:hidden">
          <SidebarContent pathname={pathname} navigation={navigation} />
        </SheetContent>
      </Sheet>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-40">
        <SidebarContent pathname={pathname} navigation={navigation} />
      </aside>

      <main className="flex-1 md:pl-72 overflow-auto bg-slate-50/50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
