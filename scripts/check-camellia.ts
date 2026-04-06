import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snap = await getDoc(doc(db, 'panels', 'camellia'));
  if (snap.exists()) {
    console.log('Camellia Data:', JSON.stringify(snap.data(), null, 2));
  }
}

check().then(() => process.exit(0));
