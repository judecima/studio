import fs from 'fs';
import path from 'path';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
// @ts-ignore
import { converter, differenceCiede2000 } from 'culori';
import { Panel, ClassifiedPanel } from '@/lib/types';
import { FAPLAC_MASTER_DATA, EGGER_MASTER_DATA, inferColorGroupFromNcs, ncsToHex } from '@/lib/constants/colors';

import { 
  normalizeName, 
  detectColor, 
  detectTexture, 
  detectTone,
  detectTemp,
  getColorParent,
  getColorSub
} from './classifier';

function getDb() {
  const sdk = initializeFirebase();
  return sdk.firestore;
}

const toLab = converter('lab');
const de2000 = differenceCiede2000();

let sharpInstance: any = null;
let ncsInstance: any = null;
let colorCentroids: { lab: { l: number; a: number; b: number }; name: string }[] | null = null;

async function loadColorCentroids() {
  if (colorCentroids) return colorCentroids;
  const db = getDb();
  try {
    const snap = await getDocs(collection(db, 'color_groups'));
    colorCentroids = snap.docs.map(doc => ({
      lab: doc.data().lab,
      name: doc.data().name.toLowerCase(),
    }));
    return colorCentroids;
  } catch (e) {
    return [];
  }
}

const classificationCache = new Map<string, ClassifiedPanel>();

async function getCachedClassifiedPanel(panel: Panel): Promise<ClassifiedPanel> {
  if (classificationCache.has(panel.id)) return classificationCache.get(panel.id)!;
  const classified = await classifyAndSync(panel);
  classificationCache.set(panel.id, classified);
  return classified;
}

async function getNcsLab(ncsCode: string): Promise<{ l: number; a: number; b: number } | null> {
  if (!ncsCode) return null;
  const cleanCode = ncsCode.replace(/\*/g, '').trim().toUpperCase();
  
  const hex = ncsToHex(cleanCode);
  if (hex) {
    const lab = toLab(hex);
    if (lab) return { l: lab.l, a: lab.a, b: lab.b };
  }

  try {
    const db = getDb();
    const cacheRef = doc(db, 'ncs_cache', cleanCode);
    const cacheSnap = await getDoc(cacheRef);
    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      if (data.l !== undefined) return { l: data.l, a: data.a, b: data.b };
    }
  } catch (e) {}

  try {
    if (!ncsInstance) {
      const ncsModule = await import('ncs-color');
      ncsInstance = (ncsModule as any).default || ncsModule;
    }
    const rgbStr = ncsInstance.rgb(cleanCode);
    if (rgbStr) {
      const lab = toLab(rgbStr);
      if (lab) {
        const result = { l: lab.l, a: lab.a, b: lab.b };
        const db = getDb();
        await setDoc(doc(db, 'ncs_cache', cleanCode), result);
        return result;
      }
    }
  } catch (error) {}

  return null;
}

async function getAverageColor(imagePath: string): Promise<{ r: number; g: number; b: number } | undefined> {
  const fullPath = path.join(process.cwd(), 'public', imagePath);
  if (!fs.existsSync(fullPath)) return undefined;

  try {
    if (!sharpInstance) {
      const sharpModule = await import('sharp');
      sharpInstance = sharpModule.default;
    }
    
    let pipeline = sharpInstance(fullPath);
    const metadata = await pipeline.metadata();
    
    if (metadata.width && metadata.height && (metadata.width > 500 || metadata.height > 500)) {
      pipeline = pipeline.resize(500, 500, { fit: 'inside' });
    }
    
    const { data, info } = await pipeline
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelCount = info.width * info.height;
    let r = 0, g = 0, b = 0;
    
    const channels = info.channels || 3;
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * channels;
      r += data[offset];
      g += data[offset + 1];
      r += data[offset + 2];
    }
    
    return {
      r: Math.floor(r / pixelCount),
      g: Math.floor(g / pixelCount),
      b: Math.floor(b / pixelCount),
    };
  } catch (e) {
    return undefined;
  }
}

function rgbToLab(r: number, g: number, b: number) {
  const lab = toLab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
  return { l: lab?.l ?? 0, a: lab?.a ?? 0, b: lab?.b ?? 0 };
}

async function classifyAndSync(panel: Panel): Promise<ClassifiedPanel> {
  const panelId = panel.id.toLowerCase();
  const baseId = panelId.replace(/^(faplac|egger|arauco|masisa)-/, '');
  
  // 1. Respetar valores manuales si existen en el objeto panel recibido
  const manualTexture = panel.surfaceTexture || (panel as any).texture;
  const manualHasGrain = panel.hasGrain;

  const masterInfo = FAPLAC_MASTER_DATA[baseId] || EGGER_MASTER_DATA[baseId] || EGGER_MASTER_DATA[panel.code?.toLowerCase() || ''];

  if (masterInfo) {
    return {
      ...panel,
      certifiedLab: masterInfo.lab,
      colorGroup: masterInfo.cat.toLowerCase(),
      colorParent: masterInfo.cat.toLowerCase(),
      colorSub: getColorSub(masterInfo.lab.l),
      tone: detectTone(masterInfo.lab.l),
      temperature: 'neutral',
      // Priorizar manual sobre detección automática incluso en Master Data
      texture: manualTexture || detectTexture(panel.name, (panel as any).surfaceTexture),
      hasGrain: manualHasGrain !== undefined ? manualHasGrain : (manualTexture === 'madera'),
      isSmooth: manualTexture === 'liso' || manualTexture === 'mate',
      colorSource: 'certified_master_list'
    } as ClassifiedPanel;
  }

  const detectedTextureValue = detectTexture(panel.name, (panel as any).surfaceTexture);
  const classified: any = {
    ...panel,
    texture: manualTexture || detectedTextureValue,
    hasGrain: manualHasGrain !== undefined ? manualHasGrain : (detectedTextureValue === 'madera'),
    isSmooth: manualTexture ? (manualTexture === 'liso' || manualTexture === 'mate') : (detectedTextureValue === 'liso')
  };

  let needsSync = false;
  const ncsCode = panel.ncs || (panel as any).ncsCode || (panel as any).colorData?.ncs;
  let colorGroup: string | null = detectColor(panel.name, ncsCode);
  if (colorGroup === 'otro') colorGroup = null;

  let lab = (panel as any).labColor || panel.labColor;
  if (!lab && (panel as any).hexColor) {
    lab = toLab((panel as any).hexColor);
  }

  if (!colorGroup && lab) {
    const centroids = await loadColorCentroids();
    if (centroids && centroids.length) {
      let minDE = Infinity;
      let best = null;
      for (const cent of centroids) {
        const dE = de2000(lab, cent.lab);
        if (dE < minDE) {
          minDE = dE;
          best = cent.name;
        }
      }
      if (best) colorGroup = best.toLowerCase();
    }
  }

  classified.colorGroup = (colorGroup || 'otro').toLowerCase();
  classified.tone = (panel.colorHue && panel.colorHue !== 'medium') ? panel.colorHue : detectTone(lab?.l || 50);
  classified.temperature = (panel as any).temperature || 'neutral';
  
  if (lab) {
    classified.colorParent = getColorParent(lab, panel.name).toLowerCase();
    classified.colorSub = getColorSub(lab.l).toLowerCase();
  }

  if (!lab && ncsCode) {
    lab = await getNcsLab(ncsCode);
    if (lab) {
      needsSync = true;
      classified.colorSource = 'ncs_objective';
    }
  }

  if (!lab && panel.mainImage) {
    const avg = await getAverageColor(panel.mainImage);
    if (avg) {
      lab = rgbToLab(avg.r, avg.g, avg.b);
      needsSync = true;
      classified.colorSource = 'visual_estimation';
    }
  }

  if (needsSync && lab) {
    try {
      const db = getDb();
      await updateDoc(doc(db, 'panels', panel.id), {
        labColor: lab,
        colorGroup: classified.colorGroup,
        colorHue: classified.tone,
        colorParent: classified.colorParent,
        colorSub: classified.colorSub,
        surfaceTexture: classified.texture,
        hasGrain: classified.hasGrain,
        isSmooth: classified.isSmooth,
        colorSource: classified.colorSource || 'analytical_v6.6',
        updatedAt: new Date().toISOString()
      });
    } catch (e) {}
  }

  classified.certifiedLab = lab;
  return classified as ClassifiedPanel;
}

function calculateScore(a: ClassifiedPanel, b: ClassifiedPanel): number {
  const labA = a.certifiedLab || (a as any).labColor;
  const labB = b.certifiedLab || (b as any).labColor;

  let colorScore = 0;
  if (labA && labB) {
    const dE = de2000(labA, labB);
    colorScore = Math.max(0, 1 - (dE / 18));
  } else {
    colorScore = (a.colorGroup.toLowerCase() === b.colorGroup.toLowerCase()) ? 0.8 : 0.2;
  }

  const isMetalSmooth = (a.texture === 'metal' && b.texture === 'liso') || (a.texture === 'liso' && b.texture === 'metal');
  const textureBonus = (a.texture === b.texture || isMetalSmooth) ? 0.2 : 0.1;
  let finalScore = (colorScore * 0.8) + textureBonus;

  const normA = a.name.toLowerCase();
  const normB = b.name.toLowerCase();
  if (normA.includes('almendra') && normB.includes('almendra')) {
    finalScore = Math.min(1, finalScore + 0.15);
  }

  const parentA = (a.colorParent || a.colorGroup || 'otro').toLowerCase();
  const parentB = (b.colorParent || b.colorGroup || 'otro').toLowerCase();
  const subA = (a.colorSub || a.tone || 'medio').toLowerCase();
  const subB = (b.colorSub || b.tone || 'medio').toLowerCase();

  if (parentA === parentB) {
    finalScore = Math.min(1, finalScore + 0.05);
    if (subA === subB) {
      finalScore = Math.min(1, finalScore + 0.05);
    }
  } else if (parentA !== 'otro' && parentB !== 'otro') {
    finalScore *= 0.6; 
  }

  // 🛡️ CRÍTICO: La veta es un factor excluyente para el 100%
  if (a.hasGrain !== b.hasGrain) {
    finalScore *= 0.4; // Penalización masiva si uno tiene veta y el otro no
  }

  return Math.min(1, Math.max(0, finalScore));
}

function describePanel(panel: ClassifiedPanel): string {
  const parentName = panel.colorParent || panel.colorGroup;
  const subName = panel.colorSub || panel.tone || 'medio';
  const texture = panel.texture;
  return `${parentName} ${subName} (${texture})`;
}

function generateExplanation(target: ClassifiedPanel, match: ClassifiedPanel, score: number): string {
  const percentage = Math.round(score * 100);
  const targetDesc = describePanel(target);
  const matchDesc = describePanel(match);
  let colorReason = '';
  if (target.certifiedLab && match.certifiedLab) {
    const dE = de2000(target.certifiedLab, match.certifiedLab);
    if (dE < 5) colorReason = 'color prácticamente idéntico';
    else if (dE < 10) colorReason = 'color muy similar';
    else if (dE < 20) colorReason = 'color cercano';
    else colorReason = 'color moderadamente similar';
  } else {
    if (target.colorGroup.toLowerCase() === match.colorGroup.toLowerCase()) colorReason = `mismo grupo cromático (${target.colorGroup})`;
    else colorReason = `grupo cromático ${target.colorGroup} vs ${match.colorGroup}`;
  }
  
  let textureMsg = target.hasGrain === match.hasGrain 
    ? (target.hasGrain ? 'ambos son diseños con veta.' : 'ambos son colores lisos.')
    : (target.hasGrain ? 'el original tiene veta pero este es liso.' : 'el original es liso pero este tiene veta.');

  let conclusion = percentage >= 85 ? 'Coincidencia técnica excelente' : (percentage >= 70 ? 'Equivalencia visual recomendada' : 'Alternativa técnica sugerida');
  return `${match.name} (${match.brand}) es ${matchDesc}. Su ${colorReason} y ${textureMsg} ${conclusion} con un ${percentage}% de similitud.`;
}

export async function runEquivalenceSync(allPanels: Panel[]) {
  classificationCache.clear();
  const db = getDb();
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < allPanels.length; i += BATCH_SIZE) {
    const batch = allPanels.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async (target) => {
      try {
        const targetClass = await getCachedClassifiedPanel(target);
        const candidates = allPanels.filter(p => p.id !== target.id);
        
        const scored = await Promise.all(candidates.map(async (candidate) => {
          const candClass = await getCachedClassifiedPanel(candidate);
          const score = calculateScore(targetClass, candClass);
          return { panel: candClass, score };
        }));

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
            explanation: generateExplanation(targetClass, m.panel as any, m.score)
          })),
          text: topMatches.map(m => generateExplanation(targetClass, m.panel as any, m.score)).join('\n'),
          lastSync: new Date().toISOString()
        };

        await setDoc(doc(db, 'equivalences', target.id), result);
        return result;
      } catch (e) {
        return null;
      }
    }));
    results.push(...batchResults.filter(Boolean));
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return results;
}

export {
  calculateScore,
  classifyAndSync as classify,
  generateExplanation,
  detectColor,
  detectTexture,
  detectTone,
  detectTemp
};
