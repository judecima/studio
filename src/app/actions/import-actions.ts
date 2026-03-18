
'use server';

/**
 * @fileOverview Orquestador de importación masiva.
 * Ejecuta el seed base y luego enriquece con Puppeteer.
 */

import { scrapeFaplacCatalog, parseMeasures } from '@/lib/importers/faplacPuppeteerImporter';

export async function runFullFaplacImport() {
  try {
    console.log("🏁 Iniciando Orquestador de Importación...");
    
    // 1. El Seed se maneja en el cliente para mejor feedback visual (BulkImportPage)
    // 2. Aquí ejecutamos el Scraping de enriquecimiento
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
