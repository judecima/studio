import fs from 'fs';
import path from 'path';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { pipeline } from '@xenova/transformers';
import { converter } from 'culori';

const toLab = converter('lab');

let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
  }
  return extractor;
}

function rgbToLab(r: number, g: number, b: number) {
  const lab = toLab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
  return { l: lab?.l ?? 0, a: lab?.a ?? 0, b: lab?.b ?? 0 };
}

function distance(a: any, b: any) {
  return Math.sqrt(
    (a.r - b.r) ** 2 +
    (a.g - b.g) ** 2 +
    (a.b - b.b) ** 2
  );
}

function kmeans(points: any[], k = 3, iterations = 5) {
  const centroids = points.slice(0, k);

  for (let iter = 0; iter < iterations; iter++) {
    const clusters: any[] = Array.from({ length: k }, () => []);

    for (const p of points) {
      let min = Infinity, idx = 0;

      centroids.forEach((c, i) => {
        const d = distance(p, c);
        if (d < min) {
          min = d;
          idx = i;
        }
      });

      clusters[idx].push(p);
    }

    for (let i = 0; i < k; i++) {
      if (!clusters[i].length) continue;

      const avg = clusters[i].reduce(
        (acc: { r: number; g: number; b: number }, p: { r: number; g: number; b: number }) => {
          acc.r += p.r;
          acc.g += p.g;
          acc.b += p.b;
          return acc;
        },
        { r: 0, g: 0, b: 0 }
      );

      centroids[i] = {
        r: avg.r / clusters[i].length,
        g: avg.g / clusters[i].length,
        b: avg.b / clusters[i].length
      };
    }
  }

  const weights = centroids.map(c => {
    let count = 0;
    for (const p of points) {
      if (distance(p, c) < 30) count++;
    }
    return count / points.length;
  });

  return { centroids, weights };
}

export async function extractAndStoreFeatures(panel: any) {
  const { firestore } = initializeFirebase();
  const ref = doc(firestore as any, 'panel_features', panel.id as string);
  const snap = await getDoc(ref);

  if (snap.exists()) return snap.data();

  if (!panel.mainImage) return null;

  const fullPath = path.join(process.cwd(), 'public', panel.mainImage);
  if (!fs.existsSync(fullPath)) return null;

  const { Jimp } = await import('jimp');
  const img = await Jimp.read(fullPath);

  const samples: any[] = [];
  const step = Math.max(1, Math.floor(img.width / 30));

  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      const rgba = img.getPixelColor(x, y);
      samples.push({
        r: (rgba >>> 24) & 0xff,
        g: (rgba >>> 16) & 0xff,
        b: (rgba >>> 8) & 0xff
      });
    }
  }

  const { centroids, weights } = kmeans(samples);

  const palette = centroids.map(c => rgbToLab(c.r, c.g, c.b));

  const extractor = await getExtractor();
  const output: any = await extractor(fullPath);
  const embedding = Array.from(output.data);

  const data = {
    palette,
    weights,
    embedding,
    updatedAt: new Date().toISOString()
  };

  await setDoc(ref, data);

  return data;
}