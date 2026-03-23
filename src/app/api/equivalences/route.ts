import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Panel } from '@/lib/types';
import { runEquivalenceSync } from '@/lib/equivalences/engine';

export async function GET() {
  try {
    const sdk = initializeFirebase();
    const firestore = sdk.firestore;
    
    if (!firestore) {
      return NextResponse.json({ success: false, error: "Database offline" }, { status: 500 });
    }

    // 1. Obtener todos los paneles candidatos
    const panelsSnap = await getDocs(collection(firestore, 'panels'));
    const allPanels = panelsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Panel[];

    if (allPanels.length < 1) return NextResponse.json({ success: false, error: "No panels found" });

    // 2. Ejecutar el Batch Runner v5.1 (Procesa todo en bloques con respiro)
    // No usamos offset/limit en la URL porque el motor ya gestiona el batching interno para no morir
    const results = await runEquivalenceSync(allPanels);

    return NextResponse.json({
      success: true,
      processed: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ Sync Error v5.1:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
