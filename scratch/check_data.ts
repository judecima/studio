import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, 'panels'), limit(5));
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`Panel: ${data.name}`);
    console.log(` - colorParent: ${data.colorParent}`);
    console.log(` - colorGroup: ${data.colorGroup}`);
    console.log(` - hasGrain: ${data.hasGrain}`);
    console.log('---');
  });
}

check().then(() => process.exit(0));
