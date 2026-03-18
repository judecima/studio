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
      
      // Usamos una imagen de picsum más estética en lugar de un placeholder de texto
      const defaultImage = `https://picsum.photos/seed/${id}/800/600`;

      const panelData = {
        ...item,
        id,
        images: [],
        mainImage: defaultImage,
        visible: false,
        stock: 0,
        source: "seed_faplac",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        colorGroup: 'medio',
        colorHue: 'otros',
        styleTags: [item.line.toLowerCase()],
        useCases: ['cocina']
      };

      await setDoc(docRef, panelData, { merge: true });
      successCount++;
    } catch (error) {
      console.error(`❌ Error insertando ${item.name}:`, error);
      errorCount++;
    }
  }

  console.log(`🎉 Inserción finalizada: ${successCount} éxitos.`);
  return { successCount, errorCount };
}
