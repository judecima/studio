
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedProduct {
  name: string;
  brand: string;
  width: number;
  height: number;
  thickness: number;
  description: string;
  images: string[];
  mainImage: string;
  source: string;
}

/**
 * Scraper REAL para Faplac.
 * Extrae lista de productos y luego navega a cada detalle para obtener dimensiones.
 */
export async function scrapeFaplacCatalogs(): Promise<ScrapedProduct[]> {
  const baseUrl = 'https://www.faplaconline.com.ar';
  const catalogUrl = `${baseUrl}/home/c/ar-faplac`;
  
  try {
    const { data: html } = await axios.get(catalogUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(html);
    const products: ScrapedProduct[] = [];

    // Buscamos los links de productos en el catálogo
    const productLinks: string[] = [];
    $('.product-item a.product-item-link').each((_, el) => {
      const link = $(el).attr('href');
      if (link) productLinks.push(link.startsWith('http') ? link : `${baseUrl}${link}`);
    });

    // Limitamos para el demo/prototipo o procesamos en batches
    const linksToProcess = productLinks.slice(0, 10);

    for (const link of linksToProcess) {
      try {
        const { data: detailHtml } = await axios.get(link);
        const $d = cheerio.load(detailHtml);
        
        const name = $d('.page-title span').text().trim();
        const description = $d('.product.attribute.description .value').text().trim();
        const mainImage = $d('.gallery-placeholder img').attr('src') || '';
        
        // Parsing de medidas (Ej: "1830 x 2750 x 18 mm")
        const specsText = $d('.product.attribute.specifications').text();
        const dimensions = parseDimensions(specsText || name);

        if (name) {
          products.push({
            name,
            brand: 'Faplac',
            ...dimensions,
            description: description || `Tablero Faplac diseño ${name}.`,
            images: [mainImage],
            mainImage: mainImage || 'https://picsum.photos/seed/faplac/800/600',
            source: 'faplac_scraper'
          });
        }
      } catch (e) {
        console.error(`Error procesando detalle de: ${link}`, e);
      }
    }

    return products;
  } catch (error) {
    console.error('Error en scraper de Faplac:', error);
    throw error;
  }
}

function parseDimensions(text: string) {
  // Regex para buscar patrones como 1830x2600x18 o similares
  const regex = /(\d{4})\s*[xX*]\s*(\d{4})\s*[xX*]\s*(\d{1,2})/;
  const match = text.match(regex);
  
  if (match) {
    return {
      width: parseInt(match[1]),
      height: parseInt(match[2]),
      thickness: parseInt(match[3])
    };
  }
  
  // Valores por defecto de Faplac si no se encuentran
  return {
    width: 2820,
    height: 1830,
    thickness: 18
  };
}
