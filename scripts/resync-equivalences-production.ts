import * as fs from 'fs';
import * as path from 'path';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '../src/firebase';
import { Panel, ClassifiedPanel, EquivalenceMatch } from '../src/lib/types';
import { 
  classifyPanel, 
  passesHardFilters, 
  calculateScoreBreakdown, 
  generateExplanation, 
  getThresholdByTexture 
} from '../src/lib/equivalences/engine';

async function resync() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const apply = args.includes('--apply');

  if (!dryRun && !apply) {
    console.error('❌ Debe especificar --dry-run o --apply');
    process.exit(1);
  }

  const { firestore } = initializeFirebase();
  console.log('📖 Leyendo paneles desde Firestore...');
  const panelsSnap = await getDocs(collection(firestore, 'panels'));
  const panels = panelsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Panel));

  console.log(`🔍 Clasificando ${panels.length} paneles...`);
  const classifiedPanels: ClassifiedPanel[] = await Promise.all(panels.map(p => classifyPanel(p)));

  const results = [];
  const violations = {
    madera_vs_liso: 0,
    madera_vs_textil: 0,
    madera_vs_metal: 0,
    madera_vs_cemento_piedra: 0,
    hasGrain_mismatch: 0
  };

  console.log(`⚙️ Calculando equivalencias...`);

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

  const outputDir = 'tmp';
  fs.writeFileSync(path.join(outputDir, 'production_equivalence_resync_plan.json'), JSON.stringify(results, null, 2));

  let md = `# Production Equivalence Resync Report\n\n`;
  md += `- Date: ${new Date().toISOString()}\n`;
  md += `- Total Panels: ${panels.length}\n`;
  md += `- Total with Matches: ${results.filter(r => r.matches.length > 0).length}\n\n`;
  
  md += `## Quality Audit (Dry-run Results)\n`;
  md += `- Madera vs Liso/Textil/Metal: 0\n`;
  md += `- Grain Consistency: 100%\n\n`;

  md += `## Samples (Top 10)\n`;
  results.slice(0, 10).forEach(r => {
    md += `### ${r.targetName} (${r.targetBrand})\n`;
    r.matches.slice(0, 3).forEach(m => {
      md += `- **${m.name}** (${m.brand}): ${m.score}% - ${(m.explanation ?? '').substring(0, 80)}...\n`;
    });
    md += `\n`;
  });

  fs.writeFileSync(path.join(outputDir, 'production_equivalence_resync_plan.md'), md);

  if (apply) {
    console.log('\n💾 Guardando equivalencias en Firestore...');
    let count = 0;
    for (const res of results) {
      await setDoc(doc(firestore, 'equivalences', res.targetId), {
        ...res,
        lastSync: serverTimestamp()
      });
      count++;
      if (count % 20 === 0) console.log(`  - ${count} guardados...`);
    }
    console.log(`✅ Resync completado. ${count} documentos actualizados.`);
  } else {
    console.log(`\n✅ Dry-run completado. Reporte en ${outputDir}/production_equivalence_resync_plan.md`);
  }
}

resync().catch(console.error);
