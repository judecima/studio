
"use client"

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, query, collection, where, documentId, getDocs } from "firebase/firestore";
import { Panel, Equivalence } from "@/lib/types";
import { PanelCard } from "@/components/PanelCard";

function EquivalenceSection({ panelId, targetPanel }: { panelId: string, targetPanel: any }) {
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [isDynamicLoading, setIsDynamicLoading] = useState(true);
  
  const db = useFirestore();
  const eqRef = useMemoFirebase(() => {
    if (!db || !panelId) return null;
    return doc(db, 'equivalences', panelId);
  }, [db, panelId]);

  const { data: eq, isLoading: isEqLoading } = useDoc<Equivalence>(eqRef);

  useEffect(() => {
    async function hydrateMatches() {
      const baseMatches = eq?.matches || [];
      if (baseMatches.length === 0) return;
      
      try {
        const ids = baseMatches.map(m => m.id);
        const q = query(collection(db, 'panels'), where(documentId(), 'in', ids.slice(0, 20))); // Aumentado a 20 para permitir más resultados
        const snap = await getDocs(q);
        
        const hydrated = snap.docs.map(doc => {
          const data = doc.data() as Panel;
          const matchMeta = baseMatches.find(m => m.id === doc.id);
          
          return {
            ...data,
            id: doc.id,
            score: matchMeta?.score || 0,
            explanation: matchMeta?.explanation || ""
          } as any;
        }).sort((a: any, b: any) => b.score - a.score);
        
        setAllMatches(hydrated);
      } catch (e) {
        console.error("Error hydrating matches:", e);
      }
    }
    
    if (!isEqLoading && eq) {
      hydrateMatches();
    }
  }, [eq, isEqLoading, db]);

  useEffect(() => {
    async function fetchMatches() {
      if (!panelId) return;
      try {
        const res = await fetch(`/api/match?id=${panelId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.matches.length > 0) {
          setAllMatches(prev => prev.length === 0 ? data.matches : prev);
        }
      } catch (e) {} finally {
        setIsDynamicLoading(false);
      }
    }
    fetchMatches();
  }, [panelId]);

  const filteredMatches = useMemo(() => {
    // 🔥 Se ajusta para mostrar desde el 60%, sin límite de cantidad
    return allMatches.filter(m => (m.score || m.matchScore || 0) >= 60);
  }, [allMatches]);

  if (isDynamicLoading && !eq) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="text-xl font-headline font-bold text-slate-900 tracking-tight">
          Coincidencias de Diseño (+60%)
        </h3>
      </div>

      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredMatches.map((matchPanel: any) => (
            <div key={matchPanel.id} className="relative group/card">
              <div className="absolute -top-2 -right-2 z-30">
                <Badge className="bg-indigo-600 text-white border-2 border-white shadow-lg h-10 w-10 rounded-full p-0 flex items-center justify-center font-bold text-xs">
                  {Math.max(0, Math.floor(matchPanel.score || matchPanel.matchScore || 0))}%
                </Badge>
              </div>
              <PanelCard panel={matchPanel} />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 border border-dashed rounded-3xl text-center text-muted-foreground text-sm">
          No se han encontrado coincidencias con precisión técnica superior al 60% para este diseño.
        </div>
      )}
    </div>
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

  if (isPanelLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-headline font-bold text-slate-700 animate-pulse text-xl">Cargando...</p>
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-4xl font-headline font-bold">No encontrado</h1>
        <Button onClick={() => router.push('/')}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/40">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-6 pl-0 gap-2 hover:bg-transparent hover:text-primary transition-all group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> 
          <span className="font-bold uppercase tracking-widest text-xs">Catálogo</span>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LADO IZQUIERDO: Imagen y Nombre FIXED */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-xl bg-white ring-1 ring-slate-200 group">
              <Image 
                src={panel.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"} 
                alt={panel.name} 
                fill 
                priority
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
              />
            </div>

            {/* Identidad del Panel */}
            <div className="px-2">
              <Badge className="bg-primary text-white border-none mb-3 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">
                {panel.brand}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-headline font-bold text-slate-900 leading-tight tracking-tight">
                {panel.name}
              </h1>
            </div>

            {/* Miniaturas */}
            {panel.images && panel.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                {panel.images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden ring-1 ring-slate-200 border-2 border-white shadow-sm shrink-0">
                    <Image src={img} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LADO DERECHO: Recomendaciones */}
          <div className="lg:col-span-8">
            <div className="bg-white/50 backdrop-blur-sm p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
              <EquivalenceSection panelId={id as string} targetPanel={panel} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
