
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

      setScrapedData(result.data || []);
      setImportStatus('saving');
      
      const data = result.data || [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        // Generar un ID único basado en el nombre para evitar duplicados
        const docId = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const docRef = doc(db, 'panels', docId);

        const panelData = {
          ...item,
          id: docId, // El ID es obligatorio según las reglas de seguridad
          visible: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          colorGroup: item.brand === 'Egger' ? 'medio' : 'claro',
          colorHue: 'otros',
          styleTags: ['moderno'],
          useCases: ['cocina']
        };

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
      toast({ title: "Importación Finalizada", description: `Se han cargado ${data.length} productos.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
          <p className="text-muted-foreground">Extrae productos reales de Faplac y Egger directamente a tu base de datos.</p>
        </div>
        <Database className="h-10 w-10 text-primary opacity-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Fuentes de Datos</CardTitle>
            <CardDescription>Configuración de los scrapers industriales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-xl bg-slate-50 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold">Faplac Argentina</span>
                <span className="text-xs text-muted-foreground">Scraping HTML Directo</span>
              </div>
              <Badge>Activo</Badge>
            </div>
            <div className="p-4 border rounded-xl bg-slate-50 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold">Egger Global</span>
                <span className="text-xs text-muted-foreground">Seed Data & Parsing</span>
              </div>
              <Badge>Activo</Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-12 text-lg font-bold gap-2" 
              onClick={handleStartImport}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Globe className="h-5 w-5" />}
              {isProcessing ? 'Procesando...' : 'Ejecutar Importación Real'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado del Proceso</CardTitle>
            <CardDescription>Seguimiento en tiempo real de la carga.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {importStatus !== 'idle' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {importStatus === 'scraping' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {importStatus === 'saving' && <Database className="h-4 w-4 animate-bounce" />}
                    {importStatus === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    <span className="font-medium">
                      {importStatus === 'scraping' && 'Extrayendo datos de catálogos web...'}
                      {importStatus === 'saving' && 'Guardando productos en Firestore...'}
                      {importStatus === 'done' && 'Proceso completado con éxito'}
                    </span>
                  </div>
                  <span className="font-mono">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
              {scrapedData.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl flex flex-col items-center gap-2">
                  <FileUp className="h-8 w-8 opacity-10" />
                  Presiona el botón para iniciar el scraping real
                </div>
              ) : (
                scrapedData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden border">
                        <img src={item.mainImage} alt="" className="object-cover h-full w-full" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{item.name}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[10px] h-4">{item.brand}</Badge>
                          <span className="text-[10px] text-muted-foreground">{item.width}x{item.height}mm</span>
                        </div>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
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
