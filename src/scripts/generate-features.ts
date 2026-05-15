import { extractAndStoreFeatures } from '@/lib/color-engine/feature-extractor';

const panels: any[] = [
  // 👉 PONÉ ACÁ TUS PANELES REALES
];

async function run() {
  for (const panel of panels) {
    console.log('Procesando', panel.id);
    await extractAndStoreFeatures(panel);
  }

  console.log('Features generadas');
}

run();