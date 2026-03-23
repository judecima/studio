import axios from 'axios';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId } from '../catalog-engine/catalog.adapter';

const BASE_URL = 'https://www.faplaconline.com.ar';
const LOGIN_URL = `${BASE_URL}/home/login`;
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas?p=1`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🔥 Faplac Industrial Scraper v6.8: Ultra-Fast Opt & High Res (1200H)
 */
export async function runIndustrialPipeline() {
  const { firestore } = initializeFirebase();
  console.log("🚀 Iniciando Pipeline Faplac v6.8 (Ultra-Fast 1200H)...");
  let browser: any = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);

    // --- Bloquear recursos no esenciales para acelerar la carga ---
    await page.setRequestInterception(true);
    page.on('request', (request: any) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'websocket', 'manifest'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // --- Login ---
    console.log("🔐 Autenticando en portal Faplac...");
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[name="j_username"]', { timeout: 15000 });
    await page.type('input[name="j_username"]', process.env.FAPLAC_USERNAME || '');
    await page.type('input[name="j_password"]', process.env.FAPLAC_PASSWORD || '');

    const csrfToken = await page.$eval('input[name="CSRFToken"]', (el: any) => el.value);

    await page.evaluate((csrf) => {
      const form = document.querySelector('#loginDropDownForm') as HTMLFormElement;
      if (form) {
        (form.querySelector('input[name="CSRFToken"]') as HTMLInputElement).value = csrf;
        form.submit();
      }
    }, csrfToken);

    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log("✅ Sesión activa.");

    // --- Recolectar enlaces (Fidelidad v7.4.0 + Scroll Incremental) ---
    const allProductLinks = new Set<string>();
    const targetPages = [
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=1`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=2`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=3`
    ];

    for (const pageUrl of targetPages) {
      console.log(`📄 Explorando: ${pageUrl}`);
      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        
        // 🚀 Scroll Incremental Dinámico (Crucial para Lazy Load)
        for (let s = 0; s < 4; s++) {
          await page.evaluate(() => window.scrollBy(0, 1200));
          await delay(1000); 
        }
        await delay(1000); 

        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href && href.includes('/home/p/'))
            .map(href => href.split('?')[0]);
        });
        
        links.forEach(link => allProductLinks.add(link));
      } catch (e) {
        console.log(`  ⚠️ Timeout explorando página ${pageUrl.split('?').pop()}, continuando...`);
      }
    }

    console.log(`✅ ${allProductLinks.size} productos detectados.`);

    const productLinks = Array.from(allProductLinks);
    let processedCount = 0;
    const localDir = path.join(process.cwd(), 'public', 'images', 'faplac');
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

    const chunkSize = 5;
    for (let i = 0; i < productLinks.length; i += chunkSize) {
      const chunk = productLinks.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (url) => {
        const detailPage = await browser.newPage();
        try {
          await detailPage.setUserAgent(HEADERS['User-Agent']);
          await detailPage.setRequestInterception(true);
          detailPage.on('request', (req: any) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
            else req.continue();
          });

          await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          const productData = await detailPage.evaluate(() => {
            const pathname = window.location.pathname;
            const urlCode = pathname.split('/').pop() || '';
            const descEl = document.querySelector('.description.color-09');
            const description = descEl ? descEl.textContent?.trim() : '';
            const detailsEl = document.querySelector('.tab-details');
            let details = detailsEl ? Array.from(detailsEl.querySelectorAll('p')).map(p => p.textContent?.trim()).join('\n') : '';

            // --- IMAGEN DE ALTA CALIDAD (1200H) ---
            let imageUrl = '';
            const visibleImg = document.querySelector('.imageGallery-h .img-responsive.m-center');
            if (visibleImg) imageUrl = visibleImg.getAttribute('src') || '';
            if (!imageUrl) imageUrl = document.querySelector('img.gallery-placeholder__image')?.getAttribute('src') || '';
            if (!imageUrl) imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
            
            if (imageUrl && imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
            if (imageUrl && !imageUrl.startsWith('http')) imageUrl = `${window.location.origin}${imageUrl}`;

            const nameInput = document.querySelector('input.js-product-name') as HTMLInputElement;
            const finalName = nameInput ? nameInput.value.trim() : (document.querySelector('h1.page-title span, h1.name')?.textContent?.trim() || '');

            const specs: Record<string, string> = {};
            document.querySelectorAll('.product-classifications table tbody tr').forEach(row => {
              const label = row.querySelector('td.attrib')?.textContent?.trim().replace(/[*:]/, '');
              const value = row.querySelector('td:not(.attrib)')?.textContent?.trim();
              if (label && value) specs[label] = value;
            });

            return {
              name: finalName,
              urlCode,
              description,
              details,
              specs,
              imageUrl,
            };
          });

          if (!productData.name || !productData.imageUrl) return;

          const slug = normalizePanelId(productData.name);
          // Detección dinámica de extensión (Faplac suele usar .jpg pero Egger .webp)
          const isWebP = productData.imageUrl.includes('.webp');
          const isPng = productData.imageUrl.includes('.png');
          const ext = isWebP ? 'webp' : (isPng ? 'png' : 'jpg');
          
          const localFile = path.join(localDir, `${slug}.${ext}`);
          const finalImageUrl = `/images/faplac/${slug}.${ext}`;

          // Descarga de Imagen con extensión correcta
          try {
            if (!fs.existsSync(localFile)) {
              const res = await axios.get(productData.imageUrl, { responseType: 'arraybuffer', timeout: 15000, headers: HEADERS });
              fs.writeFileSync(localFile, res.data);
            }
          } catch (e) {
            console.error(`⚠️ Error imagen ${slug}`);
          }

          const panelDoc = {
            id: slug,
            name: productData.name,
            brand: 'Faplac',
            line: productData.specs['Línea del Catálogo'] || '',
            width: productData.specs['Medidas']?.includes('2750') ? 2750 : 1830,
            height: productData.specs['Medidas']?.includes('2750') ? 1830 : 2750,
            thickness: parseInt(productData.specs['Espesor'] || '18'),
            description: productData.description,
            stock: 0,
            mainImage: finalImageUrl,
            images: [finalImageUrl],
            visible: true,
            updatedAt: serverTimestamp(),
            code: productData.urlCode,
            surfaceTexture: productData.specs['Textura'] || 'Mate',
            isSmooth: (productData.name + productData.description).toLowerCase().includes('mate'),
            finish: (productData.name + productData.description).toLowerCase().includes('mate') ? 'mate' : 'brillo',
          };

          await setDoc(doc(firestore, 'panels', slug), panelDoc, { merge: true });
          processedCount++;
        } catch (err) {
          console.error(`⚠️ Timeout en ${url}`);
        } finally {
          await detailPage.close();
        }
      }));
    }

    await browser.close();
    console.log(`✅ Faplac v6.8 finalizado: ${processedCount} actualizados.`);
    return { success: true, count: processedCount };

  } catch (error: any) {
    if (browser) await browser.close();
    console.error("❌ Error Fatal Faplac:", error.message);
    return { success: false };
  }
}