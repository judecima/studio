const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, updateDoc } = require('firebase/firestore');
const { kmeans } = require('ml-kmeans');
const { converter, differenceCiede2000 } = require('culori');

const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const toLab = converter('lab');

const PALETTE = [
  { name: 'Blanco Puro', hex: '#FFFFFF' },
  { name: 'Blanco Cálido', hex: '#F5F5F0' },
  { name: 'Hueso', hex: '#E3DAC9' },
  { name: 'Almendra / Crema', hex: '#EEDC82' },
  { name: 'Beige', hex: '#D2B48C' },
  { name: 'Arena', hex: '#C2B280' },
  { name: 'Gris Perla', hex: '#E7E7E7' },
  { name: 'Gris Claro', hex: '#D3D3D3' },
  { name: 'Gris Medio', hex: '#808080' },
  { name: 'Gris Grafito', hex: '#363636' },
  { name: 'Negro', hex: '#000000' },
  { name: 'Madera Clara', hex: '#C19A6B' },
  { name: 'Madera Media', hex: '#8B4513' },
  { name: 'Madera Oscura', hex: '#3B2F2F' }
];

async function generateGroups() {
  console.log("🎨 Refinando Grupos de Color...");
  const snap = await getDocs(collection(db, 'panels'));
  const solids = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.hasGrain && p.labColor);

  console.log(`📊 Agrupando ${solids.length} colores sólidos...`);
  const data = solids.map(p => [p.labColor.l, p.labColor.a, p.labColor.b]);

  const K = 12; // Número de grupos deseados
  const clusters = kmeans(data, K);
  const centroids = clusters.centroids;

  const usedNames = new Set();
  const colorGroups = centroids.map((c, i) => {
    const lab = { mode: 'lab', l: c[0], a: c[1], b: c[2] };
    
    // Encontrar el nombre más cercano en la paleta extendida
    let best = PALETTE[0];
    let minDiff = Infinity;
    
    PALETTE.forEach(p => {
      const pLab = toLab(p.hex);
      const diff = differenceCiede2000()(lab, pLab);
      if (diff < minDiff) {
        minDiff = diff;
        best = p;
      }
    });

    let groupName = best.name;
    let counter = 1;
    while (usedNames.has(groupName)) {
      groupName = `${best.name} (${counter++})`;
    }
    usedNames.add(groupName);

    return {
      id: `group-${i}`,
      name: groupName,
      lab: { l: c[0], a: c[1], b: c[2] },
      sampleCount: clusters.clusters.filter(v => v === i).length
    };
  });

  // Guardar centroides
  for (const group of colorGroups) {
    await setDoc(doc(db, 'color_groups', group.id), group);
    console.log(`✅ Grupo: ${group.name} | Muestras: ${group.sampleCount}`);
  }

  // 3. Re-clasificar todos los paneles (incluyendo maderas para el hue)
  console.log("🔄 Actualizando paneles con nueva clasificación...");
  const allPanels = await getDocs(collection(db, 'panels'));
  for (const docSnap of allPanels.docs) {
    const p = docSnap.data();
    if (!p.labColor) continue;

    const pLab = { mode: 'lab', l: p.labColor.l, a: p.labColor.a, b: p.labColor.b };
    let bestGroup = colorGroups[0];
    let minDiff = Infinity;

    colorGroups.forEach(g => {
      const diff = differenceCiede2000()(pLab, { mode: 'lab', ...g.lab });
      if (diff < minDiff) {
        minDiff = diff;
        bestGroup = g;
      }
    });

    await updateDoc(doc(db, 'panels', docSnap.id), {
      colorGroup: bestGroup.name,
      colorHue: p.labColor.l > 75 ? 'claro' : (p.labColor.l > 40 ? 'medio' : 'oscuro')
    });
  }

  console.log("✨ Finalizado.");
  process.exit(0);
}

generateGroups();
