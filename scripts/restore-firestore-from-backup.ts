import * as fs from 'fs';
import * as path from 'path';
import { collection, doc, setDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '../src/firebase';

async function restore() {
  const args = process.argv.slice(2);
  const manifestPath = args.indexOf('--manifest') !== -1 ? args[args.indexOf('--manifest') + 1] : undefined;

  if (!manifestPath) {
    console.error('❌ Debe especificar --manifest <path_al_json_de_manifiesto>');
    process.exit(1);
  }

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ No existe el manifiesto: ${manifestPath}`);
    process.exit(1);
  }

  const backupDir = path.dirname(manifestPath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const { firestore } = initializeFirebase();

  console.log(`⚠️ INICIANDO RESTAURACIÓN (Proyecto: ${manifest.projectId}, Timestamp: ${manifest.timestamp})`);
  
  // 1. Restore Panels
  const panelsFile = path.join(backupDir, manifest.files.panels.filename);
  const panels: any[] = JSON.parse(fs.readFileSync(panelsFile, 'utf8'));
  console.log(`📦 Restaurando ${panels.length} paneles...`);
  
  // Opcional: Limpiar colección actual primero? Por seguridad mejor sobreescribir por ID.
  for (const p of panels) {
    const { id, ...data } = p;
    await setDoc(doc(firestore, 'panels', id), {
      ...data,
      restoredAt: serverTimestamp()
    });
  }

  // 2. Restore Equivalences
  const eqFile = path.join(backupDir, manifest.files.equivalences.filename);
  const equivalences: any[] = JSON.parse(fs.readFileSync(eqFile, 'utf8'));
  console.log(`🔗 Restaurando ${equivalences.length} equivalencias...`);
  
  for (const eq of equivalences) {
    const { id, ...data } = eq;
    await setDoc(doc(firestore, 'equivalences', id), {
      ...data,
      restoredAt: serverTimestamp()
    });
  }

  console.log('✅ Restauración completada con éxito.');
}

restore().catch(console.error);
