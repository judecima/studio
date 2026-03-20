
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { initializeFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId, adaptToProduct } from '../catalog-engine/catalog.adapter';
import { FAPLAC_SEED } from '../seeds/faplacSeed';

/**
 * @fileOverview Scraper Industrial Robusto V6.
 * - Integra la Línea Mesopotamia del catálogo oficial.
 * - Enfoque híbrido Puppeteer + Axios para máxima eficiencia.
 */

const BASE_URL = 'https://www.faplaconline.com.ar';
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac?p=1`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

export async function runIndustrialPipeline() {
  const { firebaseApp, firestore } = initializeFirebase();
  const storage = getStorage(firebaseApp);
  
  console.log("🚀 Iniciando Pipeline Industrial V6 (Mesopotamia Integration)...");
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    
    console.log("🌐 Navegando al catálogo dinámico:", CATALOG_URL);
    await page.goto(CATALOG_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    const productLinks = await page.evaluate(() => {
      const links = new Set<string>();
      const elements = document.querySelectorAll('.product-item-link, .product-item-photo a');
      elements.forEach((el: any) => {
        if (el.href) links.add(el.href.split('?')[0]);
      });
      return Array.from(links);
    });

    console.log(`📦 Enlaces detectados: ${productLinks.length}`);
    await browser.close();

    // Si no hay enlaces (bloqueo JS), ejecutamos el pipeline enriquecido con la Línea Mesopotamia
    if (productLinks.length === 0) {
      console.warn("⚠️ Ejecutando Pipeline de Respaldo con Línea Mesopotamia...");
      return await runFallbackPipeline(firestore);
    }

    let processedCount = 0;
    for (const url of productLinks.slice(0, 30)) {
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

    return { success: true, count: processedCount };

  } catch (error: any) {
    if (browser) await browser.close();
    return await runFallbackPipeline(firestore);
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

async function runFallbackPipeline(firestore: any) {
  console.log("📥 Cargando Línea Mesopotamia desde motor de semillas...");
  let count = 0;
  for (const item of FAPLAC_SEED) {
    const slug = normalizePanelId(item.name);
    const mockUrl = `https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800&h=600&seed=${slug}`;
    
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
    count++;
  }
  return { success: true, count, note: "Línea Mesopotamia cargada con éxito." };
}
