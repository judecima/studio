'use client';

import { Firestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FAPLAC_SEED } from '../seeds/faplacSeed';

/**
 * Normaliza el nombre del producto para usarlo como ID consistente.
 */
export function normalizePanelId(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Inserta el seed completo de Faplac en Firestore.
 */
export async function seedFaplac(db: Firestore) {
  console.log(`🚀 Iniciando creación de estructura para ${FAPLAC_SEED.length} productos...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const item of FAPLAC_SEED) {
    try {
      const id = normalizePanelId(item.name);
      const docRef = doc(db, 'panels', id);
      
      const panelData = {
        ...item,
        id,
        images: [],
        mainImage: `https://picsum.photos/seed/${id}/800/600`,
        visible: true,
        stock: Math.floor(Math.random() * 50) + 10,
        source: "seed_faplac",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        colorGroup: 'medio',
        colorHue: 'otros',
        styleTags: [item.line.toLowerCase()],
        useCases: ['cocina', 'placard']
      };

      await setDoc(docRef, panelData, { merge: true });
      successCount++;
    } catch (error) {
      errorCount++;
    }
  }

  return { successCount, errorCount };
}
