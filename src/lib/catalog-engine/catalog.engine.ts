import { CatalogProduct } from './catalog.types';
import { similarity } from './similarity';

export class CatalogEngine {
  private products: CatalogProduct[] = [];
  private cache = new Map<string, any>();

  constructor(products: CatalogProduct[]) {
    this.products = products;
  }

  setProducts(products: CatalogProduct[]) {
    this.products = products;
    this.cache.clear();
  }

  getAll() {
    return this.products;
  }

  getById(id: string) {
    return this.products.find(p => p.id === id);
  }

  findSimilar(id: string, threshold = 6) {
    if (this.cache.has(id)) return this.cache.get(id);

    const base = this.getById(id);
    if (!base) return [];

    const result = this.products
      .filter(p => p.id !== id)
      .map(p => ({
        product: p,
        score: similarity(base.fingerprint, p.fingerprint)
      }))
      .filter(p => p.score >= threshold)
      .sort((a, b) => b.score - a.score);

    this.cache.set(id, result);
    return result;
  }
}