
"use client"

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Ruler, Layers, Loader2, FileDown, MessageSquare } from "lucide-react";
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-headline font-bold text-slate-700 animate-pulse text-xl">
          Analizando ficha técnica...
        </p>
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-4xl font-headline font-bold">Producto no encontrado</h1>
        <p className="text-muted-foreground max-w-sm">Es posible que este panel ya no esté disponible o el enlace sea incorrecto.</p>
        <Button onClick={() => router.push('/')}>Volver al Catálogo</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/40">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-10">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-6 pl-0 gap-2 hover:bg-transparent hover:text-primary transition-all group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> 
          <span className="font-bold uppercase tracking-widest text-xs">Volver al Catálogo</span>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-16 bg-white p-4 sm:p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-100">
          
          {/* Gallery Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative aspect-[4/3] sm:aspect-video lg:aspect-[4/3] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100 group">
              <Image 
                src={activeImage || panel.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"} 
                alt={panel.name || "Vista principal del tablero"} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
                priority 
              />
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-4 px-1 custom-scrollbar snap-x">
              {[panel.mainImage, ...(panel.images || [])].filter(Boolean).map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 sm:w-24 aspect-square rounded-2xl overflow-hidden border-2 transition-all shrink-0 snap-start ${activeImage === img ? 'border-primary ring-4 ring-primary/10 shadow-lg scale-95' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <Image src={img} alt={`Vista secundaria ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="border-primary/30 text-primary font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-primary/5">
                  {panel.brand}
                </Badge>
                {panel.stock > 0 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 px-4 py-1.5 rounded-full font-bold">
                    Stock en Depósito
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="px-4 py-1.5 rounded-full">Sin Stock</Badge>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-bold text-slate-900 leading-[1.1] tracking-tight">
                {panel.name}
              </h1>
            </div>

            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              {panel.description || "Tablero melamínico premium para diseño de interiores y mobiliario de alta gama."}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase mb-2 tracking-widest opacity-80">
                  <Ruler className="h-4 w-4" /> Dimensiones
                </div>
                <p className="text-xl md:text-2xl font-headline font-bold text-slate-800">
                  {panel.width}x{panel.height} <span className="text-xs font-body font-normal text-muted-foreground">mm</span>
                </p>
              </div>
              <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase mb-2 tracking-widest opacity-80">
                  <Layers className="h-4 w-4" /> Espesor
                </div>
                <p className="text-xl md:text-2xl font-headline font-bold text-slate-800">
                  {panel.thickness} <span className="text-xs font-body font-normal text-muted-foreground">mm</span>
                </p>
              </div>
            </div>

            <Separator className="opacity-50" />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="flex-1 h-16 text-lg font-bold shadow-xl shadow-primary/30 rounded-2xl gap-2">
                <MessageSquare className="h-5 w-5" /> Consultar Precio
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-16 text-lg font-bold rounded-2xl gap-2 border-2">
                <FileDown className="h-5 w-5" /> Ficha Técnica
              </Button>
            </div>
          </div>
        </div>

        {/* Similar Products Section */}
        <section className="mt-20 md:mt-32">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-100">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Diseño & Armonía</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-headline font-bold text-slate-900 tracking-tight">Productos Similares</h2>
              <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
                Basado en nuestra tecnología de recomendación industrial por materialidad y veta.
              </p>
            </div>
          </div>

          <SimilarProducts productId={id as string} />
        </section>
      </main>

      <footer className="bg-slate-900 text-white py-12 md:py-20 mt-20">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          <div className="space-y-4">
             <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg" />
              <span className="font-headline font-bold text-2xl tracking-tight">TablerosPro</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
              Transformando espacios con materiales de excelencia desde Argentina para el mundo.
            </p>
          </div>
          <div className="hidden md:block" />
          <div className="space-y-4">
            <h4 className="font-headline font-bold text-lg uppercase tracking-widest text-slate-500">Legal</h4>
            <div className="flex flex-col gap-2 text-slate-400 text-sm">
              <span className="hover:text-primary cursor-pointer transition-colors">Términos y condiciones</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Política de privacidad</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Garantía industrial</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
