
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
import { PanelFilters } from "@/lib/types";
import { Search, RotateCcw } from "lucide-react";

interface Props {
  filters: PanelFilters;
  onChange: (filters: PanelFilters) => void;
  onReset: () => void;
}

export function PanelFiltersSidebar({ filters, onChange, onReset }: Props) {
  const brands = ["Arauco", "Faplac", "Masisa", "Guillermina"];
  const thicknesses = [3, 5.5, 9, 12, 15, 18, 25];

  return (
    <div className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline font-bold text-lg">Filtros</h2>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-2 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Búsqueda</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar nombre..." 
              className="pl-9"
              value={filters.search || ""}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Marca</Label>
          <Select 
            value={filters.brand || "all"} 
            onValueChange={(val) => onChange({ ...filters, brand: val === "all" ? undefined : val })}
          >
            <SelectTrigger>
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
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Espesor (mm)</Label>
          <div className="grid grid-cols-2 gap-2">
            {thicknesses.map(t => (
              <div key={t} className="flex items-center space-x-2">
                <Checkbox 
                  id={`t-${t}`} 
                  checked={filters.thickness?.includes(t)}
                  onCheckedChange={(checked) => {
                    const current = filters.thickness || [];
                    const next = checked 
                      ? [...current, t] 
                      : current.filter(item => item !== t);
                    onChange({ ...filters, thickness: next });
                  }}
                />
                <Label htmlFor={`t-${t}`} className="text-sm font-normal">{t} mm</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="grain" 
              checked={filters.hasGrain}
              onCheckedChange={(checked) => onChange({ ...filters, hasGrain: checked as boolean })}
            />
            <Label htmlFor="grain" className="text-sm font-medium">Solo con vetas</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
