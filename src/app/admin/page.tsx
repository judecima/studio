
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Eye, AlertCircle, ShoppingBag, Loader2 } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, limit, orderBy } from "firebase/firestore";
import { Panel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

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
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const panels = allPanels || [];

  const stats = [
    { title: "Total Paneles", value: panels.length, icon: Package, color: "text-blue-600" },
    { title: "Visibles", value: panels.filter(p => p.visible).length, icon: Eye, color: "text-green-600" },
    { title: "Bajo Stock", value: panels.filter(p => p.stock < 10).length, icon: AlertCircle, color: "text-amber-600" },
    { title: "Marcas", value: new Set(panels.map(p => p.brand)).size, icon: ShoppingBag, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Resumen General</h1>
        <p className="text-muted-foreground">Estado actual de tu catálogo de productos en tiempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(recentPanels || []).map(panel => (
                <div key={panel.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{panel.name}</span>
                    <span className="text-xs text-muted-foreground">{panel.brand} • {panel.thickness}mm</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Sincronizado</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Crítico</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {panels.filter(p => p.stock < 20).slice(0, 5).map(panel => (
                <div key={panel.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <span className="font-medium text-sm">{panel.name}</span>
                  <Badge variant={panel.stock < 10 ? "destructive" : "secondary"}>
                    {panel.stock} unidades
                  </Badge>
                </div>
              ))}
              {panels.filter(p => p.stock < 20).length === 0 && (
                <p className="text-center py-4 text-muted-foreground text-sm">Todo el stock está en niveles óptimos.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
