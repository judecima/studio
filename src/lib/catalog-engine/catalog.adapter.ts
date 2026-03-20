import { CatalogProduct, MaterialType, ColorHue, ToneType, ColorGroup } from './catalog.types';
import { RawScrapedItem } from '../importers/faplac-scraper';

/**
 * Normaliza el nombre del producto para usarlo como ID consistente en todo el sistema.
 * Debe coincidir exactamente con la lógica de Firestore.
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

/**
 * Mapa de sinónimos semánticos para inferencia de color.
 */
const COLOR_MAP: Record<ColorHue, string[]> = {
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
 * Adapta los datos crudos a CatalogProduct.
 */
export function adaptProducts(raw: RawScrapedItem[]): CatalogProduct[] {
  return raw.map(item => {
    const content = (item.name + ' ' + item.description).toLowerCase();
    
    // Inferencia de Material
    let material: MaterialType = 'liso';
    if (/(roble|nogal|cedro|haya|teca|fresno|pino|madera|veta|halifax|hamilton|lincoln|mesopotamia)/.test(content)) material = 'madera';
    else if (/(lino|seda|textil|hilado|tweed)/.test(content)) material = 'textil';
    else if (/(piedra|marmol|concreto|hormigon|stucco)/.test(content)) material = 'piedra';
    else if (/(aluminio|metal|acero|cobre)/.test(content)) material = 'metal';

    // Inferencia de Color
    let hue: ColorHue = 'otros';
    for (const [key, synonyms] of Object.entries(COLOR_MAP)) {
      if (synonyms.some(s => content.includes(s)) || content.includes(key)) {
        hue = key as ColorHue;
        break;
      }
    }

    // Inferencia de Tono
    let tone: ToneType = 'neutro';
    if (/(calido|roble|miel|arena|otoño|marron|madera)/.test(content)) tone = 'calido';
    else if (/(frio|gris|azul|plata|hielo|concreto)/.test(content)) tone = 'frio';

    // Inferencia de Grupo
    let group: ColorGroup = 'medio';
    if (/(blanco|claro|chiaro|premium|bianco|nieve|crema)/.test(content)) group = 'claro';
    else if (/(negro|oscuro|notte|tabaco|profundo|grafito|carbón)/.test(content)) group = 'oscuro';

    // Medidas
    const dimsMatch = item.dimensions.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
    const width = dimsMatch ? parseInt(dimsMatch[1]) : 1830;
    const height = dimsMatch ? parseInt(dimsMatch[2]) : 2750;
    const thickness = dimsMatch ? parseInt(dimsMatch[3]) : 18;

    return {
      id: normalizePanelId(item.name),
      name: item.name,
      brand: item.brand,
      line: item.name.split(' ')[0] || 'General',
      collection: '2024',
      launch: content.includes('lanzamiento'),
      texture: material === 'madera' ? 'veta' : 'soft',
      finish: 'mate',
      hasGrain: material === 'madera',
      color: {
        name: hue,
        group,
        hue,
        semanticTags: COLOR_MAP[hue] || []
      },
      dimensions: { width, height, thickness },
      description: item.description,
      details: 'Apto para mobiliario de cocina, placards y oficinas.',
      images: [item.mainImage],
      mainImage: item.mainImage,
      fingerprint: {
        material,
        tone,
        grainIntensity: material === 'madera' ? 3 : 0
      },
      similar_a: []
    };
  });
}