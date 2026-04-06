"use client";

import React, { useState } from 'react';
import Kitchen3D from '@/components/customizer/Kitchen3D';
import PanelSelector from '@/components/customizer/PanelSelector';
import { Panel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProjectService } from '@/lib/projects/ProjectService';
import { Navbar } from '@/components/Navbar';
import { Save, Sparkles, LayoutPanelLeft, Share2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function CustomizerPage() {
  const [upperPanel, setUpperPanel] = useState<Panel | null>(null);
  const [lowerPanel, setLowerPanel] = useState<Panel | null>(null);
  const [projectName, setProjectName] = useState('Mi Cocina Nueva');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!upperPanel || !lowerPanel) {
      toast({
        title: "Selección incompleta",
        description: "Por favor selecciona ambos materiales antes de guardar.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const id = await ProjectService.saveProject(projectName, upperPanel, lowerPanel);
      toast({
        title: "Proyecto guardado",
        description: `Tu cocina "${projectName}" ha sido guardada con éxito (ID: ${id}).`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al guardar",
        description: "No pudimos conectar con la base de datos.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LADO IZQUIERDO: Visualizador 3D (Ocupa 7/12) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative group">
              <Kitchen3D 
                upperPanelUrl={upperPanel?.mainImage || ""} 
                lowerPanelUrl={lowerPanel?.mainImage || ""} 
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button size="sm" variant="secondary" className="bg-background/80 backdrop-blur shadow-lg">
                  <Sparkles className="h-4 w-4 mr-2 text-primary" /> Calidad HD
                </Button>
              </div>
            </div>

            <Card className="bg-muted/30 border-none shadow-none">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h2 className="text-xl font-headline font-bold">Resumen de Materiales</h2>
                    <p className="text-sm text-muted-foreground italic">Haz clic en los selectores para cambiar la estética.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="default" className="rounded-full px-6 gap-2" onClick={handleSave} disabled={isSaving}>
                      <Save className="h-4 w-4" /> {isSaving ? 'Guardando...' : 'Guardar Proyecto'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LADO DERECHO: Controles (Ocupa 5/12) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-border/40 shadow-xl shadow-primary/5">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <LayoutPanelLeft className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-headline">Configuración</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre del Proyecto</label>
                  <Input 
                    placeholder="Ej. Cocina Minimalista" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-muted/50 border-none focus-visible:ring-1"
                  />
                </div>

                <div className="space-y-6 border-t pt-6">
                  <PanelSelector 
                    label="Gabinetes Superiores" 
                    selectedPanel={upperPanel}
                    onSelect={setUpperPanel}
                    zone="upper"
                  />
                  
                  <PanelSelector 
                    label="Gabinetes Inferiores" 
                    selectedPanel={lowerPanel}
                    onSelect={setLowerPanel}
                    zone="lower"
                  />
                </div>

                <div className="pt-4">
                  <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 text-xs text-muted-foreground space-y-3">
                    <p className="font-bold flex items-center gap-2">
                      💡 Tip Profesional
                    </p>
                    <p>
                      Para un diseño moderno, intenta combinar una **madera cálida** (ej. Paraíso) en los bajos con un **tono liso neutro** (ej. Blanco o Gris) en los altos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
