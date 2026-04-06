/**
 * Equivalence Re-sync Script
 * Recalculates all equivalences for all panels in Firestore.
 */
import { initializeFirebase } from '../src/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { runEquivalenceSync } from '../src/lib/equivalences/engine';
import { Panel } from '../src/lib/types';

async function syncAll() {
  const { firestore } = initializeFirebase();
  console.log("🚀 Iniciando Re-sincronización de Equivalencias masiva...");

  // Equivalences are between different brands, usually panels. 
  // We'll sync panels.
  const snapshot = await getDocs(collection(firestore, 'panels'));
  const panels = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Panel));
  
  console.log(`📦 Calculando equivalencias para ${panels.length} paneles...`);
  
  await runEquivalenceSync(panels);

  console.log("✅ Equivalencias actualizadas.");
}

syncAll().catch(console.error);
