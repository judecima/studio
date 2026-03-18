"use client"

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Ruler, Layers, Loader2, Sparkles } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { generateCombinations } from "@/services/combinations-engine";
import { CombinationCard } from "@/components/CombinationCard";
import { useDoc, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query } from "firebase/firestore";
import { Panel } from "@/lib/types";

export default function PanelDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();

  const panelRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, 'panels', id as string);
  }, [db, id]);

  const { data: panel, isLoading: isPanelLoading } = useDoc<Panel>(panelRef);

  const panelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'panels'));
  }, [db]);

  const { data: allPanels } = useCollection<Panel>(panelsQuery);

  const [activeImage, setActiveImage] = useState("");

  useEffect(() => {
    if (panel?.mainImage) setActiveImage(panel.mainImage);
  }, [panel]);

  const combinations = useMemo(() => {
    if (!panel || !allPanels) return [];
    return generateCombinations(panel, allPanels);
  }, [panel, allPanels]);

  if (isPanelLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>Cargando detalles del producto...</p>
      </div>
    );
  }

  if (!panel) return <div className="text-center py-20">Producto no encontrado</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 pl-0 gap-2">
          <ChevronLeft className="h-4 w-4" /> Catálogo
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-white p-6 md:p-8 rounded-3xl border shadow-sm overflow-hidden">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border shadow-sm bg-slate-50">
              <Image 
                src={activeImage || panel.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"} 
                alt={panel.name} 
                fill 
                className="object-cover" 
                priority 
              />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {[panel.mainImage, ...(panel.images || [])].filter(Boolean).map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 aspect-square rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeImage === img ? 'border-primary shadow-md' : 'border-transparent opacity-60'}`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 overflow-hidden">
            <div className="space-y-2">
              <Badge variant="outline" className="border-primary text-primary font-bold uppercase tracking-widest truncate max-w-full">
                {panel.brand}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-headline font-bold break-words">
                {panel.name}
              </h1>
            </div>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {panel.description || "Sin descripción disponible para este producto."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-slate-50 rounded-2xl border flex flex-col justify-center">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase mb-1">
                  <Ruler className="h-4 w-4" /> Dimensiones
                </div>
                <p className="text-xl font-headline font-bold truncate">
                  {panel.width || "?"}x{panel.height || "?"} mm
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border flex flex-col justify-center">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase mb-1">
                  <Layers className="h-4 w-4" /> Espesor
                </div>
                <p className="text-xl font-headline font-bold truncate">
                  {panel.thickness || "?"} mm
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="flex-1 h-14 text-lg font-bold">Solicitar Cotización</Button>
              <Button size="lg" variant="outline" className="flex-1 h-14 text-lg font-bold">Ficha Técnica</Button>
            </div>
          </div>
        </div>

        {/* Combinations Section */}
        <section className="mt-16 md:mt-20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-2">
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-bold uppercase text-xs tracking-widest mb-1">
                <Sparkles className="h-4 w-4" /> Smart Recommendations
              </div>
              <h2 className="text-2xl md:text-3xl font-headline font-bold">Combinaciones Ideales</h2>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Sugerencias basadas en armonía tonal y uso.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {combinations.length > 0 ? (
              combinations.map(combo => (
                <CombinationCard key={combo.id} combination={combo} panels={allPanels || []} />
              ))
            ) : (
              <p className="col-span-full text-center py-10 text-muted-foreground bg-white rounded-2xl border border-dashed">
                Buscando combinaciones inteligentes...
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
