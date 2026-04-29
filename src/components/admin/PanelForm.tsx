"use client"

import { useState, useEffect } from "react";
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
  Loader2, 
  Save, 
  Upload,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useStorage } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useRouter } from "next/navigation";
import { COLOR_PARENTS_LAB, SUB_LEVELS } from "@/lib/equivalences/classifier";

// ENUMS ACTUALIZADOS (v6.6)
const COLOR_PARENTS = ['blanco', 'beige', 'gris', 'negro', 'marron', 'rojo', 'verde', 'azul', 'amarillo', 'naranja', 'rosa', 'violeta', 'otro'] as const;
const COLOR_SUBS = ['muy claro', 'claro', 'medio claro', 'medio oscuro', 'oscuro', 'muy oscuro'] as const;
const TEXTURES = ['liso', 'madera', 'textil', 'cementicio', 'piedra', 'metal', 'otro'] as const;
const FINISHES = ['mate', 'brillo', 'satinado', 'texturado', 'supermate'] as const;

// MAPEO DE LEGACY A NORMALIZADO
const LEGACY_MAP: Record<string, string> = {
  'bark': 'madera',
  'nature': 'madera',
  'nórdico': 'madera',
  'nordico': 'madera',
  'wood': 'madera',
  'textura': 'textil',
  'hilado': 'textil',
  'linen': 'textil',
  'soft': 'mate',
  'perfectmatt': 'supermate'
};

const panelSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  brand: z.string().min(1, "Marca requerida"),
  width: z.coerce.number().min(0),
  height: z.coerce.number().min(0),
  thickness: z.coerce.number().min(0),
  hasGrain: z.boolean(),
  description: z.string().optional().nullable(),
  stock: z.coerce.number().min(0),
  visible: z.boolean(),
  mainImage: z.string().min(1, "La imagen principal es requerida"),
  colorParent: z.enum(COLOR_PARENTS as any).default("otro"),
  colorSub: z.enum(COLOR_SUBS as any).default("medio claro"),
  surfaceTexture: z.enum(TEXTURES as any).default("liso"),
  finish: z.enum(FINISHES as any).default("mate"),
  antiFingerprint: z.boolean().default(false),
  code: z.string().optional().nullable(),
  ncs: z.string().optional().nullable(),
  launchYear: z.coerce.number().optional().nullable(),
  hexColor: z.string().optional().nullable(),
  labColor: z.object({
    l: z.number(),
    a: z.number(),
    b: z.number(),
  }).optional().nullable(),
  colorSource: z.enum(['ncs', 'analytical_v6.1', 'image', 'fallback']).default('fallback')
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

  // Normalizar datos iniciales si vienen de legacy
  const normalizedInitial = initialData ? {
    ...initialData,
    colorParent: (initialData.colorParent?.toLowerCase() || 'otro') as any,
    colorSub: (initialData.colorSub?.toLowerCase() || 'medio claro') as any,
    surfaceTexture: (LEGACY_MAP[initialData.surfaceTexture?.toLowerCase()] || initialData.surfaceTexture?.toLowerCase() || 'liso') as any,
    finish: (LEGACY_MAP[initialData.finish?.toLowerCase()] || initialData.finish?.toLowerCase() || 'mate') as any,
  } : undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(panelSchema),
    defaultValues: {
      name: normalizedInitial?.name || "",
      brand: normalizedInitial?.brand || "Faplac",
      width: normalizedInitial?.width || 1830,
      height: normalizedInitial?.height || 2750,
      thickness: normalizedInitial?.thickness || 18,
      hasGrain: normalizedInitial?.hasGrain ?? false,
      description: normalizedInitial?.description || "",
      stock: normalizedInitial?.stock || 0,
      visible: normalizedInitial?.visible ?? true,
      mainImage: normalizedInitial?.mainImage || "https://placehold.co/800x600?text=Subir+Imagen",
      colorParent: normalizedInitial?.colorParent || "otro",
      colorSub: normalizedInitial?.colorSub || "medio claro",
      surfaceTexture: normalizedInitial?.surfaceTexture || "liso",
      finish: normalizedInitial?.finish || "mate",
      antiFingerprint: normalizedInitial?.antiFingerprint || false,
      code: normalizedInitial?.code || "",
      ncs: normalizedInitial?.ncs || "",
      launchYear: normalizedInitial?.launchYear || 2024,
      hexColor: normalizedInitial?.hexColor || null,
      labColor: normalizedInitial?.labColor || null,
      colorSource: normalizedInitial?.colorSource || 'fallback'
    },
  });

  // FASE 3.6 — VALIDACIONES Dinámicas
  const watchTexture = form.watch("surfaceTexture");
  const watchHasGrain = form.watch("hasGrain");
  const watchFinish = form.watch("finish");

  useEffect(() => {
    if (watchTexture === 'madera' && !watchHasGrain) {
      // Warning o sugerencia automática
      console.warn("Sugerencia: Un panel de madera suele tener veta activa.");
    }
  }, [watchTexture, watchHasGrain]);

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
        form.setValue("colorSource", "image");
        
        const response = await fetch('/api/extract-colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: downloadURL })
        });
        const result = await response.json();
        if (result.success) {
          form.setValue("hexColor", result.hex);
          form.setValue("labColor", result.lab);
          toast({ title: "Color vinculado", description: `Detectado: ${result.hex}` });
        }
      } catch (error) {
        toast({ title: "Error", description: "Fallo al subir imagen.", variant: "destructive" });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const onSubmit = (values: FormValues) => {
    if (!db) return;
    
    // FASE 3.1.2 — Validaciones de integridad antes de guardar
    if (values.surfaceTexture === 'madera' && !values.hasGrain) {
      if (!confirm("Has marcado Madera pero SIN veta. ¿Es correcto?")) return;
    }
    if (values.surfaceTexture === 'metal' && values.hasGrain) {
      toast({ title: "Error de consistencia", description: "Un metal no puede tener veta de madera.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const docId = initialData?.id || `${values.brand.toLowerCase()}-${values.name.toLowerCase().replace(/\s+/g, '-')}`;
    const docRef = doc(db, collectionName, docId);

    const panelData = {
      ...values,
      id: docId,
      updatedAt: serverTimestamp(),
      createdAt: initialData?.createdAt || serverTimestamp(),
    };

    setDoc(docRef, panelData, { merge: true })
      .then(() => {
        toast({ title: "Panel Guardado", description: "Los cambios se han persistido con éxito." });
        router.push('/admin/panels');
        router.refresh();
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: mode === 'create' ? 'create' : 'update',
          requestResourceData: values
        }));
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const onInvalid = (errors: any) => {
    console.error("Fallo de validación:", errors);
    toast({
      title: "Revisa el formulario",
      description: "Hay campos obligatorios con valores no permitidos.",
      variant: "destructive"
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-indigo-100 shadow-sm">
              <CardHeader className="bg-indigo-50/30 rounded-t-xl">
                <CardTitle className="text-indigo-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                  Identidad del Producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
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
                        <FormMessage />
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
                        <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
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
                        <FormMessage />
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

            <Card className="border-slate-100">
              <CardHeader className="bg-slate-50/50">
                <CardTitle className="text-slate-800">Atributos Normalizados (Motor v6.6)</CardTitle>
                <CardDescription>Estos campos definen el ranking de equivalencias.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="colorParent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Familia Cromática</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {COLOR_PARENTS.map(p => (
                              <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                            {COLOR_SUBS.map(s => (
                              <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                        <FormLabel>Tipo de Material (Capa A)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="liso">LISO / UNICOLOR</SelectItem>
                            <SelectItem value="madera">MADERA (VETA)</SelectItem>
                            <SelectItem value="cementicio">CEMENTO / PIEDRA</SelectItem>
                            <SelectItem value="textil">TEXTIL / TRAMA</SelectItem>
                            <SelectItem value="metal">METAL / ACERO</SelectItem>
                            <SelectItem value="otro">OTRO (GENERAL)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                            <SelectItem value="supermate">SUPERMATE / PM</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-8 p-4 bg-slate-50 rounded-xl border border-slate-100 items-center justify-between">
                  <div className="flex gap-8">
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
                  
                  {watchTexture === 'madera' && !watchHasGrain && (
                    <div className="flex items-center gap-2 text-amber-600 animate-pulse">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase">Madera sin veta: ¿Estás seguro?</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Imagen y Fuente</CardTitle>
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
                  name="colorSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origen del Dato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="ncs">Carta NCS (Altísima Confianza)</SelectItem>
                          <SelectItem value="image">Extracción de Imagen (Manual)</SelectItem>
                          <SelectItem value="analytical_v6.1">Análisis IA (Estimado)</SelectItem>
                          <SelectItem value="fallback">Sin origen claro (Baja)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dimensiones Industriales</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm font-medium">
                <FormField control={form.control} name="width" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Ancho (mm)</FormLabel>
                    <FormControl><Input type="number" className="w-24 h-8" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="height" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Alto (mm)</FormLabel>
                    <FormControl><Input type="number" className="w-24 h-8" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="thickness" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Espesor (mm)</FormLabel>
                    <FormControl><Input type="number" className="w-24 h-8" {...field} /></FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end gap-4 shadow-2xl z-50">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" size="lg" className="px-12 font-bold shadow-indigo-100 shadow-xl" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
            {mode === 'create' ? 'CREAR PRODUCTO' : 'GUARDAR CAMBIOS'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
