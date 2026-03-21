import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId } from '../catalog-engine/catalog.adapter';

const BASE_URL = 'https://www.egger.com';
const START_URL = 'https://www.egger.com/es/mobiliario-e-interiorismo/?country=CL';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

export async function runEggerPipeline() {
  const { firestore } = initializeFirebase();
  console.log("🚀 Iniciando Pipeline Egger Latam...");
  let browser: any = null;
  
  try {
    const allProductLinks = new Set<string>();

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    await page.setExtraHTTPHeaders({
       'Accept-Language': 'es-ES,es;q=0.9',
    });

    console.log(`📡 Navegando a Catálogo Egger: ${START_URL}`);
    try {
      await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
      console.log(`⚠️ Advertencia: Timeout al cargar Egger (ignorable si el DOM cargó).`);
    }

    // Esperar a que la página asiente scripts básicos
    await new Promise(r => setTimeout(r, 5000));

    // Handle Cookie Banner if present
    try {
      await page.evaluate(() => {
        const acceptBtn = document.querySelector('#onetrust-accept-btn-handler') as HTMLElement;
        if (acceptBtn) acceptBtn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
    } catch(e) {}

    console.log(`Buscando botones de "Mostrar más"...`);
    
    let hasMore = true;
    let attempts = 0;
    while (hasMore && attempts < 25) { // Seguridad contra loops infinitos
      hasMore = await page.evaluate(() => {
        let clicked = false;
        const buttons = document.querySelectorAll('button, a, .js-load-more');
        for (const btn of Array.from(buttons)) {
          const text = (btn.textContent || '').trim().toLowerCase();
          const className = (btn.className || '').toLowerCase();
          
          if (
            (text.includes('mostrar más') || text.includes('load more') || text.includes('cargar más') || text.includes('mostrar mas')) || 
            (className.includes('load-more') || className.includes('show-more'))
          ) {
             const htmlBtn = btn as HTMLElement;
             if (htmlBtn.offsetParent !== null && !htmlBtn.hasAttribute('disabled')) { 
               htmlBtn.click();
               clicked = true;
               break;
             }
          }
        }
        return clicked;
      });

      if (hasMore) {
        console.log(`Click en Mostrar Más (Scroll ${attempts + 1})...`);
        await new Promise(r => setTimeout(r, 3500)); // Wait for AJAX elements to render
        await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
        attempts++;
      }
    }

    // Scroll sweep again to load images
    await page.evaluate(async () => {
       window.scrollBy(0, document.body.scrollHeight / 2);
       await new Promise(r => setTimeout(r, 1000));
       window.scrollBy(0, document.body.scrollHeight);
    });

    // Recolectar Links
    const linksOnPage = await page.evaluate(() => {
      const links = new Set<string>();
      const allNodes = document.querySelectorAll('a');
      allNodes.forEach((a: any) => {
         // Typical Egger product path: /es/mobiliario-e-interiorismo/product-detail/...
         if (a.href && (a.href.includes('/product-detail/') || a.href.includes('/p/'))) {
            links.add(a.href.split('?')[0].split('#')[0]);
         }
      });
      return Array.from(links);
    });

    linksOnPage.forEach((link: string) => {
      if (!link.startsWith('http')) link = `${BASE_URL}${link}`;
      allProductLinks.add(link);
    });

    const productLinks = Array.from(allProductLinks);
    console.log(`✅ Encontrados ${productLinks.length} enlaces únicos de Egger tras exprimir la paginación.`);

    let processedCount = 0;
    const chunkSize = 5;
    
    for (let i = 0; i < productLinks.length; i += chunkSize) {
      const chunk = productLinks.slice(i, i + chunkSize);
      
      await Promise.all(chunk.map(async (url) => {
        try {
          const detailPage = await browser.newPage();
          await detailPage.setUserAgent(HEADERS['User-Agent']);
          await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          const html = await detailPage.content();
          await detailPage.close();

          const productData = scrapeProductDetailFromHtml(url, html);
          if (!productData.name) return;

          const slug = normalizePanelId(`Egger ${productData.sku || productData.name}`);
          
          let finalImageUrl = productData.imageUrl;
          if (finalImageUrl) {
            const localDir = path.join(process.cwd(), 'public', 'images', 'egger');
            const localFilePath = path.join(localDir, `${slug}.jpg`);
            finalImageUrl = `/images/egger/${slug}.jpg`;
            
            try {
              if (!fs.existsSync(localFilePath)) {
                if (!fs.existsSync(localDir)) {
                  fs.mkdirSync(localDir, { recursive: true });
                }
                const imageResponse = await axios.get(productData.imageUrl, { 
                  responseType: 'arraybuffer',
                  timeout: 20000,
                  headers: Object.assign({}, HEADERS, { Referer: url })
                });
                fs.writeFileSync(localFilePath, imageResponse.data);
              }
            } catch (e) {
              console.error(`⚠️ Fallo imagen local para ${slug}`);
              finalImageUrl = productData.imageUrl; // fallback to remote
            }
          }

          // Adaptar a Panel Firestore
          const hueMap: Record<string, string> = { 
             'rojo': 'rojo', 'bordo': 'rojo', 'blanco': 'blanco', 'marfil': 'blanco', 
             'negro': 'negro', 'grafito': 'negro', 'gris': 'gris', 'cemento': 'gris', 
             'beige': 'beige', 'arena': 'beige', 'marron': 'marron', 'nogal': 'marron',
             'roble': 'madera clara', 'wengue': 'madera oscura', 'haya': 'madera clara'
          };
          
          let materialHue = 'otros';
          for (const [key, val] of Object.entries(hueMap)) {
            if ((productData.name + ' ' + productData.description).toLowerCase().includes(key)) {
               materialHue = val; break;
            }
          }

          const isDark = (productData.name + productData.description).toLowerCase().match(/(negro|oscuro|tabaco|notte|marron|wengue)/);
          const isLight = (productData.name + productData.description).toLowerCase().match(/(blanco|claro|nieve|crema|marfil|roble|haya)/);

          const panelDoc = {
            id: slug,
            name: `${productData.name} ${productData.sku ? `(${productData.sku})` : ''}`.trim(),
            brand: "Egger",
            width: 2800,
            height: 2070,
            thickness: 18,
            hasGrain: !productData.isSmooth,
            description: productData.description || "Tablero melamínico de alta gama - Línea Egger.",
            stock: 100,
            images: finalImageUrl ? [finalImageUrl] : [],
            mainImage: finalImageUrl || '',
            visible: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            colorGroup: isDark ? 'oscuro' : isLight ? 'claro' : 'medio',
            colorHue: materialHue,
            styleTags: ['moderno', 'europeo', 'egger'],
            useCases: ['cocina', 'placard', 'oficina', 'baño']
          };

          await setDoc(doc(firestore, 'panels', panelDoc.id), panelDoc, { merge: true });
          
          processedCount++;
        } catch (err: any) {
          console.error(`⚠️ Error en ${url}:`, err.message);
        }
      }));
    }
    
    await browser.close();
    return { success: true, count: processedCount };

  } catch (error: any) {
    if (browser) await browser.close();
    console.error("❌ Falló completo el scraper Egger.", error.message);
    return { success: false, error: error.message };
  }
}

function scrapeProductDetailFromHtml(url: string, html: string) {
  try {
    const $ = cheerio.load(html);

    let name = $('h1').first().text().trim();
    if (!name) name = $('.product-title').text().trim();
    if (!name) name = $('title').text().split('|')[0].trim();

    const description = $('.product-description').first().text().trim() || 
                        $('meta[name="description"]').attr('content') || "";
    
    // Attempt multiple Egger Image selectors
    let imageUrl = $('.product-image img').attr('src') ||
                   $('meta[property="og:image"]').attr('content') ||
                   $('.main-image img').attr('src') || "";

    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    // SKU Extraction (often H1180 or W1000)
    let sku = '';
    const skuMatch = name.match(/([H|W|U|F]\d{3,4})/i); 
    if (skuMatch) {
      sku = skuMatch[1];
    } else {
      sku = $('.product-sku').text().trim();
    }

    const isSmooth = description.toLowerCase().includes('liso') || description.toLowerCase().includes('st9') || description.toLowerCase().includes('mate');

    return { name, description, imageUrl, sku, isSmooth };
  } catch (e) {
    return { name: "", description: "", imageUrl: "", sku: "", isSmooth: false };
  }
}
