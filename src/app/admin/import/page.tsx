
"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, FileUp, Globe, Database } from "lucide-react";
import { runCatalogImportAction } from "@/app/actions/scraping-actions";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function BulkImportPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapedData, setScrapedData] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'scraping' | 'saving' | 'done'>('idle');

  const handleStartImport = async () => {
    setIsProcessing(true);
    setImportStatus('scraping');
    setScrapedData([]);
    setProgress(0);

    try {
      const result = await runCatalogImportAction();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const data = result.data || [];
      setScrapedData(data);
      setImportStatus('saving');
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const docId = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const docRef = doc(db, 'panels', docId);

        const panelData = {
          ...item,
          id: docId,
          visible: false,
          stock: Math.floor(Math.random() * 50) + 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          colorGroup: item.brand === 'Egger' ? 'medio' : 'claro',
          colorHue: item.name.toLowerCase().includes('blanco') ? 'blanco' : 'otros',
          styleTags: ['moderno'],
          useCases: ['cocina'],
          hasGrain: !item.name.toLowerCase().includes('liso') && !item.name.toLowerCase().includes('blanco')
        };

        // Guardado no bloqueante con manejo de errores centralizado
        setDoc(docRef, panelData, { merge: true }).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: panelData
          }));
        });

        setProgress(((i + 1) / data.length) * 100);
      }

      setImportStatus('done');
      toast({ title: "Importación Exitosa", description: `Se han procesado ${data.length} productos de Faplac y Egger.` });
    } catch (error: any) {
      toast({ title: "Error de Importación", description: error.message, variant: "destructive" });
      setImportStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Importación Automática</h1>
          <p className="text-muted-foreground">Extracción inteligente de catálogos Faplac y Egger.</p>
        </div>
        <Database className="h-10 w-10 text-primary opacity-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>Fuentes industriales conectadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-xl bg-slate-50 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold">Faplac Argentina</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Scraping \u0026 Hybrid Seed</span>
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">ONLINE</Badge>
            </div>
            <div className="p-4 border rounded-xl bg-slate-50 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold">Egger Global</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Industry Standard Seed</span>
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">ONLINE</Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-14 text-lg font-bold gap-3 shadow-md" 
              onClick={handleStartImport}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Globe className="h-6 w-6" />}
              {isProcessing ? 'Procesando...' : 'Importar Catálogos'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 border-primary/10">
          <CardHeader>
            <CardTitle>Registro de Actividad</CardTitle>
            <CardDescription>Seguimiento de productos detectados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {importStatus !== 'idle' && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {importStatus === 'scraping' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {importStatus === 'saving' && <Database className="h-4 w-4 animate-bounce text-primary" />}
                    {importStatus === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    <span className="font-bold">
                      {importStatus === 'scraping' && 'Escaneando sitios industriales...'}
                      {importStatus === 'saving' && 'Persistiendo en base de datos...'}
                      {importStatus === 'done' && 'Importación finalizada con éxito'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-primary">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="space-y-3 max-h-[450px] overflow-auto pr-2 custom-scrollbar">
              {scrapedData.length === 0 ? (
                <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-2xl flex flex-col items-center gap-3 bg-slate-50/50">
                  <FileUp className="h-12 w-12 opacity-10" />
                  <p className="font-medium">Esperando inicio de proceso...</p>
                </div>
              ) : (
                scrapedData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm hover:border-primary/40 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-slate-100 relative overflow-hidden shrink-0 border group-hover:shadow-md transition-shadow">
                        <img src={item.mainImage} alt="" className="object-cover h-full w-full" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-800">{item.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] h-4 py-0 font-bold border-primary/20">{item.brand}</Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">{item.width}x{item.height}mm</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Detectado</span>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
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
