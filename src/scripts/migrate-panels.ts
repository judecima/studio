import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '../firebase';
import { 
  detectColor, 
  detectTexture, 
  detectTone, 
  detectTemp 
} from '../lib/equivalences/engine';

async function migratePanels() {
  console.log("🚀 Iniciando migración de limpieza de paneles...");
  const { firestore: db } = initializeFirebase();
  
  try {
    const querySnapshot = await getDocs(collection(db, 'panels'));
    console.log(`📦 Procesando ${querySnapshot.size} paneles...`);

    const updates = querySnapshot.docs.map(async (panelDoc) => {
      const data = panelDoc.data();
      const name = data.name || "";
      const description = data.description || "";
      const id = panelDoc.id;
      
      // Texto completo para detección
      const fullText = `${name} ${description} ${id}`.toLowerCase();
      
      // Nueva clasificación basada en reglas de negocio v3.1
      const newData = {
        colorGroup: detectColor(fullText),
        texture: detectTexture(fullText),
        tone: detectTone(fullText),
        temperature: detectTemp(fullText),
        // Lógica de flags estructurales
        hasGrain: fullText.includes('veta') || fullText.includes('madera') || fullText.includes('roble') || fullText.includes('nogal'),
        isSmooth: !fullText.match(/urban|hilados|textura|veta|poro|st12|st19|st22|st32|st37|st38/i)
      };

      console.log(`✅ Clasificando ${id}: ${newData.colorGroup} | ${newData.texture}`);

      const ref = doc(db, 'panels', id);
      return updateDoc(ref, newData);
    });

    await Promise.all(updates);
    console.log("✨ Migración completada: Categorías de Firestore actualizadas.");
  } catch (error) {
    console.error("❌ Error en la migración:", error);
  }
}

// Ejecutar si se llama directamente con tsx
if (require.main === module) {
  migratePanels().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { migratePanels };
