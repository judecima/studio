import * as fs from 'fs';
import * as path from 'path';
import { Panel, SurfaceTexture, Finish, ColorSource } from '../src/lib/types';

type FixActionType = "AUTO_FIX" | "REVIEW_REQUIRED" | "MANUAL_REVIEW_REQUIRED" | "NO_ACTION";

interface FixAction {
  panelId: string;
  panelName: string;
  panelCode: string;
  field: string;
  currentValue: any;
  proposedValue: any;
  actionType: FixActionType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  reason: string;
  evidence: string[];
}

// --- Helpers ---
function normalizeText(text: string): string {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();
}

function getCommercialLine(panel: Panel): string {
  const text = normalizeText(`${panel.name} ${panel.code} ${panel.description} ${panel.commercialLine || ''}`);
  if (text.includes('nature')) return 'nature';
  if (text.includes('hilado')) return 'hilado';
  if (text.includes('textura')) return 'textura';
  if (text.includes('bark') || text.includes('bar-')) return 'bark';
  if (text.includes('stucco') || text.includes('stu-')) return 'stucco';
  if (text.includes('woodtext') || text.includes('wtx-')) return 'woodtext';
  if (text.includes('deep matt') || text.includes('dmt-')) return 'deep_matt';
  if (text.includes('nordic')) return 'nordico';
  return 'unknown';
}

// --- Reglas de Autocorrección ---
function planFixes(panels: Panel[]): FixAction[] {
  const actions: FixAction[] = [];
  const woodSpecies = ['roble', 'cedro', 'castaño', 'nogal', 'teka', 'ebano', 'ebano', 'wengue', 'paraiso', 'paraiso', 'carvalho', 'olmo', 'haya', 'kiri', 'fresno', 'guatambu', 'hickory', 'pino'];

  for (const panel of panels) {
    const line = getCommercialLine(panel);
    const code = normalizeText(panel.code || '');
    const name = normalizeText(panel.name);
    const desc = normalizeText(panel.description || '');
    
    const checkField = (field: keyof Panel, proposed: any, reason: string, evidence: string[], highConf: boolean = true) => {
      const current = panel[field];
      const sourceField = `${String(field)}Source` as keyof Panel;
      const isManual = panel[sourceField] === 'manual';

      if (current === proposed) return;

      const action: FixAction = {
        panelId: panel.id,
        panelName: panel.name,
        panelCode: panel.code || '',
        field: String(field),
        currentValue: current,
        proposedValue: proposed,
        actionType: isManual ? "MANUAL_REVIEW_REQUIRED" : (highConf ? "AUTO_FIX" : "REVIEW_REQUIRED"),
        severity: highConf ? "HIGH" : "MEDIUM",
        confidence: highConf ? 0.95 : 0.6,
        reason,
        evidence
      };
      actions.push(action);
    };

    // 1. Reglas Fuertes (AUTO_FIX)
    if (code.includes('wtx') || code.includes('bar') || line === 'woodtext' || line === 'bark') {
      checkField('materialType', 'madera', 'Línea Woodtext/Bark indica madera', [line, code]);
      checkField('surfaceTexture', 'madera', 'Línea Woodtext/Bark indica madera', [line, code]);
      checkField('hasGrain', true, 'Madera industrial debe tener veta', [line, code]);
      checkField('directionality', 'veta', 'Madera industrial tiene veta', [line, code]);
    }

    if (code.includes('hil') || line === 'hilado') {
      checkField('materialType', 'textil', 'Línea Hilado indica textil', [line, code]);
      checkField('surfaceTexture', 'textil', 'Línea Hilado indica textil', [line, code]);
      checkField('hasGrain', false, 'Textil no tiene veta de madera', [line, code]);
      checkField('directionality', 'trama', 'Textil tiene trama', [line, code]);
    }

    if (code.includes('stu') || line === 'stucco') {
      checkField('materialType', 'cemento', 'Línea Stucco indica cemento/piedra', [line, code]);
      checkField('surfaceTexture', 'cementicio', 'Línea Stucco indica cementicio', [line, code]);
      checkField('hasGrain', false, 'Cemento no tiene veta', [line, code]);
    }

    if (panel.brand === 'Egger') {
      if (code.startsWith('h')) {
        checkField('materialType', 'madera', 'Código Egger H indica madera', [code]);
        checkField('surfaceTexture', 'madera', 'Código Egger H indica madera', [code]);
        checkField('hasGrain', true, 'Madera Egger H tiene veta', [code]);
      } else if (code.startsWith('u')) {
        checkField('materialType', 'unicolor', 'Código Egger U indica unicolor', [code]);
        checkField('surfaceTexture', 'liso', 'Código Egger U indica liso', [code]);
        checkField('hasGrain', false, 'Unicolor Egger no tiene veta', [code]);
      }
      if (code.includes('pg')) checkField('finish', 'brillo', 'Código PG indica brillo', [code]);
      if (code.includes('pm') || code.includes('sm')) checkField('finish', 'supermate', 'Código PM/SM indica supermate', [code]);
    }

    // 2. Reglas NAT (Nature) - Condicionales
    if (line === 'nature' || code.includes('nat')) {
      const isWood = woodSpecies.some(s => name.includes(s) || desc.includes(s));
      if (isWood) {
        checkField('materialType', 'madera', 'Línea Nature con especie detectada', [name]);
        checkField('surfaceTexture', 'madera', 'Línea Nature con especie detectada', [name]);
        checkField('hasGrain', true, 'Madera Nature tiene veta', [name]);
      } else if (name.includes('blanco') || name.includes('gris') || name.includes('negro')) {
        checkField('materialType', 'unicolor', 'Nature unicolor detectado', [name], false); // REVIEW_REQUIRED
      }
    }
    
    // 3. Consistencia Madera
    if (panel.surfaceTexture === 'madera' && !panel.hasGrain) {
      checkField('hasGrain', true, 'Consistencia: textura madera exige hasGrain true', ['stored: madera']);
    }
  }
  return actions;
}

// --- Main ---
async function run() {
  const args = process.argv.slice(2);
  const panelsPath = args.indexOf('--panels') !== -1 ? args[args.indexOf('--panels') + 1] : 'tmp/panels_full_export.json';
  const apply = args.includes('--apply');
  const dryRun = args.includes('--dry-run');

  if (!fs.existsSync(panelsPath)) { console.error(`❌ No existe ${panelsPath}`); process.exit(1); }
  
  const panels: Panel[] = JSON.parse(fs.readFileSync(panelsPath, 'utf8'));
  const actions = planFixes(panels);

  const plan = {
    summary: {
      totalPanels: panels.length,
      autoFixActions: actions.filter(a => a.actionType === "AUTO_FIX").length,
      reviewRequired: actions.filter(a => a.actionType === "REVIEW_REQUIRED").length,
      manualReviewRequired: actions.filter(a => a.actionType === "MANUAL_REVIEW_REQUIRED").length,
    },
    actions
  };

  const outputDir = path.dirname(panelsPath);
  fs.writeFileSync(path.join(outputDir, 'industrial_fix_plan.json'), JSON.stringify(plan, null, 2));

  // Markdown Plan
  let md = `# Industrial Fix Plan\n\n`;
  md += `## Summary\n`;
  md += `- Total Panels: ${plan.summary.totalPanels}\n`;
  md += `- Auto Fixes: ${plan.summary.autoFixActions}\n`;
  md += `- Review Required: ${plan.summary.reviewRequired}\n`;
  md += `- Manual Blocked: ${plan.summary.manualReviewRequired}\n\n`;
  
  md += `## Auto Fixes (Top 50)\n`;
  md += `| Panel | Field | Current | Proposed | Reason |\n`;
  md += `|---|---|---|---|---|\n`;
  actions.filter(a => a.actionType === "AUTO_FIX").slice(0, 50).forEach(a => {
    md += `| ${a.panelName} | ${a.field} | ${a.currentValue} | ${a.proposedValue} | ${a.reason} |\n`;
  });

  fs.writeFileSync(path.join(outputDir, 'industrial_fix_plan.md'), md);

  if (apply) {
    console.log("💾 Aplicando correcciones AUTO_FIX...");
    const fixedPanels = panels.map(p => {
      const panelActions = actions.filter(a => a.panelId === p.id && a.actionType === "AUTO_FIX");
      const newPanel = { ...p };
      for (const action of panelActions) {
        (newPanel as any)[action.field] = action.proposedValue;
        (newPanel as any)[`${action.field}Source`] = 'inferred';
      }
      return newPanel;
    });

    const fixedPath = panelsPath.replace('.json', '.fixed.json');
    fs.writeFileSync(fixedPath, JSON.stringify(fixedPanels, null, 2));
    console.log(`✅ Archivo generado: ${fixedPath}`);
    
    let applyMd = `# Industrial Fix Applied\n\n`;
    applyMd += `Se aplicaron ${plan.summary.autoFixActions} cambios automáticos.\n`;
    fs.writeFileSync(path.join(outputDir, 'industrial_fix_applied.md'), applyMd);
  }

  console.log(`✅ Proceso completado. Reporte en ${outputDir}/industrial_fix_plan.md`);
}

run();
