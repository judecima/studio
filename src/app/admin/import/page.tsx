"use client"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, FileUp } from "lucide-react";
import { autocompletePanelDetails } from "@/ai/flows/admin-panel-autocompletion";
import { useToast } from "@/hooks/use-toast";

export default function BulkImportPage() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ name: string; status: 'pending' | 'success' | 'error'; data?: any }[]>([]);

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
        <h1 className="text-3xl font-headline font-bold">Importación Masiva</h1>
        <p className="text-muted-foreground">Pega una lista de nombres de tableros y deja que la IA haga el resto.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" /> Entrada de Datos
            </CardTitle>
            <CardDescription>
              Un nombre por línea (ej: Egger Roble Halifax, Faplac Lino Chiaro).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Egger H1180 ST37&#10;Faplac Tuareg&#10;Masisa Nogal Habano..." 
              className="min-h-[300px] font-mono text-sm"
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
              Procesar con IA
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultados del Procesamiento</CardTitle>
            <CardDescription>Visualiza cómo la IA identifica y categoriza cada ítem.</CardDescription>
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

            <div className="space-y-3 max-h-[450px] overflow-auto pr-2">
              {results.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                  Esperando datos para procesar...
                </div>
              ) : (
                results.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.data && (
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[10px] h-4">{item.data.brand}</Badge>
                          <Badge variant="secondary" className="text-[10px] h-4">{item.data.colorGroup}</Badge>
                          <Badge variant="secondary" className="text-[10px] h-4">{item.data.colorHue}</Badge>
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
              <Button className="w-full variant-outline" variant="outline">
                Guardar todo en el Catálogo
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
