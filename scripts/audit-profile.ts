import * as fs from 'fs';
import * as path from 'path';

function loadJson(fileName: string) {
  const filePath = path.join(process.cwd(), 'tmp', fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function runProfile() {
  console.log("🚀 Iniciando perfilado estadístico...");
  
  const panels = loadJson('panels_full_export.json');
  const equivalences = loadJson('equivalences_full_export.json');

  const stats: any = {
    total_panels: panels.length,
    total_equivalences: equivalences.length,
    by_brand: {},
    by_texture: {},
    by_finish: {},
    by_color_parent: {},
    by_color_sub: {},
    by_color_source: {},
    missing_lab: 0,
    missing_hex: 0,
    missing_image: 0,
    casing_anomalies: [],
    inconsistent_color_parent: [],
    invalid_enums: [],
    dangerous_defaults: {
      liso_texture: 0,
      mate_finish: 0,
      otro_color: 0
    }
  };

  const anomalies: any[] = [];

  const expectedColorParents = ['blanco', 'beige', 'gris', 'negro', 'marron', 'rojo', 'verde', 'azul', 'amarillo', 'naranja', 'violeta', 'rosa', 'otro'];
  
  panels.forEach((p: any) => {
    // Count stats
    stats.by_brand[p.brand] = (stats.by_brand[p.brand] || 0) + 1;
    stats.by_texture[p.surfaceTexture] = (stats.by_texture[p.surfaceTexture] || 0) + 1;
    stats.by_finish[p.finish] = (stats.by_finish[p.finish] || 0) + 1;
    stats.by_color_parent[p.colorParent] = (stats.by_color_parent[p.colorParent] || 0) + 1;
    stats.by_color_sub[p.colorSub] = (stats.by_color_sub[p.colorSub] || 0) + 1;
    stats.by_color_source[p.colorSource] = (stats.by_color_source[p.colorSource] || 0) + 1;

    if (!p.labColor) stats.missing_lab++;
    if (!p.hexColor) stats.missing_hex++;
    if (!p.mainImage && (!p.images || p.images.length === 0)) stats.missing_image++;

    // Casing anomalies
    const fieldsToCheck = ['colorParent', 'colorSub', 'surfaceTexture', 'finish'];
    fieldsToCheck.forEach(f => {
      if (p[f] && p[f] !== p[f].toLowerCase()) {
        stats.casing_anomalies.push({ id: p.id, field: f, value: p[f] });
      }
    });

    // Enum validation
    if (p.colorParent && !expectedColorParents.includes(p.colorParent.toLowerCase())) {
        stats.invalid_enums.push({ id: p.id, field: 'colorParent', value: p.colorParent });
    }

    // Dangerous defaults
    if (p.surfaceTexture === 'liso') stats.dangerous_defaults.liso_texture++;
    if (p.finish === 'mate') stats.dangerous_defaults.mate_finish++;
    if (p.colorParent === 'otro') stats.dangerous_defaults.otro_color++;

    // Anomalies
    if (p.labColor && !p.colorParent) {
      anomalies.push({ id: p.id, type: 'missing_colorParent_with_lab', name: p.name });
    }
    if (p.hexColor && !p.labColor) {
      anomalies.push({ id: p.id, type: 'hex_without_lab', name: p.name });
    }
    if (p.surfaceTexture === 'madera' && p.finish === 'brillo') {
        anomalies.push({ id: p.id, type: 'suspicious_combination', detail: 'madera + brillo', name: p.name });
    }
    if (p.colorSource === 'image' && (!p.mainImage && !p.images)) {
        anomalies.push({ id: p.id, type: 'source_image_but_no_image', name: p.name });
    }
  });

  // Equivalence anomalies
  equivalences.forEach((eq: any) => {
    if (!eq.matches || eq.matches.length === 0) {
      anomalies.push({ id: eq.id, type: 'empty_equivalence', name: eq.targetName });
    }
    const selfMatch = eq.matches?.find((m: any) => m.id === eq.id);
    if (selfMatch) {
      anomalies.push({ id: eq.id, type: 'self_reference_match', name: eq.targetName });
    }
  });

  fs.writeFileSync(path.join(process.cwd(), 'tmp', 'panels_profile_summary.json'), JSON.stringify(stats, null, 2));
  fs.writeFileSync(path.join(process.cwd(), 'tmp', 'equivalence_anomalies.json'), JSON.stringify(anomalies, null, 2));
  
  console.log("✅ Perfilado y anomalías generados.");
  process.exit(0);
}

runProfile();
