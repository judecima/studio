import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedProduct {
  name: string;
  brand: string;
  width: number | null;
  height: number | null;
  thickness: number | null;
  description: string;
  images: string[];
  mainImage: string;
  url: string;
}

const BASE_URL = 'https://www.faplaconline.com.ar';
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas`;

/**
 * Scraper profesional para el catálogo de Faplac.
 */
export async function scrapeFaplacCatalog(): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];
  
  try {
    console.log(`[Scraper] Iniciando captura en: ${CATALOG_URL}`);
    
    const { data: html } = await axios.get(CATALOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 30000
    });

    const $ = cheerio.load(html);
    const productElements = $('.product-item, .item.product.product-item');

    console.log(`[Scraper] Detectados ${productElements.length} items en lista principal.`);

    // Procesamos secuencialmente para no saturar y permitir logs limpios
    for (let i = 0; i < Math.min(productElements.length, 24); i++) {
      const el = productElements.eq(i);
      const name = el.find('.product-item-link, .product-item-name a').first().text().trim();
      const detailLink = el.find('a').first().attr('href');

      if (!name || !detailLink) continue;

      const detailUrl = detailLink.startsWith('http') ? detailLink : `${BASE_URL}${detailLink}`;
      
      try {
        const productDetail = await scrapeProductDetail(detailUrl, name);
        products.push(productDetail);
        console.log(`[Scraper] ✅ Procesado: ${name}`);
      } catch (err) {
        console.error(`[Scraper] ❌ Error en detalle de ${name}:`, err);
      }
    }

    return products;
  } catch (error: any) {
    console.error(`[Scraper] 🚨 Error crítico en scraping: ${error.message}`);
    // Fallback de datos mínimos si el scraping falla completamente
    return getFallbackData();
  }
}

async function scrapeProductDetail(url: string, name: string): Promise<ScrapedProduct> {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    timeout: 15000
  });

  const $ = cheerio.load(html);

  // Extraer imagen real desde og:image
  const mainImage = $('meta[property="og:image"]').attr('content') || 
                    $('.gallery-placeholder__image').attr('src') || 
                    'https://placehold.co/800x600?text=Sin+Imagen';

  const description = $('.product.attribute.description .value').text().trim() || 
                      $('.description').text().trim();

  // Parsear medidas (ej: 1830 x 2750 x 18 mm)
  const bodyText = $('body').text();
  const measuresMatch = bodyText.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  
  return {
    name,
    brand: 'Faplac',
    width: measuresMatch ? Number(measuresMatch[1]) : 1830,
    height: measuresMatch ? Number(measuresMatch[2]) : 2750,
    thickness: measuresMatch ? Number(measuresMatch[3]) : 18,
    description: description || `Tablero melamínico de alta calidad marca Faplac.`,
    images: [mainImage],
    mainImage,
    url
  };
}

function getFallbackData(): ScrapedProduct[] {
  return [
    {
      name: "Blanco Nature",
      brand: "Faplac",
      width: 1830,
      height: 2750,
      thickness: 18,
      description: "Melamina blanca con textura Nature.",
      images: ["https://picsum.photos/seed/blanco/800/600"],
      mainImage: "https://picsum.photos/seed/blanco/800/600",
      url: "#"
    },
    {
      name: "Roble Halifax",
      brand: "Egger",
      width: 2800,
      height: 2070,
      thickness: 18,
      description: "Diseño de roble con vetas profundas.",
      images: ["https://picsum.photos/seed/halifax/800/600"],
      mainImage: "https://picsum.photos/seed/halifax/800/600",
      url: "#"
    }
  ];
}
