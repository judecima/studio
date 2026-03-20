import { ScrapedProduct } from '@/lib/faplac-scraper'; // AJUSTAR PATH
import { CatalogProduct } from './catalog.types';

function inferFingerprint(p: ScrapedProduct) {
  const name = p.name.toLowerCase();

  const isWood =
    name.includes('roble') ||
    name.includes('nogal') ||
    name.includes('oak');

  const isWhite = name.includes('blanco');
  const isBlack = name.includes('negro');

  return {
    material: isWood ? 'madera' : 'liso',
    colorGroup: isBlack ? 'oscuro' : isWhite ? 'claro' : 'medio',
    colorHue: isBlack ? 'negro' : isWhite ? 'blanco' : 'marron',
    grainIntensity: isWood ? 2 : 0,
    tone: isWood ? 'calido' : 'neutro'
  } as const;
}

export function adaptProducts(products: ScrapedProduct[]): CatalogProduct[] {
  return products.map(p => ({
    id: p.name.toLowerCase().replace(/\s+/g, '_'),
    name: p.name,
    brand: p.brand,
    line: '',

    width: p.width || 0,
    height: p.height || 0,
    thickness: p.thickness || 0,

    description: p.description,
    images: p.images,
    mainImage: p.mainImage,

    fingerprint: inferFingerprint(p)
  }));
}