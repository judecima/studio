import { NextResponse } from 'next/server';
import { rankMatchesForPanelId } from '@/lib/equivalences/engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 });
    }

    console.log(`📡 Recalculando match bajo demanda para: ${id} (Motor v6.6)`);
    
    // Usamos el pipeline unificado del engine que ya maneja:
    // 1. Clasificación
    // 2. Filtros Duros (Capa A)
    // 3. Score Multicapa (Capa B)
    // 4. Threshold dinámico
    const matches = await rankMatchesForPanelId(id);

    return NextResponse.json({
      success: true,
      cached: false,
      matches
    });

  } catch (error: any) {
    console.error('❌ Error en /api/match (v6.6):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
