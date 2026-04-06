/**
 * Regenerate Color Groups Centroids
 * Updates the 'color_groups' collection with K=24 and Keyword Bias.
 */
import { initializeFirebase } from '../src/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
// @ts-ignore
import { kmeans } from 'ml-kmeans';
// @ts-ignore
import { converter, differenceCiede2000 } from 'culori';

const toLab = converter('lab');
const ciede2000 = differenceCiede2000();

const PALETTE = [
  { name: 'Blanco Puro', hex: '#FFFFFF' },
  { name: 'Blanco Cálido / Hueso', hex: '#F5F5F0' },
  { name: 'Crema / Almendra', hex: '#F5F5DC' },
  { name: 'Beige / Arena', hex: '#D2B48C' },
  { name: 'Gris Perla', hex: '#E7E7E7' },
  { name: 'Gris Claro', hex: '#B8B8B8' },
  { name: 'Gris Medio', hex: '#808080' },
  { name: 'Gris Carbón / Grafito', hex: '#363636' },
  { name: 'Negro Profundo', hex: '#000000' },
  { name: 'Madera / Nogal', hex: '#5D4037' },
  { name: 'Verde Oliva / Musgo', hex: '#54603C' },
  { name: 'Verde Bosque / Noche', hex: '#2E473B' },
  { name: 'Verde Mineral / Menta', hex: '#879B8C' },
  { name: 'Verde Lima / Kiwi', hex: '#8CB04F' },
  { name: 'Azul Petróleo / Noche', hex: '#1C2E3D' },
  { name: 'Azul Acero / Navy', hex: '#4B5E6B' },
  { name: 'Terracota / Óxido', hex: '#8D4925' },
  { name: 'Rojo / Borravino', hex: '#630B1C' }
];

async function regenerate() {
  const { firestore } = initializeFirebase();
  console.log("🎨 Regenerando centroides de grupos de color...");

  const snap = await getDocs(collection(firestore, 'panels'));
  const solids = snap.docs
    .map(d => ({ id: d.id, name: d.data().name, labColor: d.data().labColor, hasGrain: d.data().hasGrain }))
    .filter(p => !p.hasGrain && p.labColor);

  const data = solids.map(p => [p.labColor.l, p.labColor.a, p.labColor.b]);
  const K = Math.min(solids.length, 24);
  const clusters = kmeans(data, K, {});
  const centroids = clusters.centroids;

  // Clear old
  const groupsSnap = await getDocs(collection(firestore, 'color_groups'));
  for (const d of groupsSnap.docs) {
    await deleteDoc(doc(firestore, 'color_groups', d.id));
  }

  const usedNames = new Set();
  for (let i = 0; i < centroids.length; i++) {
    const c = centroids[i];
    const lab = { mode: 'lab', l: c[0], a: c[1], b: c[2] };
    
    const members = solids.filter((_, idx) => clusters.clusters[idx] === i);
    const memberNames = members.map(m => (m.name || '').toLowerCase()).join(' ');
    const hasGreenKeyword = /verde|oliva|kiwi|mineral|forest|musgo/i.test(memberNames);
    const hasBlueKeyword = /azul|navy|noche|indigo|petroleo/i.test(memberNames);

    let best = PALETTE[0];
    let minDiff = Infinity;
    PALETTE.forEach(p => {
      const pLab = toLab(p.hex);
      let diff = ciede2000(lab, pLab as any);
      if (hasGreenKeyword && p.name.toLowerCase().includes('verde')) diff -= 15;
      if (hasBlueKeyword && p.name.toLowerCase().includes('azul')) diff -= 15;
      if (diff < minDiff) { minDiff = diff; best = p; }
    });

    let groupName = best.name;
    let counter = 1;
    while (usedNames.has(groupName)) { groupName = `${best.name} (${counter++})`; }
    usedNames.add(groupName);

    await setDoc(doc(firestore, 'color_groups', `group-${i}`), {
      id: `group-${i}`,
      name: groupName,
      lab: { l: c[0], a: c[1], b: c[2] },
      sampleCount: members.length
    });
  }

  console.log(`✅ ${centroids.length} grupos de color regenerados.`);
}

regenerate().catch(console.error);
