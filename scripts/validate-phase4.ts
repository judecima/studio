/**
 * Target Validation Script — Phase 4 (Corrective)
 * Verifies that critical commercial equivalences are recovered.
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
  console.log("🔍 Iniciando Validación Dirigida (Fase 4 Correctiva)...");

  const snapshot = await getDocs(collection(firestore, 'panels'));
  const allPanels = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Panel));

  const validationResults: any[] = [];

  for (const token of CRITICAL_TARGET_TOKENS) {
    const targets = allPanels.filter(p => 
      p.name.toLowerCase().includes(token.toLowerCase()) ||
      p.id.toLowerCase().includes(token.toLowerCase())
    );

    if (targets.length === 0) {
      console.warn(`⚠️ No se encontró ningún panel que coincida con "${token}"`);
      continue;
    }

    for (const target of targets) {
      console.log(`\n--- Validando: ${target.brand} ${target.name} (${target.id}) ---`);
      
      const targetClass = await classifyPanel(target);
      const matches = await rankMatches(target, allPanels);
      
      const result = {
        target: {
          id: target.id,
          name: target.name,
          brand: target.brand,
          texture: targetClass.surfaceTexture,
          colorParent: targetClass.colorParent
        },
        topMatches: matches.slice(0, 5).map(m => ({
          name: m.name,
          brand: m.brand,
          score: m.score,
          explanation: m.explanation,
          texture: m.breakdown?.textureScore
        }))
      };

      console.log(`Top match: ${matches[0]?.brand} ${matches[0]?.name} (Score: ${matches[0]?.score})`);
      console.log(`Explicación: ${matches[0]?.explanation}`);
      
      validationResults.push(result);
    }
  }

  // Verificar Verdades de Negocio (Clasificaciones)
  const businessTruths = [
    { name: 'Blanco Nature', expectedTexture: 'madera' },
    { name: 'Blanco Tundra', expectedTexture: 'textil' },
    { name: 'Amaranto', expectedTexture: 'madera' },
    { name: 'Báltico', expectedTexture: 'madera' }
  ];

  const truthResults = [];
  for (const truth of businessTruths) {
    const panels = allPanels.filter(p => p.name.includes(truth.name));
    for (const p of panels) {
      const classified = await classifyPanel(p);
      const success = classified.surfaceTexture === truth.expectedTexture;
      truthResults.push({
        name: p.name,
        expected: truth.expectedTexture,
        actual: classified.surfaceTexture,
        success
      });
      console.log(`${success ? '✅' : '❌'} ${p.name}: ${classified.surfaceTexture} (Esperado: ${truth.expectedTexture})`);
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    validationCount: validationResults.length,
    results: validationResults,
    businessTruths: truthResults,
    success: truthResults.every(t => t.success) && validationResults.some(r => r.topMatches.length > 0)
  };

  const reportPath = path.join(process.cwd(), 'tmp', 'phase4_corrective_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n✅ Validación completada. Reporte en tmp/phase4_corrective_report.json`);
}

validate().catch(console.error);
