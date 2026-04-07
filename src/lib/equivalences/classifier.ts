
import { converter, differenceCiede2000 } from 'culori';
import { ColorParent, ColorSub, SurfaceTexture, Finish } from '../types';

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

export function normalizeName(name: string): string {
  return (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Detecta la familia cromática basada en el nombre o valores LAB.
 */
export function detectColorParent(name: string, lab?: { l: number, a: number, b: number }): ColorParent {
  const norm = normalizeName(name);
  
  // Prioridad semántica: El nombre suele mandar en la intención de diseño
  if (norm.includes('blanco') || norm.includes('nieve')) return 'blanco';
  if (norm.includes('negro') || norm.includes('notte') || norm.includes('carbon')) return 'negro';
  if (norm.includes('gris') || norm.includes('humo') || norm.includes('plata') || norm.includes('grafito')) return 'gris';
  if (norm.includes('beige') || norm.includes('arena') || norm.includes('almendra') || norm.includes('crema')) return 'beige';
  if (norm.includes('roble') || norm.includes('nogal') || norm.includes('haya') || norm.includes('cedro') || norm.includes('marron')) return 'marron';
  if (norm.includes('verde') || norm.includes('oliva') || norm.includes('safari')) return 'verde';
  if (norm.includes('azul') || norm.includes('indigo')) return 'azul';
  if (norm.includes('rojo') || norm.includes('terracota') || norm.includes('amaranto')) return 'rojo';

  // Fallback a LAB
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
    return best.name;
  }

  return 'otro';
}

export function detectColorSub(l: number): ColorSub {
  for (const level of SUB_LEVELS) {
    if (l >= level.minL && l < level.maxL) return level.name as ColorSub;
  }
  return 'medio oscuro';
}

export function detectSurfaceTexture(name: string, manufacturerCode?: string): SurfaceTexture {
  const norm = normalizeName(name + ' ' + (manufacturerCode || ''));
  if (norm.match(/roble|nogal|cedro|pino|haya|teka|fresno|ebano|wengue|guatambu|jacaranda|petiribi|paraiso|madera|veta|st12|st19|st22|st32|st37|st38/i)) return 'madera';
  if (norm.match(/textil|lino|seda|tweed|hilado|st10/i)) return 'textil';
  if (norm.match(/hormigon|concreto|cemento|piedra|marmol|st75|st76|st20|st87/i)) return 'concreto';
  if (norm.match(/metal|aluminio|acero|cromo|litio|st2/i)) return 'metal';
  return 'liso';
}

export function detectFinish(name: string, manufacturerCode?: string): Finish {
  const norm = normalizeName(name + ' ' + (manufacturerCode || ''));
  if (norm.match(/mate|matt|st9/i)) return 'mate';
  if (norm.match(/brillo|gloss|pg|espejo/i)) return 'brillo';
  if (norm.match(/satinado|seda/i)) return 'satinado';
  if (norm.match(/texturado|rugoso|st37|st38/i)) return 'texturado';
  if (norm.match(/soft|tactil|antihuella/i)) return 'soft';
  return 'mate';
}
