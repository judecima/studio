"use client"

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { KeyRound, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/app/logo.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const { user, role, logout } = useUser();

  const isAdmin = role === 'administrador';

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex h-full items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center">
              <Image
                src={logo}
                alt="RedArquimax"
                className="h-12 w-12 translate-y-1 scale-[1.65] object-contain"
                priority
              />
            </span>
            <span className="font-headline font-bold text-xl tracking-tight hidden sm:block">
              Red<span className="text-primary">Arquimax</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === "/" ? "text-primary" : "text-muted-foreground"
              )}
            >
              Catálogo
            </Link>
            {isAdmin && (
              <>
                <Link 
                  href="/admin" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  Administración
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Panel Admin
                  </Button>
                </Link>
              </div>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border border-slate-200">
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                        {user.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        Rol: {role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); setPwOpen(true); }}
                    className="cursor-pointer"
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>Cambiar contraseña</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-b bg-background p-4 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col gap-4">
            <Link 
              href="/" 
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium p-2 rounded-md hover:bg-accent"
            >
              Catálogo
            </Link>
            {isAdmin && (
              <>
                <Link 
                  href="/admin" 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-medium p-2 rounded-md hover:bg-accent"
                >
                  Administración
                </Link>
                <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Panel Admin
                  </Button>
                </Link>
              </>
            )}
            <Button variant="ghost" onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full justify-start gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
