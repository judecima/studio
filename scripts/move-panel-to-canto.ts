import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function movePanels() {
  console.log("🚀 Iniciando migración de R1 Doppia (Panel -> Canto)...");
  try {
    const panelsSnap = await getDocs(collection(db, 'panels'));
    const toMove = panelsSnap.docs.filter(d => {
      const name = (d.data().name || '').toLowerCase();
      return name.includes('r1 doppia') || name.includes('h8955');
    });

    if (toMove.length === 0) {
      console.log("✅ No se encontraron paneles con 'R1 Doppia'.");
      process.exit(0);
    }

    console.log(`📦 Encontrados ${toMove.length} elementos para mover.`);

    for (const panelDoc of toMove) {
      const data = panelDoc.data();
      const id = panelDoc.id;

      console.log(`🔄 Moviendo: ${data.name} (${id})`);

      // 1. Crear en cantos
      await setDoc(doc(db, 'cantos', id), {
        ...data,
        updatedAt: new Date().toISOString()
      });

      // 2. Borrar de panels
      await deleteDoc(doc(db, 'panels', id));
      
      console.log(`✅ ${data.name} migrado con éxito.`);
    }

    console.log("✨ Migración completada.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error en la migración:", err);
    process.exit(1);
  }
}

movePanels();
