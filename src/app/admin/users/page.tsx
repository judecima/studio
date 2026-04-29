'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Activity, Calendar, ExternalLink, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { getUserStats } from '@/lib/activity-actions';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserTrackingPage() {
  const [data, setData] = useState<{ users: any[], activities: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userFilter, setUserFilter] = useState("all");
  const [panelSearch, setPanelSearch] = useState("");
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const result = await getUserStats(selectedMonth, selectedYear);
        setData(result as any);
        setCurrentPage(1); // Reset pagination on month change
      } catch (e) {
        console.error("Error loading user stats:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedMonth, selectedYear]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Cargando reporte de actividad...</p>
      </div>
    );
  }

  const currentMonthKey = `${selectedYear}-${selectedMonth}`;

  // Filtrado en memoria de las actividades ya descargadas para el mes
  const filteredActivities = (data?.activities || []).filter(act => {
    const matchesUser = userFilter === "all" || act.username === userFilter;
    const matchesPanel = panelSearch === "" || 
      act.panelName.toLowerCase().includes(panelSearch.toLowerCase()) ||
      act.panelId.toLowerCase().includes(panelSearch.toLowerCase());
    return matchesUser && matchesPanel;
  });

  // Paginación
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const months = [
    { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
    { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Seguimiento de Usuarios</h1>
        <p className="text-muted-foreground">Monitoreo de accesos y consultas al catálogo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-600">Periodo:</span>
        </div>
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {[2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="ml-auto">
          {data?.activities.length} registros en este mes
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Estadísticas por Usuario</CardTitle>
            </div>
            <CardDescription>Resumen de accesos mensuales y última conexión.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-center">Accesos (Mes)</TableHead>
                  <TableHead className="text-center">Conexión Hoy</TableHead>
                  <TableHead>Última Conexión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((user) => {
                  const todayKey = new Date().toISOString().split('T')[0];
                  const loggedToday = user.lastDailyAccess === todayKey;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-bold">{user.username}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-bold">
                          {user.monthlyStats?.[currentMonthKey] || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {loggedToday ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                            Sí
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-300 border-slate-200">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {user.lastLogin ? new Date(user.lastLogin.seconds * 1000).toLocaleString() : 'Nunca'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Resumen Global</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Usuarios Activos</p>
              <p className="text-2xl font-bold">{data?.users.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Usuarios Activos Hoy</p>
              <p className="text-2xl font-bold text-green-600">
                {data?.users.filter(u => u.lastDailyAccess === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Consultas Totales</p>
              <p className="text-2xl font-bold">{data?.activities.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Detalle de Consultas</CardTitle>
              <CardDescription>Explora el historial filtrado por usuario o tablero.</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar tablero..." 
                className="pl-9 h-9" 
                value={panelSearch}
                onChange={(e) => { setPanelSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {data?.users.map(u => (
                  <SelectItem key={u.id} value={u.username}>{u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Tablero</TableHead>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedActivities.map((act) => (
                <TableRow key={act.id}>
                  <TableCell className="font-medium text-primary">{act.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{act.panelName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">ID: {act.panelId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {act.timestamp ? new Date(act.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/panels/${act.panelId}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedActivities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 flex flex-col items-center gap-2">
                    <Filter className="h-8 w-8 text-slate-200" />
                    <p className="text-muted-foreground font-medium">No se encontraron resultados con los filtros aplicados.</p>
                    <Button variant="link" onClick={() => { setUserFilter("all"); setPanelSearch(""); }}>Limpiar filtros</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-xs text-slate-500">
                Mostrando {Math.min(filteredActivities.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredActivities.length, currentPage * itemsPerPage)} de {filteredActivities.length} registros
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold w-12 text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
