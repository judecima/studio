import * as fs from 'fs';
import * as path from 'path';
import { Panel, SurfaceTexture, Finish, ColorSource, ColorParent } from '../src/lib/types';
import { 
  detectColorParentDetailed, 
  detectColorSubDetailed, 
  detectSurfaceTextureDetailed, 
  detectFinishDetailed 
} from '../src/lib/equivalences/classifier';

async function ensureCompleteness() {
  const inputPath = 'tmp/panels_full_export.fixed.egger_enriched.json';
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ No existe ${inputPath}`);
    process.exit(1);
  }

  const panels: Panel[] = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  console.log(`🔍 Asegurando completitud industrial para ${panels.length} paneles...`);

  const enriched = panels.map(p => {
    const newP = { ...p };
    
    // 1. Detectar campos si faltan
    const textureD = detectSurfaceTextureDetailed(p.name, p.code);
    const finishD = detectFinishDetailed(p.name, p.code);
    const parentD = detectColorParentDetailed(p.name, p.labColor as any);
    
    if (newP.surfaceTexture === undefined) {
      newP.surfaceTexture = textureD.value;
      (newP as any).surfaceTextureSource = 'inferred';
    }
    
    if (newP.finish === undefined) {
      newP.finish = finishD.value;
      (newP as any).finishSource = 'inferred';
    }

    if (newP.colorParent === undefined) {
      newP.colorParent = parentD.value;
      (newP as any).colorParentSource = 'inferred';
    }

    if (newP.hasGrain === undefined) {
      newP.hasGrain = (newP.surfaceTexture === 'madera');
      (newP as any).hasGrainSource = 'inferred';
    }

    if (newP.directionality === undefined) {
      if (newP.surfaceTexture === 'madera') newP.directionality = 'veta';
      else if (newP.surfaceTexture === 'textil') newP.directionality = 'trama';
      else newP.directionality = 'none';
      (newP as any).directionalitySource = 'inferred';
    }

    if (newP.materialType === undefined) {
      if (newP.surfaceTexture === 'madera') newP.materialType = 'madera';
      else if (newP.surfaceTexture === 'textil') newP.materialType = 'textil';
      else if (newP.surfaceTexture === 'cementicio' || newP.surfaceTexture === 'piedra') newP.materialType = 'piedra';
      else if (newP.surfaceTexture === 'metal') newP.materialType = 'metal';
      else newP.materialType = 'unicolor';
      (newP as any).materialTypeSource = 'inferred';
    }

    // Tone and Lightness (Basado en LAB si existe, sino genérico)
    if (newP.tone === undefined || newP.lightnessGroup === undefined) {
      const L = newP.labColor?.l ?? 50;
      let group = 'media';
      let tone = 'medio';
      
      if (L >= 90) { group = 'media_alta'; tone = 'muy_claro'; }
      else if (L >= 75) { group = 'media_alta'; tone = 'claro'; }
      else if (L >= 55) { group = 'media'; tone = 'medio'; }
      else if (L >= 35) { group = 'media_baja'; tone = 'oscuro'; }
      else { group = 'baja'; tone = 'muy_oscuro'; }

      if (newP.tone === undefined) {
        newP.tone = tone as any;
        (newP as any).toneSource = 'inferred';
      }
      if (newP.lightnessGroup === undefined) {
        newP.lightnessGroup = group as any;
        (newP as any).lightnessGroupSource = 'inferred';
      }
    }

    return newP;
  });

  const outputPath = 'tmp/panels_full_export.fixed.complete.json';
  fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
  console.log(`✅ Archivo generado con éxito: ${outputPath}`);
}

ensureCompleteness().catch(console.error);
