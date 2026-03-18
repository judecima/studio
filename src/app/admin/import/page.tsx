"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Database, Sparkles, Trash2, Globe, AlertTriangle, RefreshCw } from "lucide-react";
import { runFullFaplacImport } from "@/app/actions/import-actions";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { doc, setDoc, serverTimestamp, collection, getDocs, writeBatch } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { seedFaplac } from "@/lib/scripts/seedFaplacToFirestore";

export default function BulkImportPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'clearing' | 'seeding' | 'scraping' | 'done'>('idle');
  const [isFullLoad, setIsFullLoad] = useState(false);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));

  useEffect(() => {
    if (!isUserLoading && user) {
      addLog(`👤 Sesión activa: ${user.isAnonymous ? 'Usuario Anónimo' : user.email}`);
    }
  }, [user, isUserLoading]);

  const clearDatabaseLogic = async () => {
    if (!db) return;
    setImportStatus('clearing');
    setProgress(0);
    addLog("⚠️ Iniciando limpieza de base de datos...");

    try {
      const colRef = collection(db, 'panels');
      const querySnapshot = await getDocs(colRef);
      const total = querySnapshot.size;
      
      if (total === 0) {
        addLog("ℹ️ La base de datos ya está vacía.");
      } else {
        addLog(`🗑️ Encontrados ${total} documentos. Iniciando borrado...`);
        const batchSize = 50;
        const docs = querySnapshot.docs;
        
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + batchSize);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
          
          const currentProgress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
          setProgress(currentProgress);
          addLog(`✅ Lote procesado: ${i + chunk.length}/${total}`);
        }
        addLog(`✅ Limpieza completada: ${total} documentos eliminados.`);
      }
    } catch (e: any) {
      addLog(`❌ ERROR al limpiar: ${e.message}`);
      throw e;
    }
  };

  const handleClearDatabase = async () => {
    if (!db || !user) {
      addLog("❌ Error: Base de datos o sesión no lista.");
      return;
    }

    if (!confirm("¿Estás seguro de que deseas ELIMINAR TODO el catálogo? Esta acción no se puede deshacer.")) return;
    
    setIsProcessing(true);
    try {
      await clearDatabaseLogic();
      toast({ title: "Base de datos limpia", description: "Todos los paneles han sido eliminados con éxito." });
    } catch (error: any) {
      toast({ title: "Error al limpiar", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setImportStatus('idle');
      setProgress(0);
    }
  };

  const handleStartFullImport = async () => {
    if (!db || !user) {
      addLog("❌ Error: Base de datos o sesión no lista.");
      return;
    }

    setIsProcessing(true);
    setLog([]);
    setProgress(0);
    
    try {
      if (isFullLoad) {
        await clearDatabaseLogic();
      }

      // 1. SEEDING (Base inicial)
      setImportStatus('seeding');
      addLog("🌱 Iniciando Seed base de productos...");
      setProgress(10);
      const seedResult = await seedFaplac(db);
      addLog(`✅ Seed completado: ${seedResult.successCount} productos base insertados.`);
      setProgress(30);

      // 2. SCRAPING (Enriquecimiento con imágenes REALES de Faplac)
      setImportStatus('scraping');
      addLog("🕵️ Capturando imágenes industriales REALES de alta resolución...");
      const scrapeResult = await runFullFaplacImport();
      
      if (!scrapeResult.success) {
        addLog(`⚠️ El scraping falló o fue bloqueado: ${scrapeResult.error}. Se mantendrán los datos base.`);
        setImportStatus('done');
        setProgress(100);
        return;
      }

      const data = scrapeResult.data || [];
      addLog(`🔍 Se obtuvieron ${data.length} imágenes reales exitosamente.`);
      
      // 3. PERSISTING (Actualizar Firestore con las imágenes BASE64 reales)
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // Normalización estricta del ID para coincidir con el Seed
        const docId = item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^\w-]/g, "");
        const docRef = doc(db, 'panels', docId);

        // Si tenemos imagen real capturada por el scraper, la usamos.
        const updatePayload: any = {
          updatedAt: serverTimestamp(),
          description: item.description,
          width: item.width || 1830,
          height: item.height || 2750,
          thickness: item.thickness || 18,
          visible: true,
          hasGrain: item.bodyText?.toLowerCase().includes('veta') || false,
        };

        // Si el scraper devolvió un Data URI (Base64), lo asignamos como imagen principal
        if (item.img && item.img.startsWith('data:image')) {
          updatePayload.mainImage = item.img;
        }

        setDoc(docRef, updatePayload, { merge: true }).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: updatePayload
          }));
        });

        const currentProgress = 30 + Math.round(((i + 1) / data.length) * 70);
        setProgress(currentProgress);
        if ((i + 1) % 3 === 0) addLog(`📦 Sincronizando imagen real: ${item.name}...`);
      }

      setImportStatus('done');
      addLog("🎉 PROCESO FINALIZADO. Las imágenes reales ahora residen en tu base de datos.");
      toast({ title: "Importación Exitosa", description: "Imágenes reales capturadas y persistidas." });
    } catch (error: any) {
      addLog(`❌ ERROR CRÍTICO: ${error.message}`);
      toast({ title: "Error Crítico", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Ingestión de Imágenes Industriales</h1>
          <p className="text-muted-foreground">Captura y persistencia de fotos reales directamente en Firestore.</p>
        </div>
        <div className="flex gap-2">
           <Button 
            variant="outline" 
            className="text-red-500 border-red-200 hover:bg-red-50 gap-2"
            onClick={handleClearDatabase}
            disabled={isProcessing || isUserLoading}
          >
            {isProcessing && importStatus === 'clearing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Limpiar Base de Datos
          </Button>
          <Sparkles className="h-10 w-10 text-primary animate-pulse hidden md:block" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-primary shadow-xl bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Control de Ingestión</CardTitle>
            <CardDescription className="text-slate-400">Parámetros del motor de captura.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-3 p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setIsFullLoad(!isFullLoad)}>
              <Checkbox 
                id="full-load" 
                checked={isFullLoad}
                onCheckedChange={(checked) => setIsFullLoad(!!checked)}
                className="border-slate-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="full-load" className="text-sm font-bold cursor-pointer">Reemplazo Total (Full)</Label>
                <p className="text-xs text-slate-400">Borra todo antes de capturar las imágenes reales.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`p-4 border rounded-xl transition-colors ${importStatus === 'seeding' ? 'bg-primary/20 border-primary' : 'bg-slate-800 border-slate-700'}`}>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Paso 1: Estructura</p>
                <p className="text-sm">Prepara los documentos base en Firestore.</p>
              </div>
              <div className={`p-4 border rounded-xl transition-colors ${importStatus === 'scraping' ? 'bg-primary/20 border-primary' : 'bg-slate-800 border-slate-700'}`}>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Paso 2: Captura Real</p>
                <p className="text-sm">Extrae fotos reales de Faplac y las convierte a Base64.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-16 text-lg font-bold gap-3 shadow-2xl bg-primary hover:bg-primary/90" 
              onClick={handleStartFullImport}
              disabled={isProcessing || isUserLoading}
            >
              {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Database className="h-6 w-6" />}
              {isProcessing ? 'CAPTURANDO...' : 'INICIAR CAPTURA REAL'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 border-primary/10">
          <CardHeader>
            <CardTitle>Log del Motor de Captura</CardTitle>
            <CardDescription>Seguimiento de la descarga y persistencia de imágenes industriales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                  <span>{importStatus === 'scraping' ? 'Capturando Imágenes de Alta Resolución...' : 'Sincronizando Base de Datos...'}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )}

            <div className="bg-black rounded-xl p-4 font-mono text-[10px] h-[400px] overflow-auto border-2 border-slate-800">
              {log.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                  <Globe className="h-12 w-12 opacity-20" />
                  <p>Listo para iniciar la captura de imágenes reales de Faplac...</p>
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
