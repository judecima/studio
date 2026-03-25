import { initializeFirebase } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function verifyNames() {
  const { firestore: db } = initializeFirebase();
  const q = query(collection(db, 'panels'), where('brand', '==', 'Egger'));
  const snap = await getDocs(q);
  
  console.log("📦 Egger Panels in Firestore:");
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.id.match(/w1100|u250|u999/i)) {
      console.log(`- ${data.id}: ${data.name} | Image: ${data.mainImage}`);
    }
  });
}

verifyNames();
