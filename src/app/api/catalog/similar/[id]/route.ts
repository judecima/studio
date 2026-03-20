import { NextResponse } from 'next/server';
import { CatalogEngine } from '@/lib/catalog-engine/catalog.engine';
import { adaptProducts } from '@/lib/catalog-engine/catalog.adapter';
import { scrapeFaplacCatalogs } from '@/lib/faplac-scraper';

let engine: CatalogEngine | null = null;

async function getEngine() {
  if (engine) return engine;

  const scraped = await scrapeFaplacCatalogs();
  const adapted = adaptProducts(scraped);

  engine = new CatalogEngine(adapted);
  return engine;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const engine = await getEngine();

  const similar = engine.findSimilar(params.id);

  return NextResponse.json(similar);
}