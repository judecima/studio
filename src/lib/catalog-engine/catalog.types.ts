export type Fingerprint = {
    colorGroup: 'claro' | 'medio' | 'oscuro';
    colorHue: 'beige' | 'gris' | 'marron' | 'blanco' | 'negro';
    material: 'madera' | 'liso' | 'textil' | 'piedra';
    grainIntensity: number;
    tone: 'calido' | 'neutro' | 'frio';
  };
  
  export interface CatalogProduct {
    id: string;
    name: string;
    brand: string;
    line?: string;
  
    width?: number;
    height?: number;
    thickness?: number;
  
    description?: string;
    images?: string[];
    mainImage?: string;
  
    fingerprint: Fingerprint;
  }