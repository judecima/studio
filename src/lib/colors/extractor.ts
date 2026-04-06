import sharp from 'sharp';
import { converter, formatHex } from 'culori';
import ncs from 'ncs-color';
import { ncsToHex } from '../constants/colors';

const toLab = converter('lab');

/**
 * Extracts dominant color from an image buffer using the central 30% area.
 * Returns { hex, lab } or null if it fails.
 */
export async function extractColorFromImage(buffer: Buffer): Promise<{ hex: string; lab: { l: number; a: number; b: number } } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (!width || !height) return null;

    // Crop the central 30%
    const cropWidth = Math.floor(width * 0.3);
    const cropHeight = Math.floor(height * 0.3);
    const left = Math.floor((width - cropWidth) / 2);
    const top = Math.floor((height - cropHeight) / 2);

    const { data, info } = await sharp(buffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Average RGB calculation
    const pixelCount = data.length / info.channels;
    let r = 0, g = 0, b = 0;
    
    for (let i = 0; i < data.length; i += info.channels) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    r = Math.floor(r / pixelCount);
    g = Math.floor(g / pixelCount);
    b = Math.floor(b / pixelCount);

    const rgb = { mode: 'rgb' as const, r: r / 255, g: g / 255, b: b / 255 };
    const hex = formatHex(rgb) || '#000000';
    const lab = toLab(rgb);

    if (!lab) return null;

    return {
      hex,
      lab: { 
        l: Math.round(lab.l * 100) / 100, 
        a: Math.round(lab.a * 100) / 100, 
        b: Math.round(lab.b * 100) / 100 
      }
    };
  } catch (error) {
    console.error('Error extracting color from image:', error);
    return null;
  }
}

/**
 * Gets HEX/LAB from an NCS code.
 */
export async function getColorFromNcs(ncsCode: string): Promise<{ hex: string; lab: { l: number; a: number; b: number } } | null> {
  if (!ncsCode) return null;
  const cleanCode = ncsCode.replace(/\*/g, '').trim().toUpperCase();

  const masterHex = ncsToHex(cleanCode);
  if (masterHex) {
    const lab = toLab(masterHex);
    if (lab) {
      return {
        hex: masterHex,
        lab: { 
          l: Math.round(lab.l * 100) / 100, 
          a: Math.round(lab.a * 100) / 100, 
          b: Math.round(lab.b * 100) / 100 
        }
      };
    }
  }

  try {
    const rgbStr = ncs.rgb(cleanCode);
    if (rgbStr) {
      const lab = toLab(rgbStr);
      if (lab) {
        const hex = formatHex(rgbStr) || '#000000';
        return {
          hex,
          lab: { 
            l: Math.round(lab.l * 100) / 100, 
            a: Math.round(lab.a * 100) / 100, 
            b: Math.round(lab.b * 100) / 100 
          }
        };
      }
    }
  } catch (error) {
    console.warn(`Error calculating NCS ${cleanCode}:`, error);
  }

  return null;
}
