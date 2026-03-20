import { CatalogProduct } from './catalog.types';

/**
 * Calcula un score de similaridad entre 0 y 1.
 * Ponderación: Material(40%), Color Hue(30%), Tono(20%), Grupo Color(10%)
 */
export function calculateSimilarity(a: CatalogProduct, b: CatalogProduct): number {
  if (a.id === b.id) return 1;

  let score = 0;

  // Material (40%)
  if (a.fingerprint.material === b.fingerprint.material) score += 0.4;

  // Color Hue (30%)
  if (a.color.hue === b.color.hue) score += 0.3;

  // Tono (20%)
  if (a.fingerprint.tone === b.fingerprint.tone) score += 0.2;

  // Grupo Color (10%)
  if (a.color.group === b.color.group) score += 0.1;

  return Number(score.toFixed(2));
}

/**
 * Infiere la razón de similaridad.
 */
export function getSimilarityReason(a: CatalogProduct, b: CatalogProduct): string {
  if (a.color.hue === b.color.hue && a.fingerprint.material === b.fingerprint.material) {
    return "Mismo material y tonalidad similar";
  }
  if (a.color.hue === b.color.hue) {
    return "Tonalidades cromáticas equivalentes";
  }
  return "Diseño y acabado similar";
}
