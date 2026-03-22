import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { classify } from '@/lib/equivalences/engine';
import { findTopMatches } from '@/lib/matcher';
import { Panel } from '@/lib/types';

/**
 * API ENDPOINT: /api/match?id={panelId}
 * Encuentra equivalencias en tiempo real para un panel específico.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    
    // 1. Obtener el panel objetivo
    const panelRef = doc(firestore, 'panels', id);
    const panelDoc = await panelDocToData(panelRef);
    if (!panelDoc) {
      return NextResponse.json({ error: 'Panel no encontrado' }, { status: 404 });
    }

    // 2. Clasificar el panel objetivo (enriquecer con metadatos de color/textura)
    const targetClassified = await classify(panelDoc);

    const allPanelsSnap = await getDocs(collection(firestore, 'panels'));
    const library: Panel[] = [];
    allPanelsSnap.forEach(doc => {
      const data = doc.data() as Panel;
      if (doc.id !== id) {
        library.push({ ...data, id: doc.id });
      }
    });

    // 4. Clasificar la librería (en paralelo)
    const libraryClassified = await Promise.all(library.map(p => classify(p)));

    // 5. Encontrar matches usando el Match Engine
    const matches = findTopMatches(targetClassified, libraryClassified);

    return NextResponse.json({
      success: true,
      target: {
        id: targetClassified.id,
        name: targetClassified.name,
        colorGroup: targetClassified.colorGroup,
        texture: targetClassified.texture
      },
      matches: matches.map(m => ({
        ...m,
        matchScore: Math.round(m.matchScore * 100) / 100
      }))
    });

  } catch (error: any) {
    console.error('❌ Error en /api/match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function panelDocToData(ref: any): Promise<Panel | null> {
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data) return null;
  return { ...data, id: snap.id } as Panel;
}
