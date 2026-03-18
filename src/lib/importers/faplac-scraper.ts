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
  source: string;
}

const BASE_URL = 'https://www.faplaconline.com.ar';

function getImage($img: cheerio.Cheerio<any>) {
  return (
    $img.attr('data-src') ||
    $img.attr('src') ||
    $img.attr('srcset')?.split(' ')[0] ||
    ''
  );
}

function parseMeasures(text: string) {
  // Busca patrones tipo 1830 x 2750 x 18
  const match = text.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/i);
  if (!match) return {};

  return {
    width: Number(match[1]),
    height: Number(match[2]),
    thickness: Number(match[3]),
  };
}

/**
 * Scraper profesional de Faplac.
 * Navega por las páginas del catálogo y entra en el detalle de cada producto.
 */
export async function scrapeFaplacCatalogs(): Promise<ScrapedProduct[]> {
  console.log('🔵 Iniciando scraping profundo de Faplac...');
  
  const products: ScrapedProduct[] = [];
  let page = 1;
  const maxPages = 2; // Limitamos para evitar timeouts en Server Actions de NextJS (MVP)

  while (page <= maxPages) {
    try {
      const url = `${BASE_URL}/home/c/ar-faplac?p=${page}`;
      console.log(`📄 Procesando página: ${page}`);
      
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        timeout: 15000
      });

      const $ = cheerio.load(html);
      const productElements = $('.product-item, .product-card, .item');

      if (productElements.length === 0) break;

      for (let i = 0; i < productElements.length; i++) {
        try {
          const el = productElements.eq(i);
          const name = el.find('.product-item-name a, .title').text().trim();
          const link = el.find('a').attr('href') || '';
          const mainImage = getImage(el.find('.product-image-photo, img'));

          if (!name || !link) continue;

          const detailUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;

          // 🔎 Navegar al detalle para extraer info técnica
          const { data: detailHtml } = await axios.get(detailUrl, { timeout: 10000 });
          const $$ = cheerio.load(detailHtml);

          const description = $$('.description, .product-info-main .value, .product.attribute.description').text().trim();
          
          // Buscar medidas en todo el texto del body si no hay un selector claro
          const bodyText = $$('body').text();
          const measuresText = bodyText.match(/\d+\s*x\s*\d+\s*x\s*\d+\s*mm/i)?.[0] || '';
          const measures = parseMeasures(measuresText);

          products.push({
            name,
            brand: 'Faplac',
            width: measures.width || 2820, // Fallback estándar Faplac
            height: measures.height || 1830,
            thickness: measures.thickness || 18,
            description: description || `Tablero de la línea industrial de Faplac.`,
            images: [mainImage],
            mainImage: mainImage || 'https://picsum.photos/seed/faplac/800/600',
            source: 'faplac_scraper'
          });

          console.log(`✅ Procesado: ${name}`);
        } catch (innerErr) {
          console.error('❌ Error procesando ítem individual:', innerErr);
        }
      }

      page++;
    } catch (error) {
      console.error(`❌ Error en página ${page}:`, error);
      break;
    }
  }

  // Si falló todo el scraping (bloqueo), usamos el seed de respaldo
  if (products.length === 0) {
    console.warn('⚠️ Scraping fallido o vacío, usando seed de respaldo.');
    return getFaplacSeedData();
  }

  return products;
}

function getFaplacSeedData(): ScrapedProduct[] {
  const designs = [
    { name: "Lino Chiaro", line: "Hilados" },
    { name: "Seda Giorno", line: "Hilados" },
    { name: "Tuareg", line: "Nórdica" },
    { name: "Báltico", line: "Nórdica" }
  ];

  return designs.map(d => ({
    name: `${d.name} - Línea ${d.line}`,
    brand: 'Faplac',
    width: 2820,
    height: 1830,
    thickness: 18,
    description: `Melamina Faplac de la línea ${d.line}. Acabado de alta calidad.`,
    images: [`https://picsum.photos/seed/faplac-${d.name.replace(/\s/g, '')}/800/600`],
    mainImage: `https://picsum.photos/seed/faplac-${d.name.replace(/\s/g, '')}/800/600`,
    source: 'faplac_seed'
  }));
}
