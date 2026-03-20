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
// URL base del catálogo de melaminas
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

export async function runIndustrialPipeline() {
  const { firebaseApp, firestore } = initializeFirebase();
  const storage = getStorage(firebaseApp);
  
  console.log("🏁 Iniciando Pipeline Industrial en el Servidor...");
  console.log(`🌐 URL de origen: ${CATALOG_URL}`);
  
  try {
    const response = await axios.get(CATALOG_URL, {
      headers: HEADERS,
      timeout: 45000
    });

    const $ = cheerio.load(response.data);
    
    // Selectores más amplios para capturar enlaces de productos en diferentes layouts
    const productLinks = new Set<string>();
    
    $('.product-item-link, .item.product.product-item a, a[href*="/p/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('/p/')) {
        productLinks.add(href.startsWith('http') ? href : `${BASE_URL}${href}`);
      }
    });

    const uniqueLinks = Array.from(productLinks).slice(0, 50);

    console.log(`✅ ${uniqueLinks.length} enlaces de melaminas encontrados.`);

    if (uniqueLinks.length === 0) {
      console.warn("⚠️ No se encontraron productos. Revisando selectores de respaldo...");
      // Intento con selectores genéricos de catálogo
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/p/')) productLinks.add(href.startsWith('http') ? href : `${BASE_URL}${href}`);
      });
    }

    let processedCount = 0;

    for (const url of uniqueLinks) {
      try {
        console.log(`🔎 Analizando: ${url}`);
        const productData = await scrapeProductDetail(url);
        
        if (!productData.name || !productData.imageUrl) {
          console.warn(`⚠️ Omitiendo ${url}: Faltan datos críticos (Nombre: ${productData.name}, Imagen: ${productData.imageUrl ? 'OK' : 'MISSING'})`);
          continue;
        }

        const slug = normalizePanelId(productData.name);
        const storagePath = `products/faplac/${slug}.jpg`;
        const storageRef = ref(storage, storagePath);
        
        let finalImageUrl = "";

        // Verificamos si la imagen ya existe para ahorrar transferencia
        try {
          finalImageUrl = await getDownloadURL(storageRef);
          console.log(`♻️ Imagen reutilizada: ${productData.name}`);
        } catch (e) {
          console.log(`📥 Descargando imagen industrial: ${productData.name}`);
          const imageResponse = await axios.get(productData.imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: HEADERS
          });
          
          await uploadBytes(storageRef, imageResponse.data, { 
            contentType: 'image/jpeg',
            customMetadata: { source: 'faplac-industrial-scraper', originalUrl: productData.imageUrl }
          });
          finalImageUrl = await getDownloadURL(storageRef);
        }

        // Adaptamos y guardamos metadata en Firestore
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
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data sample:", error.response.data.substring(0, 500));
    }
    throw error;
  }
}

async function scrapeProductDetail(url: string) {
  const { data: html } = await axios.get(url, { 
    headers: HEADERS,
    timeout: 20000 
  });
  const $ = cheerio.load(html);

  // Extracción robusta de nombre
  const name = $('.page-title .base').text().trim() || 
               $('h1').first().text().trim() || 
               $('meta[property="og:title"]').attr('content')?.split('|')[0].trim() || "";

  // Extracción robusta de descripción
  const description = $('.product.attribute.description .value').text().trim() || 
                      $('.description').text().trim() || 
                      $('meta[property="og:description"]').attr('content')?.trim() || 
                      "Tablero melamínico de alta calidad.";
  
  // Captura de imagen real de alta resolución (prioridad og:image)
  let imageUrl = $('meta[property="og:image"]').attr('content') || 
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('.gallery-placeholder__image').attr('src') ||
                   $('.product.image.main img').attr('src');

  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${BASE_URL}${imageUrl}`;
  }

  // Extracción de dimensiones desde specs o texto
  const specsText = $('.additional-attributes-wrapper').text() || $('body').text();
  const measuresMatch = specsText.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  
  const dimensions = measuresMatch ? {
    width: parseInt(measuresMatch[1]),
    height: parseInt(measuresMatch[2]),
    thickness: parseInt(measuresMatch[3])
  } : { width: 1830, height: 2750, thickness: 18 };

  return { 
    name, 
    description, 
    imageUrl, 
    dimensions, 
    url, 
    brand: 'Faplac' 
  };
}
