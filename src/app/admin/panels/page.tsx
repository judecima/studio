
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
import { Plus, Search, Edit2, MoreVertical, Trash2, Loader2 } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Panel } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanelsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const panelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'panels'));
  }, [db]);

  const { data: panels, isLoading } = useCollection<Panel>(panelsQuery);

  const filteredPanels = useMemo(() => {
    if (!panels) return [];
    return panels.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [panels, searchTerm]);

  const toggleVisibility = async (panelId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      const docRef = doc(db, 'panels', panelId);
      await updateDoc(docRef, { visible: !currentStatus });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo actualizar la visibilidad.", variant: "destructive" });
    }
  };

  const handleDelete = async (panelId: string) => {
    if (!db || !confirm("¿Estás seguro de eliminar este panel?")) return;
    try {
      await deleteDoc(doc(db, 'panels', panelId));
      toast({ title: "Eliminado", description: "El panel ha sido borrado del catálogo." });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar el panel.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Paneles</h1>
          <p className="text-muted-foreground">Administra tu inventario y visibilidad de productos.</p>
        </div>
        <Link href="/admin/panels/new">
          <Button className="gap-2 h-11 px-6">
            <Plus className="h-5 w-5" /> Nuevo Panel
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o marca..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">Filtros Avanzados</Button>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Cargando paneles...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Espesor</TableHead>
                <TableHead>Dimensiones</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Visibilidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPanels.map((panel) => (
                <TableRow key={panel.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-slate-100 relative overflow-hidden shrink-0 border">
                        <Image src={panel.mainImage} alt="" fill className="object-cover" />
                      </div>
                      <span className="font-medium text-sm">{panel.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{panel.brand}</Badge>
                  </TableCell>
                  <TableCell>{panel.thickness} mm</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {panel.width} x {panel.height}
                  </TableCell>
                  <TableCell>
                    <span className={panel.stock < 10 ? 'text-destructive font-bold' : ''}>
                      {panel.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={panel.visible} 
                      onCheckedChange={() => toggleVisibility(panel.id, panel.visible)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/panels/${panel.id}/edit`}>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Edit2 className="h-4 w-4" /> Editar
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem 
                          className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                          onClick={() => handleDelete(panel.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Eliminar
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
