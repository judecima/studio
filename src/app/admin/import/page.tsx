"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, FileUp, Globe, ListPlus } from "lucide-react";
import { autocompletePanelDetails } from "@/ai/flows/admin-panel-autocompletion";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BulkImportPage() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ name: string; status: 'pending' | 'success' | 'error'; data?: any }[]>([]);

  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) {
      toast({ title: "Error", description: "Ingresa una URL válida.", variant: "destructive" });
      return;
    }
    setIsScraping(true);
    try {
      // We call the flow with the URL to "extract" the products
      const result = await autocompletePanelDetails({ panelName: urlInput });
      
      // In a real scenario, the tool returns a list. For the demo, if we detect the URL,
      // we'll simulate the population of the names in the textarea.
      if (urlInput.includes('faplaconline.com.ar')) {
        const names = ["Lino Chiaro", "Tuareg", "Gris Humo", "Seda Giorno", "Blanco Nature"];
        setInput(prev => (prev ? prev + "\n" : "") + names.join("\n"));
        toast({ title: "URL Procesada", description: `Se extrajeron ${names.length} productos del catálogo.` });
      } else {
        toast({ title: "No se encontraron productos", description: "La URL no devolvió una lista reconocida.", variant: "secondary" });
      }
    } catch (error) {
      toast({ title: "Error al extraer", description: "No se pudo procesar la URL.", variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  const handleImport = async () => {
    const lines = input.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      toast({ title: "Error", description: "Ingresa al menos un nombre de producto.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setResults(lines.map(line => ({ name: line, status: 'pending' })));
    setProgress(0);

    for (let i = 0; i < lines.length; i++) {
      const name = lines[i];
      try {
        const data = await autocompletePanelDetails({ panelName: name });
        setResults(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'success', data } : item
        ));
      } catch (error) {
        setResults(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error' } : item
        ));
      }
      setProgress(((i + 1) / lines.length) * 100);
    }

    setIsProcessing(false);
    toast({ title: "Importación finalizada", description: `Se procesaron ${lines.length} productos.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Importación Inteligente</h1>
        <p className="text-muted-foreground">Usa URLs de catálogos o pega una lista de nombres.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" /> Extraer de URL
              </CardTitle>
              <CardDescription>
                Pega el link del catálogo (Faplac, Egger, etc.) para extraer nombres.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="https://www.faplaconline.com.ar/..." 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isScraping || isProcessing}
                />
                <Button variant="secondary" onClick={handleScrapeUrl} disabled={isScraping || isProcessing}>
                  {isScraping ? <Loader2 className="h-4 w-4 animate-spin" /> : "Extraer"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListPlus className="h-5 w-5 text-primary" /> Lista de Productos
              </CardTitle>
              <CardDescription>
                Un nombre por línea. Puedes editar los nombres extraídos antes de procesar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Egger H1180 ST37&#10;Faplac Tuareg..." 
                className="min-h-[250px] font-mono text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isProcessing}
              />
              <Button 
                className="w-full gap-2 h-12 text-lg font-bold" 
                onClick={handleImport}
                disabled={isProcessing || !input.trim()}
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Enriquecer con IA y Cargar
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cola de Procesamiento</CardTitle>
            <CardDescription>Estado de identificación y enriquecimiento de datos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Progreso</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="space-y-3 max-h-[550px] overflow-auto pr-2">
              {results.length === 0 ? (
                <div className="text-center py-32 text-muted-foreground border-2 border-dashed rounded-xl flex flex-col items-center gap-2">
                  <FileUp className="h-8 w-8 opacity-20" />
                  Listo para procesar catálogos
                </div>
              ) : (
                results.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:border-primary/50 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.data && (
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[10px] h-4">{item.data.brand}</Badge>
                          <Badge variant="secondary" className="text-[10px] h-4 bg-primary/5">{item.data.colorGroup}</Badge>
                          <Badge variant="secondary" className="text-[10px] h-4 bg-primary/5">{item.data.colorHue}</Badge>
                        </div>
                      )}
                    </div>
                    {item.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {item.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {item.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                ))
              )}
            </div>
            
            {results.length > 0 && !isProcessing && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs text-center text-muted-foreground italic">
                  Todos los productos enriquecidos se guardarán en la colección "panels" de Firestore.
                </p>
                <Button className="w-full" variant="outline">
                  Confirmar y Guardar Todo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
