
"use client"

import { SimilarProduct } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  product: SimilarProduct;
}

export function SimilarProductCard({ product }: Props) {
  // Determinar nivel de similitud para la UI
  const getSimilarityLevel = (score: number) => {
    if (score >= 0.85) return { label: "Muy Similar", color: "bg-green-500" };
    if (score >= 0.65) return { label: "Similar", color: "bg-blue-500" };
    return { label: "Relacionado", color: "bg-slate-500" };
  };

  const level = getSimilarityLevel(product.score);

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-white group flex flex-col h-full">
      <Link href={`/panels/${product.id}`} className="block relative aspect-[4/3] overflow-hidden shrink-0">
        <Image 
          src={product.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"} 
          alt={product.name} 
          fill 
          className="object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge className={cn("text-white font-bold uppercase tracking-tighter border-none", level.color)}>
            {level.label} {Math.round(product.score * 100)}%
          </Badge>
        </div>
      </Link>
      
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="mb-2">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
            {product.brand}
          </p>
          <h3 className="font-headline font-bold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center gap-3 mt-auto pt-4 text-xs text-muted-foreground border-t border-dashed">
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3" /> {product.thickness}mm
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> {product.reason}
          </div>
        </div>
        
        <Link href={`/panels/${product.id}`} className="mt-4">
          <button className="w-full h-10 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-primary transition-colors flex items-center justify-center gap-2 group/btn">
            Ver Producto <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </Link>
      </CardContent>
    </Card>
  );
}
