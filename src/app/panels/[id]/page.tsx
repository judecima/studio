
"use client"

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { MOCK_PANELS, MOCK_COMBINATIONS } from "@/services/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Ruler, Layers, Package, Wind, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { generateCombinations } from "@/services/combinations-engine";
import { CombinationCard } from "@/components/CombinationCard";

export default function PanelDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const panel = MOCK_PANELS.find(p => p.id === id);
  const [activeImage, setActiveImage] = useState(panel?.mainImage || "");

  const combinations = useMemo(() => {
    if (!panel) return [];
    // Combine mock manual combinations with engine-generated ones
    const manual = MOCK_COMBINATIONS.filter(c => c.panelIds.includes(panel.id));
    const generated = generateCombinations(panel, MOCK_PANELS);
    return [...manual, ...generated];
  }, [panel]);

  if (!panel) return <div>No encontrado</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 pl-0 gap-2">
          <ChevronLeft className="h-4 w-4" /> Catálogo
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white p-8 rounded-3xl border shadow-sm">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border shadow-sm bg-slate-50">
              <Image src={activeImage} alt={panel.name} fill className="object-cover" priority />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {panel.images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 aspect-square rounded-xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-primary shadow-md' : 'border-transparent opacity-60'}`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Badge variant="outline" className="border-primary text-primary font-bold uppercase tracking-widest">
                {panel.brand}
              </Badge>
              <h1 className="text-4xl font-headline font-bold">{panel.name}</h1>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed">
              {panel.description}
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="p-4 bg-slate-50 rounded-2xl border">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase mb-1">
                  <Ruler className="h-4 w-4" /> Dimensiones
                </div>
                <p className="text-xl font-headline font-bold">{panel.width}x{panel.height}mm</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase mb-1">
                  <Layers className="h-4 w-4" /> Espesor
                </div>
                <p className="text-xl font-headline font-bold">{panel.thickness}mm</p>
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
        <section className="mt-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-bold uppercase text-xs tracking-widest mb-1">
                <Sparkles className="h-4 w-4" /> Smart Recommendations
              </div>
              <h2 className="text-3xl font-headline font-bold">Combinaciones Ideales</h2>
              <p className="text-muted-foreground mt-1">Sugerencias basadas en armonía tonal, uso y contraste.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {combinations.map(combo => (
              <CombinationCard key={combo.id} combination={combo} panels={MOCK_PANELS} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
