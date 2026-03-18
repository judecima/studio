'use server';

/**
 * @fileOverview Orquestador de importación masiva.
 * Ejecuta el seed base y luego enriquece con el scraper robusto.
 */

import { scrapeFaplacCatalog } from '@/lib/importers/faplacPuppeteerImporter';

export async function runFullFaplacImport() {
  try {
    console.log("🏁 Iniciando Orquestador de Importación Robusta...");
    
    // Ejecutamos el Scraping de enriquecimiento (ahora usa Axios/Cheerio)
    const enrichedData = await scrapeFaplacCatalog();
    
    return {
      success: true,
      data: enrichedData,
      count: enrichedData.length
    };
  } catch (error: any) {
    console.error("🚨 Fallo crítico en orquestador:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
