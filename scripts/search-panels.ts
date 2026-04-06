import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function search() {
  const snap = await getDocs(collection(db, 'panels'));
  const results = snap.docs
    .map(doc => ({ id: doc.id, name: doc.data().name }))
    .filter(p => 
      p.name.toLowerCase().includes('paraiso') || 
      p.id.toLowerCase().includes('paraiso') ||
      p.name.toLowerCase().includes('camellia')
    );
  
  console.log('Results:', JSON.stringify(results, null, 2));
}

search().then(() => process.exit(0));
