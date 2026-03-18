
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Panel, ColorGroup } from "@/lib/types";
import { Sparkles, Loader2, Save, X } from "lucide-react";
import { autocompletePanelDetails } from "@/ai/flows/admin-panel-autocompletion";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useRouter } from "next/navigation";

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
  colorGroup: z.enum(['claro', 'medio', 'oscuro']),
  colorHue: z.string(),
  styleTags: z.array(z.string()).default([]),
  useCases: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof panelSchema>;

interface Props {
  mode: 'create' | 'edit';
  initialData?: Panel;
}

export function PanelForm({ mode, initialData }: Props) {
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      colorGroup: initialData.colorGroup,
      colorHue: initialData.colorHue,
      styleTags: initialData.styleTags,
      useCases: initialData.useCases,
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
      colorGroup: 'medio',
      colorHue: 'otros',
      styleTags: [],
      useCases: [],
    },
  });

  const handleAutocomplete = async () => {
    const name = form.getValues("name");
    if (!name) {
      toast({ title: "Error", description: "Ingresa un nombre primero.", variant: "destructive" });
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
        if (result.colorGroup) form.setValue("colorGroup", result.colorGroup as ColorGroup);
        if (result.colorHue) form.setValue("colorHue", result.colorHue);
        if (result.styleTags) form.setValue("styleTags", result.styleTags);
        if (result.useCases) form.setValue("useCases", result.useCases);
        
        toast({ title: "¡IA Activa!", description: "Información técnica y de diseño autocompletada." });
      }
    } catch (error) {
      toast({ title: "Error de IA", description: "No se encontró el producto exacto.", variant: "destructive" });
    } finally {
      setIsAutocompleting(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      const docId = initialData?.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const docRef = doc(db, 'panels', docId);

      const panelToSave = {
        ...data,
        id: docId, // Obligatorio para reglas de seguridad
        updatedAt: serverTimestamp(),
        createdAt: initialData?.createdAt || serverTimestamp(),
      };

      await setDoc(docRef, panelToSave, { merge: true });
      
      toast({ title: "Guardado", description: "El catálogo ha sido actualizado correctamente." });
      router.push('/admin/panels');
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: `panels/${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        operation: mode === 'create' ? 'create' : 'update',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Detalles Técnicos</CardTitle>
              <CardDescription>Datos base para el motor de recomendaciones.</CardDescription>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAutocomplete}
              disabled={isAutocompleting}
              className="gap-2 border-primary text-primary"
            >
              {isAutocompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Autocompletar con IA
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Comercial</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="colorGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo de Color</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="claro">Claro</SelectItem>
                        <SelectItem value="medio">Medio</SelectItem>
                        <SelectItem value="oscuro">Oscuro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="colorHue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tonalidad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="blanco">Blanco</SelectItem>
                        <SelectItem value="gris">Gris</SelectItem>
                        <SelectItem value="madera clara">Madera Clara</SelectItem>
                        <SelectItem value="madera oscura">Madera Oscura</SelectItem>
                        <SelectItem value="negro">Negro</SelectItem>
                        <SelectItem value="otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <FormField
                control={form.control}
                name="hasGrain"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 border rounded-lg p-3">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel>Vetas</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visible"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 border rounded-lg p-3">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel>Público</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de Diseño</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorización de Motor</CardTitle>
            <CardDescription>Etiquetas para el cálculo de combinaciones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <FormField
                control={form.control}
                name="styleTags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estilos</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.value.map(tag => (
                        <Badge key={tag} className="gap-1">
                          {tag} <X className="h-3 w-3 cursor-pointer" onClick={() => field.onChange(field.value.filter(t => t !== tag))} />
                        </Badge>
                      ))}
                    </div>
                    <FormControl>
                      <Input placeholder="Presiona Enter para añadir estilos..." onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val && !field.value.includes(val)) {
                            field.onChange([...field.value, val]);
                            e.currentTarget.value = '';
                          }
                        }
                      }} />
                    </FormControl>
                  </FormItem>
                )}
              />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="gap-2 px-10 h-14 text-lg font-bold" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Guardar Producto
          </Button>
        </div>
      </form>
    </Form>
  );
}
