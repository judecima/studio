// @ts-ignore
import { converter, differenceCiede2000 } from 'culori';
import { inferColorGroupFromNcs } from '@/lib/constants/colors';

const toLab = converter('lab');
const ciede2000 = differenceCiede2000();

export const PALETTE = [
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Beige', hex: '#D2B48C' },
  { name: 'Gris', hex: '#808080' },
  { name: 'Negro', hex: '#000000' },
  { name: 'Marron', hex: '#8B4513' },
  { name: 'Rojo', hex: '#FF0000' },
  { name: 'Verde', hex: '#008000' },
  { name: 'Azul', hex: '#0000FF' },
  { name: 'Amarillo', hex: '#FFFF00' },
  { name: 'Naranja', hex: '#FFA500' },
  { name: 'Violeta', hex: '#EE82EE' },
  { name: 'Rosa', hex: '#FFC0CB' },
];

export const COLOR_WORDS = [
  'blanco', 'beige', 'gris', 'negro', 'marron', 'rojo', 'verde', 'azul',
  'amarillo', 'naranja', 'violeta', 'rosa', 'cafe', 'almendra', 'crema',
  'arena', 'perla', 'carbon', 'gris oscuro', 'gris claro', 'verde oliva',
  'safari', 'aluminio', 'plata', 'acero', 'metal'
];

export const COLOR_WEIGHTS: Record<string, { weight: number, group?: string }> = {
  // Especializados (Máxima prioridad)
  'almendra': { weight: 15, group: 'Beige' },
  'crema': { weight: 15 },
  'perla': { weight: 15 },
  'arena': { weight: 15 },
  'carbon': { weight: 15 },
  'oliva': { weight: 15 },
  'safari': { weight: 15, group: 'Verde' }, // Forzar Safari a Verde
  // Metales
  'aluminio': { weight: 10, group: 'Gris' },
  'plata': { weight: 10, group: 'Gris' },
  'acero': { weight: 10, group: 'Gris' },
  'metal': { weight: 10, group: 'Gris' },
  // Cromáticos
  'verde': { weight: 5 },
  'azul': { weight: 5 },
  'rojo': { weight: 5 },
  'amarillo': { weight: 5 },
  'naranja': { weight: 5 },
  'violeta': { weight: 5 },
  'rosa': { weight: 5 },
  'marron': { weight: 5 },
  'cafe': { weight: 5 },
  // Genéricos (Mínima prioridad)
  'blanco': { weight: 1 },
  'beige': { weight: 1 },
  'gris': { weight: 1 },
  'negro': { weight: 1 }
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
  
  // Si la palabra clave tiene un grupo forzado (ej. safari -> Verde, aluminio -> Gris)
  const entry = COLOR_WEIGHTS[bestWord];
  if (entry?.group) return entry.group;
  
  return bestWord.charAt(0).toUpperCase() + bestWord.slice(1);
}

export function detectColor(name: string, ncs?: string): string {
  // 1. Prioridad: Nombre (Semántica ponderada)
  const detected = getDominantColorName([name]);
  if (detected) return detected;

  // 2. Prioridad: NCS (Inferencia técnica)
  if (ncs) {
    const inferred = inferColorGroupFromNcs(ncs);
    if (inferred) return inferred.charAt(0).toUpperCase() + inferred.slice(1);
  }

  return 'Otro';
}

export function detectTexture(name: string, surfaceTexture?: string): string {
  const normName = normalizeName(name);
  const normSurf = normalizeName(surfaceTexture || '');
  
  // 1. MADERA: Roble, Paraiso, Kiri, Petiribi, Nogal, Pino, Cerezo, Cedro, Hickory, Olmo, Coco o "nature"
  if (
    normName.match(/roble|paraiso|kiri|petiribi|nogal|pino|cerezo|cedro|hickory|olmo|coco/i) ||
    normSurf === 'nature' || 
    normSurf.match(/st12|st19|st22|st32|st37|st38/i)
  ) return 'madera';
  
  // 2. TEXTIL: Hilado, Textil o Lino
  if (
    normSurf === 'hilado' || 
    normName.match(/textil|lino/i) ||
    normSurf.match(/st10/i)
  ) return 'textil';
  
  // 3. CONCRETO: Hormigon
  if (
    normName.match(/hormigon|concreto|cemento/i) ||
    normSurf.match(/st75|st76|st20|st87/i)
  ) return 'concreto';
  
  // 4. METAL: Metal, Chromix, Aluminio, Litio
  if (
    normName.match(/metal|chromix|aluminio|litio/i) ||
    normSurf.match(/st2/i)
  ) return 'metal';
  
  // 5. LISO: El resto
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

// 🎨 JERARQUÍA OBJETIVA (LAB-BASED)
export const COLOR_PARENTS = [
  { name: 'Blanco', lab: { l: 95, a: 0, b: 0 } },
  { name: 'Beige', lab: { l: 80, a: 5, b: 15 } },
  { name: 'Gris', lab: { l: 50, a: 0, b: 0 } },
  { name: 'Negro', lab: { l: 10, a: 0, b: 0 } },
  { name: 'Marrón', lab: { l: 35, a: 15, b: 15 } },
  { name: 'Rojo', lab: { l: 45, a: 60, b: 45 } },
  { name: 'Verde', lab: { l: 45, a: -50, b: 30 } },
  { name: 'Azul', lab: { l: 30, a: 50, b: -70 } },
  { name: 'Amarillo', lab: { l: 85, a: -10, b: 80 } },
  { name: 'Naranja', lab: { l: 60, a: 40, b: 55 } },
  { name: 'Violeta', lab: { l: 40, a: 45, b: -45 } },
  { name: 'Rosa', lab: { l: 70, a: 35, b: -10 } }
];

export const SUB_LEVELS = [
  { name: 'Muy Claro', minL: 80, maxL: 100 },
  { name: 'Claro', minL: 65, maxL: 80 },
  { name: 'Medio Claro', minL: 50, maxL: 65 },
  { name: 'Medio Oscuro', minL: 35, maxL: 50 },
  { name: 'Oscuro', minL: 20, maxL: 35 },
  { name: 'Muy Oscuro', minL: 0, maxL: 20 }
];

const de2000 = differenceCiede2000();

export function getColorParent(lab: { l: number; a: number; b: number }, name?: string): string {
  // 1. Prioridad: Búsqueda semántica forzada (si hay nombre)
  if (name) {
    const detected = getDominantColorName([name]);
    // Solo forzar si es una de nuestras categorías "Padre" o un keyword fuerte
    if (detected && COLOR_PARENTS.some(p => p.name === detected)) {
      return detected;
    }
    // Casos especiales mapeados
    if (detected === 'Safari' || detected === 'Oliva') return 'Verde';
    if (detected === 'Almendra') return 'Beige'; // O podrías añadir Almendra como Padre si quieres
  }

  // 2. Fallback: Distancia LAB pura (CIEDE2000)
  let bestParent = COLOR_PARENTS[0];
  let minDE = Infinity;
  for (const parent of COLOR_PARENTS) {
    const dE = de2000(lab, parent.lab);
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
  return 'Medio'; // fallback
}
