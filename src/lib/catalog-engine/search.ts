import { CatalogProduct, SearchResult } from './catalog.types';

/**
 * Mapa de colores semánticos para búsqueda inteligente.
 */
const COLOR_SEMANTICS: Record<string, string[]> = {
  rojo: ["rojo", "bordo", "terracota", "ladrillo", "vino", "terrarum", "cerezo"],
  blanco: ["blanco", "marfil", "crema", "premium", "bianco", "seda", "chiaro", "nieve"],
  negro: ["negro", "grafito", "notte", "carbón", "oscuro", "humo"],
  gris: ["gris", "cemento", "plata", "humo", "antracita", "plomo", "grafito"],
  madera: ["roble", "nogal", "oak", "fresno", "haya", "cedro", "curupay", "teca", "guayubira"],
  beige: ["beige", "arena", "crema", "lino", "chiaro", "tuareg", "camel", "chiaro"]
};

/**
 * Motor de búsqueda inteligente.
 */
export function searchProducts(products: CatalogProduct[], query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return products.map(p => ({ product: p, relevance: 1 }));

  // Expandir query con semántica si es un color
  const semanticTerms = [q];
  for (const [key, synonyms] of Object.entries(COLOR_SEMANTICS)) {
    if (key === q || synonyms.includes(q)) {
      semanticTerms.push(key, ...synonyms);
      break;
    }
  }

  return products
    .map(p => {
      let relevance = 0;
      const content = `${p.name} ${p.description} ${p.brand} ${p.color.hue} ${p.line}`.toLowerCase();

      // Búsqueda exacta en nombre
      if (p.name.toLowerCase().includes(q)) relevance += 10;
      
      // Búsqueda semántica
      semanticTerms.forEach(term => {
        if (content.includes(term)) relevance += 2;
      });

      // Match por marca
      if (p.brand.toLowerCase() === q) relevance += 5;

      return { product: p, relevance };
    })
    .filter(res => res.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
}
