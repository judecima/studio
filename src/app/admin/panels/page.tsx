"use client"

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  Filter, 
  RefreshCw, 
  Edit2, 
  PackageOpen,
  CheckCircle2,
  XCircle,
  Layers
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, doc, deleteDoc, updateDoc, orderBy, getDocs, writeBatch } from "firebase/firestore";
import { Panel } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useRouter } from "next/navigation";

const BRANDS = ["Egger", "Faplac", "Arauco", "Otro"];
const COLOR_PARENTS = ['blanco', 'beige', 'gris', 'negro', 'marron', 'rojo', 'verde', 'azul', 'amarillo', 'naranja', 'rosa', 'violeta', 'otro'];

export default function AdminPanelsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterColor, setFilterColor] = useState("all");
  const [filterGrain, setFilterGrain] = useState("all"); // 'all', 'yes', 'no'
  const [showOnlyMissingImages, setShowOnlyMissingImages] = useState(false);
  
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [category, setCategory] = useState<"panels" | "cantos">("panels");

  const q = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, category), orderBy('name', 'asc'));
  }, [db, category]);

  const { data: items, isLoading } = useCollection<Panel>(q);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(p => {
      // 1. Búsqueda de texto
      const matchesSearch = !searchTerm || 
                           p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.id?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Filtro de Marca
      if (filterBrand !== "all" && p.brand !== filterBrand) return false;

      // 3. Filtro de Color Padre (Normalizado)
      if (filterColor !== "all" && p.colorParent !== filterColor) return false;

      // 4. Filtro de Veta (hasGrain)
      if (filterGrain === "yes" && !p.hasGrain) return false;
      if (filterGrain === "no" && p.hasGrain) return false;
      
      // 5. Filtro de Imágenes faltantes
      if (showOnlyMissingImages) {
        const isMissing = !p.mainImage || p.mainImage.includes('placehold.co') || p.mainImage.includes('Subir+Imagen');
        if (!isMissing) return false;
      }
      
      return true;
    });
  }, [items, searchTerm, filterBrand, filterColor, filterGrain, showOnlyMissingImages]);

  const toggleVisibility = async (panelId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      const docRef = doc(db, category, panelId);
      await updateDoc(docRef, { visible: !currentStatus });
      toast({ title: currentStatus ? "Ocultado" : "Visible", duration: 2000 });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
    }
  };

  const handleDelete = async (panelId: string) => {
    if (!db || !confirm(`¿Eliminar este ${category === 'panels' ? 'panel' : 'canto'}?`)) return;
    try {
      await deleteDoc(doc(db, category, panelId));
      toast({ title: "Eliminado" });
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Catálogo Industrial</h1>
          <p className="text-muted-foreground text-sm">Administración centralizada de Paneles y Cantos (v6.6)</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/import">
            <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <Plus className="h-4 w-4" /> Importar Excel
            </Button>
          </Link>
          <Link href={`/admin/panels/new?collection=${category}`}>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Nuevo {category === 'panels' ? 'Panel' : 'Canto'}
            </Button>
          </Link>
        </div>
      </div>

      {/* FILTROS AVANZADOS */}
      <Card className="p-4 border shadow-sm bg-white space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Nombre, código o ID..." 
              className="pl-10 h-10 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Marcas</SelectItem>
              {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterColor} onValueChange={setFilterColor}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el Espectro</SelectItem>
              {COLOR_PARENTS.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterGrain} onValueChange={setFilterGrain}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Veta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Veta / Liso</SelectItem>
              <SelectItem value="yes">Con Veta</SelectItem>
              <SelectItem value="no">Sin Veta (Liso)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 px-3 h-10 bg-slate-50 rounded-md border border-slate-100">
            <Switch 
              id="missing-images" 
              checked={showOnlyMissingImages}
              onCheckedChange={setShowOnlyMissingImages}
              className="scale-75"
            />
            <Label htmlFor="missing-images" className="text-[10px] font-bold uppercase text-slate-500 cursor-pointer">
              Sin Imagen
            </Label>
          </div>

          <Badge variant="secondary" className="h-10 px-4 rounded-md ml-auto font-mono">
            {isLoading ? "..." : filteredItems.length}
          </Badge>
        </div>
      </Card>

      <Tabs value={category} onValueChange={(v) => setCategory(v as any)} className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 h-11 p-1 bg-slate-100/50 border">
          <TabsTrigger value="panels" className="text-xs font-bold data-[state=active]:bg-white">
            PANELES
          </TabsTrigger>
          <TabsTrigger value="cantos" className="text-xs font-bold data-[state=active]:bg-white">
            TAPACANTOS
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="overflow-hidden border shadow-sm bg-white">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Sincronizando con Firestore...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-20 flex flex-col items-center gap-4 text-center">
            <PackageOpen className="h-12 w-12 text-slate-200" />
            <p className="text-sm font-bold">No se encontraron productos con estos filtros.</p>
            <Button variant="ghost" size="sm" onClick={() => {
              setFilterBrand("all");
              setFilterColor("all");
              setFilterGrain("all");
              setSearchTerm("");
            }}>Limpiar Filtros</Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50 border-b">
              <TableRow>
                <TableHead className="w-[70px] font-bold text-[10px] uppercase">Imagen</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Producto / Ref</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Marca</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Clasificación</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-center">Estructura</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-center">Stock</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-center">Estado</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                  <TableCell>
                    <div className="w-10 h-10 rounded-md bg-slate-100 relative overflow-hidden border shadow-inner">
                      <Image 
                        src={item.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"} 
                        alt={item.name} 
                        fill 
                        className="object-cover" 
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-900 leading-tight">{item.name}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono mt-0.5">{item.id}</span>
                      {item.code && <span className="text-[9px] text-indigo-500 font-bold mt-0.5">{item.code}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-bold px-1.5 h-5",
                      item.brand === 'Egger' ? 'border-primary/30 text-primary bg-primary/5' : 'text-slate-600 border-slate-200 bg-slate-50'
                    )}>{item.brand}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.hexColor || '#ccc' }} />
                        <span className="text-[10px] font-bold uppercase">{item.colorParent}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 capitalize">{item.colorSub} | {item.surfaceTexture}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        {item.hasGrain ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] h-4 py-0 font-black">VETA</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[9px] h-4 py-0">LISO</Badge>
                        )}
                        <span className="text-[9px] font-bold text-slate-400">{item.thickness}mm</span>
                      </div>
                      <span className="text-[9px] text-slate-300 font-mono">{item.finish}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "text-[10px] font-black",
                      item.stock < 10 ? 'text-red-500' : 'text-green-600'
                    )}>
                      {item.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center gap-1">
                      <Switch 
                        checked={item.visible} 
                        onCheckedChange={() => toggleVisibility(item.id, item.visible)}
                        className="scale-50 h-4"
                      />
                      <span className="text-[8px] font-bold uppercase text-slate-400">
                        {item.visible ? "Visible" : "Oculto"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-0.5">
                      <Link href={`/admin/panels/${item.id}/edit?collection=${category}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-slate-300 hover:text-red-600"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
