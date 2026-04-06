const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanup() {
  console.log("🧹 Iniciando limpieza de Tapacantos...");
  try {
    const snap = await getDocs(collection(db, 'panels'));
    console.log(`📊 Analizando ${snap.size} registros en 'panels'...`);
    
    let movedCount = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const description = (data.description || '').toLowerCase();
      const name = (data.name || '').toLowerCase();
      
      // Identificar si es un canto
      if (description.includes('canto') || name.includes('tapacanto') || name.includes('canto complementario')) {
        console.log(`📦 Moviendo ${docSnap.id} (${data.name}) a la colección 'cantos'...`);
        
        // 1. Copiar a 'cantos'
        await setDoc(doc(db, 'cantos', docSnap.id), {
          ...data,
          movedAt: new Date().toISOString(),
          originalCollection: 'panels'
        });
        
        // 2. Eliminar de 'panels'
        await deleteDoc(doc(db, 'panels', docSnap.id));
        
        movedCount++;
      }
    }
    
    console.log(`✅ Limpieza completada: ${movedCount} registros movidos.`);
    process.exit(0);
  } catch (e) {
    console.error("❌ Error en la limpieza:", e);
    process.exit(1);
  }
}

cleanup();
