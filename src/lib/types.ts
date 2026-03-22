
export type ColorGroup = 'blanco' | 'gris' | 'negro' | 'madera' | 'beige' | 'terracota' | 'merlot' | 'amatista' | 'otro' | 'claro' | 'medio' | 'oscuro';
export type ColorHue = string;
export type StyleTag = 'moderno' | 'clasico' | 'industrial' | 'nordico' | 'minimalista';
export type UseCase = 'cocina' | 'placard' | 'oficina' | 'baño' | 'comedor';

export type Panel = {
  id: string;
  name: string;
  brand: string;
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
  // Extended fields
  colorGroup: ColorGroup;
  colorHue: ColorHue;
  styleTags: string[];
  useCases: string[];
  code?: string;
  url?: string;
  surfaceTexture?: string;
  isSmooth?: boolean;
  launchYear?: number;
  applications?: string[];
  antiFingerprint?: boolean;
  finish?: string;
  // Valores cromáticos certificados (fuente: fabricante o medición LAB)
  hexColor?: string;  // Color HEX real de la placa (ej: "#E7DCC5")
  labColor?: { l: number; a: number; b: number };  // Valores LAB certificados
  // Metadata de similaridad opcional
  similarity?: {
    score: number;
    reason: string;
  };
};

export interface SimilarProduct {
  id: string;
  name: string;
  brand: string;
  mainImage: string;
  score: number;
  reason: string;
  thickness: number;
  hasGrain: boolean;
}

export type CombinationType = 'contraste' | 'armonia' | 'funcional';

export type Combination = {
  id: string;
  name: string;
  description: string;
  panelIds: string[];
  type: CombinationType;
  useCase: UseCase;
  previewImage?: string;
  createdAt: any;
  updatedAt: any;
  isApproved: boolean;
  isGeneratedAutomatically: boolean;
};

export type PanelFilters = {
  brand?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  thickness?: number[];
  hasGrain?: boolean;
  search?: string;
  colorGroup?: ColorGroup;
  colorHue?: ColorHue;
};

export type UserRole = 'ADMIN' | 'USER';

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
}

export interface EquivalenceMatch {
  id: string;
  name: string;
  code: string;
  score: number;
  metadata?: {
    description?: string;
    surfaceTexture?: string;
    isSmooth?: boolean;
  };
}

export interface Equivalence {
  faplacCode: string;
  faplacName: string;
  faplacMetadata?: any;
  bestMatches: EquivalenceMatch[];
  text: string;
  updatedAt: any;
}

export type ClassifiedPanel = Panel & {
  colorGroup: string;
  tone: string;
  temperature: string;
  texture: string;
  certifiedLab?: { l: number; a: number; b: number };
  avgColor?: { r: number; g: number; b: number };
};
