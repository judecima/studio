import * as fs from 'fs';
import * as path from 'path';
import { rankMatches, classifyPanel } from '../src/lib/equivalences/engine';
import { Panel } from '../src/lib/types';

async function runBenchmark() {
  console.log("🚀 Iniciando benchmark del nuevo motor (v6.6)...");

  try {
    const panelsPath = path.join(process.cwd(), 'tmp', 'panels_full_export.json');
    if (!fs.existsSync(panelsPath)) {
        console.error("❌ No se encontró tmp/panels_full_export.json. Ejecuta primero scripts/audit-export.ts");
        process.exit(1);
    }
    
    const panels: Panel[] = JSON.parse(fs.readFileSync(panelsPath, 'utf8'));
    const report = {
      timestamp: new Date().toISOString(),
      total_panels: panels.length,
      matches_found: 0,
      avg_matches_per_panel: 0,
      score_distribution: {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        'below-60': 0
      },
      texture_breakdown: {} as Record<string, number>,
      examples: [] as any[]
    };

    let totalMatches = 0;

    for (const panel of panels) {
      const classified = await classifyPanel(panel);
      const matches = await rankMatches(panel, panels);
      
      report.texture_breakdown[classified.surfaceTexture] = (report.texture_breakdown[classified.surfaceTexture] || 0) + 1;
      
      if (matches.length > 0) {
        report.matches_found++;
        totalMatches += matches.length;
        
        matches.forEach(m => {
          if (m.score >= 90) report.score_distribution['90-100']++;
          else if (m.score >= 80) report.score_distribution['80-89']++;
          else if (m.score >= 70) report.score_distribution['70-79']++;
          else if (m.score >= 60) report.score_distribution['60-69']++;
          else report.score_distribution['below-60']++;
        });

        if (report.examples.length < 10 && matches.length > 0) {
          report.examples.push({
            target: { id: panel.id, name: panel.name, texture: classified.surfaceTexture },
            top_match: matches[0]
          });
        }
      }
    }

    report.avg_matches_per_panel = totalMatches / panels.length;

    const reportPath = path.join(process.cwd(), 'tmp', 'engine_refactor_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Benchmark completado.`);
    console.log(`📊 Reporte generado en tmp/engine_refactor_report.json`);
    process.exit(0);

  } catch (err) {
    console.error("❌ Error durante el benchmark:", err);
    process.exit(1);
  }
}

runBenchmark();
