
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { converter, differenceCiede2000 } from 'culori';
import { Panel, ClassifiedPanel, ColorParent, ColorSub, SurfaceTexture, Finish } from '@/lib/types';
import { 
  detectColorParent, 
  detectColorSub, 
  detectSurfaceTexture, 
  detectFinish 
} from './classifier';

const toLab = converter('lab');
const de2000 = differenceCiede2000();

function getDb() {
  const sdk = initializeFirebase();
  return sdk.firestore;
}

/**
 * Calcula el puntaje de similitud entre dos paneles con penalizaciones estrictas.
 */
export function calculateScore(a: ClassifiedPanel, b: ClassifiedPanel): number {
  if (a.id === b.id) return 1;

  let score = 1.0;

  // 1. COMPARACIÓN CROMÁTICA (Base del match)
  const labA = a.labColor;
  const labB = b.labColor;

  if (labA && labB) {
    const dE = de2000(labA as any, labB as any);
    // Un Delta E de 25 se considera el límite para ser "similar" en industria melamínica
    const colorMatch = Math.max(0, 1 - (dE / 25));
    score = colorMatch;
  } else {
    // Si no hay LAB, usamos categorías (menos preciso)
    if (a.colorParent !== b.colorParent) score *= 0.5;
    if (a.colorSub !== b.colorSub) score *= 0.8;
  }

  // 2. PENALIZACIONES ESTRUCTURALES (CRÍTICAS)
  
  // DIFERENCIA DE VETA: Penalización masiva
  if (a.hasGrain !== b.hasGrain) {
    score *= 0.4; // Reduce el score un 60%. Un liso nunca es match de una madera.
  }

  // DIFERENCIA DE FAMILIA CROMÁTICA: Si el motor detectó familias distintas, castigar fuerte.
  if (a.colorParent !== b.colorParent) {
    // Excepción: Marrón y Madera a veces se cruzan en maderas
    const isWoodCross = (a.colorParent === 'marron' && b.colorParent === 'beige') || (a.colorParent === 'beige' && b.colorParent === 'marron');
    if (!isWoodCross) {
      score *= 0.5;
    }
  }

  // 3. ATRIBUTOS DE SUPERFICIE
  
  // Textura (Concreto vs Madera, etc)
  if (a.surfaceTexture !== b.surfaceTexture) {
    score *= 0.8;
  }

  // Acabado (Mate vs Brillo)
  if (a.finish !== b.finish) {
    score *= 0.9;
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Clasifica un panel asegurando que los valores manuales de Firestore tengan prioridad.
 */
export async function classify(panel: Panel): Promise<ClassifiedPanel> {
  const lab = panel.labColor || (panel.hexColor ? toLab(panel.hexColor) : undefined);
  
  // Solo auto-detectamos si el campo está vacío o es 'otro'/'liso' por defecto
  const colorParent = (panel.colorParent && panel.colorParent !== 'otro') 
    ? panel.colorParent 
    : detectColorParent(panel.name, lab as any);
    
  const colorSub = (panel.colorSub) 
    ? panel.colorSub 
    : (lab ? detectColorSub(lab.l) : 'medio claro');

  const surfaceTexture = (panel.surfaceTexture && panel.surfaceTexture !== 'liso')
    ? panel.surfaceTexture as SurfaceTexture
    : detectSurfaceTexture(panel.name, panel.code);

  const finish = (panel.finish)
    ? panel.finish as Finish
    : detectFinish(panel.name, panel.code);

  return {
    ...panel,
    colorParent,
    colorSub,
    surfaceTexture,
    finish,
    hasGrain: panel.hasGrain !== undefined ? panel.hasGrain : (surfaceTexture === 'madera'),
    labColor: lab as any,
    certifiedLab: lab as any
  } as ClassifiedPanel;
}

export function generateExplanation(target: ClassifiedPanel, match: ClassifiedPanel, score: number): string {
  const percentage = Math.round(score * 100);
  
  if (target.hasGrain !== match.hasGrain) {
    return `${match.name} (${match.brand}) tiene un ${percentage}% de similitud cromática, pero carece de la veta del diseño original.`;
  }

  if (target.colorParent !== match.colorParent) {
    return `${match.name} (${match.brand}) se asemeja en textura, pero pertenece a una familia cromática distinta (${match.colorParent}).`;
  }

  let text = `${match.name} es una excelente alternativa de ${match.brand}. `;
  if (score > 0.9) text += "Coincidencia técnica casi idéntica en color y superficie.";
  else if (score > 0.75) text += "Tonalidad y textura muy equilibradas.";
  else text += "Similitud visual aceptable para reemplazo técnico.";

  return text;
}

export async function runEquivalenceSync(allPanels: Panel[]) {
  const db = getDb();
  const results = [];

  // Clasificar todos primero para tener una base limpia
  const classifiedAll = await Promise.all(allPanels.map(p => classify(p)));

  for (const target of classifiedAll) {
    try {
      const candidates = classifiedAll.filter(p => p.id !== target.id);
      
      const scored = candidates.map(candidate => {
        const score = calculateScore(target, candidate);
        return { panel: candidate, score };
      });

      const topMatches = scored
        .filter(m => m.score >= 0.6) 
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);

      const result = {
        targetId: target.id,
        targetCode: target.code || target.id,
        targetName: target.name,
        targetBrand: target.brand,
        matches: topMatches.map(m => ({
          id: m.panel.id,
          name: m.panel.name,
          brand: m.panel.brand,
          code: m.panel.code,
          score: Math.round(m.score * 100),
          explanation: generateExplanation(target, m.panel, m.score)
        })),
        text: topMatches.map(m => generateExplanation(target, m.panel, m.score)).join('\n'),
        lastSync: new Date().toISOString()
      };

      await setDoc(doc(db, 'equivalences', target.id), result);
      results.push(result);
    } catch (e) {
      console.error(`Error procesando ${target.id}:`, e);
    }
  }
  return results;
}
