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

// 🚀 SINGLETONS: Evitar fugas de memoria por imports dinámicos en HMR
let sharpInstance: any = null;
let ncsInstance: any = null;

// 🚀 CLUSTERING: Cache de centroides en memoria
let colorCentroids: { lab: { l: number; a: number; b: number }; name: string }[] | null = null;

async function loadColorCentroids() {
  if (colorCentroids) return colorCentroids;
  const db = getDb();
  try {
    const snap = await getDocs(collection(db, 'color_groups'));
    colorCentroids = snap.docs.map(doc => ({
      lab: doc.data().lab,
      name: doc.data().name,
    }));
    return colorCentroids;
  } catch (e) {
    console.error("⚠️ Error cargando centroides:", (e as Error).message);
    return [];
  }
}

/**
 * 🔥 OPTIMIZACIÓN: Cache de clasificación en memoria
 */
const classificationCache = new Map<string, ClassifiedPanel>();

async function getCachedClassifiedPanel(panel: Panel): Promise<ClassifiedPanel> {
  if (classificationCache.has(panel.id)) return classificationCache.get(panel.id)!;
  const classified = await classifyAndSync(panel);
  classificationCache.set(panel.id, classified);
  return classified;
}

// ----------------------------------------------------------------------
// NCS → LAB con caché en Firestore
// ----------------------------------------------------------------------
async function getNcsLab(ncsCode: string): Promise<{ l: number; a: number; b: number } | null> {
  if (!ncsCode) return null;
  const cleanCode = ncsCode.replace(/\*/g, '').trim().toUpperCase();
  
  // 1. Intentar con mapeo HEX (más rápido)
  const hex = ncsToHex(cleanCode);
  if (hex) {
    const lab = toLab(hex);
    if (lab) return { l: lab.l, a: lab.a, b: lab.b };
  }

  // 2. Buscar en Firestore
  try {
    const db = getDb();
    const cacheRef = doc(db, 'ncs_cache', cleanCode);
    const cacheSnap = await getDoc(cacheRef);
    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      if (data.l !== undefined) return { l: data.l, a: data.a, b: data.b };
    }
  } catch (e) {
    console.warn(`⚠️ Error leyendo cache NCS para ${cleanCode}:`, (e as Error).message);
  }

  // 3. Calcular con ncs-color y guardar en caché
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
  } catch (error) {
    // Silencioso, usamos fallback
  }

  return null;
}

// ----------------------------------------------------------------------
// Muestreo de imagen (Optimizado con Sharp v7.0)
// ----------------------------------------------------------------------
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
    
    // 🔥 Redimensionar a 500px para análisis ultra-veloz si es muy grande
    if (metadata.width && metadata.height && (metadata.width > 500 || metadata.height > 500)) {
      pipeline = pipeline.resize(500, 500, { fit: 'inside' });
    }
    
    const { data, info } = await pipeline
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelCount = info.width * info.height;
    let r = 0, g = 0, b = 0;
    
    // Procesar buffer raw de forma eficiente
    const channels = info.channels || 3;
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * channels;
      r += data[offset];
      g += data[offset + 1];
      b += data[offset + 2];
    }
    
    return {
      r: Math.floor(r / pixelCount),
      g: Math.floor(g / pixelCount),
      b: Math.floor(b / pixelCount),
    };
  } catch (e) {
    console.error(`❌ Error en getAverageColor Sharp (${imagePath}):`, (e as Error).message);
    return undefined;
  }
}



function rgbToLab(r: number, g: number, b: number) {
  const lab = toLab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
  return { l: lab?.l ?? 0, a: lab?.a ?? 0, b: lab?.b ?? 0 };
}

// ----------------------------------------------------------------------
// Clasificación principal
// ----------------------------------------------------------------------
async function classifyAndSync(panel: Panel): Promise<ClassifiedPanel> {
  const panelId = panel.id.toLowerCase();
  const masterInfo = FAPLAC_MASTER_DATA[panelId] || EGGER_MASTER_DATA[panelId] || EGGER_MASTER_DATA[panel.code?.toLowerCase() || ''];

  if (masterInfo) {
    return {
      ...panel,
      certifiedLab: masterInfo.lab,
      colorGroup: masterInfo.cat,
      tone: detectTone(masterInfo.lab.l),
      temperature: 'neutral',
      texture: detectTexture(panel.name, (panel as any).surfaceTexture),
      colorSource: 'certified_master_list'
    } as ClassifiedPanel;
  }

  const n = normalizeName(`${panel.name} ${panel.code} ${panel.id} ${(panel as any).colorData?.ncs || ''}`);

  const classified: any = {
    ...panel,
    texture: detectTexture(panel.name, (panel as any).surfaceTexture),
    hasGrain: detectTexture(panel.name, (panel as any).surfaceTexture) === 'madera',
    isSmooth: detectTexture(panel.name, (panel as any).surfaceTexture) === 'liso'
  };

  let needsSync = false;

  // ✅ PRIORIDAD 1: SEMÁNTICA (Keywords como 'Safari' o 'Almendra' ganan)
  const ncsCode = panel.ncs || (panel as any).ncsCode || (panel as any).colorData?.ncs;
  let colorGroup: string | null = detectColor(panel.name, ncsCode);
  if (colorGroup === 'Otro') colorGroup = null;

  // 🔥 BUG FIX: Ensure changes in group, texture or grain/smoothness trigger a sync
  if (
    colorGroup !== (panel as any).colorGroup || 
    classified.texture !== (panel as any).texture ||
    classified.hasGrain !== (panel as any).hasGrain ||
    classified.isSmooth !== (panel as any).isSmooth
  ) {
    needsSync = true;
  }

  // ✅ PRIORIDAD 2: Centros Cromáticos (Fallback si no hay keyword clara)
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
      if (best) colorGroup = best;
    }
  }

  classified.colorGroup = colorGroup || 'Otro';
  classified.tone = (panel.colorHue && panel.colorHue !== 'medium') ? panel.colorHue : detectTone(lab?.l || 50);
  classified.temperature = (panel as any).temperature || 'neutral';
  
  // ✅ NUEVO: Jerarquía Objetiva (Parent/Sub) con Enfoque Híbrido
  if (lab) {
    classified.colorParent = getColorParent(lab, panel.name);
    classified.colorSub = getColorSub(lab.l);
  }

  // Intentar obtener LAB desde NCS (caché o cálculo)
  if (!lab && ncsCode) {
    lab = await getNcsLab(ncsCode);
    if (lab) {
      needsSync = true;
      classified.colorSource = 'ncs_objective';
    }
  }

  // Si no, usar imagen
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
      console.log(`📡 Sincronizando DB para ${panel.id}: Group=${classified.colorGroup}, needsSync=${needsSync}`);
      await updateDoc(doc(db, 'panels', panel.id), {
        labColor: lab,
        colorGroup: classified.colorGroup,
        colorHue: classified.tone,
        colorParent: classified.colorParent,
        colorSub: classified.colorSub,
        surfaceTexture: classified.texture, // PERSISTENCIA DE TEXTURA UNIFICADA
        hasGrain: classified.hasGrain,
        isSmooth: classified.isSmooth,
        colorSource: classified.colorSource || 'analytical_v6.1',
        updatedAt: new Date().toISOString()
      });
    } catch (e: any) { 
      console.error(`❌ Error sincronizando ${panel.id}:`, e.message);
    }
  }

  classified.certifiedLab = lab;
  return classified as ClassifiedPanel;
}

// ----------------------------------------------------------------------
// Cálculo de similitud
// ----------------------------------------------------------------------
function calculateScore(a: ClassifiedPanel, b: ClassifiedPanel): number {
  const labA = a.certifiedLab || (a as any).labColor;
  const labB = b.certifiedLab || (b as any).labColor;

  let colorScore = 0;
  if (labA && labB) {
    const dE = de2000(labA, labB);
    // Tolerancia optimizada para comparaciones cromáticas puras
    colorScore = Math.max(0, 1 - (dE / 18));
  } else {
    colorScore = (a.colorGroup === b.colorGroup) ? 0.8 : 0.2;
  }

  const isMetalSmooth = (a.texture === 'metal' && b.texture === 'liso') || (a.texture === 'liso' && b.texture === 'metal');
  const textureBonus = (a.texture === b.texture || isMetalSmooth) ? 0.2 : 0.1;
  let finalScore = (colorScore * 0.8) + textureBonus;

  // ✅ NUEVO: Bonificaciones jerárquicas (0.10 si coinciden grupo + sub)
  if (a.colorParent && b.colorParent) {
    if (a.colorParent === b.colorParent && a.colorSub === b.colorSub) {
      finalScore = Math.min(1, finalScore + 0.10);
    } else if (a.colorParent === b.colorParent) {
      finalScore = Math.min(1, finalScore + 0.05);
    }
  }

  // 🛡️ BARRERA DE MATERIAL: Penalización crítica si uno es madera y el otro es sólido
  if (a.hasGrain !== b.hasGrain) {
    finalScore *= 0.3; 
  }

  // 🛡️ BARRERA DE GRUPO: Penalización FUERTE si los grupos OBJECTIVOS no coinciden
  const parentA = a.colorParent || a.colorGroup;
  const parentB = b.colorParent || b.colorGroup;
  
  if (parentA !== parentB && parentA !== 'otro' && parentB !== 'otro') {
    finalScore *= 0.6; 
  }

  return Math.min(1, Math.max(0, finalScore));
}

/**
 * Genera una descripción textual de un panel para el usuario.
 */
function describePanel(panel: ClassifiedPanel): string {
  const toneMap: any = { dark: 'oscuro', medium: 'medio', light: 'claro' };
  const tempMap: any = { warm: 'cálida', cool: 'fría', neutral: 'neutra' };
  const textureMap: any = {
    madera: 'madera',
    textil: 'textil',
    concreto: 'concreto',
    metal: 'metal',
    liso: 'liso'
  };
  
  const parentName = panel.colorParent || panel.colorGroup;
  const subName = panel.colorSub || toneMap[panel.tone] || 'medio';
  const texture = textureMap[panel.texture] || panel.texture;
  
  return `${parentName} ${subName} (${texture})`;
}

/**
 * Genera una explicación legible de la equivalencia.
 */
function generateExplanation(target: ClassifiedPanel, match: ClassifiedPanel, score: number): string {
  const percentage = Math.round(score * 100);
  const targetDesc = describePanel(target);
  const matchDesc = describePanel(match);

  // Razones de similitud de color
  let colorReason = '';
  if (target.certifiedLab && match.certifiedLab) {
    const dE = de2000(target.certifiedLab, match.certifiedLab);
    if (dE < 5) colorReason = 'color prácticamente idéntico';
    else if (dE < 10) colorReason = 'color muy similar';
    else if (dE < 20) colorReason = 'color cercano';
    else colorReason = 'color moderadamente similar';
  } else {
    if (target.colorGroup === match.colorGroup) colorReason = `mismo grupo cromático (${target.colorGroup})`;
    else colorReason = `grupo cromático ${target.colorGroup} vs ${match.colorGroup}`;
  }

  // Compatibilidad de material y textura
  let groupMsg = '';
  if (target.colorGroup !== match.colorGroup) {
    groupMsg = ` [Grupo: ${target.colorGroup} vs ${match.colorGroup}]`;
  }

  let materialMsg = '';
  if (target.hasGrain !== match.hasGrain) {
    materialMsg = target.hasGrain ? 'discrepancia material (madera vs liso)' : 'discrepancia material (liso vs madera)';
  }

  let textureMsg = '';
  if (target.texture === match.texture) {
    textureMsg = `ambos tienen acabado ${target.texture}.`;
  } else {
    textureMsg = `acabados diferentes (${target.texture} vs ${match.texture}).`;
  }

  const visualMsg = materialMsg ? `${materialMsg} y ${textureMsg}` : textureMsg;

  // Fuente de la equivalencia
  const sourceNote = (match as any).colorSource === 'certified_master_list'
    ? ' (datos maestro de color)'
    : ((match as any).colorSource === 'ncs_objective' ? ' (datos NCS objetivos)' : ' (estimación visual)');

  // Construir mensaje final
  let conclusion = '';
  if (percentage >= 85) conclusion = 'Coincidencia técnica excelente';
  else if (percentage >= 70) conclusion = 'Equivalencia visual recomendada';
  else conclusion = 'Alternativa técnica sugerida';

  return `${match.name} (${match.brand}) es ${matchDesc}.${groupMsg} Su ${colorReason} con el panel objetivo (${targetDesc}) y ${visualMsg} ${conclusion} con un ${percentage}% de similitud${sourceNote}.`;
}

// ----------------------------------------------------------------------
// Procesamiento por lotes
// ----------------------------------------------------------------------
export async function runEquivalenceSync(allPanels: Panel[]) {
  classificationCache.clear(); // 🔥 Limpiar caché antes de cada sincronización
  const db = getDb();
  const BATCH_SIZE = 5;
  const results = [];

  console.log(`🚀 Motor v6.1: iniciando para ${allPanels.length} paneles...`);

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
          .filter(m => m.score > 0.3) // Solo mostrar coincidencias razonables (>30%)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

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
        console.error(`❌ Error en panel ${target.id}:`, (e as Error).message);
        return null;
      }
    }));

    results.push(...batchResults.filter(Boolean));
    console.log(`⏳ Progreso: ${Math.min(i + BATCH_SIZE, allPanels.length)} / ${allPanels.length}`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  classificationCache.clear();
  console.log("✅ Motor v6.1 finalizado.");
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