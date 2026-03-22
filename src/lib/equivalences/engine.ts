import fs from 'fs';
import path from 'path';
// culori: best-in-class color science library for JS
import { converter } from 'culori';

import { Panel, ClassifiedPanel } from '@/lib/types';

// 🔥 NORMALIZACIÓN
function normalize(text: string) {
  return (text || '').toLowerCase();
}

// 🔥 DETECCIÓN POR NOMBRE/CÓDIGO
function detectColor(n: string) {
  if (n.includes('gris') || n.includes('grafito') || n.includes('cemento') || n.includes('plata') || n.includes('bruma') || n.includes('aluminio') || n.includes('plateado') || n.includes('titanio') || n.includes('plomo') || n.includes('metalico') || n.includes('cromado') || n.includes('cepillado') || n.includes('amberes') || n.includes('shadow')) return 'gris';
  if (n.includes('negro') || n.includes('notte') || n.includes('carbón')) return 'negro';
  if (n.includes('blanco') || n.includes('nieve') || n.includes('marfil')) return 'blanco';
  if (n.includes('roble') || n.includes('haya') || n.includes('nogal') || n.includes('cedro') || n.includes('teka') || n.includes('madera') || n.includes('veta') || n.includes('fresno') || n.includes('pino') || n.includes('abeto') || n.includes('conifera')) return 'madera';
  if (n.includes('terracota') || n.includes('arcilla') || n.includes('ladrillo') || n.includes('óxido')) return 'terracota';
  if (n.includes('merlot') || n.includes('bordo') || n.includes('granate') || n.includes('vino') || n.includes('rojo') || n.includes('cereza') || n.includes('cobre') || n.includes('ladrillo') || n.includes('amaranto') || n.includes('borravino') || n.includes('ciruela') || n.includes('frambuesa') || n.includes('fucsia') || n.includes('magenta') || n.includes('coral')) return 'merlot';
  if (n.includes('verde') || n.includes('oliva') || n.includes('bosque') || n.includes('esmeralda') || n.includes('musgo')) return 'otro';
  if (n.includes('azul') || n.includes('navy') || n.includes('marino') || n.includes('petroleo') || n.includes('celeste')) return 'otro';
  if (n.includes('taupe') || n.includes('cubanita') || (n.includes('gris') && n.includes('marrón'))) return 'taupe';
  if (n.includes('beige') || n.includes('arena') || n.includes('caramelo') || n.includes('almendra') || n.includes('crema') || n.includes('sahara') || n.includes('amatista') || n.includes('tela') || n.includes('lino')) return 'beige';
  return 'otro';
}

/**
 * Fallback: clasifica por tono usando el HEX de la imagen cuando el nombre no matchea.
 * Convierte el HEX a HSL y determina el grupo por el matiz (hue).
 */
function detectColorFromHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (l < 0.5 ? (max - min) / (max + min) : (max - min) / (2 - max - min));
  
  if (s < 0.12) {
    // Near-neutral: clasificar por luminosidad
    if (l > 0.85) return 'blanco';
    if (l < 0.15) return 'negro';
    return 'gris';
  }

  // Calcular hue
  let hue = 0;
  if (max === r)      hue = (g - b) / (max - min);
  else if (max === g) hue = 2 + (b - r) / (max - min);
  else                hue = 4 + (r - g) / (max - min);
  hue = ((hue * 60) + 360) % 360;

  if (hue < 20 || hue >= 340) return 'merlot';   // Rojo/Rosa/Amaranto
  if (hue < 45)  return 'terracota';               // Naranja/Teja
  if (hue < 70)  return 'beige';                   // Amarillo/Beige cálido
  if (hue < 160) return 'otro';                    // Verde (sin categoría propia aún)
  if (hue < 260) return 'otro';                    // Azul/Violeta
  if (hue < 300) return 'amatista';                // Violeta/Lila
  return 'merlot';                                  // Magenta/Fucsia
}

function detectTone(n: string) {
  if (n.includes('oscuro') || n.includes('dark') || n.includes('profundo') || n.includes('noche')) return 'dark';
  if (n.includes('claro') || n.includes('light') || n.includes('suave') || n.includes('brillante')) return 'light';
  return 'medium';
}

function detectTemp(n: string) {
  if (n.includes('roble') || n.includes('beige') || n.includes('cálido') || n.includes('miel') || n.includes('caramelo') || n.includes('terracota') || n.includes('almendra') || n.includes('amatista') || n.includes('hilados') || n.includes('lino') || n.includes('tela') || n.includes('amaranto') || n.includes('merlot')) return 'warm';
  if (n.includes('gris') || n.includes('negro') || n.includes('frío') || n.includes('hielo')) return 'cool';
  return 'neutral';
}

function detectTexture(n: string) {
  const isWood = n.includes('veta') || n.includes('madera') || n.includes('st3') || n.includes('st1') || n.includes('fresno') || n.includes('roble') || n.includes('pino') || n.includes('haya');
  if (isWood) return 'veteado';
  // Textil: detects Faplac Hilados designs and Egger F-series (Materiales)
  if (n.includes('st10') || n.includes('hilados') || n.includes('textura hilas') || n.includes('lino') || n.includes('tela') || n.includes('amatista') || n.includes('seda') || n.includes('tweed')) return 'textil';
  if (n.includes('st76') || n.includes('st75') || n.includes('urban') || n.includes('cemento') || n.includes('piedra') || n.includes('concrete') || n.includes('concreta') || n.includes('mineral') || n.includes('amberes') || n.includes('bluestone') || n.includes('metropolis')) return 'piedra';
  if (n.includes('st9') || n.includes('mate') || n.includes('extra mate') || n.includes('standard')) return 'mate';
  if (n.includes('gloss') || n.includes('brillo') || n.includes('shining') || n.includes('pg') || n.includes('st30')) return 'gloss';
  return 'standard';
}

/**
 * 🔥 EXTRACCIÓN DE COLOR RGB (Jimp Pixel Sampling)
 * Decodifica el JPEG/PNG correctamente y samplea la región central.
 */
async function getAverageColor(imagePath: string): Promise<{ r: number; g: number; b: number } | undefined> {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    if (!fs.existsSync(fullPath)) return undefined;

    const { Jimp } = await import('jimp');
    const img = await Jimp.read(fullPath);

    const w = img.width;
    const h = img.height;

    // Samplear el 30% central para evitar sombras y ruidos de borde (evita el 35% inicial)
    const x0 = Math.floor(w * 0.35);
    const y0 = Math.floor(h * 0.35);
    const x1 = Math.floor(w * 0.65);
    const y1 = Math.floor(h * 0.65);

    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    const step = Math.max(1, Math.floor((x1 - x0) / 15)); // ~15x15 muestras

    for (let y = y0; y < y1; y += step) {
      for (let x = x0; x < x1; x += step) {
        const rgba = img.getPixelColor(x, y);
        rSum += (rgba >>> 24) & 0xff;
        gSum += (rgba >>> 16) & 0xff;
        bSum += (rgba >>> 8) & 0xff;
        count++;
      }
    }

    if (count === 0) return undefined;

    return {
      r: Math.floor(rSum / count),
      g: Math.floor(gSum / count),
      b: Math.floor(bSum / count)
    };
  } catch (e) {
    console.error(`Error Jimp en ${imagePath}:`, e);
    return undefined;
  }
}

// 🔥 CLASIFICACIÓN
export async function classify(panel: Panel): Promise<ClassifiedPanel> {
  // Normalizar sobre nombre + código + ID para máxima cobertura
  const n = normalize(`${panel.name} ${panel.code} ${panel.id} ${(panel as any).category || ''}`);
  
  // SIEMPRE recomputar colorGroup desde detectColor para evitar clasificaciones
  // incorrectas cacheadas en Firestore de versiones previas del motor.
  let colorGroup = detectColor(n);
  const texture = detectTexture(n);
  const tone = detectTone(n);
  const temperature = detectTemp(n);

  // FALLBACK: si el nombre no matchea ningún grupo ('otro'), usar el HEX de imagen
  const panelHex = (panel as any).hexColor;
  if (colorGroup === 'otro' && panelHex) {
    colorGroup = detectColorFromHex(panelHex);
  }

  const classified = {
    ...panel,
    colorGroup,
    tone,
    temperature,
    texture,
  };

  // PRIORIDAD DE COLOR: 1) labColor certificado 2) hexColor 3) muestreo de imagen
  if ((panel as any).labColor) {
    (classified as any).certifiedLab = (panel as any).labColor;
    if ((panel as any).hexColor) {
      const hex = (panel as any).hexColor;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      (classified as any).avgColor = { r, g, b };
    }
  } else if ((panel as any).hexColor) {
    const hex = (panel as any).hexColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    (classified as any).avgColor = { r, g, b };
  } else if (panel.mainImage) {
    (classified as any).avgColor = await getAverageColor(panel.mainImage);
  }

  return classified as ClassifiedPanel;
}

// Convert a hex color string to a LAB object using culori (max precision)
const toLab = converter('lab');

function rgbToLab(r: number, g: number, b: number) {
  const labColor = toLab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
  return { l: labColor?.l ?? 0, a: labColor?.a ?? 0, b: labColor?.b ?? 0 };
}

// Compute Delta E (CIE76) between two LAB objects
function deltaE76(lab1: { l: number; a: number; b: number }, lab2: { l: number; a: number; b: number }) {
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

// 🔥 SCORING
export function calculateScore(a: ClassifiedPanel, b: ClassifiedPanel) {
  let s = 0;

  // REGLA DE ORO: No comparar Veteado con Sólido si es posible
  const aIsWood = a.texture === 'veteado';
  const bIsWood = b.texture === 'veteado';
  
  if (aIsWood !== bIsWood) {
    s -= 200; // Penalización extrema para evitar cruces madera vs liso
  } else {
    s += 40; // Bono por misma categoría (madera-madera o liso-liso)
  }

  // Si el grupo de color es distinto, penalización radical
  const INCOMPATIBLE_PAIRS = new Set([
    'beige|merlot', 'merlot|beige',
    'beige|negro', 'negro|beige',
    'beige|terracota', 'terracota|beige',
    'blanco|negro', 'negro|blanco',
    'blanco|merlot', 'merlot|blanco',
    'gris|merlot', 'merlot|gris',
    'gris|terracota', 'terracota|gris',
  ]);
  const groupPair = `${a.colorGroup}|${b.colorGroup}`;
  
  if (a.colorGroup === b.colorGroup) {
    s += (a.colorGroup !== 'otro') ? 70 : 5; // Bono por mismo grupo
  } else if (INCOMPATIBLE_PAIRS.has(groupPair)) {
    s -= 350; // Penalización extrema para grupos completamente incompatibles
  } else if ((a.colorGroup === 'beige' && b.colorGroup === 'blanco') || (a.colorGroup === 'blanco' && b.colorGroup === 'beige')) {
    s -= 250; // Error clásico Almendra -> Blanco
  } else {
    s -= 150; // Penalización estándar por grupo distinto
  }

  // REGLA DE LEAGUES: Penalizar Premium (PM/Gloss) si el origen es Estándar
  const bIsPremium = b.name.includes('PerfectSense') || b.name.includes('PM') || b.name.includes('Gloss') || b.name.includes('PG');
  const aIsStandard = a.texture === 'mate' || a.texture === 'standard';
  
  if (aIsStandard && bIsPremium) {
    s -= 80; // Penalización para favorecer ST9 (línea competitiva)
  }

  // REGLA DE MATERIALES: Favorecer Textil -> Textil (Lino, Hilados, etc)
  if (a.texture === 'textil' && b.texture === 'textil') {
    s += 150; // Bono masivo para mantener la coherencia de materialidad
  } else if (a.texture === 'textil' && b.texture !== 'textil') {
    s -= 100; // Penalización para evitar cambiar tela por liso si hay opción
  }

  // Bono por match técnico Standard -> ST9
  if (aIsStandard && b.id.includes('st9')) {
    s += 40;
  }

  if (a.texture === b.texture && a.texture !== 'standard') s += 30;
  
  if (a.tone === b.tone) s += 20;
  else s -= 150; // Penalización por diferencia de luminosidad (Match Maker tip)

  if (a.temperature === b.temperature) s += 15;
  else s -= 100; // Penalización por diferencia de calidez/frialdad

  // Matching por Color Perceptual (CIELAB Delta E)
  // Si hay valores LAB certificados, úsalos directamente (máxima precisión)
  const labA = (a as any).certifiedLab ?? (a.avgColor ? rgbToLab(a.avgColor.r, a.avgColor.g, a.avgColor.b) : null);
  const labB = (b as any).certifiedLab ?? (b.avgColor ? rgbToLab(b.avgColor.r, b.avgColor.g, b.avgColor.b) : null);

  if (labA && labB) {
    const dE = deltaE76(labA, labB);
    // Delta E < 2: imperceptible. Delta E > 50: muy distinto.
    const colorScore = Math.max(0, 50 - (dE * 2));
    s += colorScore;

    // FILTRO DE BRILLO (LRV): Evitar Negro vs Claro
    if (Math.abs(labA.l - labB.l) > 30) {
      s -= 200; // Penalización de brillo extremo (usando L* que es luminosidad real)
    }
  }

  return s;
}

// 🔥 DESCRIPCIONES
function describe(panel: ClassifiedPanel) {
  const toneMap: any = { light: 'claro', medium: 'medio', dark: 'oscuro' };
  const tempMap: any = { warm: 'con temperatura cálida', cool: 'con temperatura fría', neutral: 'con temperatura neutra' };

  const colorName = panel.colorGroup === 'madera' ? 'diseño de madera' : panel.colorGroup;
  return `${colorName} ${toneMap[panel.tone] || ''}, ${tempMap[panel.temperature] || 'neutro'}`;
}

// 🔥 GENERADOR DE TEXTO
export function generateText(faplac: ClassifiedPanel, matches: ClassifiedPanel[]) {
  const [best, alt] = matches;
  const isBestPremium = best.name.includes('PerfectSense') || best.name.includes('PM') || best.name.includes('Gloss') || best.name.includes('PG');
  
  const warning = isBestPremium 
    ? "\n\n⚠️ *Nota técnica: El equivalente sugerido es de la línea premium (PM/Gloss), con un acabado y costo superior al estándar de Faplac.*" 
    : "";

  return `El color ${faplac.name} de Faplac es un ${describe(faplac)}.
 
Su equivalente más cercano en Egger suele ser el ${best.code} (${best.name})${
    alt ? ` o el ${alt.code} (${alt.name})` : ''
  }, dependiendo de si se busca una tonalidad ${
    best.temperature === 'warm' ? 'más cálida' : 'más fría'
  }.
 
• Faplac ${faplac.name}: Diseño de tono ${faplac.tone} con textura ${faplac.texture}.
• Equivalencia Egger 1 (Más cercano): ${best.code} (${best.name})
${alt ? `• Equivalencia Egger 2 (Alternativa): ${alt.code} (${alt.name})` : ''}${warning}`;
}

// 🔥 MOTOR PRINCIPAL
export async function generateEquivalences(
  faplacPanels: Panel[],
  eggerPanels: Panel[]
) {
  console.log(`🧠 Clasificando ${faplacPanels.length} paneles Faplac y ${eggerPanels.length} paneles Egger...`);
  
  const eggerClassified = await Promise.all(eggerPanels.map(classify));
  const results: any[] = [];

  for (const f of faplacPanels) {
    const fClass = await classify(f);

    const scored = eggerClassified.map(e => ({
      panel: e,
      score: calculateScore(fClass, e)
    }));

    scored.sort((a, b) => b.score - a.score);

    // Tomar top 3 como candidatos; esto da más opciones cuando hay filtros de textura
    const top = scored.slice(0, 3).map(s => s.panel);
    const text = generateText(fClass, top);

    results.push({
      faplacCode: f.code || f.id,
      faplacName: f.name,
      faplacMetadata: {
        description: f.description,
        applications: (f as any).applications || [],
        surfaceTexture: (f as any).surfaceTexture,
        isSmooth: (f as any).isSmooth
      },
      bestMatches: top.map(t => ({ 
        id: t.id, 
        code: t.code, 
        name: t.name, 
        score: scored.find(s => s.panel.id === t.id)?.score,
        metadata: {
          description: t.description,
          surfaceTexture: (t as any).surfaceTexture,
          isSmooth: (t as any).isSmooth
        }
      })),
      text,
      updatedAt: new Date().toISOString()
    });
  }

  return results;
}
