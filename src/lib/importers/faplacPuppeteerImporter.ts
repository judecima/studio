'use server';

/**
 * @fileOverview Scraper Robusto para Faplac.
 * Utiliza Axios y Cheerio para navegar de forma recursiva.
 * Ahora incluye una función para convertir imágenes a Base64 para persistencia en base de datos.
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
      timeout: 5000 
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
 * Scrapea el catálogo de Faplac extrayendo datos base y entrando en cada detalle.
 */
export async function scrapeFaplacCatalog() {
  console.log("🔵 Iniciando Scraper Robusto con Ingestión de Imágenes (Base64)...");
  
  const enrichedResults = [];
  
  try {
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    
    const $ = cheerio.load(html);
    const productItems = $('.product-item, .item-product, .item');
    
    console.log(`✅ Se detectaron ${productItems.length} nodos de productos en el listado.`);

    // Procesar los primeros 30 para evitar saturar el tamaño de los documentos de Firestore
    for (let i = 0; i < Math.min(productItems.length, 30); i++) {
      const el = productItems.eq(i);
      const name = el.find('.product-item-name, .title').text().trim();
      const relativeLink = el.find('a').attr('href') || "";
      let imgUrl = el.find('img').attr('data-src') || el.find('img').attr('src') || "";
      
      if (!name || !relativeLink) continue;

      const detailUrl = relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`;
      
      try {
        const detailData = await scrapeProductDetail(detailUrl);
        
        // Convertir imagen principal a Base64
        const fullImgUrl = imgUrl.startsWith('//') ? `https:${imgUrl}` : imgUrl;
        const base64Image = await fetchImageAsBase64(fullImgUrl);
        
        enrichedResults.push({
          name,
          img: base64Image || fullImgUrl, // Preferir base64, fallback a URL si falla
          ...detailData
        });
        
        console.log(`🔍 [${i+1}/${productItems.length}] Descargado y Enriquecido: ${name}`);
      } catch (e) {
        console.error(`⚠️ Falló el detalle de ${name}:`, e);
      }
    }

    return enrichedResults;
  } catch (error: any) {
    console.error("🚨 Error crítico en scraping robusto:", error.message);
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
  
  return {
    description: description || "Tablero melamínico de alta calidad para mobiliario industrial.",
    bodyText,
  };
}

export async function parseMeasures(text: string) {
  const match = text.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  if (!match) return null;

  return {
    width: Number(match[1]),
    height: Number(match[2]),
    thickness: Number(match[3]),
  };
}
