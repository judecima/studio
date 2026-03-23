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
 * 🔥 Egger PRO Scraper v6.12: Captura 4K (PNG Fallback for Jimp) & Ultra-Fast Parallel Optimization
 */
export async function runEggerPipeline(filterCodes?: string[]) {
  const { firestore } = initializeFirebase();
  console.log("🚀 Egger PRO Scraper (v6.12: 4K PNG Stability) iniciado...");

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

  let finalProducts = allProductsData;
  if (filterCodes && filterCodes.length > 0) {
    finalProducts = allProductsData.filter(item => {
      const code = (item?.overline || item?.code || '').trim();
      return filterCodes.some(f => code.includes(f));
    });
    console.log(`🎯 Filtrando por códigos: ${filterCodes.join(', ')}. Procesando ${finalProducts.length} items.`);
  }

  const localDir = path.join(process.cwd(), 'public', 'images', 'egger');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  let count = 0;

  // 2. Procesar detalles en Lotes (Chunks) de 5 para Ultra-Velocidad
  const chunkSize = 5;
  for (let i = 0; i < finalProducts.length; i += chunkSize) {
    const chunk = finalProducts.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (item) => {
      const detailPage = await browser.newPage();
      try {
        const name = (item?.link?.text || item?.name || '').trim();
        let code = (item?.overline || item?.code || '').trim();
        if (!name || !code) return;

        const slug = normalizePanelId(`egger-${code}`);
        let imageUrl = item?.image?.url || '';

        const detailPath = item?.link?.path;
        const detailUrl = detailPath 
          ? `https://www.egger.com${detailPath}?country=CL`
          : `https://www.egger.com/es/mobiliario-e-interiorismo/disenos/${code.split(' ')[0]}?country=CL`;

        // Optimización: Interceptar recursos
        await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await detailPage.setCookie(...cookies);
        await detailPage.setRequestInterception(true);
        detailPage.on('request', (req: any) => {
          if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
          else req.continue();
        });

        await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const detailData = await detailPage.evaluate(() => {
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

          let colorChar = document.querySelector('[data-track-id="decordetail_edp_decor_data_download"]')?.textContent?.trim() || '';
          let size = document.querySelector('.absolute.right-5.bottom-5')?.textContent?.trim() || '';

          // 🎬 IMAGEN DE ALTA CALIDAD v7.3 (Multi-Fidelidad & Robustness)
          let highResUrl = '';
          const picture = document.querySelector('picture');
          
          if (picture) {
            // 1. Prioridad: original.png (Suele ser 3000px+)
            const imgEl = picture.querySelector('img');
            const fallbackSrc = imgEl?.getAttribute('src') || '';
            if (fallbackSrc.includes('original.png')) highResUrl = fallbackSrc;

            // 2. Busqueda en srcset (Mayor ancho disponible)
            if (!highResUrl) {
              const allSources = Array.from(picture.querySelectorAll('source, img'));
              const urlsWithWidth: {url: string, width: number}[] = [];
              
              allSources.forEach(s => {
                const srcset = s.getAttribute('srcset') || s.getAttribute('src') || '';
                const parts = srcset.split(',');
                parts.forEach(p => {
                  const match = p.trim().match(/(https:\/\/[^ ]+).*width=(\d+)/);
                  if (match) urlsWithWidth.push({ url: match[1], width: parseInt(match[2]) });
                });
              });

              // Ordenar por ancho descendente
              urlsWithWidth.sort((a, b) => b.width - a.width);
              if (urlsWithWidth.length > 0) {
                // Preferir 2880 o el más grande disponible
                const best = urlsWithWidth.find(u => u.width === 2880) || urlsWithWidth[0];
                highResUrl = best.url;
              }
            }
          }

          // Fallbacks de última instancia
          if (!highResUrl || highResUrl.length < 10) {
            highResUrl = document.querySelector('[data-zoom-image]')?.getAttribute('data-zoom-image') || '';
          }
          if (!highResUrl) {
            const galleryImg = document.querySelector('.gallery-placeholder__image, .product-image-gallery__image');
            highResUrl = galleryImg?.getAttribute('src') || galleryImg?.getAttribute('data-src') || '';
          }
          if (!highResUrl) highResUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

          return { ncs, colorChar, size, highResUrl };
        });

        const ncsCode = detailData.ncs.replace(/\*/g, '').trim();
        const colorCharacter = detailData.colorChar;
        const patternSize = detailData.size;

        if (detailData.highResUrl) {
          imageUrl = detailData.highResUrl.startsWith('//') ? `https:${detailData.highResUrl}` : detailData.highResUrl;
        }

        let patternHeight = 0, patternWidth = 0;
        const sizeMatch = patternSize.match(/aprox\.\s*([\d.,]+)\s*x\s*([\d.,]+)\s*mm/i);
        if (sizeMatch) {
          patternHeight = parseFloat(sizeMatch[1].replace(',', '.'));
          patternWidth = parseFloat(sizeMatch[2].replace(',', '.'));
        }

        // 🖼️ Descarga & Transformación a 500x500 Cuadrado con sharp (v7.0)
        // 🖼️ Descarga & Transformación a 500x500 Cuadrado con sharp (v7.2)
        if (imageUrl && imageUrl.startsWith('http')) {
          try {
            const urlObj = new URL(imageUrl);
            const finalExt = '.png';
            const finalLocalFile = path.join(localDir, `${slug}${finalExt}`);

            // 🧠 Procesamiento en Memoria (Evita colisión Sharp y bloqueos de red)
            const response = await axios.get(imageUrl, { 
              responseType: 'arraybuffer', 
              timeout: 60000,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const sharp = (await import('sharp')).default;
            await sharp(response.data)
              .resize(500, 500, { fit: 'cover', position: 'centre' })
              .png({ compressionLevel: 9, quality: 100 })
              .toFile(finalLocalFile);

            imageUrl = `/images/egger/${slug}${finalExt}`;
            await delay(200); // 🕒 Cortesía para evitar ERR_CONNECTION_CLOSED
          } catch (e) {
            console.log(`  ⚠️ Error transformando imagen ${slug}:`, (e as Error).message);
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
          colorData: { ncs: ncsCode || null },
          surfaceTexture: code.match(/ST\d+/) ? code.match(/ST\d+/)![0] : 'Standard',
          isSmooth: code.includes('ST9') || name.toLowerCase().includes('mate'),
          hasGrain: !code.includes('U') && !name.toLowerCase().includes('unicolor'),
          code,
          originalCode: code,
          url: detailUrl
        };

        await setDoc(doc(firestore, 'panels', slug), panelDoc, { merge: true });
        count++;
        if (count % 10 === 0) console.log(`  📥 Egger PRO: ${count}/${allProductsData.length}`);

      } catch (e: any) {
        console.log(`❌ Error ${item?.code}: ${e.message}`);
      } finally {
        await detailPage.close();
      }
    }));
    await delay(300);
  }

  await browser.close();
  console.log(`🎉 Sincronización Egger PRO completa: ${count} melaminas.`);
  return { success: true, count };
}