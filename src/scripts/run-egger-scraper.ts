import { runEggerPipeline } from '../lib/importers/egger-scraper';

async function main() {
  const args = process.argv.slice(2);
  const codesArg = args.find(a => a.startsWith('--codes='));
  const filterCodes = codesArg ? codesArg.split('=')[1].split(',') : undefined;

  console.log("🚀 Starting Egger Scraper Validation...");
  if (filterCodes) console.log("🎯 Filtering codes:", filterCodes);

  try {
    const result = await runEggerPipeline(filterCodes);
    console.log("✅ Scraper finished successfully:", result);
    process.exit(0);
  } catch (error) {
    console.error("❌ Scraper failed:", error);
    process.exit(1);
  }
}

main();
