import { CatalogProduct, SimilarityResult } from './catalog.types';
import { calculateSimilarityScore } from './similarity';

/**
 * Clase de motor de catálogo para búsqueda y recomendaciones.
 */
export class CatalogEngine {
  private products: CatalogProduct[] = [];
  private index = new Map<string, CatalogProduct>();

  constructor(products: CatalogProduct[]) {
    this.products = products;
    products.forEach(p => this.index.set(p.id, p));
  }

  /**
   * Retorna todos los productos cargados.
   */
  getAll(): CatalogProduct[] {
    return this.products;
  }

  /**
   * Obtiene un producto por su ID normalizado.
   */
  getById(id: string): CatalogProduct | undefined {
    return this.index.get(id);
  }

  /**
   * Encuentra productos similares basados en la huella digital.
   * @param id ID del producto base.
   * @param threshold Puntaje mínimo de similaridad (default 5).
   */
  findSimilar(id: string, threshold: number = 5): SimilarityResult[] {
    const base = this.getById(id);
    if (!base) return [];

    return this.products
      .filter(p => p.id !== id)
      .map(p => ({
        product: p,
        score: calculateSimilarityScore(base.fingerprint, p.fingerprint)
      }))
      .filter(res => res.score >= threshold)
      .sort((a, b) => b.score - a.score);
  }
}
