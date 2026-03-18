
'use server';

/**
 * @fileOverview Scraper profesional para Faplac usando Puppeteer.
 * Enriquece los datos base con imágenes, descripciones y medidas reales.
 */

import puppeteer from 'puppeteer';

const BASE_URL = "https://www.faplaconline.com.ar/home/c/ar-faplac";

/**
 * Scrapea el catálogo de Faplac para obtener URLs de detalle de productos.
 */
export async function scrapeFaplacCatalog() {
  console.log("🔵 Iniciando Puppeteer Scraper...");
  
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // Auto Scroll para cargar todos los productos (lazy loading)
    await autoScroll(page);
    
    const products = await page.evaluate(() => {
      const items = document.querySelectorAll('.product-item, .item-product');
      return Array.from(items).map(item => {
        const name = item.querySelector('.product-item-name, .title')?.textContent?.trim() || "";
        const link = item.querySelector('a')?.getAttribute('href') || "";
        const img = item.querySelector('img')?.getAttribute('src') || "";
        return { name, link, img };
      });
    });

    console.log(`✅ Se encontraron ${products.length} productos en el listado.`);
    
    // Enriquecimiento (limitado a los primeros 20 para esta demostración de servidor)
    const enrichedResults = [];
    for (const prod of products.slice(0, 20)) {
      try {
        const detailUrl = prod.link.startsWith('http') ? prod.link : `https://www.faplaconline.com.ar${prod.link}`;
        const detailData = await scrapeProductDetail(page, detailUrl);
        enrichedResults.push({
          ...prod,
          ...detailData
        });
        console.log(`🔍 Enriquecido: ${prod.name}`);
      } catch (e) {
        console.error(`❌ Error en detalle de ${prod.name}:`, e);
      }
    }

    return enrichedResults;
  } finally {
    await browser.close();
  }
}

async function scrapeProductDetail(page: any, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  return await page.evaluate(() => {
    const description = document.querySelector('.description, .product-info-main .value')?.textContent?.trim() || "";
    const bodyText = document.body.innerText;
    
    // Extracción de imágenes adicionales
    const galleryImages = Array.from(document.querySelectorAll('.gallery-placeholder img, .fotorama__img'))
      .map(img => img.getAttribute('src'))
      .filter(src => !!src);

    return {
      description,
      bodyText,
      galleryImages
    };
  });
}

async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

export function parseMeasures(text: string) {
  const match = text.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  if (!match) return null;

  return {
    width: Number(match[1]),
    height: Number(match[2]),
    thickness: Number(match[3]),
  };
}
