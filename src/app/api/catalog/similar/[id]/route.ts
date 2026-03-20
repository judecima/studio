import { NextResponse } from 'next/server';
import { scrapeFaplacCatalog } from '@/lib/importers/faplac-scraper';
import { adaptScrapedData } from '@/lib/catalog-engine/catalog.adapter';
import { CatalogEngine } from '@/lib/catalog-engine/catalog.engine';

// Singleton para el motor en memoria (Persiste entre requests en Next.js App Router)
let globalEngine: CatalogEngine | null = null;
let initializationPromise: Promise<CatalogEngine> | null = null;

/**
 * Inicializa el motor de forma segura y evita múltiples procesos de scraping.
 */
async function getEngine(): Promise<CatalogEngine> {
  if (globalEngine) return globalEngine;

  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      console.log('[API] Inicializando Motor de Catálogo...');
      const scraped = await scrapeFaplacCatalog();
      const adapted = adaptScrapedData(scraped);
      globalEngine = new CatalogEngine(adapted);
      return globalEngine;
    } catch (err) {
      console.error('[API] Error inicializando motor:', err);
      // Fallback a motor vacío para no bloquear
      globalEngine = new CatalogEngine([]);
      return globalEngine;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * GET /api/catalog/similar/[id]
 * Retorna recomendaciones basadas en similaridad estética.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const engine = await getEngine();
    const product = engine.getById(id);

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const similar = engine.findSimilar(id, 4); // Umbral de 4 para mayor flexibilidad

    return NextResponse.json({
      baseProduct: product,
      recommendations: similar
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
