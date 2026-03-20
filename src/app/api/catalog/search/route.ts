import { NextResponse } from 'next/server';
import { CatalogEngine } from '@/lib/catalog-engine/catalog.engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  try {
    const engine = await CatalogEngine.getInstance();
    const results = engine.search(query);
    
    return NextResponse.json({
      query,
      count: results.length,
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
