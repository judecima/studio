/**
 * Post-Resync Validation & Parity Script — Phase 5
 * Verifies that the persisted data matches the dynamic motor logic.
 */
import { initializeFirebase } from '../src/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { rankMatches, classifyPanel } from '../src/lib/equivalences/engine';
import { Panel, Equivalence } from '../src/lib/types';
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
  console.log("🏁 Iniciando Validación Post-Resync y Parity Check (Fase 5 Final)...");

  // Leer todos los paneles
  const snapshot = await getDocs(collection(firestore, 'panels'));
  const allPanels = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Panel));

  const validationResults: any[] = [];
  const parityFindings: any[] = [];

  for (const token of CRITICAL_TARGET_TOKENS) {
    const targets = allPanels.filter(p => 
      p.name.toLowerCase().includes(token.toLowerCase()) ||
      p.id.toLowerCase().includes(token.toLowerCase())
    );

    for (const target of targets) {
      console.log(`\n--- Validando Persistencia: ${target.name} ---`);
      
      // 1. Obtener dato persistido en Firestore
      const equivRef = doc(firestore, 'equivalences', target.id);
      const equivSnap = await getDoc(equivRef);
      
      if (!equivSnap.exists()) {
        console.warn(`❌ No se encontró equivalencia persistida para ${target.id}`);
        continue;
      }
      
      const persisted = equivSnap.data() as Equivalence;
      const topPersisted = persisted.matches[0];
      
      // 2. Realizar cálculo dinámico actual
      const dynamicMatches = await rankMatches(target, allPanels);
      const topDynamic = dynamicMatches[0];
      
      // Comparación de Paridad
      const isParityOK = topPersisted?.id === topDynamic?.id && Math.abs(topPersisted?.score - topDynamic?.score) <= 1;
      
      parityFindings.push({
        id: target.id,
        name: target.name,
        persistedTop: topPersisted?.name,
        dynamicTop: topDynamic?.name,
        persistedScore: topPersisted?.score,
        dynamicScore: topDynamic?.score,
        parity: isParityOK
      });

      console.log(`Persistido: ${topPersisted?.name} (${topPersisted?.score})`);
      console.log(`Dinámico:   ${topDynamic?.name} (${topDynamic?.score})`);
      console.log(`${isParityOK ? '✅ PARIDAD OK' : '❌ DISCREPANCIA DETECTADA'}`);

      validationResults.push({
        targetId: target.id,
        targetName: target.name,
        topMatch: topPersisted,
        matchesCount: persisted.matches.length,
        commercialCoherence: (token === 'almendra' && topPersisted?.name.toLowerCase().includes('almendra')) 
                           || (token === 'aluminio' && (topPersisted?.name.toLowerCase().includes('gris caliza') || topPersisted?.name.toLowerCase().includes('litio')))
      });
    }
  }

  // Generar Reporte 5.3: post_resync_validation.json
  fs.writeFileSync(
    path.join(process.cwd(), 'tmp', 'post_resync_validation.json'),
    JSON.stringify(validationResults, null, 2)
  );

  // Generar Reporte 5.4: post_resync_parity_report.json
  fs.writeFileSync(
    path.join(process.cwd(), 'tmp', 'post_resync_parity_report.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      casesEvaluated: parityFindings.length,
      globalParity: parityFindings.every(p => p.parity),
      findings: parityFindings
    }, null, 2)
  );

  console.log(`\n✅ Validación Post-Resync finalizada. Reportes generados en /tmp.`);
}

validate().catch(console.error);
