
"use client"

import { useState, useEffect } from "react";
import { SimilarProduct } from "@/lib/types";
import { SimilarProductCard } from "./SimilarProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  productId: string;
}

export function SimilarProducts({ productId }: Props) {
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function fetchSimilar() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/catalog/similar/${productId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setProducts([]);
            return;
          }
          throw new Error("Error al cargar productos similares");
        }
        
        const data = await response.json();
        
        const recommendations = (data.recommendations || []).map((p: any) => {
          // Intentamos extraer el score de la respuesta enriquecida del engine
          return {
            id: p.id,
            name: p.name,
            brand: p.brand,
            mainImage: p.mainImage,
            score: p.score || 0.75, // Fallback si no viene el score
            reason: p.reason || "Diseño complementario por textura",
            thickness: p.dimensions?.thickness || 18,
            hasGrain: p.hasGrain
          };
        });

        setProducts(recommendations.sort((a: any, b: any) => b.score - a.score));
      } catch (err: any) {
        console.error("Similar Products Error:", err);
        setError("El motor de IA está sincronizando los datos industriales.");
      } finally {
        setIsLoading(false);
      }
    }

    if (productId) fetchSimilar();
  }, [productId, retryCount]);

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
      <Alert variant="default" className="border-primary/20 bg-primary/5 shadow-sm">
        <RefreshCw className="h-4 w-4 text-primary animate-spin" />
        <AlertDescription className="text-foreground/80 flex items-center justify-between w-full">
          <span>El motor de recomendaciones se está sincronizando con el catálogo industrial.</span>
          <Button variant="ghost" size="sm" onClick={() => setRetryCount(prev => prev + 1)} className="h-7 text-xs font-bold">
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-4">
        <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center">
          <Info className="h-6 w-6 text-slate-300" />
        </div>
        <div className="max-w-xs space-y-2">
          <p className="text-slate-900 font-bold">Análisis de diseño en curso</p>
          <p className="text-slate-500 text-sm">
            Este producto ha sido detectado recientemente. El motor de IA está procesando sus características para encontrar las mejores combinaciones.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)} className="mt-2">
          Actualizar ahora
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-amber-600 font-bold uppercase text-[10px] tracking-[0.2em]">
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
