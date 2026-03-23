import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { initializeFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId } from '../catalog-engine/catalog.adapter';

const START_URL = 'https://www.egger.com/es/mobiliario-e-interiorismo/?country=CL';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 🔥 Egger PRO Scraper v6.6: Extracción de Alta Resolución y Metadatos Técnicos
 */
export async function runEggerPipeline() {
  const { firestore } = initializeFirebase();
  console.log("🚀 Egger PRO Scraper (High-Res 4K) iniciado...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  console.log(`📡 Navegando a Egger Discovery...`);
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(5000);

  // Aceptar cookies
  try {
    const cookieBtn = await page.$('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll') || 
                      await page.$('#onetrust-accept-btn-handler');
    if (cookieBtn) {
      await cookieBtn.click();
      await delay(2000);
    }
  } catch (e) {}

  const cookies = await page.cookies();

  // Obtener variables de sesión para la API
  const sessionData = await page.evaluate(() => (window as any).commonScriptVariables || null);
  console.log(`  🔑 Token CSRF: ${sessionData?.csrfToken ? 'OK' : 'MISSING'}`);

  // 1. Obtener lista completa de códigos vía API de Egger
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

    const searchRes = await fetch(searchUrl, config);
    const searchJson = await searchRes.json();
    const codes: string[] = searchJson.codes || [];
    
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

  console.log(`✅ API respondió con ${allProductsData.length} items de catálogo.`);
  if (!allProductsData.length) {
    await browser.close();
    throw new Error("No se recuperaron productos de la API.");
  }

  const localDir = path.join(process.cwd(), 'public', 'images', 'egger');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  let count = 0;

  // 2. Navegar a cada detalle para extraer Alta Resolución y NCS
  for (const item of allProductsData) {
    try {
      const name = (item?.link?.text || item?.name || '').trim();
      let code = (item?.overline || item?.code || '').trim();
      if (!name || !code) continue;

      const slug = normalizePanelId(`egger-${code}`);
      let imageUrl = item?.image?.url || ''; // Miniatura inicial como fallback

      const detailPath = item?.link?.path;
      const detailUrl = detailPath 
        ? `https://www.egger.com${detailPath}?country=CL`
        : `https://www.egger.com/es/mobiliario-e-interiorismo/disenos/${code.split(' ')[0]}?country=CL`;

      let ncsCode = '', colorCharacter = '', detailedFinish = '';
      let patternSize = '';
      let patternHeight = 0, patternWidth = 0;

      const detailPage = await browser.newPage();
      await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      await detailPage.setCookie(...cookies);

      try {
        await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        await delay(2000);

        const detailData = await detailPage.evaluate(() => {
          // --- Datos de color (FactHeroTeaser) ---
          let ncs = '';
          const factHero = document.querySelector('[data-track-component="FactHeroTeaser"]');
          if (factHero) {
            const factItems = factHero.querySelectorAll('[data-track-component="Fact"]');
            for (const item of factItems) {
              const spans = item.querySelectorAll('span');
              if (spans.length >= 2) {
                const label = spans[0].textContent?.trim() || '';
                const value = spans[1].textContent?.trim() || '';
                if (label === 'NCS') ncs = value;
              }
            }
          }

          // --- Descripción ---
          let colorChar = '';
          const textBlock = document.querySelector('[data-track-id="decordetail_edp_decor_data_download"]');
          if (textBlock) {
            colorChar = textBlock.textContent?.trim() || '';
          }

          // --- Tamaño del patrón ---
          let size = '';
          const sizeDiv = document.querySelector('.absolute.right-5.bottom-5');
          if (sizeDiv) size = sizeDiv.textContent?.trim() || '';

          // --- IMAGEN DE ALTA CALIDAD (Zoom Image) ---
          let highResUrl = '';
          const zoomImg = document.querySelector('[data-zoom-image]');
          if (zoomImg) highResUrl = zoomImg.getAttribute('data-zoom-image') || '';
          if (!highResUrl) {
            const galleryImg = document.querySelector('.gallery-placeholder__image');
            if (galleryImg) highResUrl = galleryImg.getAttribute('src') || '';
          }
          if (!highResUrl) {
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage) highResUrl = ogImage.getAttribute('content') || '';
          }

          return { ncs, colorChar, size, highResUrl };
        });

        ncsCode = detailData.ncs.replace(/\*/g, '').trim();
        colorCharacter = detailData.colorChar;
        patternSize = detailData.size;

        if (detailData.highResUrl) {
          imageUrl = detailData.highResUrl.startsWith('//') ? `https:${detailData.highResUrl}` : detailData.highResUrl;
          console.log(`  📸 Alta Resolución detectada: ${slug}`);
        }

        const sizeMatch = patternSize.match(/aprox\.\s*([\d.,]+)\s*x\s*([\d.,]+)\s*mm/i);
        if (sizeMatch) {
          patternHeight = parseFloat(sizeMatch[1].replace(',', '.'));
          patternWidth = parseFloat(sizeMatch[2].replace(',', '.'));
        }
      } catch (err: any) {
        console.log(`  ⚠️ Omisión de detalle para ${code}: ${err.message}`);
      } finally {
        await detailPage.close();
      }

      // 3. Descargar imagen (Persistente)
      if (imageUrl && imageUrl.startsWith('http')) {
        const localFile = path.join(localDir, `${slug}.jpg`);
        try {
          const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
          fs.writeFileSync(localFile, res.data);
          imageUrl = `/images/egger/${slug}.jpg`;
        } catch (e) {
          console.log(`  ⚠️ Error descargando imagen ${code}, usando fallback miniatura.`);
        }
      }

      const panelDoc = {
        id: slug,
        name,
        brand: 'Egger',
        width: 2800,
        height: 2070,
        thickness: 18,
        description: colorCharacter || `Melamina Egger de alta calidad. Diseño ${name} (${code}).`,
        patternSize,
        patternWidth,
        patternHeight,
        stock: 0,
        images: imageUrl ? [imageUrl] : [],
        mainImage: imageUrl,
        visible: true,
        updatedAt: serverTimestamp(),
        
        colorData: {
          ncs: ncsCode || null,
        },

        surfaceTexture: code.match(/ST\d+/) ? code.match(/ST\d+/)![0] : 'Standard',
        isSmooth: code.includes('ST9') || name.toLowerCase().includes('mate'),
        hasGrain: !code.includes('U') && !name.toLowerCase().includes('unicolor'),
        
        code,
        originalCode: code,
        url: detailUrl
      };

      await setDoc(doc(firestore, 'panels', slug), panelDoc, { merge: true });
      count++;
      if (count % 20 === 0) console.log(`  📥 Importados: ${count}/${allProductsData.length}`);

      await delay(300);

    } catch (e: any) {
      console.log(`❌ Error crítico en producto: ${e.message}`);
    }
  }

  await browser.close();
  console.log(`🎉 Sincronización Egger PRO completa: ${count} melaminas.`);
  return { success: true, count };
}