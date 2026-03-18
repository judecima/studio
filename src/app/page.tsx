
"use client"

import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { PanelCard } from "@/components/PanelCard";
import { PanelFiltersSidebar } from "@/components/PanelFilters";
import { PanelFilters, Panel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

export default function Home() {
  const db = useFirestore();
  const [filters, setFilters] = useState<PanelFilters>({
    thickness: [],
  });

  const panelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'panels'), where('visible', '==', true));
  }, [db]);

  const { data: panels, isLoading } = useCollection<Panel>(panelsQuery);

  const filteredPanels = useMemo(() => {
    if (!panels) return [];
    return panels.filter(panel => {
      if (filters.brand && panel.brand !== filters.brand) return false;
      if (filters.search && !panel.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.thickness && filters.thickness.length > 0 && !filters.thickness.includes(panel.thickness)) return false;
      if (filters.hasGrain !== undefined && panel.hasGrain !== filters.hasGrain) return false;
      return true;
    });
  }, [panels, filters]);

  const resetFilters = () => setFilters({ thickness: [] });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2">Nuestro Catálogo</h1>
            <p className="text-muted-foreground">Explora nuestra amplia variedad de tableros de alta calidad para tus proyectos.</p>
          </div>
          
          <div className="flex md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Filtros de Catálogo</SheetTitle>
                  <SheetDescription>Ajusta los filtros para encontrar el panel perfecto.</SheetDescription>
                </SheetHeader>
                <PanelFiltersSidebar filters={filters} onChange={setFilters} onReset={resetFilters} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-72 shrink-0">
            <PanelFiltersSidebar filters={filters} onChange={setFilters} onReset={resetFilters} />
          </aside>
          
          <div className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando catálogo...</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground font-medium">
                  Mostrando {filteredPanels.length} paneles
                </div>
                
                {filteredPanels.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPanels.map(panel => (
                      <PanelCard key={panel.id} panel={panel} />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-muted/30 rounded-xl border border-dashed">
                    <p className="text-lg font-medium">No se encontraron paneles con esos filtros.</p>
                    <Button variant="link" onClick={resetFilters}>Limpiar filtros</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">© 2024 TablerosPro Argentina. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
