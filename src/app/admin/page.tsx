
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Eye, AlertCircle, ShoppingBag, Loader2, TrendingUp, History } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, limit, orderBy } from "firebase/firestore";
import { Panel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AdminDashboard() {
  const db = useFirestore();

  const panelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'panels'));
  }, [db]);

  const recentPanelsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'panels'), orderBy('updatedAt', 'desc'), limit(5));
  }, [db]);

  const { data: allPanels, isLoading } = useCollection<Panel>(panelsQuery);
  const { data: recentPanels } = useCollection<Panel>(recentPanelsQuery);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Sincronizando tablero de control...</p>
      </div>
    );
  }

  const panels = allPanels || [];

  const stats = [
    { title: "Total Paneles", value: panels.length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Visibles en Web", value: panels.filter(p => p.visible).length, icon: Eye, color: "text-green-600", bg: "bg-green-50" },
    { title: "Stock Crítico", value: panels.filter(p => p.stock < 10).length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { title: "Marcas Activas", value: new Set(panels.map(p => p.brand)).size, icon: ShoppingBag, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Resumen de Operaciones</h1>
          <p className="text-muted-foreground">Monitoreo en tiempo real del catálogo industrial.</p>
        </div>
        <Badge variant="outline" className="h-8 px-3 gap-2 border-slate-200">
          <TrendingUp className="h-3 w-3 text-green-600" /> Sistema Operativo
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-tighter">{stat.title}</CardTitle>
              <div className={`${stat.bg} p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-400" />
              <CardTitle className="text-lg">Actualizaciones Recientes</CardTitle>
            </div>
            <Link href="/admin/panels" className="text-xs font-bold text-primary hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {(recentPanels || []).length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">No hay actividad reciente.</p>
              ) : (
                (recentPanels || []).map(panel => (
                  <div key={panel.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-800">{panel.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{panel.brand} • {panel.thickness}mm</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">Sincronizado</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <CardTitle className="text-lg">Alertas de Inventario</CardTitle>
            </div>
            <Badge variant="destructive" className="h-5 text-[10px]">{panels.filter(p => p.stock < 10).length} Críticos</Badge>
          </CardHeader>
          <CardContent>
             <div className="space-y-1">
              {panels.filter(p => p.stock < 20).slice(0, 5).map(panel => (
                <div key={panel.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-800">{panel.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{panel.brand}</span>
                  </div>
                  <Badge variant={panel.stock < 10 ? "destructive" : "secondary"} className="h-6 font-bold">
                    {panel.stock} un.
                  </Badge>
                </div>
              ))}
              {panels.filter(p => p.stock < 20).length === 0 && (
                <div className="text-center py-10 flex flex-col items-center gap-2">
                  <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">Niveles de stock saludables.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
