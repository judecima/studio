
"use client"

import { useState, useEffect } from "react";
import { SimilarProduct } from "@/lib/types";
import { SimilarProductCard } from "./SimilarProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  productId: string;
}

export function SimilarProducts({ productId }: Props) {
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSimilar() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/catalog/similar/${productId}`);
        if (!response.ok) throw new Error("Error al cargar productos similares");
        
        const data = await response.json();
        
        // El motor devuelve los productos completos, mapeamos a SimilarProduct
        // asumiendo que el engine ya calculó scores relativos al baseProduct
        const recommendations = (data.recommendations || []).map((p: any) => {
          // Buscamos el score que el engine le dio a este producto respecto al base
          const similarityData = data.baseProduct?.similar_a?.find((s: any) => s.id === p.id);
          
          return {
            id: p.id,
            name: p.name,
            brand: p.brand,
            mainImage: p.mainImage,
            score: similarityData?.score || 0.5,
            reason: similarityData?.reason || "Diseño complementario",
            thickness: p.dimensions?.thickness || 18,
            hasGrain: p.hasGrain
          };
        });

        // Ordenar por score descendente
        setProducts(recommendations.sort((a: any, b: any) => b.score - a.score));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (productId) fetchSimilar();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center bg-white rounded-3xl border border-dashed flex flex-col items-center gap-3">
        <Info className="h-8 w-8 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground font-medium">No se encontraron productos similares para este diseño.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-amber-600 font-bold uppercase text-xs tracking-widest">
        <Sparkles className="h-4 w-4" /> Smart Recommendations Engine
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <SimilarProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
