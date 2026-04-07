
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
import { Panel, ColorParent, ColorSub, SurfaceTexture, Finish } from "@/lib/types";
import { 
  Sparkles, 
  Loader2, 
  Save, 
  X, 
  Image as ImageIcon, 
  Upload 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useStorage } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useRouter } from "next/navigation";
import { converter } from "culori";
import { COLOR_PARENTS_LAB, SUB_LEVELS } from "@/lib/equivalences/classifier";

const toLab = converter('lab');

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
  mainImage: z.string().min(1, "La imagen principal es requerida"),
  colorParent: z.string(),
  colorSub: z.string(),
  surfaceTexture: z.string(),
  finish: z.string(),
  antiFingerprint: z.boolean().default(false),
  code: z.string().optional(),
  ncs: z.string().optional(),
  launchYear: z.coerce.number().optional(),
  hexColor: z.string().optional(),
  labColor: z.object({
    l: z.number(),
    a: z.number(),
    b: z.number(),
  }).optional(),
});

type FormValues = z.infer<typeof panelSchema>;

interface Props {
  mode: 'create' | 'edit';
  initialData?: Panel;
  collectionName?: string;
}

export function PanelForm({ mode, initialData, collectionName = 'panels' }: Props) {
  const { toast } = useToast();
  const db = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(panelSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      brand: initialData.brand,
      width: initialData.width,
      height: initialData.height,
      thickness: initialData.thickness,
      hasGrain: initialData.hasGrain,
      description: initialData.description || "",
      stock: initialData.stock,
      visible: initialData.visible,
      mainImage: initialData.mainImage,
      colorParent: initialData.colorParent || "otro",
      colorSub: initialData.colorSub || "medio claro",
      surfaceTexture: initialData.surfaceTexture || "liso",
      finish: initialData.finish || "mate",
      antiFingerprint: initialData.antiFingerprint || false,
      code: initialData.code || "",
      ncs: initialData.ncs || "",
      launchYear: initialData.launchYear,
      hexColor: initialData.hexColor,
      labColor: initialData.labColor,
    } : {
      name: "",
      brand: "Faplac",
      width: 1830,
      height: 2750,
      thickness: 18,
      hasGrain: false,
      description: "",
      stock: 0,
      visible: true,
      mainImage: "https://placehold.co/800x600?text=Subir+Imagen",
      colorParent: "otro",
      colorSub: "medio claro",
      surfaceTexture: "liso",
      finish: "mate",
      antiFingerprint: false,
      code: "",
      ncs: "",
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && storage) {
      setIsUploadingImage(true);
      try {
        const fileName = `${Date.now()}-${file.name}`;
        const storageRef = ref(storage, `catalog/${fileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        form.setValue("mainImage", downloadURL);
        
        // Auto-extract color from API
        const response = await fetch('/api/extract-colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: downloadURL })
        });
        const result = await response.json();
        if (result.success) {
          form.setValue("hexColor", result.hex);
          form.setValue("labColor", result.lab);
          toast({ title: "Imagen y Color vinculados", description: `Color detectado: ${result.hex}` });
        }
      } catch (error) {
        toast({ title: "Error", description: "Fallo al subir imagen.", variant: "destructive" });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const docId = initialData?.id || `${values.brand.toLowerCase()}-${values.name.toLowerCase().replace(/\s+/g, '-')}`;
      const docRef = doc(db, collectionName, docId);

      const panelData = {
        ...values,
        id: docId,
        updatedAt: serverTimestamp(),
        createdAt: initialData?.createdAt || serverTimestamp(),
      };

      await setDoc(docRef, panelData, { merge: true });
      toast({ title: "Panel Guardado", description: "Los cambios se han persistido en el catálogo." });
      router.push('/admin/panels');
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: collectionName,
        operation: mode === 'create' ? 'create' : 'update',
        requestResourceData: values
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Identidad */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identidad del Producto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Comercial</FormLabel>
                        <FormControl><Input placeholder="Ej: Roble Hamilton" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Egger">Egger</SelectItem>
                            <SelectItem value="Faplac">Faplac</SelectItem>
                            <SelectItem value="Arauco">Arauco</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Fabricante</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock (Unidades)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="visible"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-center gap-2">
                        <FormLabel>Visible en Web</FormLabel>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clasificación de Diseño (IA & Manual)</CardTitle>
                <CardDescription>Estos valores definen la compatibilidad en el motor de búsqueda.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="colorParent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Familia Cromática (Padre)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {COLOR_PARENTS_LAB.map(p => (
                              <SelectItem key={p.name} value={p.name}>{p.name.toUpperCase()}</SelectItem>
                            ))}
                            <SelectItem value="otro">OTRO</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="colorSub"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tono / Luminosidad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {SUB_LEVELS.map(s => (
                              <SelectItem key={s.name} value={s.name}>{s.name.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="surfaceTexture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Material</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="liso">LISO / UNICOLOR</SelectItem>
                            <SelectItem value="madera">MADERA (VETA)</SelectItem>
                            <SelectItem value="concreto">CONCRETO / PIEDRA</SelectItem>
                            <SelectItem value="textil">TEXTIL / TRAMA</SelectItem>
                            <SelectItem value="metal">METAL / ACERO</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="finish"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acabado Táctil</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="mate">MATE</SelectItem>
                            <SelectItem value="brillo">BRILLO / GLOSS</SelectItem>
                            <SelectItem value="satinado">SATINADO</SelectItem>
                            <SelectItem value="texturado">TEXTURADO</SelectItem>
                            <SelectItem value="soft">SOFT / SEDOSO</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <FormField
                    control={form.control}
                    name="hasGrain"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-bold">TIENE VETA</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="antiFingerprint"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-bold">ANTI-HUELLA</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Multimedia y Técnicos */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Imagen Principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square relative rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner bg-slate-50 flex items-center justify-center">
                  <img src={form.getValues("mainImage")} className="object-cover w-full h-full" alt="Preview" />
                  {isUploadingImage && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => document.getElementById('image-upload')?.click()}>
                    <Upload className="h-4 w-4" /> Subir
                  </Button>
                  <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                <FormField
                  control={form.control}
                  name="mainImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl><Input placeholder="URL externa..." {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medidas (mm)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name="width" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Ancho</FormLabel>
                    <FormControl><Input type="number" className="w-24 h-8" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="height" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Alto</FormLabel>
                    <FormControl><Input type="number" className="w-24 h-8" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="thickness" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Espesor</FormLabel>
                    <FormControl><Input type="number" className="w-24 h-8" {...field} /></FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-4 shadow-2xl z-50">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" size="lg" className="px-12 font-bold" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
            GUARDAR PANEL
          </Button>
        </div>
      </form>
    </Form>
  );
}
