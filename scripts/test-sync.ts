/**
 * Test Sync Script
 * Runs the sync logic locally and logs the group assignments.
 */
import { initializeFirebase } from '../src/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
  { name: 'Verde Oliva / Musgo', hex: '#54603c' },
  { name: 'Verde Bosque', hex: '#2E473B' },
  { name: 'Azul Petróleo / Noche', hex: '#1C2E3D' },
  { name: 'Terracota / Óxido', hex: '#8D4925' },
  { name: 'Rojo / Borravino', hex: '#630B1C' }
];

async function testSync() {
  const { firestore } = initializeFirebase();
  const snap = await getDocs(collection(firestore, 'panels'));
  const solids = snap.docs
    .map(d => ({ id: d.id, name: d.data().name, labColor: d.data().labColor, hasGrain: d.data().hasGrain }))
    .filter(p => !p.hasGrain && p.labColor);

  console.log(`📊 Sólidos: ${solids.length}`);
  const data = solids.map(p => [p.labColor.l, p.labColor.a, p.labColor.b]);
  const K = 24;
  const clusters = kmeans(data, K, {});
  const centroids = clusters.centroids;

  const colorGroups = centroids.map((c: any, clusterIdx: number) => {
    const lab = { mode: 'lab', l: c[0], a: c[1], b: c[2] };
    
    // Naming with bias
    const members = solids.filter((_, i) => clusters.clusters[i] === clusterIdx);
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

      if (diff < minDiff) {
        minDiff = diff;
        best = p;
      }
    });

    return {
      id: clusterIdx,
      name: best.name,
      lab: { l: c[0], a: c[1], b: c[2] }
    };
  });

  // Ver asignación para los problemáticos
  solids.forEach(p => {
    if (p.name.toLowerCase().includes('oliva') || p.name.toLowerCase().includes('verde')) {
      const pLab = { mode: 'lab', l: p.labColor.l, a: p.labColor.a, b: p.labColor.b };
      let bestGroup = colorGroups[0];
      let minDiff = Infinity;
      colorGroups.forEach(g => {
        const diff = ciede2000(pLab, { mode: 'lab', ...g.lab } as any);
        if (diff < minDiff) {
          minDiff = diff;
          bestGroup = g;
        }
      });
      console.log(`🔍 Product: ${p.name} -> Assigned to: ${bestGroup.name} (Diff: ${minDiff.toFixed(2)})`);
    }
  });
}

testSync().catch(console.error);
