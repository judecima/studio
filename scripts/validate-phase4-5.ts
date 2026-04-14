/**
 * Fine-Tuning Validation Script — Phase 4.5
 * Verifies Top 1 priority for commercial matches and desinflated score distribution.
 */
import { initializeFirebase } from '../src/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { rankMatches, classifyPanel } from '../src/lib/equivalences/engine';
import { Panel } from '../src/lib/types';
import * as fs from 'fs';
import * as path from 'path';

const CRITICAL_TARGET_TOKENS = [
  'almendra',
  'aluminio',
  'ceniza',
  'blanco nature',
  'blanco tundra',
  'amaranto',
  'baltico',
  'everest',
  'litio'
];

async function validate() {
  const { firestore } = initializeFirebase();
  console.log("🎯 Iniciando Validación de Fine-Tuning (Fase 4.5)...");

  const snapshot = await getDocs(collection(firestore, 'panels'));
  const allPanels = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Panel));

  const validationResults: any[] = [];
  const allScores: number[] = [];

  for (const token of CRITICAL_TARGET_TOKENS) {
    const targets = allPanels.filter(p => 
      p.name.toLowerCase().includes(token.toLowerCase()) ||
      p.id.toLowerCase().includes(token.toLowerCase())
    );

    for (const target of targets) {
      console.log(`\n--- Validando RANKING: ${target.brand} ${target.name} ---`);
      
      const matches = await rankMatches(target, allPanels);
      
      const result = {
        target: { id: target.id, name: target.name, brand: target.brand },
        topMatches: matches.slice(0, 10).map(m => ({
          name: m.name,
          brand: m.brand,
          score: m.score,
          explanation: m.explanation,
          idBoost: m.breakdown?.identityBoost || 0
        }))
      };

      // Guardar scores para distribución global
      matches.forEach(m => allScores.push(m.score));

      console.log(`Top 1: ${matches[0]?.brand} ${matches[0]?.name} (Score: ${matches[0]?.score})`);
      if (token === 'almendra' && matches[0]?.name.toLowerCase().includes('almendra')) {
        console.log("✅ ÉXITO: Identidad Almendra recuperada en Top 1.");
      }
      
      validationResults.push(result);
    }
  }

  // REPORTE 1: phase4_5_fine_tuning_report.json
  const reportPath = path.join(process.cwd(), 'tmp', 'phase4_5_fine_tuning_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));

  // REPORTE 2: score_distribution_after_fine_tuning.json
  const distribution = {
    total_matches_evaluated: allScores.length,
    bands: {
      weak_55_65: allScores.filter(s => s >= 55 && s < 65).length,
      acceptable_65_75: allScores.filter(s => s >= 65 && s < 75).length,
      good_75_85: allScores.filter(s => s >= 75 && s < 85).length,
      strong_85_plus: allScores.filter(s => s >= 85).length
    },
    avg_score: allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0
  };
  const distPath = path.join(process.cwd(), 'tmp', 'score_distribution_after_fine_tuning.json');
  fs.writeFileSync(distPath, JSON.stringify(distribution, null, 2));

  // REPORTE 3: phase4_5_summary.md
  let summary = `# Resumen de Ajuste Fino (Fase 4.5)\n\n`;
  summary += `Se ha implementado el **Identity Boost** y el **Scoring Deflactado**.\n\n`;
  summary += `## Distribución de Scores\n`;
  summary += `- **Fuerte (>85)**: ${distribution.bands.strong_85_plus}\n`;
  summary += `- **Buena (75-85)**: ${distribution.bands.good_75_85}\n`;
  summary += `- **Aceptable (65-75)**: ${distribution.bands.acceptable_65_75}\n`;
  summary += `- **Débil (55-65)**: ${distribution.bands.weak_55_65}\n\n`;
  summary += `## Análisis de Casos Críticos\n`;
  
  validationResults.forEach(r => {
    summary += `### ${r.target.brand} ${r.target.name}\n`;
    summary += `- Top 1 actual: **${r.topMatches[0]?.brand} ${r.topMatches[0]?.name}** (${r.topMatches[0]?.score})\n`;
    summary += `- Top 2: ${r.topMatches[1]?.brand} ${r.topMatches[1]?.name} (${r.topMatches[1]?.score})\n\n`;
  });

  const summaryPath = path.join(process.cwd(), 'tmp', 'phase4_5_summary.md');
  fs.writeFileSync(summaryPath, summary);

  console.log(`\n✅ Reportes generados en /tmp: fine_tuning_report, score_distribution, summary.md`);
}

validate().catch(console.error);
