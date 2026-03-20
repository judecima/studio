import axios from 'axios';
import * as cheerio from 'cheerio';
import { initializeFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, getStorage, listAll } from 'firebase/storage';
import { doc, setDoc, getFirestore, collection, getDocs } from 'firebase/firestore';
import { normalizePanelId, adaptToProduct } from '../catalog-engine/catalog.adapter';

/**
 * @fileOverview Pipeline robusto de scraping y persistencia en Firebase.
 */

const BASE_URL = 'https://www.faplaconline.com.ar';
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas?p=1`;

export async function runIndustrialPipeline() {
  const { firebaseApp, firestore } = initializeFirebase();
  const storage = getStorage(firebaseApp);
  
  console.log("🏁 Iniciando Pipeline Industrial...");
  
  try {
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000
    });

    const $ = cheerio.load(html);
    const productLinks = $('.product-item-link, .item.product.product-item a').map((_, el) => $(el).attr('href')).get();
    const uniqueLinks = Array.from(new Set(productLinks)).slice(0, 50);

    let processedCount = 0;

    for (const link of uniqueLinks) {
      const url = link.startsWith('http') ? link : `${BASE_URL}${link}`;
      try {
        const productData = await scrapeProductDetail(url);
        if (!productData.imageUrl) continue;

        const slug = normalizePanelId(productData.name);
        const fileName = `faplac-${slug}.jpg`;
        const storagePath = `products/faplac/${fileName}`;
        
        // 1. Manejo de Imagen en Storage
        const storageRef = ref(storage, storagePath);
        let finalImageUrl = "";

        try {
          finalImageUrl = await getDownloadURL(storageRef);
          console.log(`♻️ Reutilizando imagen para: ${productData.name}`);
        } catch (e) {
          console.log(`📥 Descargando y subiendo imagen: ${productData.name}`);
          const imageResponse = await axios.get(productData.imageUrl, { responseType: 'arraybuffer' });
          await uploadBytes(storageRef, imageResponse.data, { contentType: 'image/jpeg' });
          finalImageUrl = await getDownloadURL(storageRef);
        }

        // 2. Persistencia en Firestore
        const catalogProduct = adaptToProduct(productData, finalImageUrl);
        const docRef = doc(firestore, 'catalog_products', catalogProduct.id);
        
        await setDoc(docRef, catalogProduct, { merge: true });
        processedCount++;
        console.log(`✅ Sincronizado: ${catalogProduct.name}`);

      } catch (err) {
        console.error(`⚠️ Error procesando link ${url}:`, err);
      }
    }

    return { success: true, count: processedCount };
  } catch (error: any) {
    console.error("🚨 Error crítico en pipeline:", error);
    throw error;
  }
}

async function scrapeProductDetail(url: string) {
  const { data: html } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(html);

  const name = $('.page-title .base').text().trim() || $('h1').first().text().trim();
  const description = $('.product.attribute.description .value').text().trim() || $('.description').text().trim();
  const imageUrl = $('meta[property="og:image"]').attr('content') || 
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('.gallery-placeholder__image').attr('src');

  const measuresMatch = $('body').text().match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  const dimensions = measuresMatch ? {
    width: parseInt(measuresMatch[1]),
    height: parseInt(measuresMatch[2]),
    thickness: parseInt(measuresMatch[3])
  } : { width: 1830, height: 2750, thickness: 18 };

  return { name, description, imageUrl, dimensions, url };
}
