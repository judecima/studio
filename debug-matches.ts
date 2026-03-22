import { initializeFirebase } from './src/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function debugMatches() {
  const { firestore } = initializeFirebase();
  const colRef = collection(firestore, 'catalog_products');
  const snapshot = await getDocs(colRef);
  const products = snapshot.docs.map(doc => doc.data());

  console.log('--- All Names ---');
  products.forEach(p => console.log(`- ${p.name} (id: ${p.id}, brand: ${p.brand})`));

  const search = (term: string) => products.find(p => p.name?.toLowerCase().includes(term.toLowerCase()) || p.id?.toLowerCase().includes(term.toLowerCase()));

  const amaranto = search('amaranto');
  const pino = search('pino cascina');
  const teka = search('teka artico');

  console.log('--- Amaranto ---');
  console.log(JSON.stringify(amaranto, null, 2));
  console.log('--- Pino Cascina ---');
  console.log(JSON.stringify(pino, null, 2));
  console.log('--- Teka Artico ---');
  console.log(JSON.stringify(teka, null, 2));
}

debugMatches();
