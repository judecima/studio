import * as fs from 'fs';
import { EquivalenceMatch } from '../src/lib/types';

async function run() {
  const args = process.argv.slice(2);
  const originalPath = args.indexOf('--original') !== -1 ? args[args.indexOf('--original') + 1] : 'tmp/equivalences_full_export.json';
  const resyncPath = args.indexOf('--resync') !== -1 ? args[args.indexOf('--resync') + 1] : 'tmp/equivalences_resync.json';

  if (!fs.existsSync(originalPath) || !fs.existsSync(resyncPath)) {
    console.error(`❌ Faltan archivos: ${originalPath} o ${resyncPath}`);
    process.exit(1);
  }

  const original = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
  const resync = JSON.parse(fs.readFileSync(resyncPath, 'utf8'));

  const resyncMap = new Map<string, any>(resync.map((r: any) => [r.targetId, r]));
  
  const report = {
    summary: {
      totalCompared: original.length,
      improved: 0,
      worsened: 0,
      broken: 0,
      newMatches: 0
    },
    diffs: [] as any[]
  };

  for (const orig of original) {
    const res = resyncMap.get(orig.targetId);
    if (!res) continue;

    const origTop = orig.matches[0];
    const resTop = res.matches[0];

    const diff: any = {
      id: orig.targetId,
      name: orig.targetName,
      originalTop: origTop ? `${origTop.name} (${origTop.score}%)` : 'None',
      resyncTop: resTop ? `${resTop.name} (${resTop.score}%)` : 'None',
      status: 'SAME'
    };

    if (!origTop && resTop) {
      diff.status = 'NEW_MATCH';
      report.summary.newMatches++;
    } else if (origTop && !resTop) {
      diff.status = 'BROKEN';
      report.summary.broken++;
    } else if (origTop && resTop) {
      if (origTop.id !== resTop.id) {
        diff.status = 'CHANGED';
        if (resTop.score > origTop.score) report.summary.improved++;
        else report.summary.worsened++;
      }
    }

    if (diff.status !== 'SAME') {
      report.diffs.push(diff);
    }
  }

  const outputPath = 'tmp/equivalence_comparison_report.json';
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  let md = `# Equivalence Comparison Report\n\n`;
  md += `## Summary\n`;
  md += `- Total Compared: ${report.summary.totalCompared}\n`;
  md += `- New Matches (Previously empty): ${report.summary.newMatches}\n`;
  md += `- Broken (Now empty): ${report.summary.broken}\n`;
  md += `- Improved Score/Match: ${report.summary.improved}\n`;
  md += `- Worsened Score/Match: ${report.summary.worsened}\n\n`;

  md += `## Top Changes\n`;
  md += `| Panel | Original Top | Resync Top | Status |\n`;
  md += `|---|---|---|---|\n`;
  report.diffs.slice(0, 50).forEach(d => {
    md += `| ${d.name} | ${d.originalTop} | ${d.resyncTop} | ${d.status} |\n`;
  });

  fs.writeFileSync('tmp/equivalence_comparison_report.md', md);
  console.log(`✅ Reporte de comparación generado: tmp/equivalence_comparison_report.md`);
}

run().catch(console.error);
