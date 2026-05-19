import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { converter, differenceCiede2000 } from 'culori';
import { getPanelDbDriver, getPanelsRepository } from '@/lib/data/get-panels-repository';
import { replaceFirestoreColorGroups, type ColorGroupRecord } from '@/lib/data/firestore-color-groups';

const toLab = converter('lab');
const ciede2000 = differenceCiede2000();

const PALETTE = [
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

const COLOR_WORDS = [
  'blanco', 'beige', 'gris', 'negro', 'marron', 'rojo', 'verde', 'azul',
  'amarillo', 'naranja', 'violeta', 'rosa', 'cafe', 'almendra', 'crema',
  'arena', 'perla', 'carbon', 'gris oscuro', 'gris claro', 'verde oliva',
  'aluminio', 'plata', 'acero', 'metal'
];

function normalizeName(name: string): string {
  return (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getDominantColorName(names: string[]): string | null {
  const counts = new Map<string, number>();
  
  const weights: Record<string, number> = {
    // Especializados (Máxima prioridad)
    'almendra': 15, 'crema': 15, 'perla': 15, 'arena': 15, 'carbon': 15, 'oliva': 15,
    // Metales
    'aluminio': 10, 'plata': 10, 'acero': 10, 'metal': 10,
    // Cromáticos
    'verde': 5, 'azul': 5, 'rojo': 5, 'amarillo': 5, 'naranja': 5, 'violeta': 5, 'rosa': 5, 'marron': 5, 'cafe': 5,
    // Genéricos (Mínima prioridad)
    'blanco': 1, 'beige': 1, 'gris': 1, 'negro': 1
  };

  for (const name of names) {
    const norm = normalizeName(name);
    for (const word of COLOR_WORDS) {
      if (norm.includes(word)) {
        const weight = weights[word] || 1;
        counts.set(word, (counts.get(word) || 0) + weight);
        // NO break: allow finding multiple keywords and using the one with highest weight
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
  return bestWord;
}

export async function POST(req: NextRequest) {
  try {
    const repo = getPanelsRepository();
    const driver = getPanelDbDriver();
    console.log("🎨 API: Iniciando asignación fija de grupos de color...");

    // 1. Obtener sólidos
    const panels = await repo.getAllPanels();
    const solids = panels
      .map(panel => panel as any)
      .filter(p => !p.hasGrain && p.labColor);

    if (solids.length === 0) {
      return NextResponse.json({ error: "No hay colores sólidos con datos LAB" }, { status: 400 });
    }

    // 2. Asignar cada panel a uno de los 12 grupos
    const assignments = new Map<string, any[]>();
    const metallic = ['aluminio', 'plata', 'acero', 'metal'];

    for (const panel of solids) {
      let detectedWord = getDominantColorName([panel.name]);
      let groupName: string;

      if (detectedWord && metallic.includes(detectedWord.toLowerCase())) {
        groupName = 'Gris';
      } else if (detectedWord) {
        groupName = detectedWord.charAt(0).toUpperCase() + detectedWord.slice(1);
      } else {
        const pLab = { mode: 'lab' as const, l: panel.labColor.l, a: panel.labColor.a, b: panel.labColor.b };
        let best = PALETTE[0];
        let minDiff = Infinity;
        for (const p of PALETTE) {
          const pLabPal = toLab(p.hex);
          const diff = ciede2000(pLab, pLabPal as any);
          if (diff < minDiff) {
            minDiff = diff;
            best = p;
          }
        }
        groupName = best.name;
      }

      const list = assignments.get(groupName) || [];
      list.push(panel);
      assignments.set(groupName, list);
    }

    const colorGroups: ColorGroupRecord[] = [];
    for (const [name, members] of assignments.entries()) {
      const avgL = members.reduce((sum, p) => sum + p.labColor.l, 0) / members.length;
      const avgA = members.reduce((sum, p) => sum + p.labColor.a, 0) / members.length;
      const avgB = members.reduce((sum, p) => sum + p.labColor.b, 0) / members.length;

      const groupData = {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        lab: { l: avgL, a: avgA, b: avgB },
        sampleCount: members.length
      };
      colorGroups.push(groupData);
    }

    if (driver === 'firestore') {
      await replaceFirestoreColorGroups(colorGroups);
    }

    // 4. Actualizar todos los paneles
    let updatedCount = 0;
    for (const [name, members] of assignments.entries()) {
      for (const panel of members) {
        if (panel.colorGroup !== name) {
          await repo.updatePanel(panel.id, {
            colorGroup: name,
            colorHue: panel.labColor.l > 80 ? 'claro' : (panel.labColor.l > 40 ? 'medio' : 'oscuro')
          });
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      driver,
      groupsCreated: colorGroups.length,
      panelsUpdated: updatedCount
    });

  } catch (error: any) {
    console.error("❌ Error en Sync API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
