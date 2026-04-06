const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function heal() {
  console.log("🩹 Saneamiento Integral de Catálogo (v4)...");
  
  try {
    // 1. Restaurar TODO a 'panels' para empezar de cero
    const cantosSnap = await getDocs(collection(db, 'cantos'));
    console.log(`📦 Restaurando ${cantosSnap.size} registros desde 'cantos' a 'panels'...`);
    for (const docSnap of cantosSnap.docs) {
      const data = docSnap.data();
      await setDoc(doc(db, 'panels', docSnap.id), data);
      await deleteDoc(doc(db, 'cantos', docSnap.id));
    }

    // 2. Clasificar con precisión industrial
    const panelsSnap = await getDocs(collection(db, 'panels'));
    console.log(`📊 Analizando ${panelsSnap.size} productos...`);
    
    let movedToCantos = 0;
    let fixedGrain = 0;

    const WOOD_KEYWORDS = /\b(roble|nogal|cedro|pino|haya|teka|fresno|ebano|wengue|guatambu|jacaranda|petiribi|paraiso|veta|wood|grain|oak|walnut|fresno|abedul|arce|cerezo|castaño)\b/i;
    const SOLID_KEYWORDS = /\b(blanco|negro|gris|beige|vanilla|arena|humo|plomo|grafito|carbon|sombra|aluminio|metal|cromo)\b/i;
    const TEXTURE_GRAIN = /woodtext|veteado|veta|mesh|lineal|nature/i;

    for (const docSnap of panelsSnap.docs) {
      const data = docSnap.data();
      const id = docSnap.id.toLowerCase();
      const name = (data.name || '').toLowerCase();
      const code = (data.code || '').toLowerCase();
      const desc = (data.description || '').toLowerCase();
      const texture = (data.surfaceTexture || '').toLowerCase();

      // A. Filtro de Cantos: Regla de Oro
      const isCanto = name.includes('canto') || code.startsWith('q');
      
      if (isCanto) {
        console.log(`🏷️  Moviendo a Cantos: ${id}`);
        await setDoc(doc(db, 'cantos', id), data);
        await deleteDoc(doc(db, 'panels', id));
        movedToCantos++;
        continue;
      }

      // B. Lógica de Veta (Grain)
      let hasGrain = false;
      
      // Regla 1: Excepciones explícitas
      if (id.includes('safari')) {
        hasGrain = false;
      } else if (id.includes('paraiso')) {
        hasGrain = true;
      } else {
        // Regla 2: Si el nombre contiene palabras de madera -> true
        const nameHasWood = WOOD_KEYWORDS.test(name);
        
        // Regla 3: Si el nombre contiene palabras de sólido -> false (prioridad sobre descripción)
        const nameHasSolid = SOLID_KEYWORDS.test(name);
        
        // Regla 4: Textura técnica de madera
        const textureHasGrain = TEXTURE_GRAIN.test(texture);

        if (nameHasWood) {
          hasGrain = true;
        } else if (nameHasSolid) {
          hasGrain = false;
        } else {
          // Si no está claro por el nombre, mirar descripción pero con cuidado
          // Solo si no mencionamos que es un "unicolor" o "sólido"
          const descHasWood = WOOD_KEYWORDS.test(desc);
          const isUnicolor = desc.includes('unicolor') || desc.includes('monocromo') || desc.includes('liso');
          
          hasGrain = (textureHasGrain || descHasWood) && !isUnicolor;
        }
      }

      if (data.hasGrain !== hasGrain) {
        await updateDoc(doc(db, 'panels', docSnap.id), { 
          hasGrain,
          isSmooth: !hasGrain && /matt|mate|smooth|liso|st9/i.test(texture)
        });
        console.log(`✨ [FIX] ${id}: hasGrain=${hasGrain}`);
        fixedGrain++;
      }
    }

    console.log(`✅ Saneamiento v4 completado.`);
    console.log(`   - Cantos: ${movedToCantos}`);
    console.log(`   - Propiedades corregidas: ${fixedGrain}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR CRÍTICO:", err);
    process.exit(1);
  }
}

heal();
