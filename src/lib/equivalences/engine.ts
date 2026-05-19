import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { converter, differenceCiede2000 } from 'culori';
import { 
  Panel, 
  ClassifiedPanel, 
  ColorParent, 
  ColorSub, 
  SurfaceTexture, 
  Finish, 
  ScoreBreakdown,
  EquivalenceMatch
} from '@/lib/types';
import { 
  detectColorParentDetailed, 
  detectColorSubDetailed, 
  detectSurfaceTextureDetailed, 
  detectFinishDetailed,
  normalizeText,
  mapCustomToBase
} from './classifier';

const toLab = converter('lab');
const de2000 = differenceCiede2000();

/**
 * Matriz de Relación Sensorial (v6.7)
 * Define qué tan compatibles son dos texturas de forma gradual (0.0 a 1.0).
 */
const TEXTURE_RELATION: Record<string, Record<string, number>> = {
  liso: { liso: 1.0, metal: 0.92, textil: 0.60, cementicio: 0.40, piedra: 0.40, madera: 0.10, otro: 0.50 },
  metal: { metal: 1.0, liso: 0.92, textil: 0.60, cementicio: 0.40, piedra: 0.40, madera: 0.10, otro: 0.45 },
  textil: { textil: 1.0, liso: 0.60, metal: 0.60, cementicio: 0.30, piedra: 0.30, madera: 0.10, otro: 0.45 },
  cementicio: { cementicio: 1.0, piedra: 0.90, liso: 0.40, metal: 0.40, textil: 0.30, madera: 0.10, otro: 0.45 },
  piedra: { piedra: 1.0, cementicio: 0.90, liso: 0.40, metal: 0.40, textil: 0.30, madera: 0.10, otro: 0.40 },
  madera: { madera: 1.0, textil: 0.10, liso: 0.10, metal: 0.10, cementicio: 0.10, piedra: 0.10, otro: 0.10 },
  otro: { otro: 1.0, liso: 0.50, metal: 0.45, textil: 0.45, cementicio: 0.45, piedra: 0.40, madera: 0.10 }
};

/**
 * Clasificación de Tokens (v6.8)
 * Permite distinguir entre identidad comercial y descriptores genéricos.
 */
const STRONG_TOKENS = [
  'almendra', 'roble', 'nogal', 'cedro', 'olmo', 'pino',
  'lino', 'textil', 'aluminio', 'inox', 'bronce',
  'cemento', 'concreto', 'marmol', 'granito',
  'tundra', 'nature', 'everest', 'ceniza', 'litio',
  'gris caliza', 'henna', 'carvalho', 'hickory'
];

const GENERIC_TOKENS = [
  'blanco', 'beige', 'gris', 'negro', 'marron',
  'claro', 'oscuro', 'natural', 'mate', 'brillo',
  'medio', 'suave', 'nieve', 'tiza'
];

function getDb() {
  const sdk = initializeFirebase();
  return sdk.firestore;
}

/**
 * Calcula el Boost de Identidad Comercial (Fase 4.5)
 */
function calculateIdentityBoost(a: ClassifiedPanel, b: ClassifiedPanel): number {
  const nameA = normalizeText(a.name);
  const nameB = normalizeText(b.name);
  
  // 1. Coincidencia exacta de nombre normalizado
  if (nameA === nameB) return 1.0; // Recibirá el boost full

  // 2. Overlap de Tokens Fuertes
  const tokensA = nameA.split(' ');
  const tokensB = nameB.split(' ');
  const strongA = tokensA.filter(t => STRONG_TOKENS.includes(t));
  const strongB = tokensB.filter(t => STRONG_TOKENS.includes(t));
  
  const commonStrong = strongA.filter(t => strongB.includes(t));
  if (commonStrong.length > 0) return 0.6; // Boost medio

  return 0;
}

/**
 * Fase A: Filtros Duros (v6.8)
 * Decide si el candidato entra al proceso de scoring. Solo veta casos extremos.
 */
export function passesHardFilters(a: ClassifiedPanel, b: ClassifiedPanel): boolean {
  if (a.id === b.id) return false;
  
  // Excepción por verificación manual
  if (a.manualVerifiedMatches?.includes(b.id)) return true;
  if (a.manualRejectedMatches?.includes(b.id)) return false;

  // 1. Incompatibilidad de Textura (Madera vs Resto es bloqueante)
  const relation = TEXTURE_RELATION[a.surfaceTexture]?.[b.surfaceTexture] || 0.35;
  if (relation < 0.20) return false; 

  // 2. Incompatibilidad de Acabado (Brillo vs Supermate es bloqueante)
  if ((a.finish === 'brillo' && a.finishSource === 'manual' || a.finish === 'brillo') && 
      (b.finish === 'supermate' || b.finish === 'mate' && b.finishSource === 'manual')) {
      // Si uno es brillo extremo y el otro es mate extremo, bloqueamos salvo que la marca sea la misma (por ahora bloqueamos)
      if (a.finish === 'brillo' && (b.finish === 'supermate' || b.finish === 'mate')) return false;
  }
  if (b.finish === 'brillo' && (a.finish === 'supermate' || a.finish === 'mate')) return false;

  // 3. Incompatibilidad de Veta
  if (a.hasGrain !== b.hasGrain) {
    // Si uno tiene veta marcada y el otro no, y son de tipos diferentes, bloqueamos
    if (a.surfaceTexture === 'madera' || b.surfaceTexture === 'madera') return false;
  }

  // 4. Incompatibilidad de Familia Cromática
  if (!isCompatibleColorFamily(a, b)) return false;

  return true;
}

function isCompatibleColorFamily(a: ClassifiedPanel, b: ClassifiedPanel): boolean {
  const familyA = a.colorParent;
  const familyB = b.colorParent;

  if (familyA === familyB && familyA !== 'custom') return true;
  
  const neutrals = ['blanco', 'beige', 'gris', 'negro', 'marron', 'otro'];
  
  // Si uno es custom, intentamos mapearlo para el filtro duro
  const effectiveA = familyA === 'custom' ? (mapCustomToBase(a.customColorFamilyNormalized || '') || 'otro') : familyA;
  const effectiveB = familyB === 'custom' ? (mapCustomToBase(b.customColorFamilyNormalized || '') || 'otro') : familyB;

  if (effectiveA === effectiveB) return true;
  if (neutrals.includes(effectiveA) && neutrals.includes(effectiveB)) return true;

  const opposites: Record<string, string[]> = {
    rojo: ['verde', 'azul'],
    verde: ['rojo', 'violeta', 'rosa'],
    azul: ['rojo', 'naranja', 'amarillo'],
    naranja: ['azul', 'violeta'],
    amarillo: ['azul', 'violeta']
  };

  if (opposites[effectiveA]?.includes(effectiveB) || opposites[effectiveB]?.includes(effectiveA)) return false;

  return true;
}

/**
 * Fase B: Score Multicapa (v6.9 - Flexible Family & Texture Boost)
 */
export function calculateScoreBreakdown(a: ClassifiedPanel, b: ClassifiedPanel): ScoreBreakdown {
  const breakdown: ScoreBreakdown = {
    total: 0,
    colorScore: 0,
    semanticScore: 0,
    textureScore: 0,
    finishScore: 0,
    lightnessScore: 0,
    confidenceScore: 0,
    manualBoost: 0,
    identityBoost: 0
  };

  // 1. Color Family Score (Lógica Flexible)
  let familyScore = 0.3;
  if (a.colorParent === b.colorParent && a.colorParent !== 'custom' && a.colorParent !== 'otro') {
    familyScore = 1.0;
  } else if (a.colorParent === 'custom' && b.colorParent === 'custom') {
    if (a.customColorFamilyNormalized === b.customColorFamilyNormalized) familyScore = 1.0;
    else familyScore = 0.5;
  } else if (a.colorParent === 'custom' || b.colorParent === 'custom') {
    const custom = a.colorParent === 'custom' ? a : b;
    const fixed = a.colorParent === 'custom' ? b : a;
    const mapped = mapCustomToBase(custom.customColorFamilyNormalized || '');
    if (mapped === fixed.colorParent) familyScore = 0.85;
    else familyScore = 0.25;
  }

  // 1.2 Color LAB Score
  if (a.labColor && b.labColor) {
    const dE = de2000(a.labColor as any, b.labColor as any);
    const labScore = Math.max(0, 1 - (dE / 30));
    breakdown.colorScore = (labScore * 0.7) + (familyScore * 0.3);
  } else {
    breakdown.colorScore = familyScore;
  }

  // 2. Semantic Score
  const tokensA = Array.from(new Set(normalizeText(a.name + ' ' + (a.description || '')).split(' ')));
  const tokensB = new Set(normalizeText(b.name + ' ' + (b.description || '')).split(' '));
  const commonStrong = tokensA.filter(t => STRONG_TOKENS.includes(t) && tokensB.has(t));
  const commonGeneric = tokensA.filter(t => GENERIC_TOKENS.includes(t) && tokensB.has(t));
  breakdown.semanticScore = Math.min(1.0, (commonStrong.length * 0.4) + (commonGeneric.length * 0.1));

  // 3. Texture Score (Aumentado)
  breakdown.textureScore = TEXTURE_RELATION[a.surfaceTexture]?.[b.surfaceTexture] || 0.35;

  // 4. Finish Score
  breakdown.finishScore = a.finish === b.finish ? 1.0 : 0.6;

  // 5. Lightness Score
  if (a.labColor && b.labColor) {
    const diffL = Math.abs(a.labColor.l - b.labColor.l);
    breakdown.lightnessScore = Math.max(0, 1 - (diffL / 50));
  } else {
    breakdown.lightnessScore = a.colorSub === b.colorSub ? 1.0 : 0.5;
  }

  // 6. Confidence Score
  const getConf = (source?: string) => {
    if (source === 'ncs') return 1.0;
    if (source === 'manual') return 1.0;
    if (source === 'analytical_v6.1') return 0.9;
    return 0.7;
  };
  breakdown.confidenceScore = (getConf(a.colorSource) + getConf(b.colorSource)) / 2;

  // 7. Identity Boost
  breakdown.identityBoost = calculateIdentityBoost(a, b);

  // 8. Manual Boost
  if (a.manualAffinity?.[b.id]) breakdown.manualBoost = a.manualAffinity[b.id] / 100;
  else if (a.manualVerifiedMatches?.includes(b.id)) breakdown.manualBoost = 1.0;

  // Ponderación Final (v6.9 - Texture & Identity Focus)
  breakdown.total = 
    breakdown.colorScore * 0.35 +
    breakdown.textureScore * 0.22 +
    breakdown.semanticScore * 0.15 +
    breakdown.identityBoost * 0.10 +
    breakdown.finishScore * 0.08 +
    breakdown.lightnessScore * 0.07 +
    breakdown.confidenceScore * 0.03;

  breakdown.total = Math.max(0, Math.min(1, breakdown.total));
  return breakdown;
}

export function getThresholdByTexture(texture: string): number {
  const thresholds: Record<string, number> = {
    liso: 0.62,      // Ajustado para distribución deflactada
    metal: 0.60,
    textil: 0.60,
    cementicio: 0.58,
    piedra: 0.58,
    madera: 0.64,    // Bajado de 0.70 para recuperar casos comerciales
    otro: 0.60
  };
  return thresholds[texture] || 0.60;
}

export async function classifyPanel(panel: Panel): Promise<ClassifiedPanel> {
  const lab = panel.labColor || (panel.hexColor ? toLab(panel.hexColor) : undefined);
  
  const parentD = detectColorParentDetailed(panel.name, lab as any);
  const subD = detectColorSubDetailed(lab?.l);
  const textureD = detectSurfaceTextureDetailed(panel.name, panel.code);
  const finishD = detectFinishDetailed(panel.name, panel.code);

  return {
    ...panel,
    colorParent: panel.colorParent || parentD.value,
    colorSub: panel.colorSub || subD.value,
    surfaceTexture: panel.surfaceTexture || textureD.value,
    finish: panel.finish || finishD.value,
    hasGrain: panel.hasGrain !== undefined ? panel.hasGrain : (textureD.value === 'madera'),
    labColor: lab as any,
    textureConfidence: textureD.confidence,
    colorConfidence: parentD.confidence
  } as ClassifiedPanel;
}

export function generateExplanation(breakdown: ScoreBreakdown, target: ClassifiedPanel, match: ClassifiedPanel): string {
  const reasons: string[] = [];
  
  // 1. Detección de incompatibilidad táctil permitida por identidad comercial
  const isFinishMismatch = (target.finish === 'brillo' && (match.finish === 'mate' || match.finish === 'supermate')) ||
                           (match.finish === 'brillo' && (target.finish === 'mate' || target.finish === 'supermate'));

  if (isFinishMismatch && (target.name.toLowerCase() === match.name.toLowerCase() || (breakdown.identityBoost ?? 0) > 0.5)) {
    return "Alternativa cromática del mismo diseño o familia visual, pero con acabado distinto. Validar brillo/supermate antes de recomendar como reemplazo directo.";
  }

  if (breakdown.colorScore > 0.85) reasons.push("color casi idéntico");
  else if (breakdown.colorScore > 0.7) reasons.push("tonalidad muy similar");

  if (target.surfaceTexture === match.surfaceTexture) reasons.push(`misma textura ${target.surfaceTexture}`);
  
  if (breakdown.semanticScore > 0.5) reasons.push("diseño semánticamente relacionado");

  if (target.finish === match.finish) reasons.push("mismo acabado");

  if (reasons.length === 0) return "Recomendado por proximidad cromática general.";
  
  const main = reasons.slice(0, 2).join(", ");
  const cap = main.charAt(0).toUpperCase() + main.slice(1);
  return `${cap}. ${reasons.length > 2 ? `Incluye también ${reasons[2]}.` : ""}`;
}

export async function rankMatches(target: Panel, allPanels: Panel[]): Promise<EquivalenceMatch[]> {
  const targetClass = await classifyPanel(target);
  const threshold = getThresholdByTexture(targetClass.surfaceTexture);
  
  const scored = await Promise.all(allPanels
    .map(async p => {
      const candidateClass = await classifyPanel(p);
      if (!passesHardFilters(targetClass, candidateClass)) return null;
      
      const breakdown = calculateScoreBreakdown(targetClass, candidateClass);
      
      if (breakdown.total < threshold) return null;

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        code: p.code,
        score: Math.round(breakdown.total * 100),
        explanation: generateExplanation(breakdown, targetClass, candidateClass),
        breakdown
      } as EquivalenceMatch;
    })
  );

  return scored
    .filter((m): m is EquivalenceMatch => m !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

export async function rankMatchesForPanelId(id: string): Promise<EquivalenceMatch[]> {
  const db = getDb();
  const panelRef = doc(db, 'panels', id);
  const panelSnap = await getDoc(panelRef);
  
  if (!panelSnap.exists()) return [];
  const target = { id: panelSnap.id, ...panelSnap.data() } as Panel;

  const panelsSnap = await getDocs(collection(db, 'panels'));
  const allPanels = panelsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Panel[];

  return rankMatches(target, allPanels);
}

export async function computeEquivalenceResults(allPanels: Panel[]) {
  const results = [];

  for (const target of allPanels) {
    try {
      const matches = await rankMatches(target, allPanels);
      
      const result = {
        targetId: target.id,
        targetCode: target.code || target.id,
        targetName: target.name,
        targetBrand: target.brand,
        matches,
        text: matches.map(m => m.explanation).join('\n'),
        lastSync: new Date().toISOString()
      };

      results.push(result);
    } catch (e) {
      console.error(`Error procesando ${target.id}:`, e);
    }
  }
  return results;
}

export async function runEquivalenceSync(allPanels: Panel[]) {
  const db = getDb();
  const results = await computeEquivalenceResults(allPanels);

  for (const result of results) {
    await setDoc(doc(db, 'equivalences', result.targetId), result);
  }

  return results;
}

// Legacy exports for compatibility with migration scripts
export function detectColor(text: string): string { return detectColorParentDetailed(text).value; }
export function detectTexture(text: string): string { return detectSurfaceTextureDetailed(text).value; }
export function detectTone(text: string): string { return detectColorSubDetailed().value; }
export function detectTemp(text: string): string {
  const norm = text.toLowerCase();
  if (norm.includes('calido') || norm.includes('warm')) return 'calido';
  if (norm.includes('frio') || norm.includes('cold') || norm.includes('cool')) return 'frio';
  return 'neutro';
}

export const classify = classifyPanel;
export const calculateScore = calculateScoreBreakdown;
