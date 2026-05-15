import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = {
  "projectId": "studio-5733239027-4f570",
  "appId": "1:555482287833:web:404d2512c008ea291178c8",
  "apiKey": "AIzaSyCFz3uaXfz9KHvtNq1fMTI_R8cD-IUm-V0",
  "authDomain": "studio-5733239027-4f570.firebaseapp.com",
  "storageBucket": "studio-5733239027-4f570.firebasestorage.app",
  "messagingSenderId": "555482287833"
};

const ALLOWED_FAMILIES = ['blanco', 'negro', 'gris', 'beige', 'marron', 'rojo', 'naranja', 'amarillo', 'verde', 'azul', 'rosa', 'custom', 'otro'];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runAudit() {
  console.log("📡 Iniciando auditoría extendida de colores...");
  const snap = await getDocs(collection(db, 'panels'));
  const panels = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

  const customPanels = panels.filter(p => p.colorParent === 'custom');
  const legacyPanels = panels.filter(p => p.colorParent === 'otro');
  const outsideEnum = panels.filter(p => !ALLOWED_FAMILIES.includes(p.colorParent));
  
  const customCounts: Record<string, number> = {};
  const normalizedMap: Record<string, string[]> = {};
  
  customPanels.forEach(p => {
    const val = p.customColorFamily || 'VACÍO';
    customCounts[val] = (customCounts[val] || 0) + 1;
    
    if (p.customColorFamilyNormalized) {
      if (!normalizedMap[p.customColorFamilyNormalized]) normalizedMap[p.customColorFamilyNormalized] = [];
      normalizedMap[p.customColorFamilyNormalized].push(p.id);
    }
  });

  const report = {
    summary: {
      totalPanels: panels.length,
      customPanels: customPanels.length,
      legacyPanels: legacyPanels.length,
      outsideEnum: outsideEnum.length,
      percentageCustom: ((customPanels.length / panels.length) * 100).toFixed(2) + '%'
    },
    outsideEnumDetails: outsideEnum.map(p => ({ id: p.id, name: p.name, value: p.colorParent })),
    topCustomColors: Object.entries(customCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    anomalies: {
      emptyCustoms: customPanels.filter(p => !p.customColorFamily).map(p => ({ id: p.id, name: p.name })),
      emptyNormalized: customPanels.filter(p => !p.customColorFamilyNormalized && p.customColorFamily).map(p => ({ id: p.id, name: p.name })),
      duplicateNormalized: Object.entries(normalizedMap).filter(([_, ids]) => ids.length > 1).map(([norm, ids]) => ({ norm, ids })),
      legacyToMigrate: legacyPanels.map(p => ({ id: p.id, name: p.name }))
    }
  };

  const outputDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  
  const outputPath = path.join(outputDir, 'custom_color_audit.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ Auditoría completada. Reporte en tmp/custom_color_audit.json`);
  console.log(`📊 Custom: ${customPanels.length} | Outside Enum: ${outsideEnum.length} | Legacy: ${legacyPanels.length}`);
  process.exit(0);
}

runAudit();
