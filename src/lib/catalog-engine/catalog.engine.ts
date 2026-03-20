
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
        .filter(s => s.score > 0.45) // Umbral de similaridad
        .sort((a, b) => b.score - a.score)
        .slice(0, 8); // Aumentamos a 8 para dar más opciones
      
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
        // Intentamos obtener datos del catálogo web real
        const rawItems = await scrapeFaplacCatalog();
        const adapted = adaptProducts(rawItems);
        
        // Si el scraper no trae nada o trae muy pocos, usamos un fallback enriquecido
        let finalData = adapted;
        if (adapted.length < 5) {
          console.warn('[CatalogEngine] Scraper devolvió pocos resultados, usando fallback.');
          finalData = await this.getFallbackData();
        }
        
        CatalogEngine.instance = new CatalogEngine(finalData);
        console.log(`[CatalogEngine] Motor listo con ${finalData.length} productos indexados.`);
        return CatalogEngine.instance;
      } catch (err) {
        console.error('[CatalogEngine] Error crítico durante la inicialización:', err);
        const fallbackData = await this.getFallbackData();
        const fallbackEngine = new CatalogEngine(fallbackData);
        CatalogEngine.instance = fallbackEngine;
        return fallbackEngine;
      } finally {
        CatalogEngine.initPromise = null;
      }
    })();

    return CatalogEngine.initPromise;
  }

  private static async getFallbackData(): Promise<CatalogProduct[]> {
    // Datos mínimos para que el sistema no falle si el scraper es bloqueado
    return adaptProducts([
      { 
        name: "Lino Chiaro", 
        url: "#", 
        description: "Melamina textil de la línea Hilados, tono beige suave.", 
        dimensions: "1830 x 2750 x 18", 
        mainImage: "https://www.faplaconline.com.ar/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/l/i/lino-chiaro.jpg",
        brand: "Faplac" 
      },
      { 
        name: "Tuareg", 
        url: "#", 
        description: "Diseño maderado nórdico con veta suave.", 
        dimensions: "1830 x 2750 x 18", 
        mainImage: "https://www.faplaconline.com.ar/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/t/u/tuareg.jpg",
        brand: "Faplac" 
      },
      { 
        name: "Gris Humo", 
        url: "#", 
        description: "Melamina lisa tono gris medio neutro.", 
        dimensions: "1830 x 2750 x 18", 
        mainImage: "https://www.faplaconline.com.ar/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/g/r/gris-humo.jpg",
        brand: "Faplac" 
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

  public findSimilar(id: string): (CatalogProduct & { score: number; reason: string })[] {
    const product = this.getById(id);
    if (!product) return [];
    
    return product.similar_a
      .map(s => {
        const p = this.getById(s.id);
        if (!p) return null;
        return { ...p, score: s.score, reason: s.reason };
      })
      .filter((p): p is (CatalogProduct & { score: number; reason: string }) => !!p);
  }
}
