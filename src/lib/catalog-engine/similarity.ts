import { Fingerprint } from './catalog.types';

/**
 * Calcula un puntaje de similaridad ponderado entre dos huellas digitales de productos.
 * 
 * Ponderación:
 * - Material: 40% (Base del diseño)
 * - Tonalidad (Hue): 30% (Color dominante)
 * - Grupo de Color: 15% (Luminosidad)
 * - Intensidad de Veta: 10% (Textura visual)
 * - Tono: 5% (Temperatura de color)
 */
export function calculateSimilarityScore(a: Fingerprint, b: Fingerprint): number {
  let score = 0;

  // Material (Peso: 4)
  if (a.material === b.material) score += 4;

  // Color Hue (Peso: 3)
  if (a.colorHue === b.colorHue) score += 3;

  // Color Group (Peso: 1.5)
  if (a.colorGroup === b.colorGroup) score += 1.5;

  // Grain Intensity (Peso: 1)
  const grainDiff = Math.abs(a.grainIntensity - b.grainIntensity);
  if (grainDiff === 0) score += 1;
  else if (grainDiff === 1) score += 0.5;

  // Tone (Peso: 0.5)
  if (a.tone === b.tone) score += 0.5;

  return score;
}
