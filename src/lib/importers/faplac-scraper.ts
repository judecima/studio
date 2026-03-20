import axios from 'axios';
import * as cheerio from 'cheerio';
import { initializeFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { normalizePanelId, adaptToProduct } from '../catalog-engine/catalog.adapter';

/**
 * @fileOverview Pipeline robusto de scraping y persistencia en Firebase.
 * Ejecutado en el servidor para evitar bloqueos de CORS y manejar Storage.
 */

const BASE_URL = 'https://www.faplaconline.com.ar';
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas`;

export async function runIndustrialPipeline() {
  const { firebaseApp, firestore } = initializeFirebase();
  const storage = getStorage(firebaseApp);
  
  console.log("🏁 Iniciando Pipeline Industrial en el Servidor...");
  
  try {
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      },
      timeout: 30000
    });

    const $ = cheerio.load(html);
    // Buscamos los links de productos en el listado
    const productLinks = $('.product-item-link, .item.product.product-item a').map((_, el) => $(el).attr('href')).get();
    const uniqueLinks = Array.from(new Set(productLinks)).filter(link => link && link.includes('/p/')).slice(0, 40);

    console.log(`✅ ${uniqueLinks.length} melaminas únicas encontradas para procesar.`);

    let processedCount = 0;

    for (const link of uniqueLinks) {
      const url = link.startsWith('http') ? link : `${BASE_URL}${link}`;
      try {
        const productData = await scrapeProductDetail(url);
        if (!productData.imageUrl) {
          console.warn(`⚠️ Omitiendo ${productData.name}: No se encontró imagen.`);
          continue;
        }

        const slug = normalizePanelId(productData.name);
        const fileName = `${slug}.jpg`;
        const storagePath = `products/faplac/${fileName}`;
        
        const storageRef = ref(storage, storagePath);
        let finalImageUrl = "";

        // Intentamos ver si ya existe para ahorrar ancho de banda
        try {
          finalImageUrl = await getDownloadURL(storageRef);
          console.log(`♻️ Imagen ya existente para: ${productData.name}`);
        } catch (e) {
          console.log(`📥 Descargando imagen industrial para: ${productData.name}`);
          const imageResponse = await axios.get(productData.imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          
          await uploadBytes(storageRef, imageResponse.data, { 
            contentType: 'image/jpeg',
            customMetadata: { source: 'faplac-industrial-scraper' }
          });
          finalImageUrl = await getDownloadURL(storageRef);
        }

        // Persistencia de Metadata en Firestore
        const catalogProduct = adaptToProduct(productData, finalImageUrl);
        const docRef = doc(firestore, 'catalog_products', catalogProduct.id);
        
        await setDoc(docRef, catalogProduct, { merge: true });
        processedCount++;
        console.log(`✅ [${processedCount}] Sincronizado: ${catalogProduct.name}`);

      } catch (err: any) {
        console.error(`⚠️ Error procesando melamina en ${url}:`, err.message);
      }
    }

    return { success: true, count: processedCount };
  } catch (error: any) {
    console.error("🚨 Error crítico en pipeline industrial:", error.message);
    throw error;
  }
}

async function scrapeProductDetail(url: string) {
  const { data: html } = await axios.get(url, { 
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000 
  });
  const $ = cheerio.load(html);

  const name = $('.page-title .base').text().trim() || $('h1').first().text().trim();
  const description = $('.product.attribute.description .value').text().trim() || $('.description').text().trim() || "Tablero melamínico de alta calidad.";
  
  // Captura de imagen real de alta resolución
  const imageUrl = $('meta[property="og:image"]').attr('content') || 
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('.gallery-placeholder__image').attr('src');

  // Intento de extracción de medidas desde el texto de la página
  const bodyText = $('body').text();
  const measuresMatch = bodyText.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  
  const dimensions = measuresMatch ? {
    width: parseInt(measuresMatch[1]),
    height: parseInt(measuresMatch[2]),
    thickness: parseInt(measuresMatch[3])
  } : { width: 1830, height: 2750, thickness: 18 };

  return { name, description, imageUrl, dimensions, url, brand: 'Faplac' };
}
