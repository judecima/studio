import * as fs from 'fs';
import * as path from 'path';
import { Panel } from '../src/lib/types';

async function validate() {
  const args = process.argv.slice(2);
  const inputPath = args.indexOf('--input') !== -1 ? args[args.indexOf('--input') + 1] : 'tmp/panels_full_export.fixed.egger_enriched.json';

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ No existe el archivo: ${inputPath}`);
    process.exit(1);
  }

  const panels: Panel[] = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const issues: string[] = [];
  const results = {
    valid: true,
    total: panels.length,
    egger: 0,
    faplac: 0,
    errors: [] as string[],
    warnings: [] as string[]
  };

  const ids = new Set();
  
  for (const p of panels) {
    if (!p.id) results.errors.push(`Panel sin ID: ${p.name}`);
    if (ids.has(p.id)) results.errors.push(`ID duplicado: ${p.id}`);
    ids.add(p.id);

    if (p.brand === 'Egger') results.egger++;
    if (p.brand === 'Faplac') results.faplac++;

    // 1. Campos obligatorios
    const required = ['materialType', 'surfaceTexture', 'finish', 'colorParent', 'tone', 'lightnessGroup', 'hasGrain', 'directionality'];
    required.forEach(f => {
      if ((p as any)[f] === undefined) results.errors.push(`[${p.id}] Campo faltante: ${f}`);
    });

    // 2. Reglas Egger
    const code = (p.code || '').toUpperCase();
    if (p.brand === 'Egger') {
      if (code.startsWith('H') && p.surfaceTexture === 'liso') results.errors.push(`[${p.id}] Egger H no puede ser liso`);
      if ((code.startsWith('U') || code.startsWith('W')) && p.surfaceTexture === 'madera') results.errors.push(`[${p.id}] Egger U/W no puede ser madera`);
    }

    // 3. Reglas Faplac
    if (p.brand === 'Faplac') {
      const codeNorm = code.toLowerCase();
      if ((codeNorm.includes('wtx') || codeNorm.includes('bar')) && p.surfaceTexture === 'liso') results.errors.push(`[${p.id}] Faplac WTX/BAR no puede ser liso`);
      if (codeNorm.includes('hil') && p.surfaceTexture !== 'textil') results.errors.push(`[${p.id}] Faplac HIL debe ser textil`);
      if (codeNorm.includes('stu') && !['cementicio', 'piedra'].includes(p.surfaceTexture)) results.errors.push(`[${p.id}] Faplac STU debe ser cementicio/piedra`);
    }

    // 4. Consistencia Veta
    if (p.surfaceTexture === 'madera' && !p.hasGrain) results.warnings.push(`[${p.id}] Madera con hasGrain=false`);
    if (p.surfaceTexture === 'liso' && p.hasGrain) results.warnings.push(`[${p.id}] Liso con hasGrain=true`);
  }

  if (results.total !== 144) results.errors.push(`Total de paneles incorrecto: ${results.total} (esperado 144)`);
  if (results.egger !== 82) results.errors.push(`Total Egger incorrecto: ${results.egger} (esperado 82)`);
  if (results.faplac !== 62) results.errors.push(`Total Faplac incorrecto: ${results.faplac} (esperado 62)`);

  results.valid = results.errors.length === 0;

  // Save reports
  fs.writeFileSync('tmp/pre_upload_panels_validation.json', JSON.stringify(results, null, 2));

  let md = `# Pre-Upload Panels Validation Report\n\n`;
  md += `## Status: ${results.valid ? '✅ VALID' : '❌ INVALID'}\n\n`;
  md += `### Summary\n`;
  md += `- Total: ${results.total}\n`;
  md += `- Egger: ${results.egger}\n`;
  md += `- Faplac: ${results.faplac}\n`;
  md += `- Errors: ${results.errors.length}\n`;
  md += `- Warnings: ${results.warnings.length}\n\n`;

  if (results.errors.length > 0) {
    md += `### Errors\n`;
    results.errors.forEach(e => md += `- ${e}\n`);
  }

  if (results.warnings.length > 0) {
    md += `### Warnings\n`;
    results.warnings.forEach(w => md += `- ${w}\n`);
  }

  fs.writeFileSync('tmp/pre_upload_panels_validation.md', md);

  console.log(`✅ Validación completada. Resultado: ${results.valid ? 'ÉXITO' : 'FALLO'}`);
  if (!results.valid) process.exit(1);
}

validate();
