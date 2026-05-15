import { ClassifiedPanel } from './types';
import { calculateScore } from '@/lib/equivalences/engine';

/**
 * 🔥 MATCH ENGINE (Points-Based)
 * Encuentra los mejores equivalentes para un panel dado.
 * Utiliza el sistema de PUNTOS (mayor score = mejor match).
 */
export function findTopMatches(target: ClassifiedPanel, library: ClassifiedPanel[], limit = 5) {
  return library
    .filter(p => p.id !== target.id) // No compararse consigo mismo
    .map(panel => {
      const breakdown = calculateScore(target, panel);
      return { ...panel, matchScore: breakdown.total };
    })
    .sort((a, b) => b.matchScore - a.matchScore) // Mayor score = mejor match
    .slice(0, limit);
}
