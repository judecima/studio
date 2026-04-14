/**
 * Equivalence Re-sync Script (v6.6)
 * Recalculates all equivalences for all panels in Firestore using the new score engine.
 */
import { initializeFirebase } from '../src/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { runEquivalenceSync } from '../src/lib/equivalences/engine';
import { Panel } from '../src/lib/types';
import * as fs from 'fs';
import * as path from 'path';

async function syncAll() {
  const { firestore } = initializeFirebase();
  console.log("🚀 Iniciando Re-sincronización de Equivalencias masiva (Motor v6.6)...");

  const startTime = Date.now();
  const snapshot = await getDocs(collection(firestore, 'panels'));
  const panels = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Panel));
  
  console.log(`📦 Calculando equivalencias para ${panels.length} paneles...`);
  
  const results = await runEquivalenceSync(panels);

  const duration = (Date.now() - startTime) / 1000;
  
  const report = {
    timestamp: new Date().toISOString(),
    total_panels: panels.length,
    duration_seconds: duration,
    total_equivalences_generated: results.length,
    avg_matches_per_panel: results.reduce((acc, r) => acc + (r.matches?.length || 0), 0) / results.length,
    panels_without_matches: results.filter(r => (r.matches?.length || 0) === 0).map(r => r.targetName),
    high_confidence_cases: results.filter(r => r.matches?.[0]?.score >= 90).length,
    borderline_cases: results.filter(r => r.matches?.[0]?.score > 0 && r.matches?.[0]?.score < 70).length
  };

  const reportPath = path.join(process.cwd(), 'tmp', 'resync_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`✅ Equivalencias actualizadas. Reporte generado en tmp/resync_report.json`);
}

syncAll().catch(console.error);
