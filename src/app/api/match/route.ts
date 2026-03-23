import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * API ENDPOINT: /api/match?id={panelId}
 * v5.4 - Optimización para Latencia Cero y Alta Concurrencia
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    
    // 🚀 PRIORIDAD 1: Documento ya calculado y persistido (Latencia Cero)
    const eqRef = doc(firestore, 'equivalences', id);
    const eqSnap = await getDoc(eqRef);

    if (eqSnap.exists()) {
      const data = eqSnap.data();
      return NextResponse.json({
        success: true,
        cached: true,
        target: {
          id: data.panelId,
          name: data.panelName,
          code: data.panelCode,
          brand: data.panelBrand
        },
        matches: data.matches || data.bestMatches || [], // Soporte para ambas nomenclaturas
        text: data.text,
        lastSync: data.lastSync || data.updatedAt
      });
    }

    // 🚀 PRIORIDAD 2: Recalculo bajo demanda (Solo si no existe en la DB)
    console.log(`📡 Recalculando match bajo demanda para: ${id}`);
    
    // Importación dinámica para no cargar el motor si no es necesario
    const { collection, getDocs } = await import('firebase/firestore');
    const { classify, calculateScore, generateExplanation } = await import('@/lib/equivalences/engine');
    
    // 1. Obtener panel target
    const panelRef = doc(firestore, 'panels', id);
    const panelSnap = await getDoc(panelRef);
    if (!panelSnap.exists()) {
      return NextResponse.json({ error: 'Panel no encontrado' }, { status: 404 });
    }
    const target = { id: panelSnap.id, ...panelSnap.data() } as any;
    const targetClass = await classify(target);

    // 2. Obtener candidatos (limitado para performance de API)
    const panelsSnap = await getDocs(collection(firestore, 'panels'));
    const allPanels = panelsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const scored = await Promise.all(allPanels
      .filter(p => p.id !== id && p.brand !== target.brand)
      .map(async (candidate) => {
        const candClass = await classify(candidate);
        const score = calculateScore(targetClass, candClass);
        return { panel: candidate, score };
      })
    );

    const top = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const result = {
      target: { id: target.id, name: target.name, code: target.code, brand: target.brand },
      matches: top.map(m => {
        const roundedScore = Math.round(m.score * 100);
        return {
          id: m.panel.id,
          name: m.panel.name,
          brand: m.panel.brand,
          code: m.panel.code,
          mainImage: m.panel.mainImage,
          width: m.panel.width,
          height: m.panel.height,
          thickness: m.panel.thickness,
          score: roundedScore,
          explanation: generateExplanation(targetClass, m.panel, roundedScore)
        };
      })
    };

    return NextResponse.json({
      success: true,
      cached: false,
      ...result
    });

  } catch (error: any) {
    console.error('❌ Error en /api/match (v5.4):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
