import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * @fileOverview Scraper industrial para Faplac.
 * Navega recursivamente para extraer metadatos técnicos y visuales reales.
 */

export interface RawScrapedItem {
  name: string;
  url: string;
  description: string;
  dimensions: string;
  mainImage: string;
  brand: string;
}

const BASE_URL = 'https://www.faplaconline.com.ar';
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas?p=1`;

export async function scrapeFaplacCatalog(): Promise<RawScrapedItem[]> {
  const items: RawScrapedItem[] = [];
  
  try {
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 20000
    });

    const $ = cheerio.load(html);
    const productElements = $('.product-item, .item.product.product-item');

    for (let i = 0; i < Math.min(productElements.length, 40); i++) {
      const el = productElements.eq(i);
      const name = el.find('.product-item-link, .product-item-name a').first().text().trim();
      const relativeUrl = el.find('a').first().attr('href') || '';
      
      if (!name || !relativeUrl) continue;

      const detailUrl = relativeUrl.startsWith('http') ? relativeUrl : `${BASE_URL}${relativeUrl}`;
      
      try {
        const detail = await scrapeProductDetail(detailUrl);
        items.push({
          name,
          url: detailUrl,
          description: detail.description,
          dimensions: detail.dimensions,
          mainImage: detail.mainImage,
          brand: 'Faplac'
        });
      } catch (err) {
        console.error(`[Scraper] Fallo en detalle para ${name}:`, err);
      }
    }

    return items;
  } catch (error) {
    console.error('[Scraper] Error en catálogo principal:', error);
    return [];
  }
}

async function scrapeProductDetail(url: string) {
  const { data: html } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 10000
  });

  const $ = cheerio.load(html);
  
  const mainImage = $('meta[property="og:image"]').attr('content') || 
                    $('.gallery-placeholder__image').attr('src') || '';
  
  const description = $('.product.attribute.description .value').text().trim() || 
                      $('.description').text().trim();

  const dimensions = $('body').text().match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i)?.[0] || '1830 x 2750 x 18';

  return { mainImage, description, dimensions };
}
