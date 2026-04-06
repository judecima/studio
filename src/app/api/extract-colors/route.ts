import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { converter } from 'culori';
import path from 'path';
import fs from 'fs';
import { extractColorFromImage, getColorFromNcs } from '@/lib/colors/extractor';

const toLab = converter('lab');

/**
 * Helper to get color from a local public image path.
 */
async function getPanelColor(imagePath: string): Promise<{ hex: string; lab: { l: number; a: number; b: number } } | null> {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    if (!fs.existsSync(fullPath)) return null;

    const buffer = fs.readFileSync(fullPath);
    return await extractColorFromImage(buffer);
  } catch (e: any) {
    console.error(`Error processing ${imagePath}:`, e.message);
    return null;
  }
}

export async function GET() {
  try {
    const { firestore } = initializeFirebase();
    const panelsSnap = await getDocs(collection(firestore, 'panels'));

    let processed = 0;
    let skipped = 0;
    let errorsCount = 0;

    for (const panelDoc of panelsSnap.docs) {
      const data = panelDoc.data();

      // Skip if already has a manually certified labColor
      if (data.labColor) {
        skipped++;
        continue;
      }

      const imagePath = data.mainImage;
      let colorData = null;

      if (data.colorData?.ncs) {
        colorData = await getColorFromNcs(data.colorData.ncs);
      }
      
      if (!colorData && imagePath) {
        colorData = await getPanelColor(imagePath);
      }

      if (!colorData) {
        errorsCount++;
        continue;
      }

      // 🛡️ ACTUALIZAR hasGrain si falta (Material Barrier)
      let hasGrain = data.hasGrain;
      if (hasGrain === undefined) {
        const name = (data.name || '').toLowerCase();
        const brand = (data.brand || '').toLowerCase();
        const line = (data.line || '').toLowerCase();
        const code = (data.code || '').toLowerCase();
        
        const texture = (data.surfaceTexture || '').toLowerCase();
        
        if (brand === 'egger') {
          hasGrain = !code.includes('u') && !name.includes('unicolor');
        } else if (brand === 'faplac') {
          const WOOD_KEYWORDS = /roble|nogal|cedro|pino|haya|teka|fresno|ebano|wengue|guatambu|jacaranda|petiribi|paraiso|madera|veta|wood|grain|oak|walnut|mesopotamia/i;
          const TEXTURE_GRAIN = /woodtext|veteado|veta|mesh|lineal|nature/i;
          hasGrain = TEXTURE_GRAIN.test(texture) || WOOD_KEYWORDS.test(name) || WOOD_KEYWORDS.test(data.description || '');
        } else {
          // Fallback genérico
          hasGrain = !name.includes('unicolor') && !name.includes('liso');
        }
      }

      await updateDoc(doc(firestore, 'panels', panelDoc.id), {
        hexColor: colorData.hex,
        labColor: colorData.lab,
        colorSource: data.colorData?.ncs ? 'ncs' : 'image',
        hasGrain: hasGrain
      });

      processed++;
    }

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      errors: errorsCount,
      message: `Extracción completada: ${processed} procesados.`
    });

  } catch (error: any) {
    console.error('❌ Error en GET extract-colors:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { imageUrl, base64 } = await req.json();
    let colorData = null;
    
    if (imageUrl) {
       colorData = await getPanelColor(imageUrl);
    } else if (base64) {
       const buffer = Buffer.from(base64.split(',')[1], 'base64');
       colorData = await extractColorFromImage(buffer);
    }
    
    if (!colorData) return NextResponse.json({ success: false, error: 'Could not sample pixels' }, { status: 400 });

    return NextResponse.json({
      success: true,
      hex: colorData.hex,
      lab: colorData.lab
    });

  } catch (error: any) {
    console.error('❌ Error en POST extract-colors:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
