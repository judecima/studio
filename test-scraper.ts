import { runIndustrialPipeline } from "./src/lib/importers/faplac-scraper";
runIndustrialPipeline().then(console.log).catch(console.error);
