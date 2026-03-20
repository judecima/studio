import { CatalogProduct, Fingerprint } from './catalog.types';

/**
 * Normaliza un string para ser usado como ID (slug).
 */
export function normalizeId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Infiere la huella digital estética de un producto basándose en su nombre y descripción.
 */
function inferFingerprint(name: string, description: string): Fingerprint {
  const content = (name + ' ' + description).toLowerCase();

  // Inferencia de Material
  let material: Fingerprint['material'] = 'liso';
  if (/(roble|nogal|cedro|haya|teca|fresno|pino|madera|veta|halifax|hamilton|lincoln)/.test(content)) material = 'madera';
  else if (/(lino|seda|textil|hilado|tweed)/.test(content)) material = 'textil';
  else if (/(piedra|marmol|concreto|hormigon|stucco)/.test(content)) material = 'piedra';
  else if (/(aluminio|metal|acero|cobre)/.test(content)) material = 'metal';

  // Inferencia de Hue
  let colorHue: Fingerprint['colorHue'] = 'otros';
  if (content.includes('blanco')) colorHue = 'blanco';
  else if (content.includes('negro')) colorHue = 'negro';
  else if (/(gris|grafito|plomo|humo|antracita)/.test(content)) colorHue = 'gris';
  else if (/(beige|arena|crema|lino|chiaro)/.test(content)) colorHue = 'beige';
  else if (/(marron|habano|tabaco|caoba|wengue)/.test(content)) colorHue = 'marron';
  else if (content.includes('azul')) colorHue = 'azul';
  else if (content.includes('rojo')) colorHue = 'rojo';

  // Inferencia de Grupo de Color
  let colorGroup: Fingerprint['colorGroup'] = 'medio';
  if (/(blanco|claro|chiaro|premium|bianco|nieve)/.test(content)) colorGroup = 'claro';
  else if (/(negro|oscuro|notte|tabaco|profundo|grafito|carbón)/.test(content)) colorGroup = 'oscuro';

  // Inferencia de Intensidad de Veta
  let grainIntensity = 0;
  if (material === 'madera') {
    grainIntensity = 2;
    if (/(nature|sincronizado|feelwood|halifax|nudo|catedral)/.test(content)) grainIntensity = 4;
    if (/(suave|lineal)/.test(content)) grainIntensity = 1;
  }

  // Inferencia de Tono
  let tone: Fingerprint['tone'] = 'neutro';
  if (/(calido|roble|miel|arena|otoño)/.test(content)) tone = 'calido';
  else if (/(frio|gris|azul|plata|hielo)/.test(content)) tone = 'frio';

  return { material, colorGroup, colorHue, grainIntensity, tone };
}

/**
 * Adapta los datos crudos del scraper al modelo de dominio.
 */
export function adaptScrapedData(scrapedItems: any[]): CatalogProduct[] {
  return scrapedItems.map(item => ({
    id: normalizeId(item.name),
    name: item.name,
    brand: item.brand || 'Faplac',
    width: item.width || 1830,
    height: item.height || 2750,
    thickness: item.thickness || 18,
    description: item.description || '',
    images: item.images || [],
    mainImage: item.mainImage || 'https://placehold.co/800x600?text=Sin+Imagen',
    fingerprint: inferFingerprint(item.name, item.description)
  }));
}
