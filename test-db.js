const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "studio-5733239027-4f570",
  "appId": "1:555482287833:web:404d2512c008ea291178c8",
  "apiKey": "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  "authDomain": "studio-5733239027-4f570.firebaseapp.com",
  "storageBucket": "studio-5733239027-4f570.firebasestorage.app",
  "measurementId": "",
  "messagingSenderId": "555482287833"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const snap = await getDocs(collection(db, 'panels'));
    console.log(`Panels count: ${snap.size}`);
    
    const catSnap = await getDocs(collection(db, 'catalog_products'));
    console.log(`Catalog Products count: ${catSnap.size}`);
  } catch(e) {
    console.error("Error querying db:", e);
  }
}

check();
