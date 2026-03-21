"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-headline font-bold">T</span>
            </div>
            <span className="font-headline font-bold text-xl tracking-tight hidden sm:block">
              Tableros<span className="text-primary">Pro</span>
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
            <Link 
              href="/admin" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground"
              )}
            >
              Administración
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
          
          <div className="hidden md:flex items-center gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Panel Admin
              </Button>
            </Link>
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
          </div>
        </div>
      )}
    </nav>
  );
}
