import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = {
  "projectId": "studio-5733239027-4f570",
  "appId": "1:555482287833:web:404d2512c008ea291178c8",
  "apiKey": "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  "authDomain": "studio-5733239027-4f570.firebaseapp.com",
  "storageBucket": "studio-5733239027-4f570.firebasestorage.app",
  "messagingSenderId": "555482287833"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function exportCollection(collectionName: string, fileName: string) {
  console.log(`📡 Exportando colección: ${collectionName}...`);
  const snap = await getDocs(collection(db, collectionName));
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const filePath = path.join(process.cwd(), 'tmp', fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ ${data.length} documentos exportados a ${fileName}`);
  return data;
}

async function runExport() {
  try {
    if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'tmp'));
    }

    await exportCollection('panels', 'panels_full_export.json');
    await exportCollection('equivalences', 'equivalences_full_export.json');
    
    console.log("🚀 Exportación completa finalizada.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error durante la exportación:", err);
    process.exit(1);
  }
}

runExport();
