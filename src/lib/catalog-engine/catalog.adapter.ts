import { CatalogProduct, MaterialType, ColorHue, ToneType, ColorGroup } from './catalog.types';

/**
 * Normaliza el nombre del producto para usarlo como ID consistente.
 */
export function normalizePanelId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const COLOR_MAP: Record<string, ColorHue> = {
  rojo: 'rojo', bordo: 'rojo', terracota: 'rojo', vino: 'rojo', terrarum: 'rojo',
  blanco: 'blanco', marfil: 'blanco', crema: 'blanco', bianco: 'blanco', seda: 'blanco',
  negro: 'negro', grafito: 'negro', notte: 'negro', carbon: 'negro',
  gris: 'gris', cemento: 'gris', plata: 'gris', humo: 'gris', antracita: 'gris',
  beige: 'beige', arena: 'beige', lino: 'beige', chiaro: 'beige', tuareg: 'beige',
  marron: 'marron', habano: 'marron', tabaco: 'marron', caoba: 'marron', nogal: 'marron', cedro: 'marron'
};

const SEMANTIC_TAGS: Record<ColorHue, string[]> = {
  rojo: ["rojo", "bordo", "terracota", "ladrillo", "vino", "terrarum"],
  blanco: ["blanco", "marfil", "crema", "premium", "bianco", "seda", "chiaro"],
  negro: ["negro", "grafito", "notte", "carbón"],
  gris: ["gris", "cemento", "plata", "humo", "antracita", "plomo"],
  marron: ["marrón", "habano", "tabaco", "caoba", "wengue", "nogal", "cedro", "curupay"],
  beige: ["beige", "arena", "crema", "lino", "chiaro", "tuareg", "camel"],
  azul: ["azul", "profundo", "marino"],
  verde: ["verde", "bosque", "oliva"],
  otros: []
};

/**
 * Adapta los datos crudos extraídos a CatalogProduct con inferencia de diseño.
 */
export function adaptToProduct(raw: any, storageUrl: string): CatalogProduct {
  const content = `${raw.name} ${raw.description}`.toLowerCase();
  
  // Inferencia de Material
  let material: MaterialType = 'liso';
  if (/(roble|nogal|cedro|haya|teca|fresno|pino|madera|veta|halifax|hamilton|lincoln|mesopotamia)/.test(content)) material = 'madera';
  else if (/(lino|seda|textil|hilado|tweed)/.test(content)) material = 'textil';
  else if (/(piedra|marmol|concreto|hormigon|stucco)/.test(content)) material = 'piedra';

  // Inferencia de Hue y basicColors
  let hue: ColorHue = 'otros';
  const basicColorsSet = new Set<string>();

  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (content.includes(key)) {
      if (hue === 'otros') hue = value;
      basicColorsSet.add(value);
    }
  }

  const basicColors = Array.from(basicColorsSet);
  if (basicColors.length === 0) basicColors.push('otros');

  // Tono
  const tone: ToneType = /(calido|madera|marron|arena|oro|beige)/.test(content) ? 'calido' : 
                        /(frio|gris|azul|plata|hielo)/.test(content) ? 'frio' : 'neutro';

  // Grupo
  const group: ColorGroup = /(blanco|claro|chiaro|premium|nieve|crema)/.test(content) ? 'claro' :
                           /(negro|oscuro|notte|tabaco|profundo|grafito)/.test(content) ? 'oscuro' : 'medio';

  // Nuevos atributos de scraping o inferidos
  const isLaunch = raw.launch !== undefined ? Boolean(raw.launch) : content.includes('lanzamiento');
  let launchYear = raw.launchYear ? Number(raw.launchYear) : undefined;
  if (!launchYear && content.includes('lanzamiento 2024')) launchYear = 2024;

  const isSmooth = raw.isSmooth !== undefined ? Boolean(raw.isSmooth) : material === 'liso';
  const surfaceTexture = raw.surfaceTexture || (material === 'madera' ? 'veta' : material === 'textil' ? 'trama' : 'mate');

  return {
    id: normalizePanelId(raw.name),
    sku: raw.sku || "",
    name: raw.name,
    brand: raw.brand || "Faplac",
    line: raw.name.split(' ')[0] || "General",
    collection: "2024",
    launch: isLaunch,
    ...(launchYear !== undefined ? { launchYear } : {}),
    texture: surfaceTexture || 'mate',
    ...(surfaceTexture !== undefined ? { surfaceTexture } : {}),
    finish: 'mate',
    hasGrain: material === 'madera',
    isSmooth,
    color: {
      name: hue,
      group,
      hue,
      basicColors,
      semanticTags: SEMANTIC_TAGS[hue] || []
    },
    dimensions: raw.dimensions || { width: 1830, height: 2750, thickness: 18 },
    description: raw.description,
    details: "Mobiliario de interiores y arquitectura comercial.",
    images: [storageUrl],
    mainImage: storageUrl,
    fingerprint: {
      material,
      tone,
      grainIntensity: material === 'madera' ? 6 : 0
    },
    similar_a: []
  };
}
