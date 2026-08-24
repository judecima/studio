import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const c = JSON.parse(readFileSync(new URL('../serviceAccount.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(c) });
const db = getFirestore();

const snap = await db.collection('panels').get();
let withImg = 0, without = 0;
const missing = [];
snap.forEach(d => {
  const x = d.data();
  if (x.mainImage) withImg++;
  else { without++; if (missing.length < 8) missing.push(`${x.brand} / ${x.name}`); }
});
console.log('panels total:', snap.size, '| con mainImage:', withImg, '| sin mainImage:', without);
if (missing.length) console.log('sin imagen:', missing);

const kisa = snap.docs.filter(d => (d.data().name || '').toLowerCase().includes('kisa'));
for (const d of kisa) {
  console.log('KISA:', d.id, '|', d.data().brand, '| mainImage:', (d.data().mainImage || '(VACIO)').slice(0, 90));
}
if (kisa[0]) {
  const eq = await db.collection('equivalences').doc(kisa[0].id).get();
  console.log('equivalences doc para kisa existe?', eq.exists);
}
process.exit(0);
