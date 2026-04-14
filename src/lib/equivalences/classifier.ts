import { converter, differenceCiede2000 } from 'culori';
import { ColorParent, ColorSub, SurfaceTexture, Finish, ClassifiedValue } from '../types';

const toLab = converter('lab');
const de2000 = differenceCiede2000();

export const COLOR_PARENTS_LAB: { name: ColorParent, lab: { l: number, a: number, b: number } }[] = [
  { name: 'blanco', lab: { l: 95, a: 0, b: 0 } },
  { name: 'beige', lab: { l: 80, a: 5, b: 15 } },
  { name: 'gris', lab: { l: 50, a: 0, b: 0 } },
  { name: 'negro', lab: { l: 10, a: 0, b: 0 } },
  { name: 'marron', lab: { l: 35, a: 15, b: 15 } },
  { name: 'rojo', lab: { l: 45, a: 60, b: 45 } },
  { name: 'verde', lab: { l: 45, a: -50, b: 30 } },
  { name: 'azul', lab: { l: 30, a: 50, b: -70 } },
  { name: 'amarillo', lab: { l: 85, a: -10, b: 80 } },
  { name: 'naranja', lab: { l: 60, a: 40, b: 55 } },
  { name: 'violeta', lab: { l: 40, a: 45, b: -45 } },
  { name: 'rosa', lab: { l: 70, a: 35, b: -10 } }
];

export const SUB_LEVELS = [
  { name: 'muy claro', minL: 80, maxL: 100 },
  { name: 'claro', minL: 65, maxL: 80 },
  { name: 'medio claro', minL: 50, maxL: 65 },
  { name: 'medio oscuro', minL: 35, maxL: 50 },
  { name: 'oscuro', minL: 20, maxL: 35 },
  { name: 'muy oscuro', minL: 0, maxL: 20 }
] as const;

// Diccionarios de Dominio
const WOOD_TERMS = ['roble', 'oak', 'nogal', 'walnut', 'fresno', 'ash', 'olmo', 'elm', 'pino', 'pine', 'cedro', 'haya', 'teka', 'ebano', 'wengue', 'jacaranda', 'petiribi', 'paraiso'];
const TEXTILE_TERMS = ['lino', 'linen', 'textil', 'fabric', 'hilado', 'weave', 'seda', 'tweed', 'trama'];
const STONE_TERMS = ['cemento', 'cement', 'concreto', 'concrete', 'piedra', 'stone', 'marmol', 'marble', 'granito', 'granite', 'hormigon', 'pizarra'];
const METAL_TERMS = ['metal', 'inox', 'aluminio', 'bronze', 'bronce', 'cepillado', 'steel', 'acero', 'cromo', 'litio'];

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Detecta la familia cromática con confianza.
 */
export function detectColorParentDetailed(name: string, lab?: { l: number, a: number, b: number }): ClassifiedValue<ColorParent> {
  const norm = normalizeText(name);
  
  if (norm.includes('blanco') || norm.includes('nieve')) return { value: 'blanco', confidence: 0.95, source: 'keyword' };
  if (norm.includes('negro') || norm.includes('notte') || norm.includes('carbon')) return { value: 'negro', confidence: 0.95, source: 'keyword' };
  if (norm.includes('gris') || norm.includes('humo') || norm.includes('plata') || norm.includes('grafito') || norm.includes('antracita')) return { value: 'gris', confidence: 0.95, source: 'keyword' };
  if (norm.includes('beige') || norm.includes('arena') || norm.includes('almendra') || norm.includes('crema')) return { value: 'beige', confidence: 0.9, source: 'keyword' };
  if (WOOD_TERMS.some(t => norm.includes(t)) || norm.includes('marron')) return { value: 'marron', confidence: 0.85, source: 'keyword' };
  if (norm.includes('verde') || norm.includes('oliva') || norm.includes('safari')) return { value: 'verde', confidence: 0.9, source: 'keyword' };
  if (norm.includes('azul') || norm.includes('indigo')) return { value: 'azul', confidence: 0.9, source: 'keyword' };
  if (norm.includes('rojo') || norm.includes('terracota') || norm.includes('amaranto')) return { value: 'rojo', confidence: 0.9, source: 'keyword' };

  if (lab) {
    let best = COLOR_PARENTS_LAB[0];
    let minDE = Infinity;
    for (const p of COLOR_PARENTS_LAB) {
      const dE = de2000(lab as any, p.lab as any);
      if (dE < minDE) {
        minDE = dE;
        best = p;
      }
    }
    // Si la distancia es muy grande, baja la confianza
    const confidence = Math.max(0.5, 1 - (minDE / 50));
    return { value: best.name, confidence, source: 'lab' };
  }

  return { value: 'otro', confidence: 0.1, source: 'fallback' };
}

export function detectColorSubDetailed(l?: number): ClassifiedValue<ColorSub> {
  if (l === undefined) return { value: 'medio claro', confidence: 0.3, source: 'fallback' };
  
  for (const level of SUB_LEVELS) {
    if (l >= level.minL && l <= level.maxL) {
      return { value: level.name as ColorSub, confidence: 0.9, source: 'lab' };
    }
  }
  return { value: 'medio claro', confidence: 0.3, source: 'fallback' };
}

export function detectSurfaceTextureDetailed(name: string, code?: string): ClassifiedValue<SurfaceTexture> {
  const norm = normalizeText(name + ' ' + (code || ''));
  
  if (WOOD_TERMS.some(t => norm.includes(t)) || norm.match(/veta|st12|st19|st22|st32|st37|st38/i)) {
    return { value: 'madera', confidence: 0.9, source: 'keyword' };
  }
  if (TEXTILE_TERMS.some(t => norm.includes(t)) || norm.match(/st10/i)) {
    return { value: 'textil', confidence: 0.9, source: 'keyword' };
  }
  if (STONE_TERMS.some(t => norm.includes(t)) || norm.match(/st75|st76|st20|st87/i)) {
    return { value: 'cementicio', confidence: 0.9, source: 'keyword' };
  }
  if (METAL_TERMS.some(t => norm.includes(t)) || norm.match(/st2/i)) {
    return { value: 'metal', confidence: 0.9, source: 'keyword' };
  }
  
  return { value: 'liso', confidence: 0.5, source: 'fallback' };
}

export function detectFinishDetailed(name: string, code?: string): ClassifiedValue<Finish> {
  const norm = normalizeText(name + ' ' + (code || ''));
  
  if (norm.match(/supermate|perfectmatt|pm|st9/i)) return { value: 'supermate', confidence: 0.95, source: 'keyword' };
  if (norm.match(/mate|matt/i)) return { value: 'mate', confidence: 0.9, source: 'keyword' };
  if (norm.match(/brillo|gloss|pg|espejo/i)) return { value: 'brillo', confidence: 0.9, source: 'keyword' };
  if (norm.match(/satinado|seda/i)) return { value: 'satinado', confidence: 0.8, source: 'keyword' };
  if (norm.match(/texturado|rugoso|st37|st38/i)) return { value: 'texturado', confidence: 0.8, source: 'keyword' };

  return { value: 'mate', confidence: 0.4, source: 'fallback' };
}

// Legacy exports for compatibility during refactor
export const normalizeName = normalizeText;
export function detectColorParent(name: string, lab?: { l: number, a: number, b: number }): ColorParent {
  return detectColorParentDetailed(name, lab).value;
}
export function detectColorSub(l: number): ColorSub {
  return detectColorSubDetailed(l).value;
}
export function detectSurfaceTexture(name: string, manufacturerCode?: string): SurfaceTexture {
  return detectSurfaceTextureDetailed(name, manufacturerCode).value;
}
export function detectFinish(name: string, manufacturerCode?: string): Finish {
  return detectFinishDetailed(name, manufacturerCode).value;
}
