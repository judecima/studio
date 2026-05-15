import * as fs from 'fs';
import * as path from 'path';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '../src/firebase';
import { Panel } from '../src/lib/types';

async function upload() {
  const args = process.argv.slice(2);
  const inputPath = args.indexOf('--input') !== -1 ? args[args.indexOf('--input') + 1] : 'tmp/panels_full_export.fixed.complete.json';
  const dryRun = args.includes('--dry-run');
  const apply = args.includes('--apply');

  if (!dryRun && !apply) {
    console.error('❌ Debe especificar --dry-run o --apply');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ No existe el archivo: ${inputPath}`);
    process.exit(1);
  }

  const { firestore } = initializeFirebase();
  const newPanels: Panel[] = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  
  console.log(`📖 Leyendo ${newPanels.length} paneles para subir...`);

  // Get current panels for comparison
  const snap = await getDocs(collection(firestore, 'panels'));
  const currentPanelsMap = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() } as any]));

  const plan = {
    docsToCreate: 0,
    docsToUpdate: 0,
    docsSkipped: 0,
    fieldsChanged: 0,
    panelsWithManualFields: 0,
    warnings: [] as string[],
    actions: [] as any[]
  };

  for (const newP of newPanels) {
    const currentP = currentPanelsMap.get(newP.id);
    if (!currentP) {
      plan.docsToCreate++;
      plan.actions.push({ id: newP.id, name: newP.name, action: 'CREATE' });
    } else {
      const changes: any = {};
      let hasChanges = false;
      
      // Fields to update (Industrial fields)
      const fields = [
        'materialType', 'surfaceTexture', 'finish', 'colorParent', 'tone', 
        'lightnessGroup', 'hasGrain', 'directionality', 'name', 'code', 
        'brand', 'description', 'labColor', 'hexColor', 'commercialLine'
      ];

      fields.forEach(f => {
        if (JSON.stringify(newP[f as keyof Panel]) !== JSON.stringify(currentP[f])) {
          changes[f] = newP[f as keyof Panel];
          // Also update sources
          const srcField = `${f}Source`;
          if ((newP as any)[srcField]) changes[srcField] = (newP as any)[srcField];
          hasChanges = true;
          plan.fieldsChanged++;
        }
      });

      if (hasChanges) {
        plan.docsToUpdate++;
        plan.actions.push({ id: newP.id, name: newP.name, action: 'UPDATE', changes });
      } else {
        plan.docsSkipped++;
      }
    }
  }

  const outputDir = path.dirname(inputPath);
  fs.writeFileSync(path.join(outputDir, 'firestore_panels_upload_plan.json'), JSON.stringify(plan, null, 2));

  let md = `# Firestore Panels Upload Plan\n\n`;
  md += `## Summary\n`;
  md += `- Docs to Create: ${plan.docsToCreate}\n`;
  md += `- Docs to Update: ${plan.docsToUpdate}\n`;
  md += `- Docs Skipped: ${plan.docsSkipped}\n`;
  md += `- Fields to Change: ${plan.fieldsChanged}\n\n`;

  if (plan.docsToUpdate > 0) {
    md += `### Changes Sample (First 20)\n`;
    plan.actions.filter(a => a.action === 'UPDATE').slice(0, 20).forEach(a => {
      md += `- **${a.name}** (${a.id}): ${Object.keys(a.changes).join(', ')}\n`;
    });
  }

  fs.writeFileSync(path.join(outputDir, 'firestore_panels_upload_plan.md'), md);

  if (apply) {
    console.log('💾 Aplicando cambios en Firestore...');
    let count = 0;
    for (const action of plan.actions) {
      const docRef = doc(firestore, 'panels', action.id);
      if (action.action === 'CREATE') {
        const p = newPanels.find(x => x.id === action.id);
        await setDoc(docRef, {
          ...p,
          stock: true,
          visible: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (action.action === 'UPDATE') {
        await updateDoc(docRef, {
          ...action.changes,
          updatedAt: serverTimestamp()
        });
      }
      count++;
      if (count % 20 === 0) console.log(`  - ${count} procesados...`);
    }
    console.log(`✅ Upload completado. ${count} documentos afectados.`);
  } else {
    console.log(`✅ Dry-run completado. Reporte en ${outputDir}/firestore_panels_upload_plan.md`);
  }
}

upload().catch(console.error);
