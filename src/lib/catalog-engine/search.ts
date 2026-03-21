import { CatalogProduct, SearchResult } from './catalog.types';

const COLOR_SYNONYMS: Record<string, string[]> = {
  rojo: ["rojo", "bordo", "terracota", "ladrillo", "vino", "terrarum"],
  blanco: ["blanco", "crema", "marfil", "nieve", "chiaro", "bianco"],
  gris: ["gris", "cemento", "plata", "humo", "grafito", "plomo"],
  madera: ["roble", "nogal", "cedro", "haya", "teca", "fresno", "veta"]
};

/**
 * Motor de búsqueda inteligente con expansión semántica.
 */
export function searchProducts(products: CatalogProduct[], query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return products.map(p => ({ product: p, relevance: 1 }));

  // Expandir búsqueda si el término es un color conocido
  const expandedTerms = [q];
  for (const [key, synonyms] of Object.entries(COLOR_SYNONYMS)) {
    if (key === q || synonyms.includes(q)) {
      expandedTerms.push(key, ...synonyms);
      break;
    }
  }

  return products
    .map(p => {
      let relevance = 0;
      const content = `${p.name} ${p.description} ${p.brand} ${p.color.hue} ${p.line}`.toLowerCase();

      // Coincidencia exacta de nombre
      if (p.name.toLowerCase().includes(q)) relevance += 10;
      
      // Coincidencia en contenido expandido
      expandedTerms.forEach(term => {
        if (content.includes(term)) relevance += 2;
      });

      // Coincidencia con Colores Básicos asignados
      if (p.color.basicColors && p.color.basicColors.some(c => expandedTerms.includes(c))) {
        relevance += 8;
      }

      // Coincidencia por marca
      if (p.brand.toLowerCase() === q) relevance += 5;

      return { product: p, relevance };
    })
    .filter(res => res.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
}
