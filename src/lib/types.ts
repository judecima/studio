export type ColorParent = 'blanco' | 'negro' | 'gris' | 'beige' | 'marron' | 'rojo' | 'naranja' | 'amarillo' | 'verde' | 'azul' | 'rosa' | 'violeta' | 'custom' | 'otro';

export interface SimilarProduct {
  id: string;
  name: string;
  brand: string;
  mainImage: string;
  score: number;
  reason: string;
  price?: number;
}
export type ColorSub = 'muy claro' | 'claro' | 'medio claro' | 'medio oscuro' | 'oscuro' | 'muy oscuro';
export type SurfaceTexture = 'liso' | 'madera' | 'textil' | 'cementicio' | 'piedra' | 'metal' | 'otro';
export type Finish = 'mate' | 'brillo' | 'satinado' | 'texturado' | 'supermate' | 'poro_madera' | 'sincronizado' | 'otro';

export type ColorSource = 'ncs' | 'image_dominant' | 'image_clustered' | 'manual' | 'inferred' | 'imported' | 'legacy' | 'analytical_v6.1' | 'fallback' | 'lab';

export type ClassifiedValue<T> = {
  value: T;
  confidence: number;
  source: 'manual' | 'keyword' | 'lab' | 'fallback';
};

export type ScoreBreakdown = {
  total: number;
  colorScore: number;
  semanticScore: number;
  textureScore: number;
  finishScore: number;
  lightnessScore: number;
  confidenceScore: number;
  manualBoost: number;
  identityBoost?: number;
};

export type PanelFilters = {
  brand?: string;
  material?: string;
  surfaceTexture?: SurfaceTexture;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  hasGrain?: boolean;
  search?: string;
  colorParent?: ColorParent;
};

export type Panel = {
  id: string;
  name: string;
  brand: string;
  material: string; // MDF, MDP, etc. (Industrial Material)
  width: number;
  height: number;
  thickness: number;
  hasGrain: boolean;
  description: string;
  stock: number;
  images: string[];
  mainImage: string;
  visible: boolean;
  createdAt: any;
  updatedAt: any;
  
  // Jerarquía Cromática Unificada
  colorParent: ColorParent; 
  colorParentSource?: ColorSource;
  colorSub: ColorSub;
  colorSubSource?: ColorSource;
  
  // Soporte para colores personalizados (Fase Flexible)
  customColorFamily?: string | null;
  customColorFamilyNormalized?: string | null;
  colorFamilySource?: ColorSource;

  // Estética y Acabado (Industrial)
  surfaceTexture: SurfaceTexture;
  surfaceTextureSource?: ColorSource;
  finish: Finish;
  finishSource?: ColorSource;
  antiFingerprint: boolean;

  // Clasificación Industrial Extendida
  materialType?: 'unicolor' | 'madera' | 'textil' | 'cemento' | 'piedra' | 'metal' | 'fantasia' | 'otro';
  materialTypeSource?: ColorSource;
  tone?: string;
  toneSource?: ColorSource;
  lightnessGroup?: string;
  lightnessGroupSource?: ColorSource;
  directionality?: 'none' | 'vertical' | 'horizontal' | 'trama' | 'veta' | 'otro';
  directionalitySource?: ColorSource;
  commercialLine?: string;
  commercialLineSource?: ColorSource;
  hasGrainSource?: ColorSource;
  
  // Technical
  code?: string;
  ncs?: string;
  url?: string;
  launchYear?: number;
  
  // Valores calculados
  hexColor?: string;
  labColor?: { l: number; a: number; b: number };
  secondaryLabColor?: { l: number; a: number; b: number };
  paletteVariance?: number;
  
  // Metadata de calidad y origen
  colorSource?: ColorSource;
  dataConfidence?: number;

  // Revisiones manuales
  manualVerifiedMatches?: string[];
  manualRejectedMatches?: string[];
  manualAffinity?: Record<string, number>;
  
  // Legacy compatibility (to be removed in next cleanup)
  colorGroup?: string;
  colorHue?: string;
  styleTags?: string[];
  useCases?: string[];
  applications?: string[];
};

export interface EquivalenceMatch {
  id: string;
  name: string;
  brand: string;
  code?: string;
  score: number;
  explanation?: string;
  breakdown?: ScoreBreakdown;
}

export interface Equivalence {
  targetId: string;
  targetName: string;
  targetBrand: string;
  targetCode: string;
  matches: EquivalenceMatch[];
  text: string;
  lastSync?: string;
}

export type ClassifiedPanel = Panel & {
  certifiedLab?: { l: number; a: number; b: number };
  textureConfidence?: number;
  colorConfidence?: number;
};

export type CombinationType = 'armonia' | 'contraste' | 'acento' | 'funcional';
export type UseCase = 'cocina' | 'placard' | 'oficina' | 'comedor' | 'baño' | 'comercial' | 'otro';

export interface Combination {
  id: string;
  name: string;
  description: string;
  panelIds: string[];
  type: CombinationType;
  useCase: UseCase;
  createdAt: string;
  updatedAt: string;
  isApproved: boolean;
  isGeneratedAutomatically: boolean;
}
