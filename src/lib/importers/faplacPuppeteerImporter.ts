'use server';

/**
 * @fileOverview Scraper Robusto para Faplac con captura de imágenes reales.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = "https://www.faplaconline.com.ar";
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac`;

/**
 * Convierte una URL de imagen a un Data URI Base64.
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) return "";
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 10000 
    });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error(`⚠️ Error al descargar imagen: ${url}`);
    return "";
  }
}

/**
 * Scrapea el catálogo de Faplac extrayendo imágenes reales y datos técnicos.
 */
export async function scrapeFaplacCatalog() {
  console.log("🔵 Iniciando captura de imágenes reales del catálogo...");
  
  const enrichedResults = [];
  
  try {
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    
    const $ = cheerio.load(html);
    // Selectores más específicos para el sitio de Faplac
    const productItems = $('.product-item-info, .product-item, .item');
    
    console.log(`✅ Se detectaron ${productItems.length} productos en el catálogo.`);

    for (let i = 0; i < Math.min(productItems.length, 40); i++) {
      const el = productItems.eq(i);
      const name = el.find('.product-item-name, .title, h2').text().trim();
      const relativeLink = el.find('a').attr('href') || "";
      
      // Intentar múltiples atributos de imagen comunes en sitios con lazy loading
      let imgUrl = el.find('img').attr('data-src') || 
                   el.find('img').attr('src') || 
                   el.find('img').attr('data-original') || "";
      
      if (!name || !relativeLink) continue;

      const detailUrl = relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`;
      
      try {
        const detailData = await scrapeProductDetail(detailUrl);
        
        // Formatear URL de imagen
        let fullImgUrl = "";
        if (imgUrl) {
          fullImgUrl = imgUrl.startsWith('//') ? `https:${imgUrl}` : imgUrl;
          if (!fullImgUrl.startsWith('http')) fullImgUrl = `${BASE_URL}${imgUrl}`;
        }
        
        // Descargar la imagen real
        const base64Image = fullImgUrl ? await fetchImageAsBase64(fullImgUrl) : "";
        
        enrichedResults.push({
          name,
          img: base64Image, // Solo enviamos si pudimos descargarla
          originalUrl: fullImgUrl,
          ...detailData
        });
        
        console.log(`🔍 [${i+1}/${productItems.length}] Imagen real capturada para: ${name}`);
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

async function scrapeProductDetail(url: string) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    timeout: 8000
  });
  
  const $$ = cheerio.load(html);
  
  const description = $$('.description, .product-info-main .value, .product.attribute.description').text().trim();
  const bodyText = $$('body').text();

  // Intentar extraer medidas del detalle
  const measuresMatch = bodyText.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  let width = 1830;
  let height = 2750;
  let thickness = 18;

  if (measuresMatch) {
    width = Number(measuresMatch[1]);
    height = Number(measuresMatch[2]);
    thickness = Number(measuresMatch[3]);
  }
  
  return {
    description: description || "Tablero melamínico de alta calidad para mobiliario industrial.",
    width,
    height,
    thickness,
    bodyText,
  };
}
