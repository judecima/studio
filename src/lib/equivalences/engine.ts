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
 * Calcula el puntaje de similitud entre dos paneles con un enfoque más flexible y balanceado.
 */
export function calculateScore(a: ClassifiedPanel, b: ClassifiedPanel): number {
  if (a.id === b.id) return 1;

  let score = 1.0;

  // 1. COMPARACIÓN CROMÁTICA (Base del match)
  const labA = a.labColor;
  const labB = b.labColor;

  if (labA && labB) {
    const dE = de2000(labA as any, labB as any);
    // Delta E de 30 como límite para "alguna similitud visual" en melaminas
    const colorMatch = Math.max(0, 1 - (dE / 30));
    score = colorMatch;
  } else {
    // Si no hay LAB, usamos categorías con penalidad fija
    if (a.colorParent !== b.colorParent) score *= 0.65;
    if (a.colorSub !== b.colorSub) score *= 0.9;
  }

  // 2. PENALIZACIONES POR ESTRUCTURA (FLEXIBILIZADAS)
  
  // DIFERENCIA DE VETA: Reducida de 60% a 25% para permitir cruces liso/madera cercanos
  if (a.hasGrain !== b.hasGrain) {
    score *= 0.75; 
  }

  // DIFERENCIA DE FAMILIA CROMÁTICA (Sistema de Vecinos)
  if (a.colorParent !== b.colorParent) {
    const neighbors: Record<string, string[]> = {
      'blanco': ['beige', 'gris'],
      'beige': ['blanco', 'marron', 'naranja'],
      'marron': ['beige', 'naranja', 'negro'],
      'gris': ['negro', 'azul', 'blanco'],
      'negro': ['gris', 'marron'],
      'azul': ['gris', 'verde', 'violeta'],
      'verde': ['azul', 'amarillo'],
      'amarillo': ['naranja', 'verde'],
      'naranja': ['amarillo', 'rojo', 'beige'],
      'rojo': ['naranja', 'rosa', 'violeta'],
      'violeta': ['rojo', 'azul', 'rosa'],
      'rosa': ['rojo', 'violeta', 'blanco']
    };

    const isNeighbor = neighbors[a.colorParent]?.includes(b.colorParent) || 
                      neighbors[b.colorParent]?.includes(a.colorParent);
    
    if (isNeighbor) {
      score *= 0.85; // Penalidad leve (15%) para familias cercanas
    } else {
      score *= 0.60; // Penalidad mayor (40%) para familias opuestas
    }
  }

  // 3. ATRIBUTOS DE SUPERFICIE
  // Textura (Concreto vs Madera, etc)
  if (a.surfaceTexture !== b.surfaceTexture) {
    score *= 0.9;
  }

  // Acabado (Mate vs Brillo)
  if (a.finish !== b.finish) {
    score *= 0.95;
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
  const isDiffGrain = target.hasGrain !== match.hasGrain;
  const isDiffFamily = target.colorParent !== match.colorParent;

  if (percentage > 90) return `Coincidencia técnica excelente. El tono y acabado son prácticamente idénticos entre marcas.`;
  
  if (isDiffGrain && percentage > 70) {
    return `Similitud cromática muy alta (${percentage}%). Es una gran alternativa si el diseño con veta no es un requisito excluyente.`;
  }

  if (isDiffFamily && percentage > 65) {
    return `Aunque pertenecen a familias distintas (${target.colorParent} vs ${match.colorParent}), visualmente mantienen una armonía tonal muy equilibrada.`;
  }

  return `Alternativa visual aceptable. Recomendado por proximidad en el espectro cromático industrial.`;
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
