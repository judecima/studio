import { CatalogProduct } from './catalog.types';

/**
 * Calcula un score de similaridad entre 0 y 1.
 * Ponderación: Material (40%), Tono (20%), Hue (30%), Grupo (10%)
 */
export function calculateSimilarity(a: CatalogProduct, b: CatalogProduct): number {
  if (a.id === b.id) return 1;

  let score = 0;

  // Material (30%)
  if (a.fingerprint.material === b.fingerprint.material) score += 0.3;
  
  // Color Hue Exacto (20%)
  if (a.color.hue === b.color.hue) score += 0.2;

  // Basic Colors Intersection (20%)
  if (a.color.basicColors && b.color.basicColors) {
    const commonColors = a.color.basicColors.filter(c => b.color.basicColors.includes(c));
    if (commonColors.length > 0) {
      score += 0.2;
    }
  }

  // Tono (20%)
  if (a.fingerprint.tone === b.fingerprint.tone) score += 0.2;

  // Grupo (10%)
  if (a.color.group === b.color.group) score += 0.1;

  return Number(score.toFixed(2));
}

export function getSimilarityReason(a: CatalogProduct, b: CatalogProduct): string {
  const commonColors = (a.color.basicColors || []).filter(c => (b.color.basicColors || []).includes(c));
  
  if (commonColors.length > 0 && a.fingerprint.material === b.fingerprint.material) {
    return `Mismo material y tonalidad similar (${commonColors[0]})`;
  }
  if (commonColors.length > 0) {
    return `Tonalidades cromáticas similares (${commonColors[0]})`;
  }
  if (a.color.hue === b.color.hue) {
    return "Tonalidades cromáticas equivalentes";
  }
  return "Diseño y acabado complementario";
}
