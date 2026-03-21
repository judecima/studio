"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Database, ShieldCheck, HardDrive, Globe } from "lucide-react";
import { startIndustrialImport } from "@/app/actions/import-actions";
import { useToast } from "@/hooks/use-toast";

export default function IndustrialImportPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const handleStartImport = async () => {
    setIsProcessing(true);
    setLog([]);
    addLog("🚀 Iniciando Pipeline Industrial Dual...");
    addLog("🌐 Conectando con Faplac Online y Egger Latam...");
    addLog("☁️ Inicializando Firebase Storage...");

    try {
      const result = await startIndustrialImport();
      
      if (result.success) {
        addLog(`✅ Pipeline finalizado. Se sincronizaron ${result.count} productos.`);
        addLog("🖼️ Imágenes guardadas en Storage.");
        addLog("📂 Metadata persistida en Firestore.");
        toast({ title: "Importación Exitosa", description: `${result.count} productos listos.` });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      addLog(`❌ Error Crítico: ${error.message}`);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Ingestión Industrial</h1>
        <p className="text-muted-foreground">Sincroniza el catálogo web directamente con tu infraestructura Firebase.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-primary bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Motor V4
            </CardTitle>
            <CardDescription className="text-slate-400">Arquitectura de persistencia robusta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
              <HardDrive className="h-4 w-4 text-primary" />
              <span>Firebase Storage (Imágenes)</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
              <Database className="h-4 w-4 text-primary" />
              <span>Firestore (Metadata)</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
              <Globe className="h-4 w-4 text-primary" />
              <span>Scraping Recursivo</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-14 font-bold text-lg" 
              onClick={handleStartImport}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Database className="mr-2 h-5 w-5" />}
              {isProcessing ? 'Sincronizando...' : 'Iniciar Sincronización'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Log del Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black rounded-xl p-4 font-mono text-[10px] h-[400px] overflow-auto border-2 border-slate-800 text-slate-300">
              {log.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-20">
                  Esperando inicio de proceso...
                </div>
              ) : (
                log.map((line, i) => (
                  <div key={i} className="mb-1">
                    <span className={line.includes('✅') ? 'text-green-400' : line.includes('❌') ? 'text-red-400' : ''}>
                      {line}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
