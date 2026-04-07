import { converter, differenceCiede2000 } from 'culori';
import { inferColorGroupFromNcs } from '@/lib/constants/colors';

const toLab = converter('lab');
const de2000 = differenceCiede2000();

export const PALETTE = [
  { name: 'blanco', hex: '#FFFFFF' },
  { name: 'beige', hex: '#D2B48C' },
  { name: 'gris', hex: '#808080' },
  { name: 'negro', hex: '#000000' },
  { name: 'marron', hex: '#8B4513' },
  { name: 'rojo', hex: '#FF0000' },
  { name: 'verde', hex: '#008000' },
  { name: 'azul', hex: '#0000FF' },
  { name: 'amarillo', hex: '#FFFF00' },
  { name: 'naranja', hex: '#FFA500' },
  { name: 'violeta', hex: '#EE82EE' },
  { name: 'rosa', hex: '#FFC0CB' },
];

export const COLOR_WORDS = [
  'blanco', 'beige', 'gris', 'negro', 'marron', 'rojo', 'verde', 'azul',
  'amarillo', 'naranja', 'violeta', 'rosa', 'cafe', 'almendra', 'crema',
  'arena', 'perla', 'carbon', 'gris oscuro', 'gris claro', 'verde oliva',
  'safari', 'aluminio', 'plata', 'acero', 'metal', 'madera'
];

export const COLOR_WEIGHTS: Record<string, { weight: number, group?: string }> = {
  // Especializados (Máxima prioridad)
  'almendra': { weight: 15, group: 'beige' },
  'crema': { weight: 15, group: 'beige' },
  'perla': { weight: 15, group: 'gris' },
  'arena': { weight: 15, group: 'beige' },
  'carbon': { weight: 15, group: 'negro' },
  'oliva': { weight: 15, group: 'verde' },
  'safari': { weight: 15, group: 'verde' }, 
  // Metales
  'aluminio': { weight: 10, group: 'gris' },
  'plata': { weight: 10, group: 'gris' },
  'acero': { weight: 10, group: 'gris' },
  'metal': { weight: 10, group: 'gris' },
  // Cromáticos
  'verde': { weight: 5, group: 'verde' },
  'azul': { weight: 5, group: 'azul' },
  'rojo': { weight: 5, group: 'rojo' },
  'amarillo': { weight: 5, group: 'amarillo' },
  'naranja': { weight: 5, group: 'naranja' },
  'violeta': { weight: 5, group: 'violeta' },
  'rosa': { weight: 5, group: 'rosa' },
  'marron': { weight: 5, group: 'marron' },
  'cafe': { weight: 5, group: 'marron' },
  'madera': { weight: 5, group: 'marron' },
  // Genéricos (Mínima prioridad)
  'blanco': { weight: 1, group: 'blanco' },
  'beige': { weight: 1, group: 'beige' },
  'gris': { weight: 1, group: 'gris' },
  'negro': { weight: 1, group: 'negro' }
};

export function normalizeName(name: string): string {
  return (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function getDominantColorName(names: string[]): string | null {
  const counts = new Map<string, number>();
  
  for (const name of names) {
    const norm = normalizeName(name);
    for (const word of COLOR_WORDS) {
      if (norm.includes(word)) {
        const entry = COLOR_WEIGHTS[word] || { weight: 1 };
        counts.set(word, (counts.get(word) || 0) + entry.weight);
      }
    }
  }
  
  let bestWord = null;
  let maxWeight = 0;
  for (const [word, weightSum] of counts) {
    if (weightSum > maxWeight) {
      maxWeight = weightSum;
      bestWord = word;
    }
  }

  if (!bestWord) return null;
  
  const entry = COLOR_WEIGHTS[bestWord];
  return entry?.group || bestWord;
}

export function detectColor(name: string, ncs?: string): string {
  const detected = getDominantColorName([name]);
  if (detected) return detected.toLowerCase();

  if (ncs) {
    const inferred = inferColorGroupFromNcs(ncs);
    if (inferred) return inferred.toLowerCase();
  }

  return 'otro';
}

export function detectTexture(name: string, surfaceTexture?: string): string {
  const normName = normalizeName(name);
  const normSurf = normalizeName(surfaceTexture || '');
  
  if (
    normName.match(/roble|paraiso|kiri|petiribi|nogal|pino|cerezo|castaño|cedro|hickory|olmo|coco|veta|madera/i) ||
    normSurf === 'nature' || 
    normSurf.match(/st12|st19|st22|st32|st37|st38/i)
  ) return 'madera';
  
  if (
    normSurf === 'hilado' || 
    normName.match(/textil|lino|seda|tweed/i) ||
    normSurf.match(/st10/i)
  ) return 'textil';
  
  if (
    normName.match(/hormigon|concreto|cemento|piedra|marmol/i) ||
    normSurf.match(/st75|st76|st20|st87/i)
  ) return 'concreto';
  
  if (
    normName.match(/metal|chromix|aluminio|litio/i) ||
    normSurf.match(/st2/i)
  ) return 'metal';
  
  return 'liso';
}

export function detectTone(l: number): string {
  if (l > 80) return 'claro';
  if (l > 40) return 'medio';
  return 'oscuro';
}

export function detectTemp(name: string): string {
  const norm = normalizeName(name);
  if (norm.match(/calido|warm|beige|roble|miel|terracota/i)) return 'warm';
  if (norm.match(/frio|cool|gris|hielo|shadow/i)) return 'cool';
  return 'neutral';
}

export const COLOR_PARENTS = [
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
  { name: 'rosa', lab: { l: 70, a: 35, b: -10 } },
  { name: 'madera', lab: { l: 45, a: 15, b: 25 } } // Agregado madera como categoría padre
];

export const SUB_LEVELS = [
  { name: 'muy claro', minL: 80, maxL: 100 },
  { name: 'claro', minL: 65, maxL: 80 },
  { name: 'medio claro', minL: 50, maxL: 65 },
  { name: 'medio oscuro', minL: 35, maxL: 50 },
  { name: 'oscuro', minL: 20, maxL: 35 },
  { name: 'muy oscuro', minL: 0, maxL: 20 }
];

export function getColorParent(lab: { l: number; a: number; b: number }, name?: string): string {
  if (name) {
    const detected = getDominantColorName([name]);
    // Mapear madera a marron para consistencia cromática si no se usa como categoría principal
    if (detected === 'madera') return 'marron';
    if (detected && COLOR_PARENTS.some(p => p.name === detected.toLowerCase())) {
      return detected.toLowerCase();
    }
  }

  let bestParent = COLOR_PARENTS[0];
  let minDE = Infinity;
  for (const parent of COLOR_PARENTS) {
    const dE = de2000(lab as any, parent.lab as any);
    if (dE < minDE) {
      minDE = dE;
      bestParent = parent;
    }
  }
  return bestParent.name;
}

export function getColorSub(l: number): string {
  for (const level of SUB_LEVELS) {
    if (l >= level.minL && l < level.maxL) return level.name;
  }
  return 'medio';
}
