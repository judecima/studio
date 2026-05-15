import * as fs from 'fs';
import { Panel, ClassifiedPanel, Equivalence, EquivalenceMatch, ColorParent, Finish } from '../src/lib/types';

// Re-implementing helper logic to avoid import issues in standalone script
function isOppositeColor(a: ColorParent, b: ColorParent): boolean {
  const opposites: Record<string, string[]> = {
    rojo: ['verde', 'azul'],
    verde: ['rojo', 'violeta', 'rosa'],
    azul: ['rojo', 'naranja', 'amarillo'],
    naranja: ['azul', 'violeta'],
    amarillo: ['azul', 'violeta']
  };
  return opposites[a]?.includes(b) || opposites[b]?.includes(a);
}

function getViolations(target: Panel, match: any): string[] {
  const violations: string[] = [];
  
  // Material mismatch
  if (target.surfaceTexture === 'madera' && match.surfaceTexture !== 'madera' && match.surfaceTexture !== 'otro') violations.push(`madera_vs_${match.surfaceTexture}`);
  if (target.surfaceTexture !== 'madera' && match.surfaceTexture === 'madera' && target.surfaceTexture !== 'otro') violations.push(`${target.surfaceTexture}_vs_madera`);
  
  // Finish mismatch
  if ((target.finish === 'brillo' && (match.finish === 'supermate' || match.finish === 'mate')) ||
      (match.finish === 'brillo' && (target.finish === 'supermate' || target.finish === 'mate'))) {
    violations.push('brillo_vs_supermate');
  }

  // Grain mismatch
  if (target.hasGrain !== match.hasGrain) {
    if (target.surfaceTexture === 'madera' || match.surfaceTexture === 'madera') {
      violations.push('hasGrain_true_vs_false');
    }
  }

  // Color mismatch
  if (isOppositeColor(target.colorParent, match.colorParent)) {
    violations.push('colorFamily_opuesta');
  }

  // Lightness mismatch
  if (target.labColor && match.labColor) {
    const deltaL = Math.abs(target.labColor.l - match.labColor.l);
    if (deltaL > 40) violations.push('lightness_extrema');
  }

  return violations;
}

async function run() {
  const panels: Panel[] = JSON.parse(fs.readFileSync('tmp/panels_full_export.fixed.egger_enriched.json', 'utf8'));
  const legacyEq: any[] = JSON.parse(fs.readFileSync('tmp/equivalences_full_export.json', 'utf8'));
  const resyncEq: any[] = JSON.parse(fs.readFileSync('tmp/equivalences_resync.json', 'utf8'));
  
  const panelMap = new Map(panels.map(p => [p.id, p]));
  const resyncMap = new Map(resyncEq.map(e => [e.targetId, e]));

  const stats = {
    totalPanels: panels.length,
    eggerCount: panels.filter(p => p.brand === 'Egger').length,
    faplacCount: panels.filter(p => p.brand === 'Faplac').length,
    legacyEq: legacyEq.length,
    legacyMatches: legacyEq.reduce((acc, e) => acc + e.matches.length, 0),
    resyncEq: resyncEq.length,
    resyncMatches: resyncEq.reduce((acc, e) => acc + e.matches.length, 0),
  };

  const violations = {
    legacy: {} as Record<string, number>,
    resync: {} as Record<string, number>
  };

  const comparison = {
    GOOD_REMOVAL: [] as any[],
    GOOD_ADDITION: [] as any[],
    RISKY_ADDITION: [] as any[],
    RISKY_PERSISTENT: [] as any[],
    SCORE_IMPROVED: [] as any[],
    SCORE_REGRESSED: [] as any[]
  };

  // Analyze Legacy Violations
  for (const eq of legacyEq) {
    const target = panelMap.get(eq.targetId);
    if (!target) continue;
    for (const m of eq.matches) {
      const candidate = panelMap.get(m.id);
      if (!candidate) continue;
      const v = getViolations(target, candidate);
      v.forEach(type => violations.legacy[type] = (violations.legacy[type] || 0) + 1);
    }
  }

  // Analyze Resync Violations and Comparison
  for (const eq of resyncEq) {
    const target = panelMap.get(eq.targetId);
    if (!target) continue;
    
    const legacy = legacyEq.find(e => e.targetId === eq.targetId);
    const legacyMatchIds = new Set(legacy?.matches.map((m: any) => m.id) || []);

    for (const m of eq.matches) {
      const candidate = panelMap.get(m.id);
      if (!candidate) continue;
      
      const v = getViolations(target, candidate);
      v.forEach(type => violations.resync[type] = (violations.resync[type] || 0) + 1);

      const isNew = !legacyMatchIds.has(m.id);
      
      if (isNew) {
        if (v.length > 0) comparison.RISKY_ADDITION.push({ target, match: m, violations: v });
        else comparison.GOOD_ADDITION.push({ target, match: m });
      } else {
        const legacyM = legacy.matches.find((lm: any) => lm.id === m.id);
        if (m.score > legacyM.score) comparison.SCORE_IMPROVED.push({ target, match: m, oldScore: legacyM.score });
        else if (m.score < legacyM.score) comparison.SCORE_REGRESSED.push({ target, match: m, oldScore: legacyM.score });
        
        if (v.length > 0) comparison.RISKY_PERSISTENT.push({ target, match: m, violations: v });
      }
    }

    // Check Removals
    if (legacy) {
      const resyncMatchIds = new Set(eq.matches.map((m: any) => m.id));
      for (const lm of legacy.matches) {
        if (!resyncMatchIds.has(lm.id)) {
          const candidate = panelMap.get(lm.id);
          if (candidate) {
            const v = getViolations(target, candidate);
            if (v.length > 0) comparison.GOOD_REMOVAL.push({ target, match: lm, violations: v });
          }
        }
      }
    }
  }

  // Output JSON report
  // Detailed Violation Types for the table
  const violationTypes = [
    'madera_vs_liso', 'madera_vs_textil', 'madera_vs_metal', 'madera_vs_cementicio', 'madera_vs_piedra',
    'textil_vs_madera', 'brillo_vs_supermate', 'hasGrain_true_vs_false', 'colorFamily_opuesta', 'lightness_extrema'
  ];

  const finalViolations: any[] = violationTypes.map(type => {
    const legacy = violations.legacy[type] || 0;
    const resync = violations.resync[type] || 0;
    return {
        violationType: type,
        legacyCount: legacy,
        resyncCount: resync,
        delta: resync - legacy,
        status: resync < legacy ? 'IMPROVED' : (resync > legacy ? 'REGRESSED' : 'STABLE')
    };
  });

  // Manual Conflicts Detection
  const manualConflicts = panels.filter(p => {
      const isManual = p.surfaceTextureSource === 'manual' || p.finishSource === 'manual' || p.colorFamilySource === 'manual';
      if (!isManual) return false;
      
      // Basic check: if it's Egger H and texture is NOT madera
      if (p.brand === 'Egger' && p.code?.startsWith('H') && p.surfaceTexture !== 'madera' && p.surfaceTextureSource === 'manual') return true;
      if (p.brand === 'Egger' && p.code?.startsWith('U') && p.surfaceTexture === 'madera' && p.surfaceTextureSource === 'manual') return true;
      return false;
  }).map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      field: 'surfaceTexture',
      currentValue: p.surfaceTexture,
      expectedValue: p.code?.startsWith('H') ? 'madera' : 'liso',
      recommendation: `Cambiar ${p.surfaceTexture} a ${p.code?.startsWith('H') ? 'madera' : 'liso'} (Contradice taxonomía Egger)`
  }));

  const finalReport = {
    stats,
    violationsTable: finalViolations,
    comparisonSummary: {
      GOOD_REMOVAL: comparison.GOOD_REMOVAL.length,
      GOOD_ADDITION: comparison.GOOD_ADDITION.length,
      RISKY_ADDITION: comparison.RISKY_ADDITION.length,
      RISKY_PERSISTENT: comparison.RISKY_PERSISTENT.length,
      SCORE_IMPROVED: comparison.SCORE_IMPROVED.length,
      SCORE_REGRESSED: comparison.SCORE_REGRESSED.length
    },
    topRiskyPersistent: comparison.RISKY_PERSISTENT.slice(0, 20).map(c => ({
        target: c.target.name,
        match: c.match.name,
        score: c.match.score,
        violation: c.violations.join(', '),
        reason: 'Legacy violation persistent',
        recommendation: 'Revisar si la similitud visual justifica la excepción'
    })),
    topRiskyAdditions: comparison.RISKY_ADDITION.slice(0, 20).map(c => ({
        target: c.target.name,
        match: c.match.name,
        score: c.match.score,
        violation: c.violations.join(', '),
        reason: 'New match with industrial violation',
        recommendation: 'Bloquear en engine o verificar si es falso positivo'
    })),
    topGoodRemovals: comparison.GOOD_REMOVAL.slice(0, 20).map(c => ({
        target: c.target.name,
        removedMatch: c.match.name,
        oldScore: c.match.score,
        violationRemoved: c.violations.join(', '),
        reason: 'Strict filter correctly blocked legacy invalid match'
    })),
    manualConflicts
  };

  fs.writeFileSync('tmp/industrial_certification_final.json', JSON.stringify(finalReport, null, 2));
  console.log('✅ Certificación final generada: tmp/industrial_certification_final.json');
}

run().catch(console.error);
