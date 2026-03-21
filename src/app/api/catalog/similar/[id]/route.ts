import { NextResponse, NextRequest } from 'next/server';
import { CatalogEngine } from '@/lib/catalog-engine/catalog.engine';

type NextContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: NextContext
) {
  try {
    const { id } = await context.params;

    const engine = await CatalogEngine.getInstance();
    const recommendations = engine.findSimilar(id);
    
    return NextResponse.json({
      productId: id,
      count: recommendations.length,
      recommendations
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
