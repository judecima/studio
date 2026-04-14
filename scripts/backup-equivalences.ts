/**
 * Backup Equivalences Script
 * Snapshots the current 'equivalences' collection before the final resync.
 */
import { initializeFirebase } from '../src/firebase';
import { collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function backup() {
  const { firestore } = initializeFirebase();
  console.log("📦 Iniciando Backup de la colección 'equivalences'...");

  try {
    const snapshot = await getDocs(collection(firestore, 'equivalences'));
    const allEquivalences = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

    const backupPath = path.join(process.cwd(), 'tmp', 'equivalences_backup_before_final_resync.json');
    fs.writeFileSync(backupPath, JSON.stringify(allEquivalences, null, 2));

    console.log(`✅ Backup completado. ${allEquivalences.length} documentos guardados en tmp/equivalences_backup_before_final_resync.json`);
  } catch (error) {
    console.error("❌ Error durante el backup:", error);
    process.exit(1);
  }
}

backup();
