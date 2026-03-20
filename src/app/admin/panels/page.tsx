
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
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const panelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'panels'), orderBy('name', 'asc'));
  }, [db]);

  const { data: panels, isLoading } = useCollection<Panel>(panelsQuery);

  const filteredPanels = useMemo(() => {
    if (!panels) return [];
    return panels.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [panels, searchTerm]);

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
    if (!db || !user) {
      toast({ title: "Error", description: "Debes estar autenticado para realizar esta acción.", variant: "destructive" });
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
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'panels',
        operation: 'delete'
      }));
      toast({ title: "Error al vaciar", description: error.message || "Error de permisos en Firestore", variant: "destructive" });
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
          <Button 
            variant="outline" 
            className="text-red-500 border-red-200 hover:bg-red-50 gap-2 h-11"
            onClick={handleDeleteAll}
            disabled={isDeletingAll || isLoading}
          >
            {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Borrar Todo el Catálogo
          </Button>
          <Link href="/admin/panels/new">
            <Button className="gap-2 h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Nuevo Panel
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o marca..." 
            className="pl-10 h-10 border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Badge variant="secondary" className="h-10 px-4 rounded-md">
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
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900 leading-tight">{panel.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{panel.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-white border-slate-200">{panel.brand}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{panel.thickness} mm</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {panel.width} x {panel.height}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <Link href={`/admin/panels/${panel.id}/edit`}>
                          <DropdownMenuItem className="gap-2 cursor-pointer font-medium">
                            <Edit2 className="h-3.5 w-3.5" /> Editar Ficha
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem 
                          className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer font-medium"
                          onClick={() => handleDelete(panel.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
