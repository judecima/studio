'use server';

/**
 * @fileOverview Scraper Robusto para Faplac con captura de imágenes reales.
 * Utiliza Axios y Cheerio para navegar de forma recursiva y capturar fotos industriales.
 * Optimizado para la sección de Melaminas: https://www.faplaconline.com.ar/home/c/ar-faplac/ar-melaminas
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = "https://www.faplaconline.com.ar";
// URL específica sugerida por el usuario para Melaminas
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas`;

/**
 * Convierte una URL de imagen a un Data URI Base64 real.
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) {
    if (url.startsWith('//')) url = `https:${url}`;
    else if (url.startsWith('/')) url = `${BASE_URL}${url}`;
    else return "";
  }
  
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': BASE_URL
      }
    });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error: any) {
    console.error(`⚠️ Error al descargar imagen: ${url} - ${error.message}`);
    return "";
  }
}

/**
 * Scrapea el catálogo de Faplac extrayendo imágenes reales y datos técnicos.
 */
export async function scrapeFaplacCatalog() {
  console.log(`🔵 Iniciando captura profunda en: ${CATALOG_URL}`);
  
  const enrichedResults = [];
  
  try {
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    
    const $ = cheerio.load(html);
    // Selectores actualizados para el grid de productos de Faplac
    const productItems = $('.product-item, .item.product.product-item, .product-item-info');
    
    console.log(`✅ Se detectaron ${productItems.length} productos en el catálogo de melaminas.`);

    // Procesamos un lote representativo
    const limit = 40; 
    for (let i = 0; i < Math.min(productItems.length, limit); i++) {
      const el = productItems.eq(i);
      const name = el.find('.product-item-name a, .product-item-link, .name').text().trim();
      const relativeLink = el.find('a.product-item-link, .product-item-photo a, a').attr('href') || "";
      
      if (!name || !relativeLink) continue;

      const detailUrl = relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`;
      
      try {
        console.log(`🔎 [${i+1}/${limit}] Capturando detalle: ${name}`);
        const detailData = await scrapeProductDetail(detailUrl);
        
        let imgUrlToDownload = detailData.detailImgUrl;
        
        // Descargar la imagen real y convertirla a Base64
        const base64Image = imgUrlToDownload ? await fetchImageAsBase64(imgUrlToDownload) : "";
        
        enrichedResults.push({
          name,
          img: base64Image,
          originalUrl: imgUrlToDownload,
          ...detailData
        });
        
        if (base64Image) {
          console.log(`✅ Foto industrial capturada para: ${name}`);
        }
      } catch (e) {
        console.error(`⚠️ Falló el detalle de ${name}:`, e);
      }
    }

    return enrichedResults;
  } catch (error: any) {
    console.error("🚨 Error crítico en scraping:", error.message);
    throw error;
  }
}

/**
 * Scrapea la página de detalle de un producto específico para obtener la imagen real.
 */
async function scrapeProductDetail(url: string) {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 15000
    });
    
    const $$ = cheerio.load(html);
    
    // Selectores de imagen prioritarios para Faplac
    const detailImgUrl = $$('meta[property="og:image"]').attr('content') || 
                         $$('meta[name="twitter:image"]').attr('content') ||
                         $$('.gallery-placeholder__image').attr('src') ||
                         $$('.product.media img.fotorama__img').attr('src') ||
                         $$('.magnifier-image').attr('src') || "";

    const description = $$('.product.attribute.description .value, .description, .product-info-main .value').text().trim();
    const bodyText = $$('body').text();

    // Mejora del regex para medidas
    const measuresMatch = bodyText.match(/(\d{4})\s*x\s*(\d{4})\s*x\s*(\d+)/i) || bodyText.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
    let width = 1830;
    let height = 2750;
    let thickness = 18;

    if (measuresMatch) {
      width = Number(measuresMatch[1]);
      height = Number(measuresMatch[2]);
      thickness = Number(measuresMatch[3]);
    }
    
    return {
      description: description || "Tablero melamínico de alta gama para proyectos de arquitectura e interiorismo.",
      width,
      height,
      thickness,
      bodyText,
      detailImgUrl
    };
  } catch (err) {
    return {
      description: "Información técnica en proceso de actualización.",
      width: 1830,
      height: 2750,
      thickness: 18,
      bodyText: "",
      detailImgUrl: ""
    };
  }
}