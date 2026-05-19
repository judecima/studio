import { NextResponse } from 'next/server';
import { computeEquivalenceResults, runEquivalenceSync } from '@/lib/equivalences/engine';
import { getPanelDbDriver, getPanelsRepository } from '@/lib/data/get-panels-repository';
import { saveJsonEquivalences } from '@/lib/data/equivalences-json-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const repo = getPanelsRepository();
    const driver = getPanelDbDriver();
    const allPanels = await repo.getAllPanels();

    if (allPanels.length < 1) return NextResponse.json({ success: false, error: "No panels found" });

    const results = driver === 'json'
      ? await computeEquivalenceResults(allPanels)
      : await runEquivalenceSync(allPanels);

    if (driver === 'json') {
      await saveJsonEquivalences(results);
    }

    return NextResponse.json({
      success: true,
      driver,
      processed: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ Sync Error v5.1:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
