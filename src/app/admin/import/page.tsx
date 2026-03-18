
"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, FileUp, Globe, Database, Sparkles } from "lucide-react";
import { runFullFaplacImport } from "@/app/actions/import-actions";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { seedFaplac } from "@/lib/scripts/seedFaplacToFirestore";
import { parseMeasures } from "@/lib/importers/faplacPuppeteerImporter";

export default function BulkImportPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'seeding' | 'scraping' | 'done'>('idle');

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 50));

  const isValidUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const handleStartFullImport = async () => {
    if (!db) return;
    setIsProcessing(true);
    setLog([]);
    setProgress(10);
    
    try {
      // 1. SEEDING
      setImportStatus('seeding');
      addLog("🌱 Iniciando Seed base de 127 productos...");
      const seedResult = await seedFaplac(db);
      addLog(`✅ Seed completado: ${seedResult.successCount} insertados.`);
      setProgress(40);

      // 2. SCRAPING (PUPPETEER ALTERNATIVE)
      setImportStatus('scraping');
      addLog("🕵️ Iniciando Scraper Robusto para enriquecer imágenes...");
      const scrapeResult = await runFullFaplacImport();
      
      if (!scrapeResult.success) throw new Error(scrapeResult.error);

      addLog(`🔍 Encontrados ${scrapeResult.data?.length} productos con fotos reales.`);
      
      // 3. PERSISTING ENRICHED DATA
      const data = scrapeResult.data || [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const docId = item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^\w-]/g, "");
        const docRef = doc(db, 'panels', docId);

        const measures = await parseMeasures(item.bodyText || "");
        
        // Validar imágenes
        const validMainImage = isValidUrl(item.img) ? item.img : "https://placehold.co/800x600?text=Imagen+Invalida";
        const validGallery = (item.galleryImages || []).filter(isValidUrl);

        const enrichedData = {
          id: docId,
          description: item.description,
          images: validGallery.length > 0 ? validGallery : [validMainImage],
          mainImage: validMainImage,
          width: measures?.width || 1830,
          height: measures?.height || 2750,
          thickness: measures?.thickness || 18,
          updatedAt: serverTimestamp(),
          source: "scraping_enriched"
        };

        setDoc(docRef, enrichedData, { merge: true }).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: enrichedData
          }));
        });

        setProgress(40 + ((i + 1) / data.length) * 60);
      }

      setImportStatus('done');
      toast({ title: "Proceso Completo", description: "Base Faplac cargada y enriquecida con éxito." });
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      toast({ title: "Error Crítico", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Ingestión de Catálogo Pro</h1>
          <p className="text-muted-foreground">Seed masivo + Enriquecimiento automático de Faplac.</p>
        </div>
        <Sparkles className="h-10 w-10 text-primary animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-primary shadow-xl bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Control de Ingestión</CardTitle>
            <CardDescription className="text-slate-400">Automatización de nivel industrial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-slate-700 rounded-xl bg-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Paso 1: Seed</p>
              <p className="text-sm">Carga 127 registros base (Nombres, Líneas, Categorías).</p>
            </div>
            <div className="p-4 border border-slate-700 rounded-xl bg-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Paso 2: Enriquecimiento</p>
              <p className="text-sm">Navega faplaconline.com.ar para extraer imágenes válidas y medidas reales.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-16 text-lg font-bold gap-3 shadow-2xl bg-primary hover:bg-primary/90" 
              onClick={handleStartFullImport}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Database className="h-6 w-6" />}
              {isProcessing ? 'PROCESANDO...' : 'INICIAR INGESTIÓN FULL'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 border-primary/10">
          <CardHeader>
            <CardTitle>Log de Operaciones</CardTitle>
            <CardDescription>Seguimiento detallado de la automatización.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                  <span>Progreso de Ingestión</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )}

            <div className="bg-black rounded-xl p-4 font-mono text-[10px] h-[400px] overflow-auto custom-scrollbar border-2 border-slate-800">
              {log.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                  <Globe className="h-12 w-12 opacity-20" />
                  <p>Esperando señal de inicio...</p>
                </div>
              ) : (
                log.map((entry, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>{" "}
                    <span className={entry.includes('✅') ? 'text-green-400' : entry.includes('❌') ? 'text-red-400' : 'text-slate-300'}>
                      {entry}
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
