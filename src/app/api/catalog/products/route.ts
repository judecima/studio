import { NextResponse } from 'next/server';
import { CatalogEngine } from '@/lib/catalog-engine/catalog.engine';

export async function GET() {
  try {
    const engine = await CatalogEngine.getInstance();
    const products = engine.getAll();
    
    return NextResponse.json({
      count: products.length,
      timestamp: new Date().toISOString(),
      products
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
