
"use client"

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { MOCK_PANELS } from "@/services/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Ruler, Layers, Package, Tag, Wind } from "lucide-react";
import { useState } from "react";

export default function PanelDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const panel = MOCK_PANELS.find(p => p.id === id);
  const [activeImage, setActiveImage] = useState(panel?.mainImage || "");

  if (!panel) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Panel no encontrado</h1>
            <Button onClick={() => router.push('/')}>Volver al catálogo</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-8 pl-0 hover:bg-transparent hover:text-primary gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Volver atrás
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery Section */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border shadow-sm bg-white">
              <Image 
                src={activeImage} 
                alt={panel.name} 
                fill 
                className="object-cover"
                priority
                data-ai-hint="wood detail"
              />
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-2">
              {panel.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-24 aspect-square rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? 'border-primary shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="uppercase tracking-widest px-2 py-0.5 border-primary text-primary font-bold">
                  {panel.brand}
                </Badge>
                {panel.stock > 0 ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">En Stock</Badge>
                ) : (
                  <Badge variant="destructive">Agotado</Badge>
                )}
              </div>
              <h1 className="text-4xl font-headline font-bold">{panel.name}</h1>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed">
              {panel.description}
            </p>

            <Separator />

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Ruler className="h-4 w-4" />
                  <span className="text-sm uppercase tracking-wider">Dimensiones</span>
                </div>
                <p className="text-2xl font-headline font-medium">{panel.width} x {panel.height} mm</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Layers className="h-4 w-4" />
                  <span className="text-sm uppercase tracking-wider">Espesor</span>
                </div>
                <p className="text-2xl font-headline font-medium">{panel.thickness} mm</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Wind className="h-4 w-4" />
                  <span className="text-sm uppercase tracking-wider">Acabado</span>
                </div>
                <p className="text-xl font-headline font-medium">{panel.hasGrain ? 'Con Vetas' : 'Liso / Mate'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Package className="h-4 w-4" />
                  <span className="text-sm uppercase tracking-wider">Disponibilidad</span>
                </div>
                <p className="text-xl font-headline font-medium">{panel.stock} unidades</p>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="flex-1 h-14 text-lg font-bold gap-2">
                Consultar Precio
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-14 text-lg font-bold">
                Descargar Ficha Técnica
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
