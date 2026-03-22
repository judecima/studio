import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateEquivalences } from '@/lib/equivalences/engine';
import { Panel } from '@/lib/types';

export async function GET() {
  try {
    const { firestore } = initializeFirebase();
    console.log("🚀 Iniciando generación masiva de equivalencias...");

    // 1. Obtener todos los paneles
    const panelsSnap = await getDocs(collection(firestore, 'panels'));
    const allPanels = panelsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Panel[];

    if (allPanels.length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: "No hay paneles suficientes para comparar." 
      }, { status: 400 });
    }

    // 2. Generar equivalencias universales
    console.log(`🧠 Iniciando proceso masivo de equivalencias para ${allPanels.length} paneles...`);
    
    // Clasificar todos los paneles primero para optimizar
    const { classify } = await import('@/lib/equivalences/engine');
    const classifiedPanels = await Promise.all(allPanels.map(p => classify(p)));

    // 3. Motor de Match para cada panel (usando el sistema de PUNTOS original)
    const { calculateScore } = await import('@/lib/equivalences/engine');
    
    let totalGenerated = 0;
    for (const target of classifiedPanels) {
      const scored = classifiedPanels
        .filter(p => p.id !== target.id) // No compararse consigo mismo
        .map(panel => ({
          panel,
          score: calculateScore(target as any, panel as any)
        }))
        .sort((a, b) => b.score - a.score) // Mayor score = mejor match
        .slice(0, 5);
      
      console.log(`✅ [${target.brand}] ${target.name} -> ${scored.map(m => `${m.panel.code} (${m.score} pts)`).join(', ')}`);
      
      // El documento usa el ID del panel
      await setDoc(doc(firestore, 'equivalences', target.id), {
        panelId: target.id,
        panelName: target.name,
        panelBrand: target.brand,
        panelCode: target.code,
        bestMatches: scored.map(m => ({
          id: m.panel.id,
          code: m.panel.code,
          name: m.panel.name,
          brand: (m.panel as any).brand,
          score: m.score
        })),
        updatedAt: serverTimestamp()
      });
      totalGenerated++;
    }

    console.log(`🏁 Proceso finalizado. ${totalGenerated} equivalencias sincronizadas.`);

    return NextResponse.json({
      success: true,
      total: totalGenerated,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ Error en API de equivalencias:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
