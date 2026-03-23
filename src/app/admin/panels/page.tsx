
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
import { Plus, Search, Edit2, MoreVertical, Trash2, Loader2, PackageOpen } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, doc, deleteDoc, updateDoc, orderBy, getDocs, writeBatch } from "firebase/firestore";
import { Panel } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function AdminPanelsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyMissingImages, setShowOnlyMissingImages] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const panelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'panels'), orderBy('name', 'asc'));
  }, [db]);

  const { data: panels, isLoading } = useCollection<Panel>(panelsQuery);

  const filteredPanels = useMemo(() => {
    if (!panels) return [];
    return panels.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.brand?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (showOnlyMissingImages) {
        return !p.mainImage || p.mainImage.includes('placehold.co') || p.mainImage.includes('Subir+Imagen');
      }
      
      return true;
    });
  }, [panels, searchTerm, showOnlyMissingImages]);

  const toggleVisibility = async (panelId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      const docRef = doc(db, 'panels', panelId);
      await updateDoc(docRef, { visible: !currentStatus });
      toast({ title: currentStatus ? "Panel ocultado" : "Panel visible", duration: 2000 });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo actualizar la visibilidad.", variant: "destructive" });
    }
  };

  const handleDelete = async (panelId: string) => {
    if (!db || !confirm("¿Estás seguro de eliminar este panel permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'panels', panelId));
      toast({ title: "Eliminado", description: "El panel ha sido borrado del catálogo." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar el panel.", variant: "destructive" });
    }
  };

  const handleDeleteAll = async () => {
    if (!db) {
      toast({ title: "Error", description: "Base de datos no disponible.", variant: "destructive" });
      return;
    }
    
    if (!confirm(`¿Estás TOTALMENTE SEGURO de vaciar el catálogo? Esta acción eliminará todos los paneles y es irreversible.`)) return;

    setIsDeletingAll(true);
    try {
      const colRef = collection(db, 'panels');
      const snapshot = await getDocs(colRef);
      
      if (snapshot.empty) {
        toast({ title: "Catálogo vacío", description: "No hay paneles para eliminar." });
        setIsDeletingAll(false);
        return;
      }

      const docs = snapshot.docs;
      const batchSize = 50;
      let deletedCount = 0;

      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + batchSize);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deletedCount += chunk.length;
      }

      toast({ title: "Catálogo vaciado", description: `Se han eliminado ${deletedCount} paneles con éxito.` });
    } catch (error: any) {
      console.error("Error al vaciar base de datos:", error);
      // Emitimos el error de permisos para que el listener de Firebase lo atrape
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'panels',
        operation: 'delete'
      }));
      toast({ title: "Error de permisos", description: "No tienes autorización para realizar esta operación masiva.", variant: "destructive" });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Paneles</h1>
          <p className="text-muted-foreground">Administra el inventario real sincronizado con Firestore.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/import">
            <Button variant="outline" className="gap-2 h-11 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <Plus className="h-5 w-5" /> Importar Excel
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="text-red-500 border-red-200 hover:bg-red-50 gap-2 h-11"
            onClick={handleDeleteAll}
            disabled={isDeletingAll}
          >
            {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Borrar Todo
          </Button>
          <Link href="/admin/panels/new">
            <Button className="gap-2 h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Nuevo Panel
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o marca..." 
            className="pl-10 h-10 border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
          <Switch 
            id="missing-images" 
            checked={showOnlyMissingImages}
            onCheckedChange={setShowOnlyMissingImages}
          />
          <Label htmlFor="missing-images" className="text-xs font-bold uppercase tracking-tight text-slate-600 cursor-pointer">
            Faltan Imágenes
          </Label>
        </div>

        <Badge variant="secondary" className="h-10 px-4 rounded-md ml-auto">
          {isLoading ? "Sincronizando..." : `${filteredPanels.length} productos`}
        </Badge>
      </div>

      <Card className="overflow-hidden border shadow-sm bg-white">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Cargando base de datos en tiempo real...</p>
          </div>
        ) : filteredPanels.length === 0 ? (
          <div className="p-20 flex flex-col items-center gap-4 text-center">
            <PackageOpen className="h-16 w-16 text-slate-200" />
            <div className="max-w-xs">
              <p className="text-lg font-bold">No hay paneles disponibles</p>
              <p className="text-sm text-muted-foreground">El catálogo está vacío o no coincide con tu búsqueda.</p>
            </div>
            <Link href="/admin/import">
              <Button variant="outline" className="mt-2">Ir a Ingestión de Catálogo</Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[300px]">Producto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Espesor</TableHead>
                <TableHead>Medidas (mm)</TableHead>
                <TableHead>Textura</TableHead>
                <TableHead>Atributos</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPanels.map((panel) => (
                <TableRow key={panel.id} className="hover:bg-slate-50/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 relative overflow-hidden shrink-0 border border-slate-100 shadow-inner">
                        <Image 
                          src={panel.mainImage || "https://placehold.co/800x600?text=Sin+Imagen"} 
                          alt={panel.name || "Imagen de panel"} 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                      <div className="flex flex-col max-w-[400px]">
                        <span className="font-bold text-sm text-slate-900 leading-tight">{panel.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{panel.id}</span>
                          {panel.code && <Badge variant="outline" className="text-[9px] py-0 h-4 bg-slate-50 text-slate-500 border-slate-200">{panel.code}</Badge>}
                        </div>
                        {panel.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic">
                            "{panel.description}"
                          </p>
                        )}
                        {panel.applications && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(Array.isArray(panel.applications) ? panel.applications : [panel.applications]).map((app, i) => (
                              <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200 uppercase font-medium">
                                {app}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "bg-white border-slate-200",
                      panel.brand === 'Egger' ? 'text-primary border-primary/20' : 'text-slate-600'
                    )}>{panel.brand}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{panel.thickness} mm</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {panel.width} x {panel.height}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-600">{panel.surfaceTexture || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5 font-bold">
                          {panel.isSmooth ? 'LISO' : 'RUGOSO'}
                        </Badge>
                        {panel.launchYear && (
                          <span className="text-[10px] text-primary font-bold">New {panel.launchYear}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {panel.colorGroup} / {panel.colorHue}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded-md text-xs font-bold",
                      panel.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    )}>
                      {panel.stock} un.
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={panel.visible} 
                        onCheckedChange={() => toggleVisibility(panel.id, panel.visible)}
                      />
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        {panel.visible ? "Público" : "Oculto"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      <Link href={`/admin/panels/${panel.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-primary hover:bg-primary/5">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(panel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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
