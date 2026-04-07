
export type ColorParent = 'blanco' | 'beige' | 'gris' | 'negro' | 'marron' | 'rojo' | 'verde' | 'azul' | 'amarillo' | 'naranja' | 'violeta' | 'rosa' | 'otro';
export type ColorSub = 'muy claro' | 'claro' | 'medio claro' | 'medio oscuro' | 'oscuro' | 'muy oscuro';
export type SurfaceTexture = 'liso' | 'madera' | 'concreto' | 'textil' | 'metal';
export type Finish = 'mate' | 'brillo' | 'satinado' | 'texturado' | 'soft';

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
  
  // Jerarquía Cromática Unificada
  colorParent: ColorParent; 
  colorSub: ColorSub;
  
  // Estética y Acabado
  surfaceTexture: SurfaceTexture;
  finish: Finish;
  antiFingerprint: boolean;
  
  // Technical
  code?: string;
  ncs?: string;
  url?: string;
  launchYear?: number;
  
  // Valores calculados
  hexColor?: string;
  labColor?: { l: number; a: number; b: number };
  
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
};
