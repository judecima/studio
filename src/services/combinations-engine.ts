import { Panel, Combination, CombinationType, UseCase } from "@/lib/types";

/**
 * Motor inteligente para sugerir combinaciones entre paneles.
 * Añadido manejo seguro de arrays (useCases, styleTags) para evitar errores de ejecución.
 */
export function generateCombinations(basePanel: Panel, allPanels: Panel[]): Combination[] {
  const suggestions: Combination[] = [];
  
  if (!basePanel || !allPanels) return suggestions;

  const otherPanels = allPanels.filter(p => p.id !== basePanel.id && p.visible);

  // 1. Regla de Contraste (Oscuro + Claro o Madera + Sólido)
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
      useCase: (basePanel.useCases && basePanel.useCases.length > 0) ? (basePanel.useCases[0] as UseCase) : 'cocina',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isApproved: true,
      isGeneratedAutomatically: true
    });
  });

  // 2. Regla de Armonía (Mismo tono o gama)
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
      useCase: (basePanel.useCases && basePanel.useCases.length > 0) ? (basePanel.useCases[0] as UseCase) : 'oficina',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isApproved: true,
      isGeneratedAutomatically: true
    });
  });

  // 3. Regla Funcional (Basada en Casos de Uso)
  // Se añade check de seguridad para basePanel.useCases
  if (basePanel.useCases && Array.isArray(basePanel.useCases)) {
    basePanel.useCases.forEach(useCase => {
      const functionalCandidates = otherPanels.filter(p => 
        p.useCases && Array.isArray(p.useCases) && p.useCases.includes(useCase) && p.brand !== basePanel.brand
      ).slice(0, 1);

      functionalCandidates.forEach(p => {
        suggestions.push({
          id: `auto-func-${useCase}-${basePanel.id}-${p.id}`,
          name: `Pack ${useCase.charAt(0).toUpperCase() + useCase.slice(1)}: ${basePanel.name}`,
          description: `Selección técnica optimizada para el uso en ${useCase}.`,
          panelIds: [basePanel.id, p.id],
          type: 'funcional',
          useCase: useCase as UseCase,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isApproved: true,
          isGeneratedAutomatically: true
        });
      });
    });
  }

  return suggestions;
}
