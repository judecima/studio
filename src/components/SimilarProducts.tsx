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
        
        if (!response.ok) {
          // Si el producto base no está en el engine, el motor devuelve 404.
          // En ese caso, simplemente no mostramos similares sin romper la página.
          if (response.status === 404) {
            setProducts([]);
            return;
          }
          throw new Error("Error al cargar productos similares");
        }
        
        const data = await response.json();
        
        const recommendations = (data.recommendations || []).map((p: any) => {
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

        setProducts(recommendations.sort((a: any, b: any) => b.score - a.score));
      } catch (err: any) {
        console.error("Similar Products Error:", err);
        setError("No se pudo conectar con el motor de recomendaciones.");
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
      <Alert variant="default" className="border-amber-200 bg-amber-50">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          El motor de recomendaciones se está inicializando. Por favor, refresca la página en unos segundos.
        </AlertDescription>
      </Alert>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center bg-white rounded-3xl border border-dashed flex flex-col items-center gap-3">
        <Info className="h-8 w-8 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground font-medium">Análisis de diseño en curso para este producto.</p>
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