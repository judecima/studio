import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Maximize2, Layers, Ruler } from "lucide-react";

export function PanelCard({ panel }: { panel: Panel }) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-border/50 flex flex-col h-full">
      <Link href={`/panels/${panel.id}`} className="block relative aspect-[4/3] overflow-hidden shrink-0">
        <Image
          src={panel.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"}
          alt={panel.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          data-ai-hint="wood panel"
        />
        <div className="absolute top-2 right-2">
          {panel.stock > 0 ? (
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-medium">
              Stock: {panel.stock}
            </Badge>
          ) : (
            <Badge variant="destructive">Sin Stock</Badge>
          )}
        </div>
      </Link>
      <CardContent className="p-4 flex-1">
        <div className="flex justify-between items-start mb-2">
          <div className="w-full">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1 font-headline truncate">
              {panel.brand}
            </p>
            <h3 className="font-headline font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
              {panel.name}
            </h3>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 overflow-hidden">
            <Ruler className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{panel.width || "?"}x{panel.height || "?"} mm</span>
          </div>
          <div className="flex items-center gap-2 overflow-hidden">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{panel.thickness || "?"} mm</span>
          </div>
          <div className="col-span-1 sm:col-span-2 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full shrink-0 ${panel.hasGrain ? 'bg-amber-600' : 'bg-slate-300'}`} />
            <span className="truncate">{panel.hasGrain ? 'Con Vetas' : 'Liso'}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 shrink-0">
        <Link 
          href={`/panels/${panel.id}`} 
          className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ver Detalles
        </Link>
      </CardFooter>
    </Card>
  );
}
