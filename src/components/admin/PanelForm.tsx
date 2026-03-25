
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
import { 
  Sparkles, 
  Loader2, 
  Save, 
  X, 
  Image as ImageIcon, 
  Upload 
} from "lucide-react";
import { autocompletePanelDetails } from "@/ai/flows/admin-panel-autocompletion";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useRouter } from "next/navigation";
import { ncsToHex, inferColorGroupFromNcs } from "@/lib/constants/colors";
import { converter } from "culori";

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
  mainImage: z.string().url("URL de imagen principal inválida"),
  images: z.array(z.string().url()).default([]),
  colorGroup: z.string(),
  colorHue: z.string(),
  styleTags: z.array(z.string()).default([]),
  useCases: z.array(z.string()).default([]),
  // New technical fields
  code: z.string().optional(),
  ncs: z.string().optional(),
  surfaceTexture: z.string().optional(),
  isSmooth: z.boolean().default(false),
  launchYear: z.coerce.number().optional(),
  antiFingerprint: z.boolean().default(false),
  finish: z.string().optional(),
  applications: z.array(z.string()).default([]),
  // Calculated color fields
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
}

export function PanelForm({ mode, initialData }: Props) {
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

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
      images: initialData.images || [],
      colorGroup: initialData.colorGroup,
      colorHue: initialData.colorHue,
      styleTags: initialData.styleTags || [],
      useCases: initialData.useCases || [],
      code: initialData.code || "",
      ncs: initialData.ncs || "",
      surfaceTexture: initialData.surfaceTexture || "",
      isSmooth: initialData.isSmooth || false,
      launchYear: initialData.launchYear,
      antiFingerprint: initialData.antiFingerprint || false,
      finish: initialData.finish || "",
      applications: initialData.applications || [],
      hexColor: initialData.hexColor,
      labColor: initialData.labColor,
    } : {
      name: "",
      brand: "",
      width: 1830,
      height: 2750,
      thickness: 18,
      hasGrain: false,
      description: "",
      stock: 0,
      visible: true,
      mainImage: "https://picsum.photos/seed/default/800/600",
      images: [],
      colorGroup: "otro",
      colorHue: "otros",
      styleTags: [],
      useCases: [],
      code: "",
      ncs: "",
      surfaceTexture: "",
      isSmooth: false,
      launchYear: undefined,
      antiFingerprint: false,
      finish: "",
      applications: [],
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "Archivo demasiado grande", description: "El límite es 2MB.", variant: "destructive" });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue("mainImage", base64String);
        toast({ title: "Imagen Cargada", description: "Vista previa actualizada correctamente." });
        // Trigger color calculation if NCS is missing
        if (!form.getValues("ncs")) {
          handleCalculateColor(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCalculateColor = async (base64Image?: string) => {
    const ncs = form.getValues("ncs");
    const mainImage = base64Image || form.getValues("mainImage");

    if (ncs) {
      const hex = ncsToHex(ncs);
      if (hex) {
        const lab = toLab(hex);
        if (lab) {
          form.setValue("hexColor", hex);
          form.setValue("labColor", { l: lab.l, a: lab.a, b: lab.b });
          const group = inferColorGroupFromNcs(ncs);
          if (group) form.setValue("colorGroup", group);
          toast({ title: "Color vinculado al NCS", description: `HEX: ${hex} | LAB: ${Math.round(lab.l)}, ${Math.round(lab.a)}, ${Math.round(lab.b)}` });
          return;
        }
      }
    }

    // fallback to image calculation
    if (mainImage) {
      setIsAutocompleting(true);
      try {
        const isBase64 = mainImage.startsWith('data:image');
        const response = await fetch('/api/extract-colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isBase64 ? { base64: mainImage } : { imageUrl: mainImage })
        });
        const result = await response.json();
        if (result.success) {
          form.setValue("hexColor", result.hex);
          form.setValue("labColor", result.lab);
          toast({ title: "Color extraído de la imagen", description: `HEX: ${result.hex}` });
        }
      } catch (e) {
        toast({ title: "Error al extraer color", description: "No se pudo analizar la imagen.", variant: "destructive" });
      } finally {
        setIsAutocompleting(false);
      }
    }
  };

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
        
        if (result.mainImage && isValidUrl(result.mainImage)) {
          form.setValue("mainImage", result.mainImage);
        }
        
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

  const onSubmit = async (data: FormValues, stayOnPage: boolean = false) => {
    setIsSaving(true);
    try {
      // Improved ID generation: Brand + Name + (optional) Code
      const nameSlug = data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^\w-]/g, "");
      const brandSlug = data.brand.toLowerCase().replace(/\s+/g, "-");
      const codeSlug = data.code ? `-${data.code.toLowerCase().replace(/[^\w-]/g, "")}` : "";
      
      const generatedId = `${brandSlug}-${nameSlug}${codeSlug}`;
      const docId = initialData?.id || generatedId;
      const docRef = doc(db, 'panels', docId);

      console.log(`Intentando guardar panel: ${docId}`, data);

      // In create mode, check if ID already exists to avoid unintended overwrites
      if (mode === 'create') {
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          toast({ 
            title: "Error: El panel ya existe", 
            description: `Ya hay un tablero con el ID "${docId}". Cambia el nombre o código faltante.`, 
            variant: "destructive" 
          });
          setIsSaving(false);
          return;
        }
      }

      const panelToSave: any = {
        ...data,
        id: docId,
        updatedAt: serverTimestamp(),
        createdAt: initialData?.createdAt || serverTimestamp(),
      };

      // Firestore doesn't accept undefined values
      Object.keys(panelToSave).forEach(key => {
        if (panelToSave[key] === undefined) {
          delete panelToSave[key];
        }
      });

      await setDoc(docRef, panelToSave, { merge: true });
      
      toast({ title: "Guardado", description: "El catálogo ha sido actualizado correctamente." });
      if (stayOnPage) {
        form.reset();
        toast({ title: "Guardado", description: "El producto ha sido creado. Formulario listo para el siguiente." });
      } else {
        router.refresh();
        router.push('/admin/panels');
      }
    } catch (error: any) {
      console.error("Error al guardar panel:", error);
      toast({ 
        title: "Error al guardar", 
        description: error.message || "Ocurrió un error inesperado al conectar con Firestore.", 
        variant: "destructive" 
      });
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

  const onInvalid = (errors: any) => {
    console.error("Errores de validación:", errors);
    toast({ 
      title: "Formulario incompleto", 
      description: "Por favor, revisa los campos marcados en rojo.", 
      variant: "destructive" 
    });
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit((data) => onSubmit(data, false), onInvalid)(e);
        }} 
        className="space-y-8 pb-20"
      >
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Información del Producto
              </CardTitle>
              <CardDescription>Datos básicos y stock disponible.</CardDescription>
            </div>
            <Button 
                type="button" 
                variant="outline" 
                onClick={handleAutocomplete}
                disabled={isAutocompleting}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5 h-9"
              >
                {isAutocompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Autocompletar con IA
              </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold text-slate-700">Nombre Comercial</FormLabel>
                    <FormControl><Input placeholder="Ej: Roble Hamilton, Blanco Nature..." className="h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Marca</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Seleccionar marca" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Egger">Egger</SelectItem>
                        <SelectItem value="Faplac">Faplac</SelectItem>
                        <SelectItem value="Sadepan">Sadepan</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Código Fabr.</FormLabel>
                    <FormControl><Input placeholder="Ej: H3303, L-201" className="h-10" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ncs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">NCS (Opcional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="Ej: S 2005-Y20R" className="h-10 uppercase" {...field} onBlur={() => field.value && handleCalculateColor()} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Stock Actual</FormLabel>
                    <FormControl><Input type="number" className="h-10" {...field} /></FormControl>
                  </FormItem>
                )}
              />
               <div className="flex items-end pb-1 gap-2">
                 <FormField
                  control={form.control}
                  name="visible"
                  render={({ field }) => (
                    <FormItem className="flex-1 flex items-center justify-between border rounded-lg px-3 h-10 bg-slate-50/50">
                      <FormLabel className="text-xs font-bold text-slate-500 uppercase">Público</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Dimensiones y Logística</CardTitle>
            <CardDescription>Medidas estándar del tablero.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Ancho (mm)</FormLabel>
                    <FormControl><Input type="number" placeholder="1830" className="h-10" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Alto (mm)</FormLabel>
                    <FormControl><Input type="number" placeholder="2750" className="h-10" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thickness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Espesor (mm)</FormLabel>
                    <FormControl><Input type="number" placeholder="18" className="h-10" {...field} /></FormControl>
                  </FormItem>
                )}
              />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Estética y Acabado</CardTitle>
              <CardDescription>Detalles cromáticos y táctiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="colorGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Categoría Color</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="madera">Madera</SelectItem>
                          <SelectItem value="blanco">Blanco</SelectItem>
                          <SelectItem value="gris">Gris</SelectItem>
                          <SelectItem value="beige">Beige</SelectItem>
                          <SelectItem value="negro">Negro</SelectItem>
                          <SelectItem value="merlot">Rojo/Merlot</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
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
                      <FormLabel className="font-bold text-slate-700">Tono (Claro/Dark)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="claro">Claro / Light</SelectItem>
                          <SelectItem value="medio">Medio / Medium</SelectItem>
                          <SelectItem value="oscuro">Oscuro / Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="surfaceTexture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Textura Superficial</FormLabel>
                      <FormControl><Input placeholder="Ej: ST22, Porosa, Seda..." className="h-10" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="finish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Acabado (Mate/Brillo)</FormLabel>
                      <FormControl><Input placeholder="Ej: Extra Mate, Gloss..." className="h-10" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="hasGrain"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 border rounded-lg p-2 flex-1 min-w-[120px]">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="text-xs uppercase font-bold text-slate-500">Tiene Veta</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isSmooth"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 border rounded-lg p-2 flex-1 min-w-[120px]">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="text-xs uppercase font-bold text-slate-500">Acabado Liso</FormLabel>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="antiFingerprint"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 border rounded-lg p-2 flex-1 min-w-[120px]">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="text-xs uppercase font-bold text-slate-500">Anti-huella</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Imágenes y Diseño</CardTitle>
              <CardDescription>Archivo visual y descripción de uso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="mainImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Imagen Principal</FormLabel>
                    <div className="flex gap-4 items-start">
                      <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center text-slate-300 shadow-inner group">
                        {field.value && (isValidUrl(field.value) || field.value?.startsWith('data:image')) ? (
                          <img src={field.value} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <ImageIcon className="h-8 w-8" />
                        )}
                        {field.value && (
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <Button type="button" size="icon" variant="ghost" className="text-white h-8 w-8" onClick={() => handleCalculateColor()}>
                               <Sparkles className="h-4 w-4" />
                             </Button>
                           </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <FormControl><Input placeholder="URL de la imagen..." className="h-10 text-xs" {...field} /></FormControl>
                        <div className="flex items-center gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 h-9 border-slate-200 text-slate-600"
                            onClick={() => document.getElementById('image-upload')?.click()}
                          >
                            <Upload className="h-4 w-4" /> Subir Archivo
                          </Button>
                          <input 
                            id="image-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                          />
                          <p className="text-[10px] text-muted-foreground leading-tight italic">
                            Si no hay NCS, se calculará el color<br />automáticamente al subir la imagen.
                          </p>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="launchYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Año de Lanzamiento</FormLabel>
                      <FormControl><Input type="number" placeholder="Ej: 2024" className="h-10" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Descripción de Marketing / Diseño</FormLabel>
                    <FormControl><Textarea placeholder="Explica las propiedades visuales y estilo..." className="min-h-[80px] resize-none" {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 pb-2 border-b">
            <CardTitle className="text-lg font-bold">Motor de Recomendaciones (Etiquetas)</CardTitle>
            <CardDescription>Datos clave para el cálculo de similitudes y usos.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
             <FormField
                control={form.control}
                name="styleTags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Estilos Orientativos</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                      {field.value?.length > 0 ? field.value.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 transition-all">
                          {tag} <X className="h-3 w-3 cursor-pointer" onClick={() => field.onChange((field.value || []).filter(t => t !== tag))} />
                        </Badge>
                      )) : <p className="text-[10px] text-slate-400 italic">No hay etiquetas de estilo añadidas.</p>}
                    </div>
                    <FormControl>
                      <Input placeholder="Escribe y presiona Enter (ej: Nórdico, Industrial)..." className="h-10 border-slate-200" onKeyDown={(e) => {
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

              <FormField
                control={form.control}
                name="applications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Aplicaciones Sugeridas</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                      {field.value?.length > 0 ? field.value.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1 px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 transition-all">
                          {tag} <X className="h-3 w-3 cursor-pointer" onClick={() => field.onChange((field.value || []).filter(t => t !== tag))} />
                        </Badge>
                      )) : <p className="text-[10px] text-slate-400 italic">No hay aplicaciones añadidas.</p>}
                    </div>
                    <FormControl>
                      <Input placeholder="Escribe y presiona Enter (ej: Cocina, Placard)..." className="h-10 border-slate-200" onKeyDown={(e) => {
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

        <div className="flex justify-end gap-4 border-t pt-8">
          <Button type="button" variant="ghost" className="h-14 px-8 text-slate-500 font-medium" onClick={() => router.back()}>
            Descartar
          </Button>
          
          {mode === 'create' ? (
            <>
              <Button 
                type="button" 
                variant="outline" 
                className="h-14 px-8 border-slate-200 font-bold hover:bg-slate-50"
                disabled={isSaving}
                onClick={form.handleSubmit((data) => onSubmit(data, true), onInvalid)}
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Guardar y Crear Otro
              </Button>
              <Button 
                type="submit" 
                className="gap-2 px-12 h-14 text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" 
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Guardar y Listar
              </Button>
            </>
          ) : (
            <Button 
              type="submit" 
              className="gap-2 px-12 h-14 text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" 
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Guardar Cambios
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
