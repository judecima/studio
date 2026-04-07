
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
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
        // 🔥 Devolver todos los matches persistidos (ya filtrados en el engine)
        matches: data.matches || data.bestMatches || [],
        text: data.text,
        lastSync: data.lastSync || data.updatedAt
      });
    }

    console.log(`📡 Recalculando match bajo demanda para: ${id}`);
    const { collection, getDocs } = await import('firebase/firestore');
    const { classify, calculateScore, generateExplanation } = await import('@/lib/equivalences/engine');
    
    const panelRef = doc(firestore, 'panels', id);
    const panelSnap = await getDoc(panelRef);
    if (!panelSnap.exists()) {
      return NextResponse.json({ error: 'Panel no encontrado' }, { status: 404 });
    }
    const target = { id: panelSnap.id, ...panelSnap.data() } as any;
    const targetClass = await classify(target);

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

    // 🔥 Aumentado el límite de retorno a 30 y filtrado a partir de 60%
    const top = scored
      .filter(m => m.score >= 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

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
    console.error('❌ Error en /api/match (v5.5):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
