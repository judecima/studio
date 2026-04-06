
export type ColorGroup = string;
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
  colorParent?: string; // Nuevo: Categoría objetiva LAB
  colorSub?: string;    // Nuevo: Sub-gama L* (Muy Claro, etc)
  styleTags: string[];
  useCases: string[];
  code?: string;
  ncs?: string;
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
  brand: string;
  code?: string;
  score: number;
  explanation?: string;
  metadata?: {
    description?: string;
    surfaceTexture?: string;
    isSmooth?: boolean;
  };
}

export interface Equivalence {
  targetId: string;
  targetName: string;
  targetBrand: string;
  targetCode: string;
  matches: EquivalenceMatch[];
  text: string;
  lastSync?: string;
  updatedAt?: any; // Deprecated, use lastSync
}

export type ClassifiedPanel = Panel & {
  colorGroup: string;
  tone: string;
  temperature: string;
  texture: string;
  colorParent?: string;
  colorSub?: string;
  certifiedLab?: { l: number; a: number; b: number };
  avgColor?: { r: number; g: number; b: number };
};
