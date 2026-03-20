/**
 * @fileOverview Definiciones de tipos para el motor de catálogo.
 */

export type Fingerprint = {
  material: 'madera' | 'liso' | 'textil' | 'piedra' | 'metal';
  colorGroup: 'claro' | 'medio' | 'oscuro';
  colorHue: 'blanco' | 'gris' | 'beige' | 'marron' | 'negro' | 'azul' | 'rojo' | 'otros';
  grainIntensity: number; // 0 a 5
  tone: 'calido' | 'frio' | 'neutro';
};

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  width: number;
  height: number;
  thickness: number;
  description: string;
  images: string[];
  mainImage: string;
  fingerprint: Fingerprint;
}

export interface SimilarityResult {
  product: CatalogProduct;
  score: number;
}
