/**
 * Sync Group Script
 * Updates ALL panels in Firestore with their correct colorGroup using 
 * the refined engine classification logic.
 */
import { initializeFirebase } from '../src/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { classify } from '../src/lib/equivalences/engine';
import { Panel } from '../src/lib/types';

async function syncAllGroups() {
  const { firestore } = initializeFirebase();
  console.log("🚀 Iniciando Re-clasificación Cromática masiva...");

  const snapshot = await getDocs(collection(firestore, 'panels'));
  const panels = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Panel));
  
  console.log(`📦 Procesando ${panels.length} paneles...`);
  
  let updatedCount = 0;
  const batchSize = 50;
  
  for (let i = 0; i < panels.length; i += batchSize) {
    const batch = writeBatch(firestore);
    const chunk = panels.slice(i, i + batchSize);
    
    await Promise.all(chunk.map(async (panel) => {
      try {
        const classified = await classify(panel);
        if (classified && classified.colorGroup) {
          const docRef = doc(firestore, 'panels', panel.id);
          batch.update(docRef, {
            colorGroup: classified.colorGroup,
            colorHue: classified.tone || panel.colorHue,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      } catch (e) {
        console.warn(`⚠️ Error en ${panel.id}:`, (e as Error).message);
      }
    }));
    
    await batch.commit();
    console.log(`⏳ Progreso: ${Math.min(i + batchSize, panels.length)} / ${panels.length}`);
  }

  // Also sync Cantos
  console.log("🚀 Iniciando Re-clasificación de Cantos...");
  const cantosSnap = await getDocs(collection(firestore, 'cantos'));
  const cantos = cantosSnap.docs.map(d => ({ ...d.data(), id: d.id } as Panel));
  
  let cantosCount = 0;
  for (let i = 0; i < cantos.length; i += batchSize) {
    const batch = writeBatch(firestore);
    const chunk = cantos.slice(i, i + batchSize);
    
    await Promise.all(chunk.map(async (panel) => {
      try {
        const classified = await classify(panel);
        if (classified && classified.colorGroup) {
          const docRef = doc(firestore, 'cantos', panel.id);
          batch.update(docRef, {
            colorGroup: classified.colorGroup,
            colorHue: classified.tone || panel.colorHue,
            updatedAt: new Date().toISOString()
          });
          cantosCount++;
        }
      } catch (e) {
        console.warn(`⚠️ Error en canto ${panel.id}:`, (e as Error).message);
      }
    }));
    
    await batch.commit();
  }

  console.log(`✅ ¡Éxito! Paneles: ${updatedCount}, Cantos: ${cantosCount}`);
}

syncAllGroups().catch(console.error);
