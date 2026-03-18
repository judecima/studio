'use server';

/**
 * @fileOverview Scraper Robusto para Faplac.
 * Utiliza Axios y Cheerio para navegar de forma recursiva sin depender de un navegador pesado.
 * Esto evita errores de librerías de sistema (como libgobject) en entornos restringidos.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = "https://www.faplaconline.com.ar";
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac`;

/**
 * Scrapea el catálogo de Faplac extrayendo datos base y entrando en cada detalle.
 */
export async function scrapeFaplacCatalog() {
  console.log("🔵 Iniciando Scraper Robusto (Axios/Cheerio)...");
  
  const enrichedResults = [];
  
  try {
    // 1. Obtener el listado principal
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });
    
    const $ = cheerio.load(html);
    const productItems = $('.product-item, .item-product, .item');
    
    console.log(`✅ Se detectaron ${productItems.length} nodos de productos en el listado.`);

    // 2. Procesar recursivamente cada producto (limitado a los primeros 40 para evitar timeouts)
    for (let i = 0; i < Math.min(productItems.length, 40); i++) {
      const el = productItems.eq(i);
      const name = el.find('.product-item-name, .title').text().trim();
      const relativeLink = el.find('a').attr('href') || "";
      const img = el.find('img').attr('data-src') || el.find('img').attr('src') || "";
      
      if (!name || !relativeLink) continue;

      const detailUrl = relativeLink.startsWith('http') ? relativeLink : `${BASE_URL}${relativeLink}`;
      
      try {
        // 🔎 Navegar al detalle para enriquecimiento profundo
        const detailData = await scrapeProductDetail(detailUrl);
        
        enrichedResults.push({
          name,
          img: img.startsWith('//') ? `https:${img}` : img,
          ...detailData
        });
        
        console.log(`🔍 [${i+1}/${productItems.length}] Enriquecido: ${name}`);
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

/**
 * Navega a la URL de detalle de un producto para extraer info técnica.
 */
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
  
  // Galería de imágenes
  const galleryImages: string[] = [];
  $$('.gallery-placeholder img, .fotorama__img, .product-image-photo').each((_, img) => {
    const src = $$(img).attr('src') || $$(img).attr('data-src');
    if (src) galleryImages.push(src.startsWith('//') ? `https:${src}` : src);
  });

  return {
    description: description || "Tablero melamínico de alta calidad para mobiliario industrial.",
    bodyText,
    galleryImages: [...new Set(galleryImages)]
  };
}

/**
 * Parsea las medidas de un texto.
 */
export async function parseMeasures(text: string) {
  // Patrón: 1830 x 2750 x 18
  const match = text.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  if (!match) return null;

  return {
    width: Number(match[1]),
    height: Number(match[2]),
    thickness: Number(match[3]),
  };
}
