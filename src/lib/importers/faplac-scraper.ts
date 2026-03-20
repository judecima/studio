
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { initializeFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId, adaptToProduct } from '../catalog-engine/catalog.adapter';
import { FAPLAC_SEED } from '../seeds/faplacSeed';

/**
 * @fileOverview Scraper Industrial Robusto V7.
 * - Integración total de la Línea Mesopotamia.
 * - Manejo híbrido de Puppeteer para JS y Axios para detalle.
 */

const BASE_URL = 'https://www.faplaconline.com.ar';
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac?p=1`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

export async function runIndustrialPipeline() {
  const { firebaseApp, firestore } = initializeFirebase();
  const storage = getStorage(firebaseApp);
  
  console.log("🚀 Iniciando Pipeline Industrial V7 (Mesopotamia Native Integration)...");
  
  // 1. Cargamos siempre la Línea Mesopotamia como base sólida
  await loadMesopotamiaLine(firestore);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    
    console.log("🌐 Navegando al catálogo dinámico para expansión...");
    await page.goto(CATALOG_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    const productLinks = await page.evaluate(() => {
      const links = new Set<string>();
      const elements = document.querySelectorAll('.product-item-link, .product-item-photo a');
      elements.forEach((el: any) => {
        if (el.href) links.add(el.href.split('?')[0]);
      });
      return Array.from(links);
    });

    console.log(`📦 Enlaces adicionales detectados: ${productLinks.length}`);
    await browser.close();

    let processedCount = 0;
    for (const url of productLinks.slice(0, 40)) {
      try {
        const productData = await scrapeProductDetail(url);
        if (!productData.name || !productData.imageUrl) continue;

        const slug = normalizePanelId(productData.name);
        const storagePath = `products/faplac/${slug}.jpg`;
        const storageRef = ref(storage, storagePath);
        
        let finalImageUrl = "";
        try {
          finalImageUrl = await getDownloadURL(storageRef);
        } catch (e) {
          const imageResponse = await axios.get(productData.imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: HEADERS
          });
          await uploadBytes(storageRef, imageResponse.data, { contentType: 'image/jpeg' });
          finalImageUrl = await getDownloadURL(storageRef);
        }

        const catalogProduct = adaptToProduct(productData, finalImageUrl);
        await setDoc(doc(firestore, 'catalog_products', catalogProduct.id), {
          ...catalogProduct,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        processedCount++;
      } catch (err: any) {
        console.error(`⚠️ Error en ${url}:`, err.message);
      }
    }

    return { success: true, count: processedCount + FAPLAC_SEED.filter(p => p.line === 'Mesopotamia').length };

  } catch (error: any) {
    if (browser) await browser.close();
    console.error("❌ Falló el scraper dinámico, usando base Mesopotamia enriquecida.");
    return { success: true, count: FAPLAC_SEED.filter(p => p.line === 'Mesopotamia').length, note: "Sincronización limitada a Línea Mesopotamia." };
  }
}

async function loadMesopotamiaLine(firestore: any) {
  console.log("📥 Inyectando metadatos oficiales de la Línea Mesopotamia...");
  for (const item of FAPLAC_SEED.filter(p => p.line === 'Mesopotamia')) {
    const slug = normalizePanelId(item.name);
    // Usamos imágenes industriales temáticas para Mesopotamia mientras se capturan las finales
    const mockUrl = `https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80&w=800&h=600&madera=${slug}`;
    
    const catalogProduct = adaptToProduct({
      name: item.name,
      description: item.description,
      brand: item.brand,
      dimensions: { width: item.width, height: item.height, thickness: item.thickness }
    }, mockUrl);
    
    await setDoc(doc(firestore, 'catalog_products', catalogProduct.id), {
      ...catalogProduct,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

async function scrapeProductDetail(url: string) {
  try {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(html);

    const name = $('.page-title .base').text().trim() || $('h1').first().text().trim();
    const description = $('.product.attribute.description .value').text().trim() || 
                        $('meta[property="og:description"]').attr('content') || 
                        "Tablero melamínico de alta calidad.";
    
    let imageUrl = $('meta[property="og:image"]').attr('content') || 
                   $('.gallery-placeholder__image').attr('src') || "";

    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${BASE_URL}${imageUrl}`;
    }

    return { name, description, imageUrl, brand: 'Faplac' };
  } catch (e) {
    return { name: "", description: "", imageUrl: "", brand: 'Faplac' };
  }
}
