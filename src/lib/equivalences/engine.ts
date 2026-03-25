import fs from 'fs';
import path from 'path';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
// @ts-ignore
import { converter, differenceCiede2000 } from 'culori';
import { Panel, ClassifiedPanel } from '@/lib/types';
import { FAPLAC_MASTER_DATA, EGGER_MASTER_DATA, inferColorGroupFromNcs, ncsToHex } from '@/lib/constants/colors';

function getDb() {
  const sdk = initializeFirebase();
  return sdk.firestore;
}

const toLab = converter('lab');
const de2000 = differenceCiede2000();

function normalize(text: string): string {
  return (text || '').toLowerCase();
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
    const ncsModule = await import('ncs-color');
    const ncs = (ncsModule as any).default || ncsModule;
    const rgbStr = ncs.rgb(cleanCode);
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
// Clasificación por texto (fallback)
// ----------------------------------------------------------------------
function detectColor(n: string, ncs?: string): string {
  if (ncs) {
    const inferred = inferColorGroupFromNcs(ncs);
    if (inferred) return inferred;
  }
  const norm = normalize(n);
  if (norm.match(/merlot|bordo|granate|vino|rojo|cereza|amaranto|borravino|ciruela|terracota/i)) return 'merlot';
  if (norm.match(/gris|grafito|cemento|plata|aluminio|titanio|plomo|antracita|amberes|shadow|london/i)) return 'gris';
  if (norm.match(/negro|notte|carbon|obsidiana|pizarra/i)) return 'negro';
  if (norm.match(/blanco|nieve|marfil|alpino|polar/i)) return 'blanco';
  if (norm.match(/roble|nogal|madera|veta|fresno|pino|cedro|haya|teka|abeto|lincoln|hamilton|kendall/i)) return 'madera';
  if (norm.match(/beige|arena|caramelo|almendra|crema|sahara|amatista|cajú|tapestry|macadan|cachemira|guijarro/i)) return 'beige';
  return 'otro';
}

function detectTexture(n: string): string {
  const norm = normalize(n);
  if (norm.match(/hilas|hilados|textura hilas|lino|tela|seda|tweed|st10/i)) return 'textil';
  if (norm.match(/cemento|piedra|urban|concreto|st75|st76|st20/i)) return 'piedra';
  if (norm.match(/veta|madera|poro|st12|st19|st22|st32|st37|st38/i)) return 'veteado';
  if (norm.match(/st9|mate|extra mate|satinado|standard|liso|smooth/i)) return 'mate';
  if (norm.match(/gloss|brillo|shining|pg|st30/i)) return 'gloss';
  return 'standard';
}

function detectTone(n: string): string {
  const norm = normalize(n);
  if (norm.match(/oscuro|dark|deep/i)) return 'dark';
  if (norm.match(/claro|light|suave/i)) return 'light';
  return 'medium';
}

function detectTemp(n: string): string {
  const norm = normalize(n);
  if (norm.match(/cálido|warm|beige|roble|miel|terracota/i)) return 'warm';
  if (norm.match(/frío|cool|gris|hielo|shadow/i)) return 'cool';
  return 'neutral';
}

// ----------------------------------------------------------------------
// Muestreo de imagen (Optimizado con Sharp v7.0)
// ----------------------------------------------------------------------
async function getAverageColor(imagePath: string): Promise<{ r: number; g: number; b: number } | undefined> {
  const fullPath = path.join(process.cwd(), 'public', imagePath);
  if (!fs.existsSync(fullPath)) return undefined;

  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default;
    
    let pipeline = sharp(fullPath);
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
      tone: detectTone(panel.name),
      temperature: detectTemp(panel.name),
      texture: detectTexture(panel.name),
      colorSource: 'certified_master_list'
    } as ClassifiedPanel;
  }

  const n = normalize(`${panel.name} ${panel.code} ${panel.id} ${(panel as any).colorData?.ncs || ''}`);
  const ncsCode = (panel as any).colorData?.ncs;

  const classified: any = {
    ...panel,
    colorGroup: detectColor(n, ncsCode),
    tone: detectTone(n),
    temperature: detectTemp(n),
    texture: detectTexture(n)
  };

  let lab = (panel as any).labColor;
  let needsSync = false;

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
      await updateDoc(doc(db, 'panels', panel.id), {
        labColor: lab,
        colorSource: classified.colorSource || 'analytical_v6.1',
        updatedAt: new Date().toISOString()
      });
    } catch (e) { /* ignora errores de actualización */ }
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
    colorScore = Math.max(0, 1 - (dE / 15));
  } else {
    colorScore = (a.colorGroup === b.colorGroup) ? 0.8 : 0.2;
  }

  const textureBonus = (a.texture === b.texture) ? 0.3 : 0.1;
  let finalScore = (colorScore * 0.7) + textureBonus;

  // Penalización si los grupos de color son muy opuestos
  if (a.colorGroup !== b.colorGroup && a.colorGroup !== 'otro' && b.colorGroup !== 'otro') {
    finalScore *= 0.5;
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
    veteado: 'veteado',
    textil: 'textil',
    piedra: 'piedra',
    mate: 'mate',
    gloss: 'brillo',
    standard: 'liso'
  };
  const colorName = panel.colorGroup === 'madera' ? 'diseño de madera' : panel.colorGroup;
  const tone = toneMap[panel.tone] || 'medio';
  const temp = tempMap[panel.temperature] || 'neutra';
  const texture = textureMap[panel.texture] || panel.texture;
  return `${colorName} ${tone} con temperatura ${temp} y acabado ${texture}`;
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

  // Compatibilidad de textura
  let textureMsg = '';
  if (target.texture === match.texture) {
    textureMsg = `ambos tienen acabado ${target.texture}.`;
  } else {
    const targetIsWood = target.texture === 'veteado' || target.texture === 'madera';
    const matchIsWood = match.texture === 'veteado' || match.texture === 'madera';
    if (targetIsWood || matchIsWood) textureMsg = `discrepan en textura (madera vs liso).`;
    else textureMsg = `acabados diferentes (${target.texture} vs ${match.texture}).`;
  }

  // Fuente de la equivalencia
  const sourceNote = (match as any).colorSource === 'certified_master_list'
    ? ' (datos maestro de color)'
    : ((match as any).colorSource === 'ncs_objective' ? ' (datos NCS objetivos)' : ' (estimación visual)');

  // Construir mensaje final
  let conclusion = '';
  if (percentage >= 85) conclusion = 'Coincidencia técnica excelente';
  else if (percentage >= 70) conclusion = 'Equivalencia visual recomendada';
  else conclusion = 'Alternativa técnica sugerida';

  return `${match.name} (${match.brand}) es ${matchDesc}. Su ${colorReason} con el panel objetivo (${targetDesc}) y ${textureMsg} ${conclusion} con un ${percentage}% de similitud${sourceNote}.`;
}

// ----------------------------------------------------------------------
// Procesamiento por lotes
// ----------------------------------------------------------------------
export async function runEquivalenceSync(allPanels: Panel[]) {
  const db = getDb();
  const BATCH_SIZE = 5;
  const results = [];

  console.log(`🚀 Motor v6.1: iniciando para ${allPanels.length} paneles...`);

  for (let i = 0; i < allPanels.length; i += BATCH_SIZE) {
    const batch = allPanels.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(async (target) => {
      try {
        const targetClass = await getCachedClassifiedPanel(target);
        const candidates = allPanels.filter(p => p.brand !== target.brand);

        const scored = await Promise.all(candidates.map(async (candidate) => {
          const candClass = await getCachedClassifiedPanel(candidate);
          const score = calculateScore(targetClass, candClass);
          return { panel: candClass, score }; // ✅ Guardamos el panel clasificado
        }));

        const topMatches = scored.sort((a, b) => b.score - a.score).slice(0, 5);

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