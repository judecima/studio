import { ClassifiedPanel } from './types';
import { calculateScore } from './equivalences/engine';

/**
 * 🔥 MATCH ENGINE (Points-Based)
 * Encuentra los mejores equivalentes para un panel dado.
 * Utiliza el sistema de PUNTOS (mayor score = mejor match).
 */
export function findTopMatches(target: ClassifiedPanel, library: ClassifiedPanel[], limit = 5) {
  return library
    .filter(p => p.id !== target.id) // No compararse consigo mismo
    .map(panel => {
      const score = calculateScore(target, panel);
      return { ...panel, matchScore: score };
    })
    .sort((a, b) => b.matchScore - a.matchScore) // Mayor score = mejor match
    .slice(0, limit);
}
