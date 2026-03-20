import { NextResponse } from 'next/server';
import { CatalogEngine } from '@/lib/catalog-engine/catalog.engine';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const engine = await CatalogEngine.getInstance();
    const product = engine.getById(id);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const recommendations = engine.findSimilar(id);
    
    return NextResponse.json({
      baseProduct: product,
      recommendations
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
