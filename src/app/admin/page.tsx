
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_PANELS } from "@/services/mock-data";
import { Package, Eye, AlertCircle, ShoppingBag } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { title: "Total Paneles", value: MOCK_PANELS.length, icon: Package, color: "text-blue-600" },
    { title: "Visibles", value: MOCK_PANELS.filter(p => p.visible).length, icon: Eye, color: "text-green-600" },
    { title: "Bajo Stock", value: MOCK_PANELS.filter(p => p.stock < 10).length, icon: AlertCircle, color: "text-amber-600" },
    { title: "Brands", value: new Set(MOCK_PANELS.map(p => p.brand)).size, icon: ShoppingBag, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Resumen General</h1>
        <p className="text-muted-foreground">Estado actual de tu catálogo de productos.</p>
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
              {MOCK_PANELS.slice(0, 5).map(panel => (
                <div key={panel.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{panel.name}</span>
                    <span className="text-xs text-muted-foreground">{panel.brand} • {panel.thickness}mm</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Editado recientemente</span>
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
              {MOCK_PANELS.filter(p => p.stock < 20).map(panel => (
                <div key={panel.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <span className="font-medium text-sm">{panel.name}</span>
                  <Badge variant={panel.stock < 10 ? "destructive" : "secondary"}>
                    {panel.stock} unidades
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode, variant?: string }) {
  const colors: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    secondary: "bg-secondary/10 text-secondary"
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[variant]}`}>
      {children}
    </span>
  );
}
