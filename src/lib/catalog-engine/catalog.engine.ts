import { CatalogProduct, SearchResult } from './catalog.types';
import { calculateSimilarity, getSimilarityReason } from './similarity';
import { searchProducts } from './search';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

/**
 * Motor central de catálogo con inicialización Singleton y Caché en memoria.
 */
export class CatalogEngine {
  private products: CatalogProduct[] = [];
  private static instance: CatalogEngine | null = null;
  private static initPromise: Promise<CatalogEngine> | null = null;

  private constructor(products: CatalogProduct[]) {
    this.products = products;
    this.processSimilarities();
  }

  private processSimilarities() {
    this.products.forEach(base => {
      const similars = this.products
        .filter(p => p.id !== base.id)
        .map(p => ({
          id: p.id,
          score: calculateSimilarity(base, p),
          reason: getSimilarityReason(base, p)
        }))
        .filter(s => s.score >= 0.6)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
      
      base.similar_a = similars;
    });
  }

  public static async getInstance(): Promise<CatalogEngine> {
    if (CatalogEngine.instance) return CatalogEngine.instance;
    if (CatalogEngine.initPromise) return CatalogEngine.initPromise;

    CatalogEngine.initPromise = (async () => {
      try {
        console.log('[CatalogEngine] Cargando productos desde Firestore...');
        const { firestore } = initializeFirebase();
        const colRef = collection(firestore, 'catalog_products');
        const snapshot = await getDocs(colRef);
        
        const products = snapshot.docs.map(doc => doc.data() as CatalogProduct);
        CatalogEngine.instance = new CatalogEngine(products);
        console.log(`[CatalogEngine] Motor listo con ${products.length} productos.`);
        return CatalogEngine.instance;
      } catch (err) {
        console.error('[CatalogEngine] Fallo al inicializar:', err);
        return new CatalogEngine([]);
      } finally {
        CatalogEngine.initPromise = null;
      }
    })();

    return CatalogEngine.initPromise;
  }

  public getAll(): CatalogProduct[] {
    return this.products;
  }

  public getById(id: string): CatalogProduct | undefined {
    return this.products.find(p => p.id === id);
  }

  public search(q: string): SearchResult[] {
    return searchProducts(this.products, q);
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
