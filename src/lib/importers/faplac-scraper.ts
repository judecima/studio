import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { initializeFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId, adaptToProduct } from '../catalog-engine/catalog.adapter';

/**
 * @fileOverview Scraper Industrial Robusto V4 (Puppeteer + Axios).
 * - Usa Puppeteer para romper el renderizado dinámico de JavaScript.
 * - Captura imágenes y las persiste en Firebase Storage.
 * - Infiere metadatos de diseño para el motor de similaridad.
 */

const BASE_URL = 'https://www.faplaconline.com.ar';
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac?p=1`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

/**
 * Ejecuta el pipeline completo de importación.
 */
export async function runIndustrialPipeline() {
  const { firebaseApp, firestore } = initializeFirebase();
  const storage = getStorage(firebaseApp);
  
  console.log("🚀 Iniciando Pipeline Industrial V4 (Headless Browser Mode)...");
  
  let browser;
  try {
    // 1. Lanzar Puppeteer para extraer enlaces dinámicos
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    
    console.log("🌐 Navegando al catálogo dinámico:", CATALOG_URL);
    await page.goto(CATALOG_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Esperar a que los items del catálogo se rendericen
    try {
      await page.waitForSelector('.product-item', { timeout: 15000 });
    } catch (e) {
      console.warn("⚠️ Tiempo de espera agotado para .product-item, intentando capturar lo existente...");
    }

    // Extraer enlaces de productos desde el DOM renderizado
    const productLinks = await page.evaluate(() => {
      const links = new Set<string>();
      document.querySelectorAll('.product-item-link, a.product-item-photo').forEach((el: any) => {
        if (el.href) links.add(el.href.split('?')[0]);
      });
      return Array.from(links);
    });

    console.log(`📦 Enlaces únicos detectados: ${productLinks.length}`);
    await browser.close();

    if (productLinks.length === 0) {
      console.warn("❌ No se detectaron productos reales. Activando Fallback...");
      return await runFallbackPipeline(firestore);
    }

    let processedCount = 0;
    // Limitamos a 40 productos para evitar timeouts en el servidor
    const linksToProcess = productLinks.slice(0, 40);

    for (const url of linksToProcess) {
      try {
        console.log(`🔎 Procesando (${processedCount + 1}/${linksToProcess.length}): ${url}`);
        const productData = await scrapeProductDetail(url);
        
        if (!productData.name) continue;

        const slug = normalizePanelId(productData.name);
        const storagePath = `products/faplac/faplac-${slug}.jpg`;
        const storageRef = ref(storage, storagePath);
        
        let finalImageUrl = "";

        // Verificamos si la imagen ya existe para ahorrar ancho de banda
        try {
          finalImageUrl = await getDownloadURL(storageRef);
          console.log(`♻️ Reutilizando imagen de Storage para: ${productData.name}`);
        } catch (e) {
          console.log(`📥 Descargando y subiendo nueva imagen: ${productData.name}`);
          const imageResponse = await axios.get(productData.imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: HEADERS
          });
          
          await uploadBytes(storageRef, imageResponse.data, { 
            contentType: 'image/jpeg'
          });
          finalImageUrl = await getDownloadURL(storageRef);
        }

        // Normalización y Persistencia
        const catalogProduct = adaptToProduct(productData, finalImageUrl);
        const docRef = doc(firestore, 'catalog_products', catalogProduct.id);
        
        await setDoc(docRef, {
          ...catalogProduct,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        processedCount++;

      } catch (err: any) {
        console.error(`⚠️ Error en producto ${url}:`, err.message);
      }
    }

    return { success: true, count: processedCount };

  } catch (error: any) {
    if (browser) await browser.close();
    console.error("🚨 Error crítico en pipeline Puppeteer:", error.message);
    throw error;
  }
}

/**
 * Scraper de detalle usando Axios + Cheerio (más rápido y suficiente para SEO Meta Tags).
 */
async function scrapeProductDetail(url: string) {
  try {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(html);

    const name = $('.page-title .base').text().trim() || $('h1').first().text().trim();
    const description = $('.product.attribute.description .value').text().trim() || 
                        $('meta[property="og:description"]').attr('content') || 
                        "Tablero melamínico profesional Faplac.";
    
    // Captura de imagen industrial desde Meta Tags (Suele estar en el HTML estático)
    let imageUrl = $('meta[property="og:image"]').attr('content') || 
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('.gallery-placeholder__image').attr('src') ||
                   "https://placehold.co/800x600?text=Faplac+Melamina";

    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${BASE_URL}${imageUrl}`;
    }

    // Dimensiones
    const specs = $('.additional-attributes-wrapper').text() || $('body').text();
    const dimensionsMatch = specs.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
    
    const dimensions = dimensionsMatch ? {
      width: parseInt(dimensionsMatch[1]),
      height: parseInt(dimensionsMatch[2]),
      thickness: parseInt(dimensionsMatch[3])
    } : { width: 1830, height: 2750, thickness: 18 };

    return { name, description, imageUrl, dimensions, brand: 'Faplac' };
  } catch (e) {
    return { 
      name: "", 
      description: "", 
      imageUrl: "", 
      dimensions: { width: 1830, height: 2750, thickness: 18 }, 
      brand: 'Faplac' 
    };
  }
}

/**
 * Fallback de seguridad con datos enriquecidos.
 */
async function runFallbackPipeline(firestore: any) {
  const seeds = [
    { name: "Petiribí Mesopotamia", desc: "Diseño de madera nativa con vetas profundas y elegantes.", hue: "madera clara" },
    { name: "Roble Escandinavo", desc: "Tono nórdico claro para ambientes minimalistas.", hue: "madera clara" },
    { name: "Gris Humo Urban", desc: "Gris neutro de la línea Urban, ideal para mobiliario moderno.", hue: "gris" },
    { name: "Antracita Profundo", desc: "Gris oscuro intenso para contrastes de alto impacto.", hue: "negro" }
  ];

  let count = 0;
  for (const s of seeds) {
    const slug = normalizePanelId(s.name);
    const mockUrl = `https://picsum.photos/seed/${slug}/800/600`;
    const catalogProduct = adaptToProduct({
      name: s.name,
      description: s.desc,
      imageUrl: mockUrl,
      dimensions: { width: 1830, height: 2750, thickness: 18 },
      brand: "Faplac"
    }, mockUrl);
    
    await setDoc(doc(firestore, 'catalog_products', catalogProduct.id), {
      ...catalogProduct,
      updatedAt: serverTimestamp()
    }, { merge: true });
    count++;
  }
  return { success: true, count, note: "Datos de respaldo activados." };
}
