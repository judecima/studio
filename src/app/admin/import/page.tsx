
"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, FileUp, Globe, Database, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { runFullFaplacImport } from "@/app/actions/import-actions";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp, collection, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
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
  const [importStatus, setImportStatus] = useState<'idle' | 'clearing' | 'seeding' | 'scraping' | 'done'>('idle');

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));

  const isValidUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const handleClearDatabase = async () => {
    if (!db || !confirm("¿Estás seguro de que deseas ELIMINAR TODO el catálogo de paneles? Esta acción no se puede deshacer.")) return;
    
    setIsProcessing(true);
    setImportStatus('clearing');
    setLog([]);
    addLog("⚠️ Iniciando limpieza de base de datos...");
    setProgress(0);

    try {
      const querySnapshot = await getDocs(collection(db, 'panels'));
      const total = querySnapshot.size;
      
      if (total === 0) {
        addLog("ℹ️ La base de datos ya está vacía.");
      } else {
        addLog(`🗑️ Eliminando ${total} documentos...`);
        const batchSize = 50;
        const docs = querySnapshot.docs;
        
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + batchSize);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
          const currentProgress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
          setProgress(currentProgress);
        }
        addLog(`✅ Limpieza completada: ${total} documentos eliminados.`);
      }
      
      toast({ title: "Base de datos limpia", description: "Todos los paneles han sido eliminados con éxito." });
    } catch (error: any) {
      addLog(`❌ ERROR al limpiar: ${error.message}`);
      toast({ title: "Error al limpiar", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setImportStatus('idle');
      setProgress(0);
    }
  };

  const handleStartFullImport = async () => {
    if (!db) return;
    setIsProcessing(true);
    setLog([]);
    setProgress(0);
    
    try {
      // 1. SEEDING
      setImportStatus('seeding');
      addLog("🌱 Iniciando Seed base de 127 productos...");
      setProgress(10);
      const seedResult = await seedFaplac(db);
      addLog(`✅ Seed completado: ${seedResult.successCount} insertados.`);
      setProgress(40);

      // 2. SCRAPING
      setImportStatus('scraping');
      addLog("🕵️ Iniciando enriquecimiento mediante Scraping recursivo...");
      const scrapeResult = await runFullFaplacImport();
      
      if (!scrapeResult.success) throw new Error(scrapeResult.error);

      addLog(`🔍 Encontrados ${scrapeResult.data?.length} productos enriquecidos con imágenes.`);
      
      // 3. PERSISTING ENRICHED DATA
      const data = scrapeResult.data || [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const docId = item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^\w-]/g, "");
        const docRef = doc(db, 'panels', docId);

        const measures = await parseMeasures(item.bodyText || "");
        
        const enrichedData = {
          id: docId,
          name: item.name,
          brand: "Faplac",
          description: item.description,
          images: [],
          mainImage: item.img || "https://picsum.photos/seed/" + docId + "/800/600",
          width: measures?.width || 1830,
          height: measures?.height || 2750,
          thickness: measures?.thickness || 18,
          visible: true,
          stock: Math.floor(Math.random() * 100),
          updatedAt: serverTimestamp(),
          source: "scraping_enriched",
          colorGroup: 'medio',
          colorHue: 'otros',
          styleTags: ['moderno'],
          useCases: ['cocina']
        };

        await setDoc(docRef, enrichedData, { merge: true }).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'write',
            requestResourceData: enrichedData
          }));
        });

        const currentProgress = 40 + Math.round(((i + 1) / data.length) * 60);
        setProgress(currentProgress);
        if ((i + 1) % 5 === 0) addLog(`📦 Sincronizando: ${item.name}...`);
      }

      setImportStatus('done');
      addLog("🎉 PROCESO FINALIZADO CON ÉXITO.");
      toast({ title: "Proceso Completo", description: "Base Faplac cargada y enriquecida con éxito." });
    } catch (error: any) {
      addLog(`❌ ERROR CRÍTICO: ${error.message}`);
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
          <p className="text-muted-foreground">Centro de mando para la sincronización industrial.</p>
        </div>
        <div className="flex gap-2">
           <Button 
            variant="outline" 
            className="text-red-500 border-red-200 hover:bg-red-50 gap-2"
            onClick={handleClearDatabase}
            disabled={isProcessing}
          >
            <Trash2 className="h-4 w-4" /> Limpiar Base de Datos
          </Button>
          <Sparkles className="h-10 w-10 text-primary animate-pulse hidden md:block" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-primary shadow-xl bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Control de Ingestión</CardTitle>
            <CardDescription className="text-slate-400">Automatización de nivel industrial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 border rounded-xl transition-colors ${importStatus === 'clearing' ? 'bg-red-900/20 border-red-500' : 'bg-slate-800 border-slate-700'}`}>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Paso 0: Limpieza</p>
              <p className="text-sm">Opcional. Elimina registros antiguos para una carga limpia.</p>
            </div>
            <div className={`p-4 border rounded-xl transition-colors ${importStatus === 'seeding' ? 'bg-primary/20 border-primary' : 'bg-slate-800 border-slate-700'}`}>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Paso 1: Seed</p>
              <p className="text-sm">Carga 127 registros base (Nombres, Líneas, Categorías).</p>
            </div>
            <div className={`p-4 border rounded-xl transition-colors ${importStatus === 'scraping' ? 'bg-primary/20 border-primary' : 'bg-slate-800 border-slate-700'}`}>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Paso 2: Enriquecimiento</p>
              <p className="text-sm">Scraping recursivo para imágenes y medidas técnicas.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              className="w-full h-16 text-lg font-bold gap-3 shadow-2xl bg-primary hover:bg-primary/90" 
              onClick={handleStartFullImport}
              disabled={isProcessing}
            >
              {isProcessing && importStatus !== 'clearing' ? <Loader2 className="h-6 w-6 animate-spin" /> : <Database className="h-6 w-6" />}
              {isProcessing && importStatus !== 'clearing' ? 'PROCESANDO...' : 'INICIAR INGESTIÓN FULL'}
            </Button>
            <p className="text-[10px] text-center text-slate-500">
              * El proceso puede tardar unos minutos debido al scraping recursivo.
            </p>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 border-primary/10">
          <CardHeader>
            <CardTitle>Log de Operaciones</CardTitle>
            <CardDescription>Seguimiento detallado en tiempo real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                  <span>{importStatus === 'clearing' ? 'Eliminando...' : 'Sincronizando...'}</span>
                  <span>{progress}%</span>
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
                    <span className={entry.includes('✅') ? 'text-green-400' : entry.includes('❌') || entry.includes('⚠️') || entry.includes('🗑️') ? 'text-red-400' : entry.includes('📦') ? 'text-amber-400' : 'text-slate-300'}>
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
