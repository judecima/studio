
import { Panel, Combination, CombinationType, UseCase } from "@/lib/types";

/**
 * Smart engine to suggest combinations between panels.
 */
export function generateCombinations(basePanel: Panel, allPanels: Panel[]): Combination[] {
  const suggestions: Combination[] = [];
  const otherPanels = allPanels.filter(p => p.id !== basePanel.id && p.visible);

  // 1. Contrast Rule (Dark + Light or Wood + Solid)
  const contrastCandidates = otherPanels.filter(p => 
    (basePanel.colorGroup === 'claro' && p.colorGroup === 'oscuro') ||
    (basePanel.colorGroup === 'oscuro' && p.colorGroup === 'claro') ||
    (basePanel.hasGrain && !p.hasGrain)
  ).slice(0, 2);

  contrastCandidates.forEach(p => {
    suggestions.push({
      id: `auto-contrast-${basePanel.id}-${p.id}`,
      name: `Contraste: ${basePanel.name} & ${p.name}`,
      description: `Una combinación de alto impacto que resalta el diseño ${basePanel.hasGrain ? 'maderado' : 'sólido'} con un tono opuesto.`,
      panelIds: [basePanel.id, p.id],
      type: 'contraste',
      useCase: basePanel.useCases[0] || 'cocina',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isApproved: true,
      isGeneratedAutomatically: true
    });
  });

  // 2. Harmony Rule (Same Hue or Gamut)
  const harmonyCandidates = otherPanels.filter(p => 
    p.colorHue === basePanel.colorHue || 
    (basePanel.colorGroup === p.colorGroup && Math.abs(basePanel.thickness - p.thickness) <= 3)
  ).slice(0, 2);

  harmonyCandidates.forEach(p => {
    suggestions.push({
      id: `auto-harmony-${basePanel.id}-${p.id}`,
      name: `Armonía: ${basePanel.name} & ${p.name}`,
      description: `Gama tonal coherente para ambientes minimalistas y serenos.`,
      panelIds: [basePanel.id, p.id],
      type: 'armonia',
      useCase: basePanel.useCases[0] || 'oficina',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isApproved: true,
      isGeneratedAutomatically: true
    });
  });

  // 3. Functional Rule (Based on Use Case)
  basePanel.useCases.forEach(useCase => {
    const functionalCandidates = otherPanels.filter(p => 
      p.useCases.includes(useCase) && p.brand !== basePanel.brand
    ).slice(0, 1);

    functionalCandidates.forEach(p => {
      suggestions.push({
        id: `auto-func-${useCase}-${basePanel.id}-${p.id}`,
        name: `Pack ${useCase.charAt(0).toUpperCase() + useCase.slice(1)}: ${basePanel.name}`,
        description: `Selección técnica optimizada para el uso en ${useCase}.`,
        panelIds: [basePanel.id, p.id],
        type: 'funcional',
        useCase: useCase,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isApproved: true,
        isGeneratedAutomatically: true
      });
    });
  });

  return suggestions;
}
