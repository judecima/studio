
'use server';

import { scrapeFaplacCatalogs } from '@/lib/importers/faplac-scraper';
import { getEggerSeedData } from '@/lib/importers/egger-seed';

/**
 * Server Action para orquestar la importación de catálogos.
 * Realiza el scraping en el servidor para evitar problemas de CORS.
 */
export async function runCatalogImportAction() {
  try {
    console.log('Iniciando proceso de scraping...');
    
    // Ejecutamos ambos importadores
    const faplacResults = await scrapeFaplacCatalogs();
    const eggerResults = await getEggerSeedData();
    
    const allResults = [...faplacResults, ...eggerResults];
    
    console.log(`Scraping finalizado. Total encontrados: ${allResults.length}`);
    
    return {
      success: true,
      data: allResults,
      count: allResults.length
    };
  } catch (error: any) {
    console.error('Falla en Server Action de importación:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido durante la importación'
    };
  }
}
