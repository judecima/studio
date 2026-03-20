
"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Database, Sparkles, Trash2, Globe, FileCheck } from "lucide-react";
import { runFullFaplacImport } from "@/app/actions/import-actions";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { doc, setDoc, serverTimestamp, collection, getDocs, writeBatch } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { seedFaplac, normalizePanelId } from "@/lib/scripts/seedFaplacToFirestore";

export default function BulkImportPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'clearing' | 'seeding' | 'scraping' | 'done'>('idle');
  const [isFullLoad, setIsFullLoad] = useState(true);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));

  const clearDatabaseLogic = async () => {
    if (!db) return;
    setImportStatus('clearing');
    setProgress(0);
    addLog("⚠️ Iniciando limpieza profunda del catálogo...");

    try {
      const colRef = collection(db, 'panels');
      const querySnapshot = await getDocs(colRef);
      const total = querySnapshot.size;
      
      if (total === 0) {
        addLog("ℹ️ El catálogo ya está vacío.");
        return;
      }

      const batchSize = 50;
      const docs = querySnapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + batchSize);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        
        const currentProgress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
        setProgress(currentProgress);
        addLog(`🗑️ Borrados: ${i + chunk.length}/${total}`);
      }
      addLog(`✅ Catálogo vaciado exitosamente.`);
    } catch (e: any) {
      addLog(`❌ Error en limpieza: ${e.message}`);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'panels',
        operation: 'delete'
      }));
      throw e;
    }
  };

  const handleStartFullImport = async () => {
    if (!db || !user) {
      addLog("❌ Error: Firebase no está listo o sesión no iniciada.");
      return;
    }

    setIsProcessing(true);
    setLog([]);
    setProgress(0);
    
    try {
      if (isFullLoad) {
        await clearDatabaseLogic();
      }

      // 1. ESTRUCTURA (Seed)
      setImportStatus('seeding');
      addLog("🌱 Creando estructura de paneles en Firestore...");
      setProgress(10);
      const seedResult = await seedFaplac(db);
      addLog(`✅ Estructura creada: ${seedResult.successCount} documentos base.`);
      setProgress(25);

      // 2. CAPTURA REAL (Scraping detallado)
      setImportStatus('scraping');
      addLog("📸 Iniciando captura de fotos industriales REALES (Alta Resolución)...");
      const scrapeResult = await runFullFaplacImport();
      
      if (!scrapeResult.success || !scrapeResult.data) {
        addLog(`⚠️ Fallo en captura real: ${scrapeResult.error}.`);
        setImportStatus('done');
        setProgress(100);
        return;
      }

      const data = scrapeResult.data;
      addLog(`🔍 Se capturaron ${data.length} imágenes reales listas para persistir.`);
      
      // 3. PERSISTENCIA
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const docId = normalizePanelId(item.name);
        const docRef = doc(db, 'panels', docId);

        const updatePayload: any = {
          updatedAt: serverTimestamp(),
          description: item.description,
          width: item.width,
          height: item.height,
          thickness: item.thickness,
          visible: true
        };

        if (item.img && item.img.startsWith('data:image')) {
          updatePayload.mainImage = item.img;
        } else if (item.detailImgUrl) {
          updatePayload.mainImage = item.detailImgUrl;
        }

        setDoc(docRef, updatePayload, { merge: true }).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updatePayload
          }));
        });

        const currentProgress = 25 + Math.round(((i + 1) / data.length) * 75);
        setProgress(currentProgress);
        if ((i + 1) % 5 === 0) addLog(`📦 Sincronizando: ${item.name}...`);
      }

      setImportStatus('done');
      addLog("🎉 PROCESO FINALIZADO.");
      toast({ title: "Importación Exitosa", description: "Catálogo actualizado con imágenes reales." });
    } catch (error: any) {
      addLog(`❌ Error Crítico: ${error.message}`);
      toast({ title: "Error Crítico", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Captura Industrial de Imágenes</h1>
          <p className="text-muted-foreground">Convierte el catálogo web en datos locales permanentes en tu base de datos.</p>
        </div>
        <Sparkles className="h-10 w-10 text-primary animate-pulse hidden md:block" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-primary shadow-xl bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Motor de Ingestión</CardTitle>
            <CardDescription className="text-slate-400">Configura la profundidad de la captura.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className="flex items-center space-x-3 p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-primary/50 transition-colors cursor-pointer" 
              onClick={() => setIsFullLoad(!isFullLoad)}
            >
              <Checkbox 
                id="full-load" 
                checked={isFullLoad}
                onCheckedChange={(checked) => setIsFullLoad(!!checked)}
                className="border-slate-500 data-[state=checked]:bg-primary"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="full-load" className="text-sm font-bold cursor-pointer">Carga Completa (Recomendado)</Label>
                <p className="text-xs text-slate-400">Limpia el catálogo antes de capturar las nuevas imágenes.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-widest">
                <FileCheck className="h-4 w-4" /> Proceso de Captura
              </div>
              <ul className="text-xs space-y-2 text-slate-300">
                <li className="flex gap-2">🔹 Creación de estructura industrial</li>
                <li className="flex gap-2">🔹 Navegación recursiva a detalle</li>
                <li className="flex gap-2">🔹 Sincronización de fotos reales</li>
                <li className="flex gap-2">🔹 Persistencia en Firestore</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-16 text-lg font-bold gap-3 shadow-2xl bg-primary hover:bg-primary/90" 
              onClick={handleStartFullImport}
              disabled={isProcessing || isUserLoading}
            >
              {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Database className="h-6 w-6" />}
              {isProcessing ? 'PROCESANDO...' : 'INICIAR CAPTURA REAL'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 border-primary/10">
          <CardHeader>
            <CardTitle>Monitor de Proceso</CardTitle>
            <CardDescription>Seguimiento de la captura y conversión de imágenes industriales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span>{importStatus === 'scraping' ? 'Capturando Imágenes Reales...' : 'Sincronizando Firestore...'}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )}

            <div className="bg-black rounded-xl p-4 font-mono text-[10px] h-[400px] overflow-auto border-2 border-slate-800">
              {log.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                  <Globe className="h-12 w-12 opacity-20" />
                  <p>Listo para capturar imágenes industriales reales...</p>
                </div>
              ) : (
                log.map((entry, i) => (
                  <div key={i} className="mb-1">
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
