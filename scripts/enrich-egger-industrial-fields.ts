import * as fs from 'fs';
import * as path from 'path';
import { Panel, SurfaceTexture, Finish, ColorSource, ColorParent } from '../src/lib/types';

// --- Tipos para el Plan ---
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

// --- Parser Egger ---
function parseEggerDecor(input: {
  name?: string;
  code?: string;
  description?: string;
}) {
  const code = (input.code || '').trim();
  const name = (input.name || '').trim();
  const desc = (input.description || '').trim();
  
  const isEgger = code.includes(' ') || code.match(/^[HUWF]\d{3,4}/i) !== null;
  const decorMatch = code.match(/^([HUWF])(\d{3,4})/i);
  
  const decorPrefix = decorMatch ? decorMatch[1].toUpperCase() as "H" | "U" | "W" | "F" : undefined;
  const decorNumber = decorMatch ? decorMatch[2] : undefined;
  
  const stMatch = code.match(/ST(\d+)/i);
  const textureCode = stMatch ? stMatch[0].toUpperCase() : undefined;
  
  const premiumMatch = code.match(/(PG|PM|SM|TM\d*)/i);
  const premiumCode = premiumMatch ? premiumMatch[1].toUpperCase() as "PG" | "PM" | "SM" | "TM" : null;

  const tokens = (name + ' ' + desc).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/);
  
  return {
    isEgger,
    decorPrefix,
    decorNumber,
    textureCode,
    premiumCode,
    tokens,
    evidence: [`Code: ${code}`, `Prefix: ${decorPrefix}`, `ST: ${textureCode}`]
  };
}

// --- Lógica de Enriquecimiento ---
function deriveEggerFields(panel: Panel): FixAction[] {
  const actions: FixAction[] = [];
  const egger = parseEggerDecor(panel);
  if (!egger.isEgger || panel.brand !== 'Egger') return [];

  const addAction = (field: keyof Panel, proposed: any, reason: string, highConf: boolean = true) => {
    const current = panel[field];
    const sourceField = `${String(field)}Source` as keyof Panel;
    const isManual = panel[sourceField] === 'manual';

    if (current === proposed) return;

    actions.push({
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
      evidence: egger.evidence
    });
  };

  // 1. Reglas por Prefijo
  if (egger.decorPrefix === 'H') {
    addAction('materialType', 'madera', 'Prefijo H indica madera');
    addAction('surfaceTexture', 'madera', 'Prefijo H indica madera');
    addAction('hasGrain', true, 'Prefijo H indica veta');
    addAction('directionality', 'veta', 'Prefijo H indica veta');
  } else if (egger.decorPrefix === 'U') {
    addAction('materialType', 'unicolor', 'Prefijo U indica unicolor');
    addAction('surfaceTexture', 'liso', 'Prefijo U indica liso');
    addAction('hasGrain', false, 'Prefijo U no tiene veta');
    addAction('directionality', 'none', 'Prefijo U es liso');
  } else if (egger.decorPrefix === 'W') {
    addAction('materialType', 'unicolor', 'Prefijo W indica unicolor (blancos)');
    addAction('surfaceTexture', 'liso', 'Prefijo W indica liso');
    addAction('hasGrain', false, 'Prefijo W no tiene veta');
    addAction('directionality', 'none', 'Prefijo W es liso');
    if (panel.name.toLowerCase().includes('blanco') || panel.name.toLowerCase().includes('alpino')) {
        addAction('colorParent', 'blanco', 'Prefijo W con nombre de blanco');
    }
  } else if (egger.decorPrefix === 'F') {
    const t = egger.tokens;
    if (t.some(x => ['textil', 'lino', 'fabric', 'textile'].includes(x))) {
      addAction('materialType', 'textil', 'Prefijo F con token textil');
      addAction('surfaceTexture', 'textil', 'Prefijo F con token textil');
      addAction('hasGrain', false, 'Textil no tiene veta');
      addAction('directionality', 'trama', 'Textil tiene trama');
    } else if (t.some(x => ['metal', 'metallic', 'inox', 'aluminio', 'plata', 'chromix'].includes(x))) {
      addAction('materialType', 'metal', 'Prefijo F con token metal');
      addAction('surfaceTexture', 'metal', 'Prefijo F con token metal');
      addAction('directionality', 'vertical', 'Metal suele tener dirección');
    } else if (t.some(x => ['pietra', 'piedra', 'marble', 'marmol', 'granito', 'ceramic'].includes(x))) {
      addAction('materialType', 'piedra', 'Prefijo F con token piedra');
      addAction('surfaceTexture', 'piedra', 'Prefijo F con token piedra');
    } else if (t.some(x => ['hormigon', 'cemento', 'concrete', 'stucco'].includes(x))) {
      addAction('materialType', 'cemento', 'Prefijo F con token cemento');
      addAction('surfaceTexture', 'cementicio', 'Prefijo F con token cemento');
    } else {
      addAction('materialType', 'fantasia', 'Prefijo F sin material claro', false);
    }
  }

  // 2. Reglas de Acabado (Finish)
  if (egger.premiumCode === 'PG') {
    addAction('finish', 'brillo', 'Código PG indica PerfectSense Gloss');
  } else if (egger.premiumCode === 'PM' || egger.premiumCode === 'SM') {
    addAction('finish', 'supermate', 'Código PM/SM indica PerfectSense Matt');
  } else if (egger.textureCode === 'ST9') {
    addAction('finish', 'mate', 'Textura ST9 es mate');
  } else if (['ST37', 'ST38', 'ST40'].includes(egger.textureCode || '')) {
    if (egger.decorPrefix === 'H') addAction('finish', 'poro_madera', 'ST profundas en H indican poro madera');
    else addAction('finish', 'texturado', 'ST profundas indican texturado');
  } else if (egger.textureCode) {
    addAction('finish', 'texturado', 'ST indica texturado genérico');
  }

  // 3. Color y Luminosidad (vía LAB si existe)
  if (panel.labColor && panel.labColor.l !== undefined) {
    const l = panel.labColor.l;
    let group = 'media';
    let tone = 'medio';
    if (l >= 90) { group = 'media_alta'; tone = 'muy_claro'; }
    else if (l >= 75) { group = 'media_alta'; tone = 'claro'; }
    else if (l >= 55) { group = 'media'; tone = 'medio'; }
    else if (l >= 35) { group = 'media_baja'; tone = 'oscuro'; }
    else { group = 'baja'; tone = 'muy_oscuro'; }
    
    addAction('lightnessGroup', group, 'Calculado por LAB L', false);
    addAction('tone', tone, 'Calculado por LAB L', false);
  }

  return actions;
}

// --- Ejecución ---
async function run() {
  const args = process.argv.slice(2);
  const panelsPath = args.indexOf('--panels') !== -1 ? args[args.indexOf('--panels') + 1] : 'tmp/panels_full_export.fixed.json';
  const apply = args.includes('--apply');
  
  if (!fs.existsSync(panelsPath)) { console.error(`❌ No existe ${panelsPath}`); process.exit(1); }
  const panels: Panel[] = JSON.parse(fs.readFileSync(panelsPath, 'utf8'));

  const allActions: FixAction[] = [];
  panels.forEach(p => {
    allActions.push(...deriveEggerFields(p));
  });

  const plan = {
    summary: {
      totalPanels: panels.length,
      eggerPanels: panels.filter(p => p.brand === 'Egger').length,
      autoFixActions: allActions.filter(a => a.actionType === "AUTO_FIX").length,
      reviewRequiredActions: allActions.filter(a => a.actionType === "REVIEW_REQUIRED").length,
      manualReviewRequiredActions: allActions.filter(a => a.actionType === "MANUAL_REVIEW_REQUIRED").length,
      blockedByManualSource: allActions.filter(a => a.actionType === "MANUAL_REVIEW_REQUIRED").length
    },
    actions: allActions
  };

  const outputDir = path.dirname(panelsPath);
  fs.writeFileSync(path.join(outputDir, 'egger_industrial_enrichment_plan.json'), JSON.stringify(plan, null, 2));

  let md = `# Egger Industrial Enrichment Plan\n\n`;
  md += `## Summary\n`;
  md += `- Total Panels: ${plan.summary.totalPanels}\n`;
  md += `- Egger Panels: ${plan.summary.eggerPanels}\n`;
  md += `- Auto Fixes: ${plan.summary.autoFixActions}\n`;
  md += `- Review Required: ${plan.summary.reviewRequiredActions}\n`;
  md += `- Manual Blocked: ${plan.summary.manualReviewRequiredActions}\n\n`;

  md += `## Important Examples\n`;
  const examples = ['U999 ST19', 'H1710 ST10', 'W1100 PG', 'U999 PM', 'F416 ST10', 'F638 ST10', 'F206 ST9', 'H1180 ST37', 'F500 ST20'];
  examples.forEach(ex => {
    const p = panels.find(p => p.code?.includes(ex));
    if (p) {
        const pActions = allActions.filter(a => a.panelId === p.id);
        md += `### ${ex} (${p.name})\n`;
        if (pActions.length === 0) md += `*No changes needed*\n`;
        pActions.forEach(a => md += `- **${a.field}**: ${a.currentValue} -> ${a.proposedValue} (${a.actionType})\n`);
        md += `\n`;
    }
  });

  fs.writeFileSync(path.join(outputDir, 'egger_industrial_enrichment_plan.md'), md);

  if (apply) {
    const enriched = panels.map(p => {
      const pActions = allActions.filter(a => a.panelId === p.id && a.actionType === "AUTO_FIX");
      const newP = { ...p };
      pActions.forEach(a => {
        (newP as any)[a.field] = a.proposedValue;
        (newP as any)[`${a.field}Source`] = 'inferred';
      });
      return newP;
    });
    const finalPath = path.join(outputDir, 'panels_full_export.fixed.egger_enriched.json');
    fs.writeFileSync(finalPath, JSON.stringify(enriched, null, 2));
    fs.writeFileSync(path.join(outputDir, 'egger_industrial_enrichment_applied.md'), `# Applied\n\nApplied ${plan.summary.autoFixActions} fixes.`);
    console.log(`✅ Applied fixes to ${finalPath}`);
  }

  console.log(`✅ Plan generated in ${outputDir}/egger_industrial_enrichment_plan.md`);
}

run();
