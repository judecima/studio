
"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Panel } from "@/lib/types";
import { Sparkles, Loader2, Save, ImagePlus, X } from "lucide-react";
import { autocompletePanelDetails } from "@/ai/flows/admin-panel-autocompletion";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

const panelSchema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres"),
  brand: z.string().min(1, "Marca requerida"),
  width: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  thickness: z.coerce.number().positive(),
  hasGrain: z.boolean(),
  description: z.string().optional(),
  stock: z.coerce.number().min(0),
  visible: z.boolean(),
  mainImage: z.string().url("URL de imagen principal inválida"),
  images: z.array(z.string().url()).default([]),
});

type FormValues = z.infer<typeof panelSchema>;

interface Props {
  mode: 'create' | 'edit';
  initialData?: Panel;
}

export function PanelForm({ mode, initialData }: Props) {
  const { toast } = useToast();
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  const form = useForm<FormValues>({
    resolver: zodResolver(panelSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      brand: initialData.brand,
      width: initialData.width,
      height: initialData.height,
      thickness: initialData.thickness,
      hasGrain: initialData.hasGrain,
      description: initialData.description,
      stock: initialData.stock,
      visible: initialData.visible,
      mainImage: initialData.mainImage,
      images: initialData.images,
    } : {
      name: "",
      brand: "",
      width: 0,
      height: 0,
      thickness: 0,
      hasGrain: false,
      description: "",
      stock: 0,
      visible: true,
      mainImage: "https://picsum.photos/seed/default/800/600",
      images: [],
    },
  });

  const handleAutocomplete = async () => {
    const name = form.getValues("name");
    if (!name) {
      toast({
        title: "Error",
        description: "Ingresa un nombre primero para buscar información.",
        variant: "destructive"
      });
      return;
    }

    setIsAutocompleting(true);
    try {
      const result = await autocompletePanelDetails({ panelName: name });
      
      if (result) {
        if (result.name) form.setValue("name", result.name);
        if (result.brand) form.setValue("brand", result.brand);
        if (result.width) form.setValue("width", result.width);
        if (result.height) form.setValue("height", result.height);
        if (result.thickness) form.setValue("thickness", result.thickness);
        if (result.hasGrain !== undefined) form.setValue("hasGrain", result.hasGrain);
        if (result.description) form.setValue("description", result.description);
        if (result.mainImage) form.setValue("mainImage", result.mainImage);
        if (result.images) {
          setImages(result.images);
          form.setValue("images", result.images);
        }

        toast({
          title: "¡Éxito!",
          description: "Información autocompletada con éxito.",
        });
      }
    } catch (error) {
      toast({
        title: "Error de Autocompletado",
        description: "No se pudo encontrar información detallada. Por favor, ingresa los datos manualmente.",
        variant: "destructive"
      });
    } finally {
      setIsAutocompleting(false);
    }
  };

  const onSubmit = (data: FormValues) => {
    console.log("Submitting:", data);
    toast({
      title: "Guardado",
      description: `Panel ${mode === 'create' ? 'creado' : 'actualizado'} correctamente.`,
    });
  };

  const addImageField = () => {
    const url = prompt("Ingresa la URL de la imagen:");
    if (url && url.startsWith("http")) {
      const newImages = [...images, url];
      setImages(newImages);
      form.setValue("images", newImages);
    }
  };

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    form.setValue("images", next);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Información del Producto</CardTitle>
                <CardDescription>Detalles básicos y técnicos del tablero.</CardDescription>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="gap-2 border-primary text-primary hover:bg-primary/5"
                onClick={handleAutocomplete}
                disabled={isAutocompleting}
              >
                {isAutocompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Autocompletar con IA
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Panel</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Roble Claro Premium 18mm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Arauco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Disponible</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ancho (mm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alto (mm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thickness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Espesor (mm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalles sobre el acabado, usos recomendados, etc." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-8">
              <FormField
                control={form.control}
                name="hasGrain"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 border rounded-lg p-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="flex flex-col">
                      <FormLabel className="font-bold">Posee Vetas</FormLabel>
                      <FormDescription className="text-xs">Indica si tiene diseño de madera.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visible"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 border rounded-lg p-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="flex flex-col">
                      <FormLabel className="font-bold">Visible en Web</FormLabel>
                      <FormDescription className="text-xs">Publicar para clientes.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Multimedia</CardTitle>
            <CardDescription>Gestiona la imagen principal y la galería de fotos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="mainImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Imagen Principal</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <div className="mt-4 relative aspect-[16/9] max-w-md rounded-xl overflow-hidden border bg-muted">
                    {field.value ? (
                      <Image src={field.value} alt="Preview" fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">Sin previsualización</div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label className="block mb-2 font-bold">Galería de Imágenes</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                    <Image src={img} alt={`Gallery ${i}`} fill className="object-cover" />
                    <button 
                      type="button" 
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={addImageField}
                  className="aspect-square flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed hover:bg-accent transition-colors"
                >
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Añadir</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => window.history.back()}>Cancelar</Button>
          <Button type="submit" className="gap-2 px-8 h-12 text-lg font-bold">
            <Save className="h-5 w-5" /> Guardar Panel
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Ensure Label is imported from UI
import { Label } from "@/components/ui/label";
