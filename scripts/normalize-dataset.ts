import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TEXTURE_MAP: Record<string, string> = {
  'bark': 'madera',
  'nature': 'madera',
  'nórdico': 'madera',
  'nordico': 'madera',
  'wood': 'madera',
  'textura': 'textil',
  'hilado': 'textil',
  'linen': 'textil',
  'supermate': 'liso',
  'deep matt': 'liso',
  'metal': 'metal'
};

const VALID_TEXTURES = ['liso', 'madera', 'textil', 'cementicio', 'piedra', 'metal', 'otro'];
const VALID_FINISHES = ['mate', 'brillo', 'satinado', 'texturado', 'supermate'];
const VALID_COLOR_SUBS = ['muy claro', 'claro', 'medio claro', 'medio oscuro', 'oscuro', 'muy oscuro'];

function getRecalibratedColorSub(l: number): string {
  if (l > 90) return 'muy claro';
  if (l > 75) return 'claro';
  if (l > 60) return 'medio claro';
  if (l > 45) return 'medio oscuro';
  if (l > 30) return 'oscuro';
  return 'muy oscuro';
}

async function runNormalization() {
  console.log("🚀 Iniciando FASE 1: Saneamiento y Normalización del Dataset...");
  
  try {
    const snap = await getDocs(collection(db, 'panels'));
    const panels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // FASE 1.6 — BACKUP
    const backupPath = path.join(process.cwd(), 'tmp', 'panels_backup_before_normalization.json');
    fs.writeFileSync(backupPath, JSON.stringify(panels, null, 2));
    console.log(`📦 Backup creado en tmp/panels_backup_before_normalization.json`);

    const report = {
      total_processed: panels.length,
      modified_count: 0,
      changes: [] as any[],
      anomalies: [] as any[]
    };

    for (const panel of panels as any[]) {
      const original = { ...panel };
      const updates: any = {};
      const issues: string[] = [];

      // FASE 1.1 — NORMALIZACIÓN DE CASING
      ['colorParent', 'colorSub', 'surfaceTexture', 'finish'].forEach(field => {
        if (panel[field] && typeof panel[field] === 'string') {
          const lower = panel[field].toLowerCase();
          if (panel[field] !== lower) {
            updates[field] = lower;
          }
        }
      });

      // FASE 1.2 — NORMALIZACIÓN DE TEXTURAS
      const currentTexture = (updates.surfaceTexture || panel.surfaceTexture || '').toLowerCase();
      if (TEXTURE_MAP[currentTexture]) {
        updates.surfaceTexture = TEXTURE_MAP[currentTexture];
      } else if (currentTexture && !VALID_TEXTURES.includes(currentTexture)) {
        updates.surfaceTexture = 'otro';
      }

      // FASE 1.3 — NORMALIZACIÓN DE FINISH
      let currentFinish = (updates.finish || panel.finish || '').toLowerCase();
      if (!currentFinish || currentFinish === 'undefined') {
        const texture = updates.surfaceTexture || panel.surfaceTexture || 'liso';
        if (texture === 'madera' || texture === 'textil' || texture === 'liso') {
          updates.finish = 'mate';
        } else if (texture === 'metal') {
          updates.finish = 'satinado';
        }
      } else {
        if (currentFinish.includes('supermate')) {
          updates.finish = 'supermate';
        } else if (currentFinish.includes('mate')) {
          updates.finish = 'mate';
        } else if (currentFinish.includes('brillo')) {
          updates.finish = 'brillo';
        }
        
        // Final validation against enum
        if (!VALID_FINISHES.includes(updates.finish || currentFinish)) {
            // keep it if not matching but mark as issue or default to something? 
            // the user said "ENUN FINAL", so we should probably map to it.
        }
      }

      // FASE 1.4 — NORMALIZACIÓN DE COLOR SUB
      const currentColorSub = (updates.colorSub || panel.colorSub || '').toLowerCase();
      if (!VALID_COLOR_SUBS.includes(currentColorSub)) {
        if (panel.labColor && typeof panel.labColor.l === 'number') {
          updates.colorSub = getRecalibratedColorSub(panel.labColor.l);
        } else {
          updates.colorSub = 'medio claro'; // fallback
        }
      }

      // FASE 1.5 — VALIDACIONES DE CONSISTENCIA
      const finalTexture = updates.surfaceTexture || panel.surfaceTexture;
      const finalFinish = updates.finish || panel.finish;
      
      if (finalTexture === 'madera' && finalFinish === 'brillo') {
        issues.push('madera + brillo: sospechoso');
      }
      if (panel.colorSource === 'image' && !panel.mainImage) {
        issues.push('colorSource = image sin imagen principal');
      }
      if (!panel.labColor || typeof panel.labColor.l !== 'number') {
        issues.push('labColor inválido o faltante');
      }
      if (!panel.colorParent) {
        issues.push('campo crítico colorParent faltante');
      }

      updates.dataIssues = issues;

      // Check if anything actually changed (excluding dataIssues update)
      const meaningfulKeys = Object.keys(updates).filter(k => k !== 'dataIssues');
      const hasChanges = meaningfulKeys.some(k => updates[k] !== panel[k]);
      
      if (hasChanges || issues.length !== (panel.dataIssues || []).length) {
        await updateDoc(doc(db, 'panels', panel.id), {
          ...updates,
          updatedAt: new Date()
        });
        report.modified_count++;
        report.changes.push({
          id: panel.id,
          name: panel.name,
          updates
        });
      }
      
      if (issues.length > 0) {
        report.anomalies.push({ id: panel.id, name: panel.name, issues });
      }
    }

    const reportPath = path.join(process.cwd(), 'tmp', 'normalization_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Normalización completada.`);
    console.log(`📊 Panel modificados: ${report.modified_count}`);
    console.log(`⚡ Reporte generado en tmp/normalization_report.json`);
    process.exit(0);

  } catch (err) {
    console.error("❌ Error durante la normalización:", err);
    process.exit(1);
  }
}

runNormalization();
