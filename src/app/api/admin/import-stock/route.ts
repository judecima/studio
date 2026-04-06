import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase } from "@/firebase"; 
const { firestore: db } = initializeFirebase();
import { collection, doc, getDocs, writeBatch, query, where, serverTimestamp, setDoc } from "firebase/firestore";
import { Panel } from "@/lib/types";
import { detectColor, detectTexture, getColorSub } from "@/lib/equivalences/classifier";

export async function POST(req: NextRequest) {
  try {
    const { updates } = await req.json();
    
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ success: false, error: "Datos de actualización inválidos" }, { status: 400 });
    }

    // Usamos batch para optimizar escrituras (límite de 500 por batch en Firestore)
    const batch = writeBatch(db);
    let updatedCount = 0;
    let createdCount = 0;

    // Obtenemos todos los paneles actuales para búsqueda rápida en memoria
    const panelsRef = collection(db, 'panels');
    const snapshot = await getDocs(panelsRef);
    const existingPanels = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Panel));

    for (const update of updates) {
      // Normalización para búsqueda: Marca + Nombre (sin espacios extra) + Espesor
      const searchName = update.name.toLowerCase().trim();
      const searchBrand = update.brand.toLowerCase().trim();
      
      // Intentamos encontrar coincidencia exacta por nombre y marca
      let existing = existingPanels.find(p => 
        p.name.toLowerCase().trim() === searchName && 
        p.brand.toLowerCase().trim() === searchBrand &&
        p.thickness === update.thickness
      );

      if (existing) {
        // ACTUALIZAR STOCK
        const docRef = doc(db, 'panels', existing.id);
        batch.update(docRef, { 
          stock: update.stock,
          updatedAt: serverTimestamp() 
        });
        updatedCount++;
      } else {
        // CREAR NUEVO PANEL
        // Generar ID amigable: nombre-espesor-cm
        const newId = `${update.name.toLowerCase().replace(/\s+/g, '-')}-${update.thickness}mm`.replace(/[^a-z0-9-]/g, '');
        const docRef = doc(db, 'panels', newId);
        
        // Clasificación automática básica basada en el nombre
        const texture = detectTexture(update.name);
        const colorGroup = detectColor(update.name);

        const newPanel: Partial<Panel> = {
          id: newId,
          name: update.name,
          brand: update.brand,
          width: update.width,
          height: update.height,
          thickness: update.thickness,
          stock: update.stock,
          visible: false, // Oculto por defecto hasta que se revise/agregue foto
          mainImage: `https://placehold.co/800x600?text=${encodeURIComponent(update.name)}+Sin+Imagen`,
          images: [],
          description: `Producto importado vía planilla: ${update.articulo}`,
          hasGrain: texture === 'madera',
          surfaceTexture: texture,
          colorGroup: colorGroup,
          colorHue: "medio",
          applications: ["Mobiliario", "Interiores"],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        batch.set(docRef, newPanel);
        createdCount++;
      }
    }

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      updated: updatedCount, 
      created: createdCount 
    });

  } catch (error: any) {
    console.error("Error en import-stock:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
