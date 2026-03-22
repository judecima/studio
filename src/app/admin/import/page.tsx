"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronLeft,
  X,
  PackagePlus,
  RefreshCw,
  Zap,
  Bot,
  Layers,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startIndustrialImport } from "@/app/actions/import-actions";

interface RawRow {
  Articulo: string;
  "Exist. Total Empresa": number;
  [key: string]: any;
}

interface ParsedUpdate {
  articulo: string;
  name: string;
  brand: string;
  thickness: number;
  width: number;
  height: number;
  stock: number;
  isNew: boolean;
}

export default function AdminImportPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  // States for Excel
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedUpdate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // States for Scrapers & Equivalences
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [isGeneratingEquivalences, setIsGeneratingEquivalences] = useState(false);

  // Regex para el formato "MDF FAPLAC (1830X2750) NATURE TEKA ARTICO 18MM"
  const ARTICULO_REGEX = /^(?<material>.*?)\s*(?<brand>FAPLAC|EGGER)?\s*\((?<width>\d+)X(?<height>\d+)\)\s*(?<name>.*?)\s*(?<thickness>\d+(?:\.\d+)?)MM(?:\s*\(DISC\.\))?$/i;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processExcel(selectedFile);
    }
  };

  const processExcel = async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<RawRow>(worksheet);

      const updates: ParsedUpdate[] = [];

      for (const row of json) {
        if (!row.Articulo) continue;

        const match = row.Articulo.match(ARTICULO_REGEX);
        const stock = Number(row["Exist. Total Empresa"]) || 0;

        if (match && match.groups) {
          updates.push({
            articulo: row.Articulo,
            name: match.groups.name.trim(),
            brand: match.groups.brand || "Desconocida",
            width: Number(match.groups.width),
            height: Number(match.groups.height),
            thickness: Number(match.groups.thickness),
            stock: stock,
            isNew: false 
          });
        }
      }

      setParsedData(updates);
      toast({ title: "Excel Procesado", description: `Se encontraron ${updates.length} artículos válidos.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo leer el archivo Excel.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncExcel = async () => {
    setIsUploading(true);
    try {
      const res = await fetch("/api/admin/import-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: parsedData })
      });

      const result = await res.json();
      if (result.success) {
        toast({ 
          title: "Sincronización Exitosa", 
          description: `Se actualizaron ${result.updated} productos y se crearon ${result.created} nuevos.`,
        });
        router.push("/admin/panels");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({ title: "Error de Sincronización", description: "Ocurrió un error al guardar en Firestore.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLaunchScrapers = async () => {
    setIsSyncingCatalog(true);
    toast({ title: "Sincronización Iniciada", description: "Se están ejecutando los scrapers de Faplac y Egger..." });
    try {
      const result = await startIndustrialImport();
      if (result.success) {
        toast({ 
          title: "Sincronización de Catálogo Finalizada", 
          description: `Se procesaron ${result.count} productos exitosamente.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error en Scrapers", description: error.message, variant: "destructive" });
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const handleGenerateEquivalences = async () => {
    setIsGeneratingEquivalences(true);
    toast({ title: "Generación Iniciada", description: "Recomputando equivalencias universales..." });
    try {
      const res = await fetch("/api/equivalences");
      const result = await res.json();
      if (result.success) {
        toast({ 
          title: "Equivalencias Listas", 
          description: `Se generaron ${result.total} registros de comparación.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error en Equivalencias", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingEquivalences(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} size="icon">
          <ChevronLeft />
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-slate-900">Centro de Importación</h1>
          <p className="text-muted-foreground font-medium italic">Gestión de catálogo, equivalencias y existencias.</p>
        </div>
      </div>

      <Tabs defaultValue="sync" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="sync" className="gap-2">
            <Zap className="h-4 w-4" /> Sincronización
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Stock Excel
          </TabsTrigger>
        </TabsList>

        {/* TAB: SINCRONIZACION AUTOMATICA */}
        <TabsContent value="sync" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm overflow-hidden group">
              <CardHeader className="bg-slate-50/50 pb-8">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Bot className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-indigo-100/50 text-indigo-700 border-none">Scrapers v2.0</Badge>
                </div>
                <CardTitle className="text-xl">Sincronización de Catálogo</CardTitle>
                <CardDescription>Extrae automáticamente nuevos productos y acabados de Faplac y Egger.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Detección de nuevos diseños
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Descarga de imágenes HD
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Actualización de especificaciones
                  </li>
                </ul>
                <Button 
                  onClick={handleLaunchScrapers} 
                  disabled={isSyncingCatalog}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 text-md font-bold"
                >
                  {isSyncingCatalog ? (
                    <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando Pipelines... </>
                  ) : (
                    <> <RefreshCw className="mr-2 h-5 w-5" /> Lanzar Sincronización </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden group">
              <CardHeader className="bg-slate-50/50 pb-8">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Layers className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="bg-amber-100/50 text-amber-700 border-none">Motor Perceptual</Badge>
                </div>
                <CardTitle className="text-xl">Generación de Equivalencias</CardTitle>
                <CardDescription>Calcula comparativas visuales entre todos los paneles del sistema.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Comparación Universal (Cross-Brand)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Cálculo CIELAB Delta E 76
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Penalizaciones por textura y veta
                  </li>
                </ul>
                <Button 
                  onClick={handleGenerateEquivalences} 
                  disabled={isGeneratingEquivalences}
                  variant="outline"
                  className="w-full h-12 border-amber-200 hover:bg-amber-50 text-amber-700 text-md font-bold"
                >
                  {isGeneratingEquivalences ? (
                    <> <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analizando Muestras... </>
                  ) : (
                    <> <Sparkles className="mr-2 h-5 w-5" /> Recomputar Equivalencias </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: STOCK EXCEL */}
        <TabsContent value="stock" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Dropzone */}
            <Card className="lg:col-span-1 border-dashed border-2 bg-slate-50/50">
              <CardHeader>
                <CardTitle className="text-lg">Subir Archivo</CardTitle>
                <CardDescription>Soporta formatos .xlsx y .csv de existencias.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-white transition-all cursor-pointer group"
                  onClick={() => document.getElementById('excel-input')?.click()}
                >
                  <div className="bg-indigo-50 p-4 rounded-full text-indigo-500 group-hover:scale-110 transition-transform mb-4">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Click para seleccionar</p>
                  <p className="text-xs text-slate-400 mt-1">Existencias_Empresa.xlsx</p>
                  <input 
                    id="excel-input" 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </div>

                {file && (
                  <div className="p-4 bg-white rounded-xl border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div className="text-xs">
                        <p className="font-bold text-slate-700 truncate max-w-[150px]">{file.name}</p>
                        <p className="text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setFile(null); setParsedData([]); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview Area */}
            <Card className="lg:col-span-2 shadow-sm border-none bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vista Previa de Datos</CardTitle>
                  <CardDescription>Validación técnica de los campos detectados.</CardDescription>
                </div>
                {parsedData.length > 0 && !isUploading && (
                  <Button 
                    onClick={handleSyncExcel} 
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                    disabled={isProcessing}
                  >
                    <RefreshCw className="h-4 w-4" /> Sincronizar {parsedData.length} ítems
                  </Button>
                )}
                {isUploading && (
                  <Button disabled className="gap-2 bg-indigo-600">
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <p className="text-slate-500 animate-pulse font-medium">Procesando planilla...</p>
                  </div>
                ) : parsedData.length > 0 ? (
                  <ScrollArea className="h-[450px] rounded-md border">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Marca / Medidas</TableHead>
                          <TableHead>Nombre / Diseño</TableHead>
                          <TableHead className="text-center">Espesor</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-[9px] py-0">{item.brand}</Badge>
                                <p className="text-[10px] font-mono text-slate-400">{item.width}x{item.height}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-sm text-slate-800 uppercase tracking-tight">{item.name}</span>
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-600">
                              {item.thickness} <span className="text-[10px] font-normal">mm</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {item.stock} un.
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center gap-4 border-2 border-dashed rounded-2xl bg-slate-50/30">
                    <AlertCircle className="h-12 w-12 text-slate-200" />
                    <div className="max-w-xs">
                      <p className="text-slate-500 font-bold">Sin datos para procesar</p>
                      <p className="text-xs text-slate-400">Sube un archivo Excel para ver la vista previa de los productos y sus existencias.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
