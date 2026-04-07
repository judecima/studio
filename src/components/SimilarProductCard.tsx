"use client"

import { SimilarProduct } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Percent, Sparkles, ArrowRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";

interface Props {
  product: SimilarProduct;
}

export function SimilarProductCard({ product }: Props) {
  const getSimilarityLevel = (score: number) => {
    if (score >= 0.85) return { label: "Muy Similar", color: "bg-green-500", light: "bg-green-50 text-green-700" };
    if (score >= 0.65) return { label: "Similar", color: "bg-blue-500", light: "bg-blue-50 text-blue-700" };
    return { label: "Relacionado", color: "bg-slate-500", light: "bg-slate-50 text-slate-700" };
  };

  const level = getSimilarityLevel(product.score);

  return (
    <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 border-none bg-white group flex flex-col h-full rounded-[2rem] shadow-sm ring-1 ring-slate-100">
      {/* Refuerzo de bordes con ring-slate-200 para paneles claros */}
      <Link href={`/panels/${product.id}`} className="block relative aspect-[4/3] overflow-hidden shrink-0 m-2.5 rounded-[1.5rem] ring-1 ring-slate-200 shadow-sm">
        <Image 
          src={product.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"} 
          alt={product.name} 
          fill 
          className="object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge className={cn("text-white font-bold uppercase tracking-tighter border-none px-3 py-1 shadow-lg", level.color)}>
            {Math.round(product.score * 100)}% Match
          </Badge>
        </div>
      </Link>
      
      <CardContent className="px-5 py-5 flex flex-col flex-1">
        <div className="mb-4">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
            {product.brand}
          </p>
          <h3 className="font-headline font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
            {product.name}
          </h3>
        </div>

        <div className={cn("p-3 rounded-xl mb-6 flex flex-col gap-1", level.light)}>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" /> Recomendación IA
          </div>
          <p className="text-xs font-medium leading-relaxed italic">
            "{product.reason}"
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Layers className="h-3.5 w-3.5" /> {product.thickness}MM
          </div>
          <Link href={`/panels/${product.id}`}>
            <Button size="sm" variant="ghost" className="rounded-full h-10 w-10 p-0 hover:bg-primary hover:text-white">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
