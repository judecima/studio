'use server';

import { runIndustrialPipeline } from '@/lib/importers/faplac-scraper';

/**
 * Server Action para ejecutar el pipeline de importación industrial.
 */
export async function startIndustrialImport() {
  try {
    const result = await runIndustrialPipeline();
    return {
      success: true,
      ...result
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
