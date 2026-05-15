import * as fs from 'fs';
import * as path from 'path';
import { Panel, ClassifiedPanel, EquivalenceMatch } from '../src/lib/types';
import { classifyPanel, passesHardFilters, calculateScoreBreakdown, generateExplanation, getThresholdByTexture } from '../src/lib/equivalences/engine';

async function run() {
  const args = process.argv.slice(2);
  const panelsPath = args.indexOf('--panels') !== -1 ? args[args.indexOf('--panels') + 1] : 'tmp/panels_full_export.fixed.egger_enriched.json';
  const outputPath = args.indexOf('--output') !== -1 ? args[args.indexOf('--output') + 1] : 'tmp/equivalences_resync.json';

  if (!fs.existsSync(panelsPath)) {
    console.error(`❌ No existe ${panelsPath}`);
    process.exit(1);
  }

  console.log(`📖 Cargando paneles desde ${panelsPath}...`);
  const panels: Panel[] = JSON.parse(fs.readFileSync(panelsPath, 'utf8'));
  
  console.log(`🔍 Clasificando ${panels.length} paneles...`);
  const classifiedPanels: ClassifiedPanel[] = await Promise.all(panels.map(p => classifyPanel(p)));

  const results = [];
  console.log(`⚙️ Calculando equivalencias (Resync Local)...`);

  for (let i = 0; i < classifiedPanels.length; i++) {
    const target = classifiedPanels[i];
    const threshold = getThresholdByTexture(target.surfaceTexture);
    const matches: EquivalenceMatch[] = [];

    for (let j = 0; j < classifiedPanels.length; j++) {
      if (i === j) continue;
      const candidate = classifiedPanels[j];

      if (!passesHardFilters(target, candidate)) continue;

      const breakdown = calculateScoreBreakdown(target, candidate);
      if (breakdown.total < threshold) continue;

      matches.push({
        id: candidate.id,
        name: candidate.name,
        brand: candidate.brand,
        code: candidate.code,
        score: Math.round(breakdown.total * 100),
        explanation: generateExplanation(breakdown, target, candidate),
        breakdown
      });
    }

    // Ordenar y limitar
    const sortedMatches = matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    results.push({
      targetId: target.id,
      targetName: target.name,
      targetBrand: target.brand,
      targetCode: target.code || target.id,
      matches: sortedMatches,
      text: sortedMatches.map(m => m.explanation).join('\n'),
      lastSync: new Date().toISOString()
    });

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\rProcesados: ${i + 1}/${classifiedPanels.length}`);
    }
  }

  console.log(`\n✅ Resync completado. Guardando en ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  // Resumen en MD
  const mdPath = outputPath.replace('.json', '.md');
  let md = `# Local Equivalence Resync Report\n\n`;
  md += `- Date: ${new Date().toISOString()}\n`;
  md += `- Source: ${panelsPath}\n`;
  md += `- Total Panels: ${panels.length}\n`;
  md += `- Total Equivalences: ${results.filter(r => r.matches.length > 0).length}\n\n`;
  
  md += `## Samples (Top 10)\n`;
  results.slice(0, 10).forEach(r => {
    md += `### ${r.targetName} (${r.targetBrand})\n`;
    r.matches.slice(0, 3).forEach(m => {
      md += `- **${m.name}** (${m.brand}): ${m.score}% - ${m.explanation}\n`;
    });
    md += `\n`;
  });

  fs.writeFileSync(mdPath, md);
  console.log(`✅ Reporte generado: ${mdPath}`);
}

run().catch(console.error);
