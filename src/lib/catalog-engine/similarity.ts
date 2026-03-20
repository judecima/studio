import { Fingerprint } from './catalog.types';

export function similarity(a: Fingerprint, b: Fingerprint): number {
  let score = 0;

  if (a.material === b.material) score += 3;
  if (a.colorHue === b.colorHue) score += 3;
  if (a.colorGroup === b.colorGroup) score += 2;

  const grainDiff = Math.abs(a.grainIntensity - b.grainIntensity);
  score += Math.max(0, 2 - grainDiff);

  if (a.tone === b.tone) score += 1;

  return score;
}