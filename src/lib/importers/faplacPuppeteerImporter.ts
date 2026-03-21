'use server';

/**
 * @fileOverview Scraper Robusto para Faplac con captura de imágenes industriales REALES.
 * Navega de forma recursiva al detalle de cada melamina para extraer la foto de alta calidad.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = "https://www.faplaconline.com.ar";
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas`;

/**
 * Descarga una imagen y la convierte a Data URI Base64.
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
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': BASE_URL
      }
    });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error: any) {
    console.error(`⚠️ Error al capturar imagen real: ${url} - ${error.message}`);
    return "";
  }
}

/**
 * Captura el catálogo de melaminas con navegación recursiva al detalle.
 */
export async function scrapeFaplacCatalog() {
  console.log(`🔵 Iniciando captura de fotos industriales en: ${CATALOG_URL}`);
  
  const enrichedResults = [];
  
  try {
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    
    const $ = cheerio.load(html);
    const productItems = $('.product-item, .item.product.product-item');
    
    console.log(`✅ ${productItems.length} productos detectados para procesamiento profundo.`);

    // Procesamos los primeros 35 productos para asegurar éxito sin timeouts
    const limit = 35; 
    for (let i = 0; i < Math.min(productItems.length, limit); i++) {
      const el = productItems.eq(i);
      const name = el.find('.product-item-name a, .product-item-link').text().trim();
      const relativeLink = el.find('a.product-item-link, .product-item-photo a').attr('href') || "";
      
      if (!name || !relativeLink) continue;

      const detailUrl = relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`;
      
      try {
        console.log(`🔎 [${i+1}/${limit}] Entrando a ficha técnica: ${name}`);
        const detailData = await scrapeProductDetail(detailUrl);
        
        // Convertimos la imagen real a Base64
        const base64Image = detailData.detailImgUrl ? await fetchImageAsBase64(detailData.detailImgUrl) : "";
        
        enrichedResults.push({
          name,
          img: base64Image,
          ...detailData
        });
        
        if (base64Image) {
          console.log(`✅ Foto industrial REAL guardada para: ${name}`);
        }
      } catch (e) {
        console.error(`⚠️ Falló captura de detalle para ${name}`);
      }
    }

    return enrichedResults;
  } catch (error: any) {
    console.error("🚨 Error crítico en motor de captura:", error.message);
    throw error;
  }
}

/**
 * Extrae la imagen industrial de alta resolución y datos técnicos de la ficha del producto.
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
    
    // Selectores de imagen de alta calidad (Priorizamos metadatos og:image para fotos reales)
    const detailImgUrl = $$('img.img-responsive.m-center').attr('src') ||
                         $$('meta[property="og:image"]').attr('content') || 
                         $$('.gallery-placeholder__image').attr('src') || "";

    const description = $$('.description').text().trim() ||
                        $$('.product.attribute.description .value').text().trim() ||
                        $$('meta[name="description"]').attr('content') ||
                        $$('meta[property="og:description"]').attr('content') || "";
                          
    const isSmoothText = $$('.product.attribute.liso').text().toLowerCase() || '';
    const isSmooth = isSmoothText.includes('si') || isSmoothText.includes('true');
    const surfaceTexture = $$('.product.attribute.textura .value').text().trim() || undefined;
    const launchYearText = $$('.product.attribute.lanzamiento .value').text().trim() || '';
    const launchYear = launchYearText ? parseInt(launchYearText) : undefined;
    const launch = !!launchYearText || description.toLowerCase().includes('lanzamiento');
    const sku = $$('.code.hidden').text().trim() || $$('.product.attribute.sku .value').text().trim() || $$('.sku').text().trim() || "";

    // The original function returned width, height, thickness.
    // The new selectors don't provide direct access to these.
    // Keeping the default values or trying to infer from description if possible.
    const bodyText = $$('body').text();
    const measuresMatch = bodyText.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*mm/i);

    return {
      description: description || "Tablero melamínico Faplac. Calidad industrial para mobiliario.",
      width: measuresMatch ? Number(measuresMatch[1]) : 1830,
      height: measuresMatch ? Number(measuresMatch[2]) : 2750,
      thickness: measuresMatch ? Number(measuresMatch[3]) : 18,
      detailImgUrl,
      isSmooth,
      surfaceTexture,
      launchYear,
      launch,
      sku
    };
  } catch (err) {
    return {
      description: "Producto del catálogo Faplac.",
      width: 1830,
      height: 2750,
      thickness: 18,
      detailImgUrl: "",
      isSmooth: false,
      launch: false
    };
  }
}
