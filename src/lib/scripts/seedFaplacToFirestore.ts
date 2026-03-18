
'use client';

import { Firestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FAPLAC_SEED } from '../seeds/faplacSeed';

function normalizeId(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

/**
 * Inserta el seed completo de Faplac en Firestore.
 * @param db Instancia de Firestore
 */
export async function seedFaplac(db: Firestore) {
  console.log(`🚀 Iniciando inserción de ${FAPLAC_SEED.length} productos Faplac...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const item of FAPLAC_SEED) {
    try {
      const id = normalizeId(item.name);
      const docRef = doc(db, 'panels', id);
      
      const panelData = {
        ...item,
        id,
        images: [],
        mainImage: "https://placehold.co/800x600?text=Cargando...",
        visible: false,
        stock: 0,
        source: "seed_faplac",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Aesthetic defaults to be enriched
        colorGroup: 'medio',
        colorHue: 'otros',
        styleTags: [item.line.toLowerCase()],
        useCases: ['cocina']
      };

      await setDoc(docRef, panelData, { merge: true });
      successCount++;
      if (successCount % 20 === 0) console.log(`📦 Procesados: ${successCount}`);
    } catch (error) {
      console.error(`❌ Error insertando ${item.name}:`, error);
      errorCount++;
    }
  }

  console.log(`🎉 Inserción finalizada.`);
  console.log(`✅ Éxito: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  
  return { successCount, errorCount };
}
