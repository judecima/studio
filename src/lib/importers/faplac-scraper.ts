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

export async function runIndustrialPipeline() {
  const { firestore } = initializeFirebase();
  console.log("🚀 Iniciando Pipeline Industrial Faplac (con login y especificaciones completas)...");
  let browser: any = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);

    // --- Login con el formulario real ---
    console.log("🔐 Iniciando sesión en Faplac...");
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('input[name="j_username"]', { timeout: 15000 });
    await page.waitForSelector('input[name="j_password"]', { timeout: 15000 });

    await page.type('input[name="j_username"]', process.env.FAPLAC_USERNAME!);
    await page.type('input[name="j_password"]', process.env.FAPLAC_PASSWORD!);

    const csrfToken = await page.$eval('input[name="CSRFToken"]', (el: any) => el.value);
    console.log(`🔑 CSRF Token obtenido: ${csrfToken ? 'OK' : 'MISSING'}`);

    await page.evaluate((csrf) => {
      const form = document.querySelector('#loginDropDownForm') as HTMLFormElement;
      if (form) {
        const csrfInput = form.querySelector('input[name="CSRFToken"]') as HTMLInputElement;
        if (csrfInput) csrfInput.value = csrf;
        form.submit();
      }
    }, csrfToken);

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log("✅ Sesión iniciada correctamente.");

    // --- Recolectar enlaces de productos ---
    const allProductLinks = new Set<string>();
    const targetPages = [
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=1`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=2`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=3`
    ];

    for (const pageUrl of targetPages) {
      console.log(`📄 Explorando: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.evaluate(() => {
        window.scrollBy(0, document.body.scrollHeight / 2);
        setTimeout(() => window.scrollBy(0, document.body.scrollHeight), 1000);
      });
      await delay(2000);

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href.includes('/home/p/'))
          .map(href => href.split('?')[0]);
      });
      links.forEach(link => allProductLinks.add(link));
    }

    console.log(`✅ Encontrados ${allProductLinks.size} enlaces únicos.`);

    // --- Procesar cada producto ---
    const productLinks = Array.from(allProductLinks);
    let processedCount = 0;
    const localDir = path.join(process.cwd(), 'public', 'images', 'faplac');
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

    const chunkSize = 5;
    for (let i = 0; i < productLinks.length; i += chunkSize) {
      const chunk = productLinks.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (url) => {
        try {
          const detailPage = await browser.newPage();
          await detailPage.setUserAgent(HEADERS['User-Agent']);
          await detailPage.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

          const productData = await detailPage.evaluate(() => {
            // --- Obtener el código desde la URL ---
            const pathname = window.location.pathname; // ej: "/home/p/gris-caliza-215MESMDF18"
            const urlCode = pathname.split('/').pop() || ''; // "gris-caliza-215MESMDF18"

            // --- Descripción (color-09) ---
            const descEl = document.querySelector('.description.color-09');
            const description = descEl ? descEl.textContent?.trim() : '';

            // --- Detalles de producto (tab-details) ---
            const detailsEl = document.querySelector('.tab-details');
            let details = '';
            if (detailsEl) {
              const paragraphs = detailsEl.querySelectorAll('p');
              details = Array.from(paragraphs).map(p => p.textContent?.trim()).filter(Boolean).join('\n');
            }

            // --- Aplicaciones (USO Y APLICACIONES) ---
            let applications: string[] = [];
            const appHeading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent?.includes('USO Y APLICACIONES'));
            if (appHeading && appHeading.parentElement) {
              const appDiv = appHeading.parentElement.querySelector('.description');
              if (appDiv) {
                const text = appDiv.textContent?.trim() || '';
                applications = text.includes(',')
                  ? text.split(',').map(s => s.trim()).filter(Boolean)
                  : [text].filter(Boolean);
              }
            }

            // --- Especificaciones (tabla) ---
            const specs: Record<string, string> = {};
            const specTable = document.querySelector('.product-classifications table');
            if (specTable) {
              const rows = specTable.querySelectorAll('tbody tr');
              for (const row of rows) {
                const labelCell = row.querySelector('td.attrib');
                const valueCell = row.querySelector('td:not(.attrib)');
                if (labelCell && valueCell) {
                  const label = labelCell.textContent?.trim().replace(/[*:]/, '');
                  const value = valueCell.textContent?.trim();
                  if (label && value) specs[label] = value;
                }
              }
            }

            // --- Imagen ---
            let imageUrl = document.querySelector('img.gallery-placeholder__image, img.img-responsive.m-center')?.getAttribute('src') || '';
            if (imageUrl && imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
            if (imageUrl && !imageUrl.startsWith('http')) imageUrl = `${window.location.origin}${imageUrl}`;

            // --- Nombre desde campo oculto ---
            const nameInput = document.querySelector('input.js-product-name') as HTMLInputElement;
            const name = nameInput ? nameInput.value.trim() : '';
            const fallbackName = document.querySelector('h1.page-title span, h1.name')?.textContent?.trim() || '';
            const finalName = name || fallbackName;

            const sku = document.querySelector('.product.attribute.sku .value, .sku')?.textContent?.trim() || '';

            // --- Dimensiones ---
            let width = 1830, height = 2750, thickness = 18;
            const dimensionsRaw = specs['Medidas'] || '';
            if (dimensionsRaw) {
              const dimMatch = dimensionsRaw.match(/(\d+)\s*x\s*(\d+)/i);
              if (dimMatch) {
                width = parseInt(dimMatch[1], 10);
                height = parseInt(dimMatch[2], 10);
              }
            }
            const thicknessRaw = specs['Espesor'] || '';
            if (thicknessRaw) {
              const thickMatch = thicknessRaw.match(/(\d+)/);
              if (thickMatch) thickness = parseInt(thickMatch[1], 10);
            }

            // --- Acabado ---
            const texture = specs['Textura'] || '';
            const finishText = (description + ' ' + texture).toLowerCase();
            const isSmooth = finishText.includes('mate') || finishText.includes('liso') || texture.toLowerCase().includes('mate');
            const antiFingerprint = finishText.includes('anti-huella') || finishText.includes('soft touch');
            const hasGrain = !finishText.includes('unícolor') && !name.toLowerCase().includes('blanco') && (finishText.includes('veta') || finishText.includes('madera'));

            return {
              name: finalName,
              urlCode,            // ← código extraído de la URL
              sku,
              description,
              details,
              applications,
              brand: specs['Marca'] || 'Faplac',
              productType: specs['Producto'] || '',
              design: specs['Diseño'] || '',
              texture,
              line: specs['Línea del Catálogo'] || '',
              width,
              height,
              thickness,
              substrate: specs['Sustratos'] || '',
              imageUrl,
              isSmooth,
              antiFingerprint,
              hasGrain,
            };
          });

          if (!productData.name || !productData.imageUrl) return;

          const slug = normalizePanelId(productData.name);
          const localFile = path.join(localDir, `${slug}.jpg`);
          const finalImageUrl = `/images/faplac/${slug}.jpg`;

          try {
            if (!fs.existsSync(localFile)) {
              const imageResponse = await axios.get(productData.imageUrl, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: HEADERS
              });
              fs.writeFileSync(localFile, imageResponse.data);
            }
          } catch (e) {
            console.error(`⚠️ No se pudo guardar imagen para ${slug}`);
          }

          // Clasificación de color (usando nombre + descripción)
          const combinedText = (productData.name + ' ' + productData.description).toLowerCase();
          const hueMap: Record<string, string> = {
            'rojo': 'rojo', 'bordo': 'rojo', 'blanco': 'blanco', 'marfil': 'blanco',
            'negro': 'negro', 'grafito': 'negro', 'gris': 'gris', 'cemento': 'gris',
            'beige': 'beige', 'arena': 'beige', 'marron': 'marron', 'nogal': 'marron'
          };
          let materialHue = 'otros';
          for (const [key, val] of Object.entries(hueMap)) {
            if (combinedText.includes(key)) {
              materialHue = val; break;
            }
          }
          const isDark = combinedText.match(/(negro|oscuro|tabaco|notte)/);
          const isLight = combinedText.match(/(blanco|claro|nieve|crema|marfil)/);

          const panelDoc = {
            id: slug,
            name: productData.name,
            brand: productData.brand,
            line: productData.line,
            productType: productData.productType,
            design: productData.design,
            substrate: productData.substrate,
            width: productData.width,
            height: productData.height,
            thickness: productData.thickness,
            description: productData.description,
            details: productData.details,
            applications: productData.applications,
            stock: 0,
            images: [finalImageUrl],
            mainImage: finalImageUrl,
            visible: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            colorGroup: isDark ? 'oscuro' : isLight ? 'claro' : 'medio',
            colorHue: materialHue,
            styleTags: ['moderno', 'industrial'],
            useCases: ['cocina', 'placard', 'oficina'],
            code: productData.urlCode,                     // ← ahora se usa el código de URL
            surfaceTexture: productData.texture,
            isSmooth: productData.isSmooth,
            antiFingerprint: productData.antiFingerprint,
            finish: productData.isSmooth ? 'mate' : 'brillo',
            hasGrain: productData.hasGrain,
          };

          await setDoc(doc(firestore, 'panels', slug), panelDoc, { merge: true });
          processedCount++;
        } catch (err: any) {
          console.error(`⚠️ Error en ${url}:`, err.message);
        }
      }));
    }

    await browser.close();
    console.log(`✅ Procesamiento finalizado. Paneles actualizados: ${processedCount}`);
    return { success: true, count: processedCount };

  } catch (error: any) {
    if (browser) await browser.close();
    console.error("❌ Falló el scraper:", error.message);
    return { success: true, count: 0, note: "Error en scraping." };
  }
}