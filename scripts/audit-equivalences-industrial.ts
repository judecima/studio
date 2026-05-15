import * as fs from 'fs';
import * as path from 'path';
import { Panel, Equivalence, EquivalenceMatch } from '../src/lib/types';

async function audit() {
  const args = process.argv.slice(2);
  const panelsPath = args.indexOf('--panels') !== -1 ? args[args.indexOf('--panels') + 1] : 'tmp/post_production_panels_export.json';
  const eqPath = args.indexOf('--equivalences') !== -1 ? args[args.indexOf('--equivalences') + 1] : 'tmp/post_production_equivalences_export.json';

  if (!fs.existsSync(panelsPath) || !fs.existsSync(eqPath)) {
    console.error('❌ Faltan archivos para la auditoría.');
    process.exit(1);
  }

  const panels: Panel[] = JSON.parse(fs.readFileSync(panelsPath, 'utf8'));
  const equivalences: any[] = JSON.parse(fs.readFileSync(eqPath, 'utf8'));
  const panelMap = new Map(panels.map(p => [p.id, p]));

  const auditResults = {
    summary: {
      totalEquivalences: equivalences.length,
      totalMatches: 0,
      violations: {
        madera_vs_liso: 0,
        madera_vs_textil: 0,
        madera_vs_metal: 0,
        madera_vs_cementicio: 0,
        hasGrain_mismatch: 0,
        brillo_vs_supermate: 0
      }
    },
    criticalIssues: [] as any[]
  };

  for (const eq of equivalences) {
    const target = panelMap.get(eq.targetId);
    if (!target) continue;

    for (const match of eq.matches) {
      const candidate = panelMap.get(match.id);
      if (!candidate) continue;
      
      auditResults.summary.totalMatches++;

      // 1. Madera vs Resto
      if (target.surfaceTexture === 'madera') {
        if (candidate.surfaceTexture === 'liso') auditResults.summary.violations.madera_vs_liso++;
        if (candidate.surfaceTexture === 'textil') auditResults.summary.violations.madera_vs_textil++;
        if (candidate.surfaceTexture === 'metal') auditResults.summary.violations.madera_vs_metal++;
        if (candidate.surfaceTexture === 'cementicio') auditResults.summary.violations.madera_vs_cementicio++;
      }

      // 2. Grain
      if (target.hasGrain !== candidate.hasGrain) {
        if (target.surfaceTexture === 'madera' || candidate.surfaceTexture === 'madera') {
           auditResults.summary.violations.hasGrain_mismatch++;
        }
      }

      // 3. Brillo vs Supermate
      const isFinishMismatch = (target.finish === 'brillo' && (candidate.finish === 'mate' || candidate.finish === 'supermate')) ||
                               (candidate.finish === 'brillo' && (target.finish === 'mate' || target.finish === 'supermate'));
      if (isFinishMismatch) auditResults.summary.violations.brillo_vs_supermate++;
    }
  }

  fs.writeFileSync('tmp/post_production_equivalence_audit.json', JSON.stringify(auditResults, null, 2));

  let md = `# Post-Production Equivalence Industrial Audit\n\n`;
  md += `## Summary\n`;
  md += `- Total Equivalences: ${auditResults.summary.totalEquivalences}\n`;
  md += `- Total Matches: ${auditResults.summary.totalMatches}\n\n`;
  
  md += `### Violations\n`;
  md += `| Tipo | Cantidad |\n`;
  md += `|---|---|\n`;
  md += `| Madera vs Liso | ${auditResults.summary.violations.madera_vs_liso} |\n`;
  md += `| Madera vs Textil | ${auditResults.summary.violations.madera_vs_textil} |\n`;
  md += `| Madera vs Metal | ${auditResults.summary.violations.madera_vs_metal} |\n`;
  md += `| Madera vs Cementicio | ${auditResults.summary.violations.madera_vs_cementicio} |\n`;
  md += `| HasGrain Mismatch | ${auditResults.summary.violations.hasGrain_mismatch} |\n`;
  md += `| Brillo vs Supermate | ${auditResults.summary.violations.brillo_vs_supermate} |\n\n`;

  const success = Object.values(auditResults.summary.violations).reduce((a, b) => a + b, 0) - auditResults.summary.violations.brillo_vs_supermate === 0;
  md += `## Verdict: ${success ? '✅ PASSED' : '❌ FAILED'}\n`;
  
  fs.writeFileSync('tmp/post_production_equivalence_audit.md', md);
  console.log(`✅ Auditoría completada. Reporte en tmp/post_production_equivalence_audit.md`);
}

audit();
