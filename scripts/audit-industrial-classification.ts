import * as fs from 'fs';
import * as path from 'path';
import { Panel, SurfaceTexture, Finish, ColorParent } from '../src/lib/types';

// --- Utilidades ---
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

// --- FASE 1: Normalización de línea comercial ---
function normalizeCommercialLine(panel: Panel): {
  commercialLine: string;
  evidence: string[];
  confidence: number;
} {
  const name = normalizeText(panel.name || '');
  const code = normalizeText(panel.code || '');
  const desc = normalizeText(panel.description || '');
  const line = normalizeText(panel.commercialLine || '');
  
  const fullText = `${name} ${code} ${desc} ${line}`;
  const evidence: string[] = [];
  let detected: string = 'unknown';
  let confidence = 0;

  const rules = [
    { key: 'nature', patterns: ['nat', 'linea nature', 'nature'] },
    { key: 'hilado', patterns: ['hil', 'linea hilados', 'hilado'] },
    { key: 'textura', patterns: ['txt', 'linea textura', 'textura'] },
    { key: 'bark', patterns: ['bar', 'bark'] },
    { key: 'deep_matt', patterns: ['dmt', 'deep matt'] },
    { key: 'stucco', patterns: ['stu', 'stucco'] },
    { key: 'woodtext', patterns: ['wtx', 'woodtext'] },
    { key: 'nordico', patterns: ['nor', 'linea nordica', 'nordico'] },
    { key: 'nativa', patterns: ['nativa'] },
    { key: 'lisos', patterns: ['linea lisos'] },
    { key: 'mesopotamia', patterns: ['mes', 'mesopotamia'] },
    { key: 'urban_concept', patterns: ['urban concept'] },
    { key: 'etnica', patterns: ['etnica'] },
    { key: 'blend', patterns: ['blend'] },
    { key: 'maderas_clasicas', patterns: ['maderas clasicas'] },
  ];

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      if (fullText.includes(pattern)) {
        detected = rule.key;
        evidence.push(`Pattern: ${pattern}`);
        confidence = 0.9;
        break;
      }
    }
    if (detected !== 'unknown') break;
  }

  return { commercialLine: detected, evidence, confidence };
}

// --- FASE 2: Clasificación industrial esperada ---
function deriveExpectedIndustrialAttributes(panel: Panel): {
  expectedMaterialType: string;
  expectedSurfaceTexture: SurfaceTexture;
  expectedFinish: Finish;
  expectedHasGrain: boolean;
  expectedDirectionality: string;
  confidence: number;
  evidence: string[];
  warnings: string[];
} {
  const normLine = normalizeCommercialLine(panel);
  const line = normLine.commercialLine;
  const name = normalizeText(panel.name);
  const code = normalizeText(panel.code || '');
  const desc = normalizeText(panel.description || '');
  
  const res = {
    expectedMaterialType: 'otro',
    expectedSurfaceTexture: 'otro' as SurfaceTexture,
    expectedFinish: 'mate' as Finish,
    expectedHasGrain: false,
    expectedDirectionality: 'none',
    confidence: 0.5,
    evidence: [...normLine.evidence],
    warnings: [] as string[]
  };

  const woodTerms = ['roble', 'nogal', 'cedro', 'olmo', 'pino', 'haya', 'teka', 'fresno', 'encina', 'paraiso', 'petiribi', 'carvalho', 'hickory', 'wengue', 'ebano', 'nativa'];
  const stoneTerms = ['cemento', 'concreto', 'marmol', 'granito', 'piedra', 'pizarra', 'caliza', 'hormigon'];
  const textileTerms = ['lino', 'hilado', 'textil', 'trama', 'seda', 'weave', 'fabric'];
  const metalTerms = ['metal', 'acero', 'inox', 'aluminio', 'bronce', 'metallic'];

  const isTextileExplicit = textileTerms.some(t => name.includes(t) || desc.includes(t)) || line === 'hilado';
  const isWoodExplicit = woodTerms.some(t => name.includes(t) || desc.includes(t));

  if (line === 'woodtext' || line === 'bark' || code.includes('wtx') || code.includes('bar')) {
    res.expectedMaterialType = 'madera';
    res.expectedSurfaceTexture = 'madera';
    res.expectedFinish = 'texturado';
    res.expectedHasGrain = true;
    res.expectedDirectionality = 'veta';
    res.confidence = 0.95;
  } else if (line === 'hilado' || code.includes('hil') || isTextileExplicit) {
    res.expectedMaterialType = 'textil';
    res.expectedSurfaceTexture = 'textil';
    res.expectedFinish = 'texturado';
    res.expectedHasGrain = false;
    res.expectedDirectionality = 'trama';
    res.confidence = 0.95;
  } else if (line === 'stucco' || code.includes('stu')) {
    res.expectedMaterialType = 'cemento';
    res.expectedSurfaceTexture = 'cementicio';
    res.expectedFinish = 'texturado';
    res.confidence = 0.95;
  } else if (line === 'nature' || code.includes('nat')) {
    if (isWoodExplicit) {
      res.expectedMaterialType = 'madera';
      res.expectedSurfaceTexture = 'madera';
      res.expectedHasGrain = true;
      res.expectedDirectionality = 'veta';
      res.confidence = 0.9;
    } else if (name.includes('blanco') || name.includes('unicolor') || name.includes('nieve')) {
      res.expectedMaterialType = 'unicolor';
      res.expectedSurfaceTexture = 'liso';
      res.expectedHasGrain = false;
      res.confidence = 0.8;
    } else {
      res.warnings.push('REVIEW_REQUIRED: Nature line ambiguous');
    }
  }

  if (panel.brand === 'Egger') {
    if (code.startsWith('h')) {
      res.expectedMaterialType = 'madera';
      res.expectedSurfaceTexture = 'madera';
      res.expectedHasGrain = true;
      res.expectedDirectionality = 'veta';
      res.confidence = Math.max(res.confidence, 0.9);
    } else if (code.startsWith('u')) {
      res.expectedMaterialType = 'unicolor';
      res.expectedSurfaceTexture = 'liso';
      res.expectedHasGrain = false;
      res.confidence = Math.max(res.confidence, 0.9);
    } else if (code.startsWith('f')) {
      if (stoneTerms.some(t => name.includes(t))) res.expectedMaterialType = 'piedra';
      else if (textileTerms.some(t => name.includes(t))) res.expectedMaterialType = 'textil';
      else if (metalTerms.some(t => name.includes(t))) res.expectedMaterialType = 'metal';
      res.confidence = Math.max(res.confidence, 0.8);
    }
    if (code.includes('pg')) res.expectedFinish = 'brillo';
    if (code.includes('pm') || code.includes('sm')) res.expectedFinish = 'supermate';
  }

  if (res.expectedMaterialType === 'otro') {
    if (isWoodExplicit) { res.expectedMaterialType = 'madera'; res.expectedSurfaceTexture = 'madera'; res.expectedHasGrain = true; }
    else if (stoneTerms.some(t => name.includes(t))) { res.expectedMaterialType = 'piedra'; res.expectedSurfaceTexture = 'cementicio'; }
    else if (isTextileExplicit) { res.expectedMaterialType = 'textil'; res.expectedSurfaceTexture = 'textil'; }
    else if (metalTerms.some(t => name.includes(t))) { res.expectedMaterialType = 'metal'; res.expectedSurfaceTexture = 'metal'; }
  }

  return res;
}

// --- FASE 3: Auditar Paneles ---
function auditPanels(panels: Panel[]) {
  return panels.map(panel => {
    const expected = deriveExpectedIndustrialAttributes(panel);
    const issues = [];
    let severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    if (panel.surfaceTexture === 'madera' && !panel.hasGrain) {
      issues.push('surfaceTexture madera but hasGrain false');
      severity = 'HIGH';
    }
    if (panel.surfaceTexture === 'liso' && panel.hasGrain) {
      issues.push('surfaceTexture liso but hasGrain true');
      severity = 'HIGH';
    }
    
    if (expected.confidence > 0.7) {
      if (panel.surfaceTexture !== expected.expectedSurfaceTexture && expected.expectedSurfaceTexture !== 'otro') {
        issues.push(`surfaceTexture mismatch: stored=${panel.surfaceTexture}, expected=${expected.expectedSurfaceTexture}`);
        severity = severity === 'HIGH' ? 'HIGH' : 'MEDIUM';
      }
    }

    if (expected.warnings.length > 0) {
      issues.push(...expected.warnings);
      if (severity === 'LOW') severity = 'MEDIUM';
    }

    return {
      id: panel.id,
      name: panel.name,
      code: panel.code,
      brand: panel.brand,
      storedTexture: panel.surfaceTexture,
      expectedTexture: expected.expectedSurfaceTexture,
      issues,
      severity,
      manualData: !!(panel.surfaceTextureSource === 'manual' || panel.finishSource === 'manual' || panel.colorFamilySource === 'manual')
    };
  });
}

// --- FASE 5: Auditar Equivalencias ---
function auditEquivalences(panels: Panel[], equivalences: any[]) {
  const panelMap = new Map(panels.map(p => [p.id, p]));
  const results: any[] = [];

  for (const eq of equivalences) {
    const target = panelMap.get(eq.targetId);
    if (!target) continue;

    for (const match of eq.matches) {
      const candidate = panelMap.get(match.id);
      if (!candidate) continue;

      const violations = [];
      if (target.surfaceTexture === 'madera' && candidate.surfaceTexture !== 'madera' && match.score > 70) {
        violations.push({ type: 'materialType incompatible (Madera vs Otros)', severity: 'HIGH' });
      }

      if (violations.length > 0) {
        results.push({
          targetName: target.name,
          matchName: candidate.name,
          score: match.score,
          violations
        });
      }
    }
  }
  return results;
}

// --- EJECUCIÓN ---
async function run() {
  const args = process.argv.slice(2);
  const panelsPath = args.indexOf('--panels') !== -1 ? args[args.indexOf('--panels') + 1] : 'tmp/panels_full_export.json';
  const equivalencesPath = args.indexOf('--equivalences') !== -1 ? args[args.indexOf('--equivalences') + 1] : 'tmp/equivalences_full_export.json';

  if (!fs.existsSync(panelsPath)) { console.error(`❌ No existe ${panelsPath}`); process.exit(1); }
  
  const panels = JSON.parse(fs.readFileSync(panelsPath, 'utf8'));
  const equivalences = fs.existsSync(equivalencesPath) ? JSON.parse(fs.readFileSync(equivalencesPath, 'utf8')) : [];

  const panelAudit = auditPanels(panels);
  const equivalenceAudit = auditEquivalences(panels, equivalences);

  const report = {
    summary: {
      totalPanels: panels.length,
      issues: panelAudit.filter(a => a.issues.length > 0).length,
      highSeverity: panelAudit.filter(a => a.severity === 'HIGH').length,
      equivalenceViolations: equivalenceAudit.length
    },
    panelAudit: panelAudit.filter(a => a.issues.length > 0),
    equivalenceAudit
  };

  const outputBase = panelsPath.replace('.json', '');
  fs.writeFileSync(`${outputBase}_audit.json`, JSON.stringify(report, null, 2));
  
  let md = `# Industrial Audit Report\n\n`;
  md += `- Total Panels: ${report.summary.totalPanels}\n`;
  md += `- Issues: ${report.summary.issues}\n`;
  md += `- High Severity: ${report.summary.highSeverity}\n`;
  md += `- Equivalence Violations: ${report.summary.equivalenceViolations}\n\n`;
  
  md += `## Top Issues\n`;
  panelAudit.filter(a => a.issues.length > 0).slice(0, 50).forEach(a => {
    md += `- **${a.name}** (${a.code}): ${a.issues.join(', ')} [${a.severity}]\n`;
  });

  fs.writeFileSync(`${outputBase}_audit.md`, md);
  console.log(`✅ Audit completado: ${outputBase}_audit.md`);
}

run();
