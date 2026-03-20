
"use client"

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Ruler, Layers, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { SimilarProducts } from "@/components/SimilarProducts";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
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

  const [activeImage, setActiveImage] = useState("");

  useEffect(() => {
    if (panel?.mainImage) setActiveImage(panel.mainImage);
  }, [panel]);

  if (isPanelLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium text-muted-foreground">Analizando ficha técnica...</p>
      </div>
    );
  }

  if (!panel) return <div className="text-center py-20">Producto no encontrado</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 pl-0 gap-2 hover:bg-transparent hover:text-primary transition-colors">
          <ChevronLeft className="h-4 w-4" /> Volver al Catálogo
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-white p-6 md:p-8 rounded-3xl border shadow-sm overflow-hidden">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border shadow-sm bg-slate-50">
              <Image 
                src={activeImage || panel.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"} 
                alt={panel.name || "Vista detallada del panel"} 
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
                  <Image src={img} alt={`Miniatura ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 overflow-hidden flex flex-col">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary text-primary font-bold uppercase tracking-widest truncate max-w-full px-3 py-1">
                  {panel.brand}
                </Badge>
                {panel.stock > 0 && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                    Stock Disponible
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-headline font-bold break-words text-slate-900">
                {panel.name}
              </h1>
            </div>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {panel.description || "Este tablero melamínico de alta calidad ofrece un acabado excepcional para proyectos de arquitectura interior y diseño de mobiliario a medida."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-slate-50/50 rounded-2xl border flex flex-col justify-center">
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase mb-1 tracking-widest">
                  <Ruler className="h-4 w-4" /> Dimensiones Reales
                </div>
                <p className="text-xl font-headline font-bold truncate text-slate-800">
                  {panel.width || "?"}x{panel.height || "?"} mm
                </p>
              </div>
              <div className="p-4 bg-slate-50/50 rounded-2xl border flex flex-col justify-center">
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase mb-1 tracking-widest">
                  <Layers className="h-4 w-4" /> Espesor de Hoja
                </div>
                <p className="text-xl font-headline font-bold truncate text-slate-800">
                  {panel.thickness || "?"} mm
                </p>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
              <Button size="lg" className="flex-1 h-14 text-lg font-bold shadow-lg shadow-primary/20">Solicitar Cotización</Button>
              <Button size="lg" variant="outline" className="flex-1 h-14 text-lg font-bold">Ficha Técnica PDF</Button>
            </div>
          </div>
        </div>

        {/* Similar Products Section */}
        <section className="mt-16 md:mt-24">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-slate-900">Productos Similares</h2>
              <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl">
                Nuestro motor de inteligencia artificial ha seleccionado estas alternativas basadas en armonía cromática, materialidad y veta.
              </p>
            </div>
          </div>

          <SimilarProducts productId={id as string} />
        </section>
      </main>
    </div>
  );
}
