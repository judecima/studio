"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PanelFilters, ColorParent } from "@/lib/types";
import { Search, RotateCcw, Box, Check, X } from "lucide-react";

interface Props {
  filters: PanelFilters;
  onChange: (filters: PanelFilters) => void;
  onReset: () => void;
}

export function PanelFiltersSidebar({ filters, onChange, onReset }: Props) {
  const brands = ["Egger", "Faplac", "Arauco", "Otro"];
  const colorParents: ColorParent[] = [
    'blanco', 'beige', 'gris', 'negro', 'marron', 
    'rojo', 'verde', 'azul', 'amarillo', 'naranja', 'rosa', 
    'violeta', 'otro'
  ];

  return (
    <div className="space-y-6 bg-card p-6 rounded-2xl border shadow-sm sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline font-bold text-lg flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" /> Filtros
        </h2>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-2 text-xs hover:bg-slate-100 rounded-full">
          <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar
        </Button>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Búsqueda</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input 
              placeholder="Buscar nombre o código..." 
              className="pl-10 h-11 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
              value={filters.search || ""}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Marca</Label>
          <Select 
            value={filters.brand || "all"} 
            onValueChange={(val) => onChange({ ...filters, brand: val === "all" ? undefined : val })}
          >
            <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl">
              <SelectValue placeholder="Todas las marcas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {brands.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Tipo de Diseño</Label>
          <Select 
            value={filters.surfaceTexture || "all"} 
            onValueChange={(val) => onChange({ ...filters, surfaceTexture: val === "all" ? undefined : val as any })}
          >
            <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl capitalize">
              <SelectValue placeholder="Liso, Madera, etc." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los diseños</SelectItem>
              <SelectItem value="liso">Liso / Unicolor</SelectItem>
              <SelectItem value="madera">Maderas</SelectItem>
              <SelectItem value="textil">Textiles</SelectItem>
              <SelectItem value="cementicio">Cementicios / Piedra</SelectItem>
              <SelectItem value="metal">Metálicos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Color Principal</Label>
          <Select 
            value={filters.colorParent || "all"} 
            onValueChange={(val) => onChange({ ...filters, colorParent: val === "all" ? undefined : val as ColorParent })}
          >
            <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl capitalize">
              <SelectValue placeholder="Cualquier color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquier color</SelectItem>
              {colorParents.map(cp => (
                <SelectItem key={cp} value={cp} className="capitalize">{cp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Textura / Veta</Label>
          <div className="flex flex-col gap-2">
            <Button
              variant={filters.hasGrain === undefined ? "secondary" : "ghost"}
              size="sm"
              className={`justify-start h-10 rounded-xl px-3 ${filters.hasGrain === undefined ? 'bg-primary/5 text-primary border border-primary/10' : 'text-slate-600'}`}
              onClick={() => onChange({ ...filters, hasGrain: undefined })}
            >
              <div className={`h-4 w-4 rounded-full border mr-2 flex items-center justify-center ${filters.hasGrain === undefined ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                {filters.hasGrain === undefined && <Check className="h-3 w-3 text-white" />}
              </div>
              Todos
            </Button>
            
            <Button
              variant={filters.hasGrain === true ? "secondary" : "ghost"}
              size="sm"
              className={`justify-start h-10 rounded-xl px-3 ${filters.hasGrain === true ? 'bg-primary/5 text-primary border border-primary/10' : 'text-slate-600'}`}
              onClick={() => onChange({ ...filters, hasGrain: true })}
            >
              <div className={`h-4 w-4 rounded-full border mr-2 flex items-center justify-center ${filters.hasGrain === true ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                {filters.hasGrain === true && <Check className="h-3 w-3 text-white" />}
              </div>
              Con veta
            </Button>

            <Button
              variant={filters.hasGrain === false ? "secondary" : "ghost"}
              size="sm"
              className={`justify-start h-10 rounded-xl px-3 ${filters.hasGrain === false ? 'bg-primary/5 text-primary border border-primary/10' : 'text-slate-600'}`}
              onClick={() => onChange({ ...filters, hasGrain: false })}
            >
              <div className={`h-4 w-4 rounded-full border mr-2 flex items-center justify-center ${filters.hasGrain === false ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                {filters.hasGrain === false && <Check className="h-3 w-3 text-white" />}
              </div>
              Sin veta
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
