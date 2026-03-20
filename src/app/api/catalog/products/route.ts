import { NextResponse } from 'next/server';
import { scrapeFaplacCatalog } from '@/lib/importers/faplac-scraper';
import { adaptScrapedData } from '@/lib/catalog-engine/catalog.adapter';
import { CatalogEngine } from '@/lib/catalog-engine/catalog.engine';

/**
 * Endpoint de Debug para inspeccionar el dataset cargado.
 */
export async function GET() {
  try {
    // Para simplificar, scrapeamos en el momento o usamos el motor global
    const scraped = await scrapeFaplacCatalog();
    const adapted = adaptScrapedData(scraped);
    
    return NextResponse.json({
      count: adapted.length,
      products: adapted
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
