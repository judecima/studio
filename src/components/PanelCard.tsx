
import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Layers, Ruler, ChevronRight } from "lucide-react";

export function PanelCard({ panel }: { panel: Panel }) {
  return (
    <Card className="overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 bg-white border-none shadow-sm flex flex-col h-full rounded-[2rem] relative ring-1 ring-slate-100">
      
      {/* Image Wrapper */}
      <Link href={`/panels/${panel.id}`} className="block relative aspect-[4/3] overflow-hidden shrink-0 m-3 rounded-[1.5rem]">
        <Image
          src={panel.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"}
          alt={panel.name || "Panel industrial"}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          data-ai-hint="wood panel"
        />
        <div className="absolute top-4 right-4 z-10">
          {panel.stock > 0 ? (
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-md text-slate-900 border-none font-bold px-3 py-1 shadow-sm">
              STOCK: {panel.stock}
            </Badge>
          ) : (
            <Badge variant="destructive" className="font-bold border-none shadow-sm">SIN STOCK</Badge>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>

      <CardContent className="px-6 py-4 flex-1 flex flex-col">
        <div className="flex flex-col gap-1 mb-4">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            {panel.brand}
          </p>
          <h3 className="font-headline font-bold text-xl md:text-2xl leading-tight text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
            {panel.name}
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-auto pt-6 border-t border-slate-50 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-xl">
              <Ruler className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>{panel.width}x{panel.height}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-xl">
              <Layers className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>{panel.thickness} MM</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-2">
        <Link 
          href={`/panels/${panel.id}`} 
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white hover:bg-primary transition-all shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
        >
          VER DETALLES <ChevronRight className="h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
