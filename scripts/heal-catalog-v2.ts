import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { converter, differenceCiede2000 } from 'culori';

// Firebase Config
const firebaseConfig = {
  projectId: "studio-5733239027-4f570",
  appId: "1:555482287833:web:404d2512c008ea291178c8",
  apiKey: "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  authDomain: "studio-5733239027-4f570.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const toLab = converter('lab');
const de2000 = differenceCiede2000();

// 🎨 PALETA DE PADRES (Normalizada a minúsculas)
const COLOR_PARENTS = [
  { name: 'blanco', lab: { l: 95, a: 0, b: 0 } },
  { name: 'beige', lab: { l: 80, a: 5, b: 15 } },
  { name: 'gris', lab: { l: 50, a: 0, b: 0 } },
  { name: 'negro', lab: { l: 10, a: 0, b: 0 } },
  { name: 'marron', lab: { l: 35, a: 15, b: 15 } },
  { name: 'rojo', lab: { l: 45, a: 60, b: 45 } },
  { name: 'verde', lab: { l: 45, a: -50, b: 30 } },
  { name: 'azul', lab: { l: 30, a: 50, b: -70 } },
  { name: 'amarillo', lab: { l: 85, a: -10, b: 80 } },
  { name: 'naranja', lab: { l: 60, a: 40, b: 55 } },
  { name: 'violeta', lab: { l: 40, a: 45, b: -45 } },
  { name: 'rosa', lab: { l: 70, a: 35, b: -10 } }
];

async function heal() {
  console.log("🚀 Iniciando Sanación Profunda del Catálogo...");
  
  try {
    const snap = await getDocs(collection(db, 'panels'));
    const panels = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    console.log(`📊 Analizando ${panels.length} paneles...`);
    let updatedCount = 0;
    
    for (const panel of panels) {
      const lab = panel.labColor || (panel.hexColor ? toLab(panel.hexColor) : null);
      const name = (panel.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const code = (panel.code || '').toLowerCase();
      
      // 1. Detectar Color Padre
      let colorParent = 'otro';
      
      // Prioridad Semántica
      if (name.includes('blanco') || name.includes('nieve')) colorParent = 'blanco';
      else if (name.includes('negro') || name.includes('notte') || name.includes('carbon')) colorParent = 'negro';
      else if (name.includes('gris') || name.includes('humo') || name.includes('plata') || name.includes('grafito')) colorParent = 'gris';
      else if (name.includes('beige') || name.includes('arena') || name.includes('almendra') || name.includes('crema')) colorParent = 'beige';
      else if (name.includes('roble') || name.includes('nogal') || name.includes('haya') || name.includes('cedro') || name.includes('marron')) colorParent = 'marron';
      else if (name.includes('verde') || name.includes('oliva') || name.includes('safari')) colorParent = 'verde';
      else if (name.includes('azul') || name.includes('indigo')) colorParent = 'azul';
      else if (name.includes('rojo') || name.includes('terracota') || name.includes('amaranto')) colorParent = 'rojo';
      
      // Fallback LAB
      if (colorParent === 'otro' && lab) {
        let best = COLOR_PARENTS[0];
        let minDE = Infinity;
        for (const p of COLOR_PARENTS) {
          const dE = de2000(lab, p.lab);
          if (dE < minDE) {
            minDE = dE;
            best = p;
          }
        }
        colorParent = best.name;
      }
      
      // 2. Detectar Veta (hasGrain)
      // Si no tiene el campo o es inconsistente
      const hasGrain = (name + ' ' + code).match(/roble|nogal|cedro|pino|haya|teka|fresno|ebano|wengue|guatambu|jacaranda|petiribi|paraiso|madera|veta|st12|st19|st22|st32|st37|st38/i) ? true : false;

      // 3. Actualizar
      const updates: any = {};
      if (panel.colorParent !== colorParent) updates.colorParent = colorParent;
      if (panel.hasGrain !== hasGrain) updates.hasGrain = hasGrain;
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'panels', panel.id), {
          ...updates,
          updatedAt: serverTimestamp()
        });
        updatedCount++;
        if (updatedCount % 20 === 0) console.log(`  - ${updatedCount} actualizados...`);
      }
    }
    
    console.log(`✅ Sanación completada. Total actualizado: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

heal();
