import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { initializeFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId } from '../catalog-engine/catalog.adapter';
import { extractColorFromImage, getColorFromNcs } from '../colors/extractor';
import { classify } from '../equivalences/engine';

const START_URL = 'https://www.egger.com/es/mobiliario-e-interiorismo/?country=CL';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runEggerPipeline(filterCodes?: string[]) {
  const { firestore } = initializeFirebase();
  console.log("🚀 Egger PRO Scraper (v6.15: Symmetric Material Fix) iniciado...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(5000);

  try {
    const cookieBtn = await page.$('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll') || 
                      await page.$('#onetrust-accept-btn-handler');
    if (cookieBtn) {
      await cookieBtn.click();
      await delay(2000);
    }
  } catch (e) {}

  const cookies = await page.cookies();
  const sessionData = await page.evaluate(() => (window as any).commonScriptVariables || null);

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

  let finalProducts = allProductsData;
  if (filterCodes && filterCodes.length > 0) {
    finalProducts = allProductsData.filter(item => {
      const code = (item?.overline || item?.code || '').trim();
      return filterCodes.some(f => code.includes(f));
    });
  }

  const localDir = path.join(process.cwd(), 'public', 'images', 'egger');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  let count = 0;
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

          let highResUrl = '';
          const picture = document.querySelector('picture');
          if (picture) {
            const imgEl = picture.querySelector('img');
            const fallbackSrc = imgEl?.getAttribute('src') || '';
            if (fallbackSrc.includes('original.png')) highResUrl = fallbackSrc;
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
              urlsWithWidth.sort((a, b) => b.width - a.width);
              if (urlsWithWidth.length > 0) {
                const best = urlsWithWidth.find(u => u.width === 2880) || urlsWithWidth[0];
                highResUrl = best.url;
              }
            }
          }
          const nameFromH1 = document.querySelector('h1')?.textContent?.trim() || '';
          return { ncs, colorChar, size, highResUrl, nameFromH1 };
        });

        const ncsCode = detailData.ncs.replace(/\*/g, '').trim();
        const colorCharacter = detailData.colorChar;
        const patternSize = detailData.size;

        if (detailData.highResUrl) {
          imageUrl = detailData.highResUrl.startsWith('//') ? `https:${detailData.highResUrl}` : detailData.highResUrl;
        }

        let extractedColor = null;
        if (imageUrl && imageUrl.startsWith('http')) {
          try {
            const response = await axios.get(imageUrl, { 
              responseType: 'arraybuffer', 
              timeout: 60000,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            let finalImageData = response.data;
            if (response.data.byteLength < 2000 && imageUrl.includes('width=2880')) {
                const fallbackUrl = imageUrl.replace('width=2880', 'width=1200');
                const retryScale = await axios.get(fallbackUrl, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (retryScale.data.byteLength > response.data.byteLength) {
                  finalImageData = retryScale.data;
                }
            }

            if (ncsCode) extractedColor = await getColorFromNcs(ncsCode);
            if (!extractedColor) extractedColor = await extractColorFromImage(finalImageData);

            const sharpInstance = (await import('sharp')).default;
            const finalLocalFile = path.join(localDir, `${slug}.png`);
            await sharpInstance(finalImageData)
              .resize(500, 500, { fit: 'cover', position: 'centre' })
              .png({ compressionLevel: 9, quality: 100 })
              .toFile(finalLocalFile);

            imageUrl = `/images/egger/${slug}.png`;
          } catch (e) {}
        }

        const panelName = detailData.nameFromH1 || name;
        const surfaceTexture = code.match(/ST\d+/) ? code.match(/ST\d+/)![0] : 'Standard';
        
        const hasGrain = !code.toUpperCase().startsWith('U') && 
                         !code.toUpperCase().startsWith('W') && 
                         !name.toLowerCase().includes('unicolor');

        const panelDoc = {
          id: slug,
          name: panelName,
          brand: 'Egger',
          width: 2800,
          height: 2070,
          thickness: 18,
          description: colorCharacter || `Melamina Egger de alta calidad. Diseño ${name} (${code}).`,
          patternSize,
          stock: 0,
          images: imageUrl ? [imageUrl] : [],
          mainImage: imageUrl,
          visible: true,
          updatedAt: serverTimestamp(),
          colorData: { ncs: ncsCode || null },
          hexColor: extractedColor?.hex || null,
          labColor: extractedColor?.lab || null,
          colorSource: extractedColor ? (ncsCode ? 'ncs' : 'image') : null,
          surfaceTexture,
          isSmooth: surfaceTexture === 'ST9' || name.toLowerCase().includes('mate'),
          hasGrain,
          code,
          url: detailUrl,
          colorGroup: null as any,
          colorHue: null as any,
        };

        if (panelDoc.labColor) {
          try {
            const classified = await classify(panelDoc as any);
            if (classified) {
              panelDoc.colorGroup = classified.colorGroup.toLowerCase();
              panelDoc.colorHue = classified.tone.toLowerCase();
            }
          } catch (e) {}
        }

        await setDoc(doc(firestore, 'panels', slug), panelDoc, { merge: true });
        count++;
      } catch (e: any) {
      } finally {
        await detailPage.close();
      }
    }));
    await delay(300);
  }

  await browser.close();
  return { success: true, count };
}
