import { NextResponse } from 'next/server';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { 
  detectColor, 
  detectTexture, 
  detectTone, 
  detectTemp 
} from '@/lib/equivalences/engine';

export async function GET() {
  console.log("🚀 Iniciando migración de limpieza de paneles vía API...");
  const { firestore: db } = initializeFirebase();
  
  try {
    const querySnapshot = await getDocs(collection(db, 'panels'));
    const updates = querySnapshot.docs.map(async (panelDoc) => {
      const data = panelDoc.data();
      const n = ( (data.name || "") + " " + (data.description || "") + " " + (panelDoc.id || "") ).toLowerCase();
      
      const newData = {
        colorGroup: detectColor(n),
        texture: detectTexture(n),
        tone: detectTone(n),
        temperature: detectTemp(n),
        hasGrain: n.includes('veta') || n.includes('madera') || n.includes('roble') || n.includes('nogal'),
        isSmooth: !n.match(/urban|hilados|textura|veta|poro|st12|st19|st22|st32|st37|st38/i)
      };

      const ref = doc(db, 'panels', panelDoc.id);
      return updateDoc(ref, newData);
    });

    await Promise.all(updates);
    return NextResponse.json({ success: true, total: querySnapshot.size, message: "Migración completada." });
  } catch (error: any) {
    console.error("❌ Error en API de migración:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
