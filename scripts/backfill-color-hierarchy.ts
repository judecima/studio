import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
// @ts-ignore
import { differenceCiede2000 } from 'culori';

const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const de2000 = differenceCiede2000();

// 🎨 PALETA DE PADRES (Copiada de classifier.ts para evitar problemas de importación en script)
const COLOR_PARENTS = [
  { name: 'Blanco', lab: { l: 95, a: 0, b: 0 } },
  { name: 'Beige', lab: { l: 80, a: 5, b: 15 } },
  { name: 'Gris', lab: { l: 50, a: 0, b: 0 } },
  { name: 'Negro', lab: { l: 10, a: 0, b: 0 } },
  { name: 'Marrón', lab: { l: 35, a: 15, b: 15 } },
  { name: 'Rojo', lab: { l: 45, a: 60, b: 45 } },
  { name: 'Verde', lab: { l: 45, a: -50, b: 30 } },
  { name: 'Azul', lab: { l: 30, a: 50, b: -70 } },
  { name: 'Amarillo', lab: { l: 85, a: -10, b: 80 } },
  { name: 'Naranja', lab: { l: 60, a: 40, b: 55 } },
  { name: 'Violeta', lab: { l: 40, a: 45, b: -45 } },
  { name: 'Rosa', lab: { l: 70, a: 35, b: -10 } }
];

const SUB_LEVELS = [
  { name: 'Muy Claro', minL: 80, maxL: 100 },
  { name: 'Claro', minL: 65, maxL: 80 },
  { name: 'Medio Claro', minL: 50, maxL: 65 },
  { name: 'Medio Oscuro', minL: 35, maxL: 50 },
  { name: 'Oscuro', minL: 20, maxL: 35 },
  { name: 'Muy Oscuro', minL: 0, maxL: 20 }
];

async function backfill() {
  console.log("🚀 Iniciando Backfill de Jerarquía de Color...");
  
  try {
    const snap = await getDocs(collection(db, 'panels'));
    const panels = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    console.log(`📊 Procesando ${panels.length} paneles...`);
    let updatedCount = 0;
    
    for (const panel of panels) {
      if (!panel.labColor) continue;
      
      const lab = panel.labColor;
      const name = panel.name;
      
      // 1. Prioridad: Híbrida (Semántica)
      let bestParentName = '';
      const norm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (norm.includes('safari') || norm.includes('oliva')) bestParentName = 'Verde';
      else if (norm.includes('almendra')) bestParentName = 'Beige';
      
      // 2. Fallback: Distancia LAB pura
      if (!bestParentName) {
        let bestParent = COLOR_PARENTS[0];
        let minDE = Infinity;
        for (const parent of COLOR_PARENTS) {
          const dE = de2000(lab, parent.lab);
          if (dE < minDE) {
            minDE = dE;
            bestParent = parent;
          }
        }
        bestParentName = bestParent.name;
      }
      
      // 3. Encontrar Sub-gama
      let sub = 'Medio';
      for (const level of SUB_LEVELS) {
        if (lab.l >= level.minL && lab.l < level.maxL) {
          sub = level.name;
          break;
        }
      }
      
      // 4. Actualizar si es necesario
      if (panel.colorParent !== bestParentName || panel.colorSub !== sub) {
        await updateDoc(doc(db, 'panels', panel.id), {
          colorParent: bestParentName,
          colorSub: sub,
          updatedAt: new Date().toISOString()
        });
        updatedCount++;
        if (updatedCount % 10 === 0) console.log(`  - ${updatedCount} actualizados...`);
      }
    }
    
    console.log(`✅ Finalizado. Total actualizados: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fatal:", err);
    process.exit(1);
  }
}

backfill();
