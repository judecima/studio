
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Eye, AlertCircle, ShoppingBag, Loader2, TrendingUp, History, Users } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, limit, orderBy } from "firebase/firestore";
import { Panel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getUserStats, getTopPanels } from "@/lib/activity-actions";

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

  const { data: allPanels, isLoading: isPanelsLoading } = useCollection<Panel>(panelsQuery);
  const [activityData, setActivityData] = useState<{ users: any[], activities: any[] } | null>(null);
  const [topPanels, setTopPanels] = useState<any[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        const [stats, top] = await Promise.all([
          getUserStats(),
          getTopPanels()
        ]);
        setActivityData(stats as any);
        setTopPanels(top);
      } catch (e) {
        console.error(e);
      } finally {
        setIsActivityLoading(false);
      }
    }
    loadActivity();
  }, []);

  if (isPanelsLoading || isActivityLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Sincronizando tablero de control...</p>
      </div>
    );
  }

  const panels = allPanels || [];

  // Agrupar última actividad por usuario
  const userSummaries = activityData?.users.map(user => {
    const lastView = activityData.activities.find(a => a.username === user.username);
    return {
      username: user.username,
      lastLogin: user.lastLogin,
      lastPanel: lastView?.panelName || 'Ninguno'
    };
  }).sort((a, b) => {
    const timeA = a.lastLogin?.seconds || 0;
    const timeB = b.lastLogin?.seconds || 0;
    return timeB - timeA;
  }) || [];

  const stats = [
    { title: "Total Paneles", value: panels.length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Visibles en Web", value: panels.filter(p => p.visible).length, icon: Eye, color: "text-green-600", bg: "bg-green-50" },
    { title: "Stock Crítico", value: panels.filter(p => p.stock < 10).length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { title: "Activos Hoy", value: userSummaries.filter(u => {
        const todayKey = new Date().toISOString().split('T')[0];
        return u.lastLogin && new Date(u.lastLogin.seconds * 1000).toISOString().split('T')[0] === todayKey;
      }).length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
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
              <CardTitle className="text-lg">Actividad de Usuarios</CardTitle>
            </div>
            <Link href="/admin/users" className="text-xs font-bold text-primary hover:underline">Ver detalle</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {userSummaries.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">Sin actividad de usuarios registrada.</p>
              ) : (
                userSummaries.map(user => {
                  const todayKey = new Date().toISOString().split('T')[0];
                  const loggedToday = user.lastLogin && new Date(user.lastLogin.seconds * 1000).toISOString().split('T')[0] === todayKey;
                  
                  return (
                    <div key={user.username} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{user.username}</span>
                          {loggedToday && (
                            <Badge className="bg-green-500/10 text-green-600 border-none text-[8px] h-4 font-bold px-1.5">HOY</Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          Último: {user.lastPanel}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Conexión</p>
                        <p className="text-[10px] font-medium">
                          {user.lastLogin ? new Date(user.lastLogin.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  );
                })
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-lg">Top 10 Más Visitados</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold">Ranking Global</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topPanels.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm col-span-2">Esperando datos de visitas...</p>
              ) : (
                topPanels.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center font-bold text-xs text-indigo-600 shadow-sm">
                      #{index + 1}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{item.views} visitas únicas diarias</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-indigo-600 text-white overflow-hidden relative">
          <CardHeader>
            <CardTitle className="text-white">Tips de Gestión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/10 p-4 rounded-xl border border-white/10">
              <p className="text-xs font-bold uppercase mb-1 opacity-70">Tendencias</p>
              <p className="text-sm font-medium">Observa los tableros más visitados para ajustar tus promociones de stock.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-xl border border-white/10">
              <p className="text-xs font-bold uppercase mb-1 opacity-70">Optimización</p>
              <p className="text-sm font-medium">Los datos se actualizan cada vez que un usuario nuevo consulta un tablero cada día.</p>
            </div>
          </CardContent>
          <TrendingUp className="absolute bottom-[-20px] right-[-20px] h-40 w-40 opacity-10" />
        </Card>
      </div>
    </div>
  );
}
