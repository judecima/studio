import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { initializeFirebase } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId } from '../catalog-engine/catalog.adapter';

const START_URL = 'https://www.egger.com/es/mobiliario-e-interiorismo/?country=CL';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runEggerPipeline() {
  const { firestore } = initializeFirebase();
  console.log("🚀 Egger PRO Scraper (Auth-Integrated) iniciado...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  console.log(`📡 Navegando a Egger para extraer tokens de sesión...`);
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(5000);

  // Intentar aceptar cookies para limpiar el DOM
  try {
    const cookieBtn = await page.$('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll') || 
                      await page.$('#onetrust-accept-btn-handler');
    if (cookieBtn) await cookieBtn.click();
  } catch (e) {}

  // 🔥 EXTRAER VARIABLES DE SESION
  const sessionData = await page.evaluate(() => {
    return (window as any).commonScriptVariables || null;
  });

  if (!sessionData || !sessionData.csrfToken) {
    console.log("  ⚠️ No se encontró commonScriptVariables.csrfToken. Intentando reintentar...");
    await delay(5000);
  }

  console.log(`  🔑 Token CSRF detectado: ${sessionData?.csrfToken ? 'OK' : 'MISSING'}`);

  // 🔥 EJECUTAR LLAMADAS API DESDE EL BROWSER (Hereda cookies + CSRF)
  const allProductsData = await page.evaluate(async (data) => {
    const apiBase = data.apiBaseURL || 'https://api.www.egger.com';
    const csrf = data.csrfToken;
    const searchUrl = `${apiBase}/pimedp/decor-search/api/searchLucene?country=CL&language=es`;
    
    const config: RequestInit = {
      credentials: "include" as RequestCredentials,
      headers: { 
        "X-Sec-Csrf-Token": csrf,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    };

    // 1. Get Codes
    const searchRes = await fetch(searchUrl, config);
    const searchJson = await searchRes.json();
    const codes: string[] = searchJson.codes || [];
    
    // 2. Get Detail Data in chunks
    const PAGE_SIZE = 24;
    const detailedItems: any[] = [];
    
    for (let i = 0; i < codes.length; i += PAGE_SIZE) {
      const chunk = codes.slice(i, i + PAGE_SIZE);
      const detailRes = await fetch(`${apiBase}/pimedp/decor-search/api/detaildata`, {
        ...config,
        method: "POST",
        body: JSON.stringify(chunk)
      });
      const detailJson = await detailRes.json();
      if (detailJson.items) detailedItems.push(...detailJson.items);
    }
    
    return detailedItems;
  }, sessionData);

  console.log(`✅ API respondio con ${allProductsData.length} items.`);
  await browser.close();

  if (!allProductsData.length) throw new Error("No se recuperaron productos de la API.");

  // 🔥 PROCESAR E IMPORTAR
  let count = 0;
  const localDir = path.join(process.cwd(), 'public', 'images', 'egger');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  for (const item of allProductsData) {
    try {
      const name = (item?.link?.text || item?.name || '').trim();
      const code = (item?.overline || item?.code || '').trim();
      if (!name || !code) continue;

      const slug = normalizePanelId(`egger-${code}`);
      let imageUrl = item?.image?.url || '';

      if (imageUrl && imageUrl.startsWith('http')) {
        const localFile = path.join(localDir, `${slug}.jpg`);
        if (!fs.existsSync(localFile)) {
          try {
            const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
            fs.writeFileSync(localFile, res.data);
            imageUrl = `/images/egger/${slug}.jpg`;
          } catch (e) {
            console.log(`  ⚠️ Error imagen ${code}`);
          }
        } else {
          imageUrl = `/images/egger/${slug}.jpg`;
        }
      }

      const panelDoc = {
        id: slug,
        name,
        brand: 'Egger',
        width: 2800,
        height: 2070,
        thickness: 18,
        description: `Melamina Egger de alta calidad. Diseño ${name} (${code}).`,
        stock: 0,
        images: imageUrl ? [imageUrl] : [],
        mainImage: imageUrl,
        visible: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        surfaceTexture: code.match(/ST\d+/) ? code.match(/ST\d+/)![0] : 'Standard',
        isSmooth: code.includes('ST9') || name.toLowerCase().includes('mate'),
        antiFingerprint: name.includes('PerfectSense') || name.includes('Matt') || code.includes('ST9'),
        finish: name.includes('PerfectSense') ? 'Premium Matt' : (code.match(/ST\d+/) ? `Textura ${code.match(/ST\d+/)![0]}` : 'Textura Estándar'),
        hasGrain: !code.includes('U') && !name.toLowerCase().includes('unicolor') && !name.toLowerCase().includes('blanco'),
        code,
        url: `https://www.egger.com/es/furniture-interior-design/decor-search/${code}`
      };

      await setDoc(doc(firestore, 'panels', slug), panelDoc, { merge: true });
      count++;
      if (count % 20 === 0) console.log(`  📥 Importados: ${count}/${allProductsData.length}`);

    } catch (e: any) {
      console.log(`❌ Error importando: ${e.message}`);
    }
  }

  console.log(`🎉 Sincronización completa: ${count} melaminas.`);
  return { success: true, count };
}