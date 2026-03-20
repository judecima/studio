import { CatalogProduct, SearchResult } from './catalog.types';
import { calculateSimilarity, getSimilarityReason } from './similarity';
import { searchProducts } from './search';
import { scrapeFaplacCatalog } from '../importers/faplac-scraper';
import { adaptProducts } from './catalog.adapter';

/**
 * @fileOverview Motor central de catálogo con inicialización Singleton y Caché.
 */

export class CatalogEngine {
  private products: CatalogProduct[] = [];
  private static instance: CatalogEngine | null = null;
  private static initPromise: Promise<CatalogEngine> | null = null;

  private constructor(products: CatalogProduct[]) {
    this.products = products;
    this.processSimilarities();
  }

  /**
   * Genera el grafo de similaridad automáticamente.
   */
  private processSimilarities() {
    this.products.forEach(base => {
      const similars = this.products
        .filter(p => p.id !== base.id)
        .map(p => ({
          id: p.id,
          score: calculateSimilarity(base, p),
          reason: getSimilarityReason(base, p)
        }))
        .filter(s => s.score > 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      base.similar_a = similars;
    });
  }

  /**
   * Inicialización asíncrona segura con protección de concurrencia.
   */
  public static async getInstance(): Promise<CatalogEngine> {
    if (CatalogEngine.instance) return CatalogEngine.instance;
    if (CatalogEngine.initPromise) return CatalogEngine.initPromise;

    CatalogEngine.initPromise = (async () => {
      try {
        console.log('[CatalogEngine] Inicializando catálogo industrial...');
        const rawItems = await scrapeFaplacCatalog();
        const adapted = adaptProducts(rawItems);
        
        // Fallback si el scraper no trae nada
        const finalData = adapted.length > 0 ? adapted : await this.getFallbackData();
        
        CatalogEngine.instance = new CatalogEngine(finalData);
        return CatalogEngine.instance;
      } catch (err) {
        console.error('[CatalogEngine] Error crítico:', err);
        const fallback = new CatalogEngine(await this.getFallbackData());
        CatalogEngine.instance = fallback;
        return fallback;
      } finally {
        CatalogEngine.initPromise = null;
      }
    })();

    return CatalogEngine.initPromise;
  }

  private static async getFallbackData(): Promise<CatalogProduct[]> {
    return adaptProducts([
      { 
        name: "Lino Chiaro", 
        url: "#", 
        description: "Melamina textil beige claro.", 
        dimensions: "1830 x 2750 x 18", 
        mainImage: "https://picsum.photos/seed/lino/800/600",
        brand: "Faplac" 
      },
      { 
        name: "Roble Halifax", 
        url: "#", 
        description: "Maderado premium con veta profunda.", 
        dimensions: "1830 x 2750 x 18", 
        mainImage: "https://picsum.photos/seed/roble/800/600",
        brand: "Egger" 
      }
    ]);
  }

  public getAll(): CatalogProduct[] {
    return this.products;
  }

  public getById(id: string): CatalogProduct | undefined {
    return this.products.find(p => p.id === id);
  }

  public search(query: string): SearchResult[] {
    return searchProducts(this.products, query);
  }

  public findSimilar(id: string): CatalogProduct[] {
    const product = this.getById(id);
    if (!product) return [];
    
    return product.similar_a
      .map(s => this.getById(s.id))
      .filter((p): p is CatalogProduct => !!p);
  }
}
