import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const BASE_URL = 'https://www.faplaconline.com.ar';

async function simulateScraping() {
  const outputDir = path.join(process.cwd(), 'scraper-test-images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("🚀 Iniciando Simulación de Scraper (Puppeteer + Imágenes Locales)...");
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36');

  // Navegar a la página 1 usando JS real
  console.log("🌐 Cargando página web interactiva...");
  await page.goto(`${BASE_URL}/home/c/ar-faplac/ar-melaminas?p=1`, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log("⏳ Esperando a que el listado de productos termine de renderizarse...");
  try {
    await page.waitForSelector('.product-item, .product-item-link', { timeout: 15000 });
  } catch (e) {
    console.log("⚠️ No se detectó la grid de productos después de 15 segundos. Puede ser un bloqueo o el catálogo está vacío.");
  }

  console.log("📸 Tomando captura de pantalla para depuración visual...");
  await page.screenshot({ path: path.join(outputDir, 'debug_screenshot.png'), fullPage: true });

  const pageHtml = await page.content();
  fs.writeFileSync(path.join(outputDir, 'debug.html'), pageHtml);
  console.log("📄 HTML de depuración guardado en debug.html");

    const debugProducts = await page.evaluate(() => {
      const allLinks = document.querySelectorAll('a');
      const results: any[] = [];
      allLinks.forEach((a: any) => {
        const cls = typeof a.className === 'string' ? a.className : '';
        if (a.innerText?.toLowerCase().includes('petirib') || a.href?.includes('petiribi') || cls.includes('product')) {
           results.push({ text: a.innerText, href: a.href, className: a.className });
        }
      });
      return results;
    });
    console.log("🕵️  Debug info de enlaces encontrados:", JSON.stringify(debugProducts, null, 2));

    const productLinks = await page.evaluate(() => {
      const links = new Set<string>();
      // Intentamos capturar cualquier cosa que parezca un producto basándonos en los enlaces de Faplac
      const allNodes = document.querySelectorAll('a');
      allNodes.forEach((a) => {
         // heuristica mas generica
         if (a.href && a.href.includes('/home/p/')) {
            links.add(a.href.split('?')[0]);
         }
      });
      return Array.from(links);
    });
  console.log(`📦 Enlaces encontrados en la primera página: ${productLinks.length}`);
  
  // Testear los primeros 3 productos para no demorar
  const testLinks = productLinks.slice(0, 3);
  console.log(`🔎 Testeando detalladamente ${testLinks.length} productos...`);

  for (const url of testLinks) {
    console.log(`\nEntrando a: ${url}`);
    
    // Podemos usar Axios para el detalle porque las vistas de producto de Magento suelen tener el HTML server-side
    // o al menos las metaetiquetas que necesitamos, pero probemos también con Puppeteer por las dudas:
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const html = await page.content();
    fs.writeFileSync(path.join(outputDir, 'product.html'), html);
    const $$ = cheerio.load(html);

    let name = $$('h1.name').first().contents().filter(function() {
      return this.type === 'text';
    }).text().trim();
    if (!name) name = $$('.page-title .base').text().trim();
    if (!name) name = $$('h1').first().text().trim();

    const description = $$('.description').first().text().trim() || 
                        $$('.product.attribute.description .value').text().trim() || 
                        $$('meta[name="description"]').attr('content') || "";
    
    let imageUrl = $$('img.img-responsive.m-center').attr('src') ||
                   $$('meta[property="og:image"]').attr('content') || 
                   $$('.gallery-placeholder__image').attr('src') || "";
    
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${BASE_URL}${imageUrl}`;
    }

    const sku = $$('.code.hidden').text().trim() || $$('.product.attribute.sku .value').text().trim() || $$('.sku').text().trim() || "SIN-SKU";
    
    console.log(`🔹 Nombre: ${name}`);
    console.log(`🔹 SKU extraído: ${sku}`);
    console.log(`🔹 Imagen detectada: ${imageUrl || '¡NO SE ENCONTRÓ! '}`);

    if (imageUrl) {
      try {
        console.log(`🖼️ Descargando imagen a carpeta local...`);
        const imgResponse = await axios.get(imageUrl, { 
          responseType: 'arraybuffer',
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const destPath = path.join(outputDir, `${sku}_${safeName}.${ext}`);
        
        fs.writeFileSync(destPath, imgResponse.data);
        console.log(`✅ Imagen guardada: ${destPath}`);
      } catch (imgErr: any) {
        console.error(`❌ Falló la descarga de la imagen: ${imgErr.message}`);
      }
    }
  }

  console.log("\n🛑 Cerrando navegador virtual...");
  await browser.close();
  console.log("🏁 Simulación terminada con éxito. Revisá la carpeta /scraper-test-images.");
}

simulateScraping().catch(console.error);
