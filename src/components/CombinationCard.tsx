
"use client"

import { Combination, Panel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Layers } from "lucide-react";

interface Props {
  combination: Combination;
  panels: Panel[];
}

export function CombinationCard({ combination, panels }: Props) {
  const comboPanels = panels.filter(p => combination.panelIds.includes(p.id));

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-primary/20 bg-white group">
      <div className="relative aspect-[16/9] flex">
        {comboPanels.map((p, i) => (
          <div key={p.id} className="relative flex-1 h-full overflow-hidden border-r last:border-0">
            <Image 
              src={p.mainImage} 
              alt={p.name || "Panel de combinación"} 
              fill 
              className="object-cover transition-transform duration-700 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          </div>
        ))}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-primary/90 text-primary-foreground font-bold uppercase tracking-tighter">
            {combination.type}
          </Badge>
          {combination.isGeneratedAutomatically && (
            <Badge variant="secondary" className="gap-1 bg-white/90 backdrop-blur">
              <Sparkles className="h-3 w-3 text-amber-500" /> IA Suggested
            </Badge>
          )}
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg font-headline font-bold leading-tight">
          {combination.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {combination.description}
        </p>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-3 mt-4">
          <div className="flex -space-x-3 overflow-hidden">
            {comboPanels.map(p => (
              <div key={p.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white overflow-hidden relative border border-slate-200">
                <Image src={p.mainImage} alt={p.name || "Panel"} fill className="object-cover" />
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {comboPanels.length} Paneles
          </span>
        </div>
        
        <Link href={`/combinations/${combination.id}`}>
          <button className="w-full mt-4 h-10 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-primary transition-colors flex items-center justify-center gap-2">
            Ver Inspiración <Layers className="h-4 w-4" />
          </button>
        </Link>
      </CardContent>
    </Card>
  );
}
