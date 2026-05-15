import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '../src/firebase';

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join('tmp', 'backup');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const { firestore, firebaseApp } = initializeFirebase();
  const projectId = (firebaseApp.options as any).projectId || 'unknown';

  console.log(`🚀 Iniciando backup de Firestore (Proyecto: ${projectId})...`);

  try {
    // 1. Backup Panels
    console.log('📦 Exportando colección: panels...');
    const panelsSnap = await getDocs(collection(firestore, 'panels'));
    const panelsData = panelsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const panelsFile = `firestore_panels_backup_${timestamp}.json`;
    const panelsPath = path.join(backupDir, panelsFile);
    fs.writeFileSync(panelsPath, JSON.stringify(panelsData, null, 2));

    // 2. Backup Equivalences
    console.log('🔗 Exportando colección: equivalences...');
    const eqSnap = await getDocs(collection(firestore, 'equivalences'));
    const eqData = eqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const eqFile = `firestore_equivalences_backup_${timestamp}.json`;
    const eqPath = path.join(backupDir, eqFile);
    fs.writeFileSync(eqPath, JSON.stringify(eqData, null, 2));

    // 3. Generate Manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      projectId,
      env: process.env.NODE_ENV || 'development',
      files: {
        panels: {
          filename: panelsFile,
          count: panelsData.length,
          sha256: crypto.createHash('sha256').update(JSON.stringify(panelsData)).digest('hex')
        },
        equivalences: {
          filename: eqFile,
          count: eqData.length,
          sha256: crypto.createHash('sha256').update(JSON.stringify(eqData)).digest('hex')
        }
      }
    };

    const manifestFile = `firestore_backup_manifest_${timestamp}.json`;
    fs.writeFileSync(path.join(backupDir, manifestFile), JSON.stringify(manifest, null, 2));

    console.log('✅ Backup completado exitosamente.');
    console.log(`📄 Manifiesto: ${manifestFile}`);
    console.log(`📊 Paneles: ${panelsData.length}, Equivalencias: ${eqData.length}`);
  } catch (error) {
    console.error('❌ Error fatal durante el backup:', error);
    process.exit(1);
  }
}

backup();
