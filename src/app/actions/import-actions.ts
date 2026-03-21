'use server';

import { runIndustrialPipeline } from '@/lib/importers/faplac-scraper';
import { runEggerPipeline } from '@/lib/importers/egger-scraper';

export type ImportResult = 
  | { success: true; count: number; note?: string }
  | { success: false; error: string; count?: never; note?: never };

export async function startIndustrialImport(): Promise<ImportResult> {
  try {
    let totalCount = 0;
    
    console.log("🛠️ Lanzando Faplac Pipeline...");
    const faplacResult = await runIndustrialPipeline();
    if (faplacResult.success) totalCount += (faplacResult as any).count || 0;

    console.log("🛠️ Lanzando Egger Pipeline...");
    const eggerResult = await runEggerPipeline();
    if (eggerResult.success) totalCount += (eggerResult as any).count || 0;

    return { success: true, count: totalCount };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    } as ImportResult;
  }
}
