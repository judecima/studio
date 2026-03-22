import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { converter } from 'culori';
import path from 'path';
import fs from 'fs';

const toLab = converter('lab');

/**
 * Extracts the dominant color from an image file using jimp (pure JS JPEG decoder).
 * Samples the center 30%×30% of the image in a grid to avoid edges and compression noise.
 */
async function extractHexFromImage(imagePath: string): Promise<{ hex: string; lab: { l: number; a: number; b: number } } | null> {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    if (!fs.existsSync(fullPath)) return null;

    // Dynamically import jimp (works in Node, avoids browser bundle issues)
    const { Jimp } = await import('jimp');
    const img = await Jimp.read(fullPath);

    const w = img.width;
    const h = img.height;

    // Sample the central 30% region of the image (avoid shadows, borders, backgrounds)
    const x0 = Math.floor(w * 0.35);
    const y0 = Math.floor(h * 0.35);
    const x1 = Math.floor(w * 0.65);
    const y1 = Math.floor(h * 0.65);

    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    const step = Math.max(1, Math.floor((x1 - x0) / 20)); // up to 20×20 samples

    for (let y = y0; y < y1; y += step) {
      for (let x = x0; x < x1; x += step) {
        const hex = img.getPixelColor(x, y);
        // Jimp packs RGBA as 32-bit integer: RRGGBBAA
        const r = (hex >>> 24) & 0xff;
        const g = (hex >>> 16) & 0xff;
        const b = (hex >>> 8) & 0xff;
        rSum += r; gSum += g; bSum += b; count++;
      }
    }

    if (count === 0) return null;

    const r = Math.round(rSum / count);
    const g = Math.round(gSum / count);
    const b = Math.round(bSum / count);

    // Build HEX string
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    // Convert to LAB via culori (precise, D65 illuminant)
    const labColor = toLab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
    const lab = {
      l: Math.round((labColor?.l ?? 0) * 100) / 100,
      a: Math.round((labColor?.a ?? 0) * 100) / 100,
      b: Math.round((labColor?.b ?? 0) * 100) / 100,
    };

    return { hex, lab };
  } catch (e: any) {
    console.error(`Error procesando ${imagePath}:`, e.message);
    return null;
  }
}

export async function GET() {
  try {
    const { firestore } = initializeFirebase();
    const panelsSnap = await getDocs(collection(firestore, 'panels'));

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const results: string[] = [];

    for (const panelDoc of panelsSnap.docs) {
      const data = panelDoc.data();

      // Skip if already has a manually certified labColor
      if (data.labColor) {
        console.log(`⏭️  ${panelDoc.id}: ya tiene labColor certificado, saltando.`);
        skipped++;
        continue;
      }

      const imagePath = data.mainImage;
      if (!imagePath) { skipped++; continue; }

      const color = await extractHexFromImage(imagePath);

      if (!color) {
        console.log(`❌ ${panelDoc.id}: no se pudo extraer color de "${imagePath}"`);
        errors++;
        continue;
      }

      await updateDoc(doc(firestore, 'panels', panelDoc.id), {
        hexColor: color.hex,
        // Note: labColor is NOT set here — that's reserved for certified values.
        // The engine will compute LAB from hexColor via culori.
      });

      const msg = `✅ ${panelDoc.id}: HEX=${color.hex} → L*=${color.lab.l}, a*=${color.lab.a}, b*=${color.lab.b}`;
      console.log(msg);
      results.push(msg);
      processed++;
    }

    // After extracting colors, we need to re-run equivalences
    console.log(`\n🏁 Extracción completada: ${processed} procesados, ${skipped} saltados, ${errors} errores.`);
    console.log('👉 Ahora visita /api/equivalences para regenerar las equivalencias con los nuevos colores.');

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      errors,
      message: `Extracción de HEX completada. Ahora visita /api/equivalences para re-sincronizar.`,
      sample: results.slice(0, 10),
    });

  } catch (error: any) {
    console.error('❌ Error en extract-colors:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
