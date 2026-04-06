import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { extractColorFromImage, getColorFromNcs } from '../src/lib/colors/extractor';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runBackfill() {
  console.log("🚀 Starting Color Backfill...");
  const snap = await getDocs(collection(db, 'panels'));
  const panels = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let count = 0;
  for (const panel of panels) {
    if ((panel as any).labColor) continue;

    const ncsCode = (panel as any).colorData?.ncs;
    const imagePath = (panel as any).mainImage;
    let colorData = null;

    if (ncsCode) {
      colorData = await getColorFromNcs(ncsCode);
    }

    if (!colorData && imagePath) {
      const fullPath = path.join(process.cwd(), 'public', imagePath);
      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        colorData = await extractColorFromImage(buffer);
      }
    }

    if (colorData) {
      await updateDoc(doc(db, 'panels', panel.id), {
        hexColor: colorData.hex,
        labColor: colorData.lab,
        colorSource: ncsCode ? 'ncs' : 'image'
      });
      count++;
      console.log(`✅ Updated ${panel.id}: ${colorData.hex}`);
    }
  }

  console.log(`🏁 Backfill complete. Updated ${count} panels.`);
  process.exit(0);
}

runBackfill();
