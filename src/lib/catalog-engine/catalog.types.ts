/**
 * @fileOverview Definiciones de tipos para el motor de catálogo profesional.
 */

export type ColorGroup = 'claro' | 'medio' | 'oscuro';
export type ColorHue = 'blanco' | 'gris' | 'beige' | 'marron' | 'negro' | 'azul' | 'rojo' | 'verde' | 'otros';
export type MaterialType = 'madera' | 'liso' | 'textil' | 'piedra' | 'metal';
export type ToneType = 'calido' | 'frio' | 'neutro';

export interface CatalogProduct {
  id: string;
  name: string;
  sku?: string;
  brand: string;
  line: string;
  collection: string;
  launch: boolean;
  launchYear?: number;
  texture: string;
  surfaceTexture?: string;
  finish: string;
  hasGrain: boolean;
  isSmooth: boolean;
  color: {
    name: string;
    group: ColorGroup;
    hue: ColorHue;
    basicColors: string[];
    semanticTags: string[];
  };
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  description: string;
  details: string;
  images: string[];
  mainImage: string;
  fingerprint: {
    material: MaterialType;
    tone: ToneType;
    grainIntensity: number; // 0 a 10
  };
  similar_a: {
    id: string;
    score: number;
    reason: string;
  }[];
}

export interface SearchResult {
  product: CatalogProduct;
  relevance: number;
}
