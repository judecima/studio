import * as fs from 'fs';
import * as path from 'path';
import { converter, differenceCiede2000 } from 'culori';

// We'll re-implement the current calculateScore logic here to ensure it runs correctly in the script
// and to avoid issues with Next.js imports if they become complex.
// This is exactly as found in src/lib/equivalences/engine.ts

const toLab = converter('lab');
const de2000 = differenceCiede2000();

function calculateScore(a: any, b: any): number {
  if (a.id === b.id) return 1;

  let score = 1.0;

  // 1. COMPARACIÓN CROMÁTICA
  const labA = a.labColor;
  const labB = b.labColor;

  if (labA && labB) {
    const dE = de2000(labA as any, labB as any);
    const colorMatch = Math.max(0, 1 - (dE / 30));
    score = colorMatch;
  } else {
    if (a.colorParent !== b.colorParent) score *= 0.65;
    if (a.colorSub !== b.colorSub) score *= 0.9;
  }

  // 2. PENALIZACIONES POR ESTRUCTURA
  if (a.hasGrain !== b.hasGrain) {
    score *= 0.75; 
  }

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

    const isNeighbor = (a.colorParent && neighbors[a.colorParent]?.includes(b.colorParent)) || 
                      (b.colorParent && neighbors[b.colorParent]?.includes(a.colorParent));
    
    if (isNeighbor) {
      score *= 0.85;
    } else {
      score *= 0.60;
    }
  }

  if (a.surfaceTexture !== b.surfaceTexture) {
    score *= 0.9;
  }

  if (a.finish !== b.finish) {
    score *= 0.95;
  }

  return Math.min(1, Math.max(0, score));
}

function loadJson(fileName: string) {
  const filePath = path.join(process.cwd(), 'tmp', fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function runBenchmark() {
  console.log("🚀 Iniciando benchmark de equivalencias (Persistido vs Recalculado)...");
  
  const panels = loadJson('panels_full_export.json');
  const equivalences = loadJson('equivalences_full_export.json');

  const report: any = {
    global_metrics: {
      total_panels: panels.length,
      top1_divergence: 0,
      top5_divergence: 0,
      missing_persisted: 0,
      missing_recalculated: 0,
      avg_score_diff: 0
    },
    divergences: []
  };

  let totalScoreDiff = 0;
  let countScoreDiff = 0;

  panels.forEach((target: any) => {
    const persisted = equivalences.find((e: any) => e.targetId === target.id || e.id === target.id);
    const persistedMatches = persisted?.matches || [];
    
    // Recalculate
    const recalculatedMatches = panels
      .filter((p: any) => p.id !== target.id)
      .map((candidate: any) => ({
        id: candidate.id,
        name: candidate.name,
        brand: candidate.brand,
        score: Math.round(calculateScore(target, candidate) * 100)
      }))
      .filter((m: any) => m.score >= 60)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 20);

    if (persistedMatches.length === 0 && recalculatedMatches.length > 0) {
      report.global_metrics.missing_persisted++;
    }
    if (persistedMatches.length > 0 && recalculatedMatches.length === 0) {
      report.global_metrics.missing_recalculated++;
    }

    // Compare Top 1
    const pTop1 = persistedMatches[0]?.id;
    const rTop1 = recalculatedMatches[0]?.id;
    if (pTop1 !== rTop1) {
      report.global_metrics.top1_divergence++;
    }

    // Compare common matches scores
    persistedMatches.forEach((pm: any) => {
      const rm = recalculatedMatches.find((m: any) => m.id === pm.id);
      if (rm) {
        totalScoreDiff += Math.abs(pm.score - rm.score);
        countScoreDiff++;
      }
    });

    if (Math.abs(persistedMatches.length - recalculatedMatches.length) > 5 || pTop1 !== rTop1) {
      report.divergences.push({
        id: target.id,
        name: target.name,
        persisted_count: persistedMatches.length,
        recalculated_count: recalculatedMatches.length,
        top1_persisted: persistedMatches[0]?.name || 'N/A',
        top1_recalculated: recalculatedMatches[0]?.name || 'N/A',
        top1_p_score: persistedMatches[0]?.score,
        top1_r_score: recalculatedMatches[0]?.score
      });
    }
  });

  report.global_metrics.avg_score_diff = countScoreDiff > 0 ? totalScoreDiff / countScoreDiff : 0;

  fs.writeFileSync(path.join(process.cwd(), 'tmp', 'equivalence_diff_report.json'), JSON.stringify(report, null, 2));
  
  console.log("✅ Benchmark completado.");
  process.exit(0);
}

runBenchmark();
