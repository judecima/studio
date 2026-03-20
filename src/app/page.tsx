
"use client"

import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { PanelCard } from "@/components/PanelCard";
import { PanelFiltersSidebar } from "@/components/PanelFilters";
import { PanelFilters, Panel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Loader2, PackageSearch } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-10">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-headline font-bold tracking-tight text-slate-900">
              Nuestro Catálogo
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Explora nuestra amplia variedad de tableros melamínicos de alta calidad para tus proyectos de diseño y arquitectura.
            </p>
          </div>
          
          <div className="flex lg:hidden w-full md:w-auto">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto gap-2 h-12 shadow-sm">
                  <SlidersHorizontal className="h-4 w-4" /> Filtros de Diseño
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-full sm:max-w-md">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle className="text-xl font-headline font-bold">Ajustar Filtros</SheetTitle>
                  <SheetDescription>Filtra por marca, espesor o tipo de veta.</SheetDescription>
                </SheetHeader>
                <div className="h-full overflow-y-auto">
                  <PanelFiltersSidebar filters={filters} onChange={setFilters} onReset={resetFilters} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:block w-80 shrink-0 sticky top-24 h-fit">
            <PanelFiltersSidebar filters={filters} onChange={setFilters} onReset={resetFilters} />
          </aside>
          
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-dashed shadow-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">Analizando catálogo industrial...</p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between text-sm font-bold uppercase tracking-widest text-slate-400">
                  <span>Resultados ({filteredPanels.length})</span>
                  {filteredPanels.length > 0 && <span className="h-px flex-1 mx-4 bg-slate-200 hidden sm:block" />}
                </div>
                
                {filteredPanels.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                    {filteredPanels.map(panel => (
                      <PanelCard key={panel.id} panel={panel} />
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center bg-white rounded-3xl border border-dashed shadow-sm flex flex-col items-center gap-4 px-6">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
                      <PackageSearch className="h-8 w-8 text-slate-300" />
                    </div>
                    <div className="max-w-xs space-y-2">
                      <p className="text-xl font-bold text-slate-900">Sin coincidencias</p>
                      <p className="text-sm text-muted-foreground">No encontramos paneles que cumplan con los criterios de filtrado seleccionados.</p>
                    </div>
                    <Button variant="outline" onClick={resetFilters} className="mt-2">Limpiar todos los filtros</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t py-12 md:py-16 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 opacity-40 grayscale">
            <div className="w-8 h-8 bg-slate-400 rounded-lg" />
            <span className="font-headline font-bold text-xl tracking-tight">TablerosPro</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-loose">
            © 2024 TablerosPro Argentina. <br className="md:hidden" />
            Expertos en distribución de melaminas y soluciones de carpintería.
          </p>
        </div>
      </footer>
    </div>
  );
}
