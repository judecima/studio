'use server';

/**
 * @fileOverview Scraper Robusto para Faplac con captura de imágenes reales.
 * Utiliza Axios y Cheerio para navegar de forma recursiva.
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
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': BASE_URL
      }
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
  console.log("🔵 Iniciando captura profunda de imágenes reales del catálogo...");
  
  const enrichedResults = [];
  
  try {
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    
    const $ = cheerio.load(html);
    // Selectores para los productos en la lista
    const productItems = $('.product-item-info, .product-item, .item');
    
    console.log(`✅ Se detectaron ${productItems.length} productos en la lista del catálogo.`);

    // Limitamos a los primeros 25 para evitar timeouts excesivos y problemas de memoria con Base64
    for (let i = 0; i < Math.min(productItems.length, 25); i++) {
      const el = productItems.eq(i);
      const name = el.find('.product-item-name, .title, h2').text().trim();
      const relativeLink = el.find('a').attr('href') || "";
      
      if (!name || !relativeLink) continue;

      const detailUrl = relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`;
      
      try {
        console.log(`🔎 [${i+1}/${Math.min(productItems.length, 25)}] Navegando al detalle: ${name}`);
        const detailData = await scrapeProductDetail(detailUrl);
        
        // Priorizar la imagen encontrada en el detalle (suele ser de mayor calidad)
        let imgUrlToDownload = detailData.detailImgUrl;
        
        // Si no hay imagen en detalle, intentar la de la lista (catalog)
        if (!imgUrlToDownload) {
          imgUrlToDownload = el.find('img').attr('data-src') || el.find('img').attr('src') || "";
        }

        // Normalizar URL
        if (imgUrlToDownload && imgUrlToDownload.startsWith('//')) {
          imgUrlToDownload = `https:${imgUrlToDownload}`;
        } else if (imgUrlToDownload && !imgUrlToDownload.startsWith('http')) {
          imgUrlToDownload = `${BASE_URL}${imgUrlToDownload}`;
        }
        
        // Descargar la imagen real y convertirla a Base64
        const base64Image = imgUrlToDownload ? await fetchImageAsBase64(imgUrlToDownload) : "";
        
        enrichedResults.push({
          name,
          img: base64Image,
          originalUrl: imgUrlToDownload,
          ...detailData
        });
        
        if (base64Image) {
          console.log(`✅ Imagen real (Base64) capturada con éxito para: ${name}`);
        } else {
          console.log(`⚠️ No se pudo capturar imagen real para: ${name}`);
        }
      } catch (e) {
        console.error(`⚠️ Falló la extracción del detalle de ${name}:`, e);
      }
    }

    return enrichedResults;
  } catch (error: any) {
    console.error("🚨 Error crítico en scraping de Faplac:", error.message);
    throw error;
  }
}

/**
 * Scrapea la página de detalle de un producto específico.
 */
async function scrapeProductDetail(url: string) {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 10000
    });
    
    const $$ = cheerio.load(html);
    
    // 1. Extraer Imagen de alta resolución del detalle
    // Faplac suele usar un esquema de galería que inyecta la imagen en un placeholder o meta tag
    let detailImgUrl = $$('meta[property="og:image"]').attr('content') || 
                       $$('.gallery-placeholder__image').attr('src') ||
                       $$('.product.media img').attr('src') || 
                       $$('.fotorama__img').attr('src') || "";

    // 2. Extraer Descripción
    const description = $$('.description, .product-info-main .value, .product.attribute.description').text().trim();
    const bodyText = $$('body').text();

    // 3. Extraer Medidas (regex robusta para encontrar patrones como 1830 x 2750 x 18)
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
      detailImgUrl
    };
  } catch (err) {
    console.error(`Error scrapeando detalle en ${url}:`, err);
    return {
      description: "Información no disponible.",
      width: 1830,
      height: 2750,
      thickness: 18,
      bodyText: "",
      detailImgUrl: ""
    };
  }
}
