
"use client"

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Ruler, Layers, Loader2, FileDown, MessageSquare } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, query, collection, where, documentId } from "firebase/firestore";
import { Panel, Equivalence } from "@/lib/types";
import { Sparkles, ArrowRight, Info } from "lucide-react";
import { PanelCard } from "@/components/PanelCard";

function EquivalenceSection({ panelId, targetPanel }: { panelId: string, targetPanel: any }) {
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [targetMetadata, setTargetMetadata] = useState<any>(null);
  const [isDynamicLoading, setIsDynamicLoading] = useState(true);
  
  const db = useFirestore();
  const eqRef = useMemoFirebase(() => {
    if (!db || !panelId) return null;
    return doc(db, 'equivalences', panelId);
  }, [db, panelId]);

  const { data: eq, isLoading: isEqLoading } = useDoc<Equivalence>(eqRef);

  // Fetch real-time matches from our new Match Engine API
  useEffect(() => {
    async function fetchMatches() {
      if (!panelId) return;
      try {
        setIsDynamicLoading(true);
        const res = await fetch(`/api/match?id=${panelId}`);
        const data = await res.json();
        if (data.success) {
          setAllMatches(data.matches);
          setTargetMetadata(data.target);
        }
      } catch (e) {
        console.error("Error fetching matches:", e);
      } finally {
        setIsDynamicLoading(false);
      }
    }
    fetchMatches();
  }, [panelId]);

  // 🔥 Filtrado Estricto (Mínimo 60 Puntos)
  const filteredMatches = useMemo(() => {
    return allMatches.filter(m => {
      const similarity = Math.max(0, Math.floor(m.matchScore || 0));
      return similarity >= 60;
    });
  }, [allMatches]);

  const similarityOfTopMatch = useMemo(() => {
    if (filteredMatches.length === 0) return 0;
    const top = filteredMatches[0];
    return Math.max(0, Math.floor(top.matchScore || 0));
  }, [filteredMatches]);

  const narrativeText = useMemo(() => {
    // Si hay un texto pre-calculado en Firestore, lo priorizamos
    if (eq?.text) return `"${eq.text}"`;

    const toneMap: any = { light: 'claro', dark: 'oscuro', medium: 'medio' };
    const tempMap: any = { warm: 'cálida', cool: 'fría', neutral: 'neutra' };
    
    const tone = toneMap[targetPanel.tone] || 'medio';
    const temp = tempMap[targetPanel.temperature] || 'neutra';
    const color = targetPanel.colorGroup === 'merlot' ? 'rojo-violeta' : targetPanel.colorGroup === 'madera' ? 'veteado' : targetPanel.colorGroup || 'otro';
    
    let baseText = `El color ${targetPanel.name} (${targetPanel.brand}) es un diseño de tono ${tone} y temperatura ${temp}, con una base cromática ${color}.`;
    
    // Solo si hay matches excelentes (>= 60%), generamos la lista
    if (filteredMatches.length >= 1 && similarityOfTopMatch >= 60) {
      let listText = `${baseText}\n\nCoincidencias técnicas detectadas:\n`;
      filteredMatches.forEach(m => {
        const similarity = Math.max(0, Math.floor(m.matchScore || 0));
        const mFullIdentity = `${m.name} ${m.code || ''}`.toLowerCase();
        
        // Detección de acabados premium (Egger PerfectSense o Gloss)
        const isPremium = mFullIdentity.includes('perfectsense') || mFullIdentity.includes('pm') || mFullIdentity.includes('gloss') || mFullIdentity.includes('pg');
        
        // Detección de inconsistencia de material usando METADATOS CLASIFICADOS
        const isStone = targetMetadata?.texture === 'piedra';
        const mIsMetal = mFullIdentity.includes('metal') || mFullIdentity.includes('aluminio') || mFullIdentity.includes('f528');
        const mIsLiso = m.texture === 'mate' || m.texture === 'standard' || m.texture === 'liso';
        const mIsWood = m.texture === 'veteado';
        
        const isCategoryMismatch = (isStone && (mIsMetal || mIsLiso || mIsWood)) || (targetMetadata?.texture === 'mate' && m.texture === 'piedra');
        
        let prefix = `• ${m.name} (${m.code || m.id}) - ${m.brand} - ${similarity}%`;
        if (isPremium) prefix += ` 💎 [Línea Premium]`;
        if (isCategoryMismatch) prefix += ` ⚠️ [Textura diferente]`;
        listText += `${prefix}\n`;
      });
      return listText;
    }

    // Fallback si no hay matches excelentes
    return "Análisis en tiempo real: Se han encontrado coincidencias técnicas basadas en colorimetría digital y textura.";
  }, [eq, filteredMatches, similarityOfTopMatch, targetPanel, targetMetadata]);

  if (isDynamicLoading && !eq) return (
    <div className="mt-16 flex justify-center py-20">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
    </div>
  );

  // Si no hay equivalencia guardada NI matches dinámicos filtrados, no mostramos nada
  if (!eq && filteredMatches.length === 0 && !isDynamicLoading) return null;

  return (
    <section className="mt-16 bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-indigo-100/20 relative overflow-hidden ring-1 ring-slate-100">
      <div className="absolute -top-24 -right-24 h-64 w-64 bg-indigo-50/50 rounded-full blur-3xl opacity-50" />
      
      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-2xl md:text-3xl font-headline font-bold text-slate-900 tracking-tight">
                Coincidencias de Diseño CIELAB
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-14">
              Detección de Similitud Entre Marcas y Colecciones
            </p>
          </div>
        </div>

        <div className="bg-slate-50/80 backdrop-blur-sm p-6 md:p-8 rounded-[2rem] border border-slate-100 leading-relaxed text-slate-600 italic text-lg md:text-xl font-medium shadow-inner relative group whitespace-pre-wrap">
          <div className="absolute -left-1 top-4 h-12 w-1 bg-indigo-500 rounded-full opacity-40" />
          {narrativeText}
        </div>

        {filteredMatches.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
              <span>Top Alternativas Detectadas (Min 60%)</span>
              <div className="h-px flex-1 mx-6 bg-slate-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {isDynamicLoading ? (
                 Array(Math.min(3, filteredMatches.length || 3)).fill(0).map((_, i) => (
                   <div key={i} className="aspect-[3/4] bg-slate-100 animate-pulse rounded-[2rem]" />
                 ))
              ) : (
                filteredMatches.map((matchPanel: any) => {
                  const similarity = Math.max(0, Math.floor(matchPanel.matchScore || 0));
                  return (
                    <div key={matchPanel.id} className="relative group/card">
                      <div className="absolute -top-3 -right-3 z-30">
                        <Badge className="bg-indigo-600 text-white border-2 border-white shadow-xl h-12 w-12 rounded-full p-0 flex items-center justify-center font-bold text-sm ring-4 ring-indigo-50">
                          {similarity}
                        </Badge>
                      </div>
                      <PanelCard panel={matchPanel} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

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

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase mb-2 tracking-widest opacity-80">
                  <Ruler className="h-4 w-4" /> Dimensiones
                </div>
                <p className="text-xl font-headline font-bold text-slate-800">
                  {panel.width}x{panel.height} <span className="text-xs font-body font-normal text-muted-foreground">mm</span>
                </p>
              </div>
              <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col">
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase mb-2 tracking-widest opacity-80">
                  <Layers className="h-4 w-4" /> Espesor
                </div>
                <p className="text-xl font-headline font-bold text-slate-800">
                  {panel.thickness} <span className="text-xs font-body font-normal text-muted-foreground">mm</span>
                </p>
              </div>
              <div className="p-5 bg-slate-100/50 rounded-[1.5rem] border border-slate-200 flex flex-col">
                <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase mb-2 tracking-widest opacity-80">
                  <Layers className="h-4 w-4" /> Textura
                </div>
                <p className="text-xl font-headline font-bold text-slate-800">
                  {panel.surfaceTexture || 'Standard'} 
                  <span className="text-[10px] block font-body font-normal text-muted-foreground uppercase tracking-tight">
                    Acabado {panel.isSmooth ? 'Liso' : 'con Veta / Rugoso'}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tipo de Veta</p>
                  <p className="text-sm font-bold text-slate-700">{panel.hasGrain ? 'Diseño con Veta' : 'Color Sólido / Liso'}</p>
                </div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Fingerprint</p>
                  <p className="text-sm font-bold text-slate-700">{panel.antiFingerprint ? 'Protección Anti-huella' : 'Acabado Estándar'}</p>
                </div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Acabado Final</p>
                  <p className="text-sm font-bold text-slate-700">{panel.finish || 'Mate / Natural'}</p>
                </div>
              </div>
            </div>

            {panel.applications && panel.applications.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aplicaciones Sugeridas</h4>
                <div className="flex flex-wrap gap-2">
                  {panel.applications.map((app, i) => (
                    <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-tight">
                      {app}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(panel.useCases?.length > 0 || panel.styleTags?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {panel.useCases?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ambientes Ideales</h4>
                    <div className="flex flex-wrap gap-2">
                      {panel.useCases.map((use, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 text-primary rounded-lg border border-primary/10 text-xs font-bold uppercase tracking-tight">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                          {use}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {panel.styleTags?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estilos Sugeridos</h4>
                    <div className="flex flex-wrap gap-2">
                      {panel.styleTags.map((tag, i) => (
                        <div key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-xs font-bold uppercase tracking-tight italic">
                          # {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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

        {/* Coincidencias CIELAB Section */}
        <EquivalenceSection panelId={id as string} targetPanel={panel} />

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
