
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { initializeFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePanelId, adaptToProduct } from '../catalog-engine/catalog.adapter';
import { FAPLAC_SEED } from '../seeds/faplacSeed';

/**
 * @fileOverview Scraper Industrial Robusto V7.
 * - Integración total de la Línea Mesopotamia.
 * - Manejo híbrido de Puppeteer para JS y Axios para detalle.
 */

const BASE_URL = 'https://www.faplaconline.com.ar';
const CATALOG_URL = `${BASE_URL}/home/c/ar-faplac/ar-melaminas?p=1`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

export async function runIndustrialPipeline() {
  const { firestore } = initializeFirebase();
  
  console.log("🚀 Iniciando Pipeline Industrial V7 (Optimizado - Hibrido)...");
  let browser: any = null;
  
  try {
    // 1. Cargamos siempre la Línea Mesopotamia como base sólida
    await loadMesopotamiaLine(firestore);

    const allProductLinks = new Set<string>();

    console.log("🌐 Escaneando catálogo interactivo con Puppeteer...");
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);

    const targetPages = [
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=1`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=2`,
      `${BASE_URL}/home/c/ar-faplac/ar-melaminas?q=%3AreleaseDate&page=3`
    ];

    for (let idx = 0; idx < targetPages.length; idx++) {
      const pageUrl = targetPages[idx];
      console.log(`Página Principal (Desplazando en bloque ${idx + 1}/4)...`);
      
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Pequeño barrido hacia abajo por si hay lazy-loading de DOM
      await page.evaluate(async () => {
        window.scrollBy(0, document.body.scrollHeight / 2);
        await new Promise(r => setTimeout(r, 1000));
        window.scrollBy(0, document.body.scrollHeight);
      });
      
      await new Promise(r => setTimeout(r, 2000));

      const linksOnPage = await page.evaluate(() => {
        const links = new Set<string>();
        const allNodes = document.querySelectorAll('a');
        allNodes.forEach((a: any) => {
           if (a.href && a.href.includes('/home/p/')) {
              links.add(a.href.split('?')[0]);
           }
        });
        return Array.from(links);
      });

      linksOnPage.forEach((link: string) => allProductLinks.add(link));
    }

    console.log(`✅ Encontrados ${allProductLinks.size} enlaces únicos tras recorrer las 4 páginas del catálogo.`);

    // Do not close browser yet, we will use it for detail pages
    const productLinks = Array.from(allProductLinks);
    console.log(`📦 Enlaces únicos totales detectados: ${productLinks.length}`);

    let processedCount = 0;
    
    // Procesamiento en lotes (chunks) de 5 concurrencias para acelerar sin bloquear la red
    const chunkSize = 5;
    for (let i = 0; i < productLinks.length; i += chunkSize) {
      const chunk = productLinks.slice(i, i + chunkSize);
      
      await Promise.all(chunk.map(async (url) => {
        try {
          const detailPage = await browser.newPage();
          await detailPage.setUserAgent(HEADERS['User-Agent']);
          
          await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          const html = await detailPage.content();
          await detailPage.close();

          const productData = scrapeProductDetailFromHtml(url, html);
          if (!productData.name || !productData.imageUrl) return;

          const slug = normalizePanelId(productData.name);
          
          // --- NUEVO: Guardado Local en Next.js Public ---
          const localDir = path.join(process.cwd(), 'public', 'images', 'faplac');
          const localFilePath = path.join(localDir, `${slug}.jpg`);
          const finalImageUrl = `/images/faplac/${slug}.jpg`;
          
          try {
            if (!fs.existsSync(localFilePath)) {
              if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
              }
              const imageResponse = await axios.get(productData.imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: HEADERS
              });
              fs.writeFileSync(localFilePath, imageResponse.data);
            }
          } catch (e) {
            console.error(`⚠️ No se pudo guardar la imagen localmente para ${slug}.`);
          }

          // --- Adaptar a Interface Panel para el Frontend ---
          const hueMap: Record<string, string> = { 
             'rojo': 'rojo', 'bordo': 'rojo', 'blanco': 'blanco', 'marfil': 'blanco', 
             'negro': 'negro', 'grafito': 'negro', 'gris': 'gris', 'cemento': 'gris', 
             'beige': 'beige', 'arena': 'beige', 'marron': 'marron', 'nogal': 'marron' 
          };
          
          let materialHue = 'otros';
          for (const [key, val] of Object.entries(hueMap)) {
            if ((productData.name + ' ' + productData.description).toLowerCase().includes(key)) {
               materialHue = val; break;
            }
          }

          const isDark = (productData.name + productData.description).toLowerCase().match(/(negro|oscuro|tabaco|notte)/);
          const isLight = (productData.name + productData.description).toLowerCase().match(/(blanco|claro|nieve|crema|marfil)/);

          const panelDoc = {
            id: slug,
            name: productData.name,
            brand: "Faplac",
            width: 1830,
            height: 2750,
            thickness: 18,
            description: productData.description,
            stock: 0,
            images: [finalImageUrl],
            mainImage: finalImageUrl,
            visible: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            colorGroup: isDark ? 'oscuro' : isLight ? 'claro' : 'medio',
            colorHue: materialHue,
            styleTags: ['moderno', 'industrial'],
            useCases: ['cocina', 'placard', 'oficina'],
            code: productData.sku || "",
            surfaceTexture: productData.surfaceTexture || "",
            isSmooth: !!productData.isSmooth,
            launchYear: productData.launchYear || 0,
            applications: productData.aplicaciones || [],
            antiFingerprint: !!productData.antiFingerprint,
            finish: productData.finish || "",
            hasGrain: !!productData.hasGrain
          };

          await setDoc(doc(firestore, 'panels', panelDoc.id), panelDoc, { merge: true });
          
          processedCount++;
        } catch (err: any) {
          console.error(`⚠️ Error en ${url}:`, err.message);
        }
      }));
    }
    await browser.close();
    return { success: true, count: processedCount + FAPLAC_SEED.filter(p => p.line === 'Mesopotamia').length };

  } catch (error: any) {
    if (browser) await browser.close();
    console.error("❌ Falló el scraper dinámico, usando base Mesopotamia enriquecida.", error.message);
    return { success: true, count: FAPLAC_SEED.filter(p => p.line === 'Mesopotamia').length, note: "Sincronización limitada a Línea Mesopotamia." };
  }
}

async function loadMesopotamiaLine(firestore: any) {
  console.log("📥 Inyectando metadatos oficiales de la Línea Mesopotamia...");
  for (const item of FAPLAC_SEED.filter(p => p.line === 'Mesopotamia')) {
    const slug = normalizePanelId(item.name);
    // Usamos imágenes industriales temáticas para Mesopotamia mientras se capturan las finales
    const mockUrl = `https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80&w=800&h=600&madera=${slug}`;
    
    const hueMap: Record<string, string> = { 
       'rojo': 'rojo', 'bordo': 'rojo', 'blanco': 'blanco', 'marfil': 'blanco', 
       'negro': 'negro', 'grafito': 'negro', 'gris': 'gris', 'cemento': 'gris', 
       'beige': 'beige', 'arena': 'beige', 'marron': 'marron', 'nogal': 'marron' 
    };
    
    let materialHue = 'otros';
    for (const [key, val] of Object.entries(hueMap)) {
      if ((item.name + ' ' + item.description).toLowerCase().includes(key)) {
         materialHue = val; break;
      }
    }

    const isDark = (item.name + item.description).toLowerCase().match(/(negro|oscuro|tabaco|notte)/);
    const isLight = (item.name + item.description).toLowerCase().match(/(blanco|claro|nieve|crema|marfil)/);

    const panelDoc = {
      id: slug,
      name: item.name,
      brand: item.brand || "Faplac",
      width: item.width || 1830,
      height: item.height || 2750,
      thickness: item.thickness || 18,
      hasGrain: true, // Typical for Mesopotamia
      description: item.description || "Tablero melamínico de la Línea Mesopotamia.",
      stock: 0,
      images: [mockUrl],
      mainImage: mockUrl,
      visible: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      colorGroup: isDark ? 'oscuro' : isLight ? 'claro' : 'medio',
      colorHue: materialHue,
      styleTags: ['moderno', 'Madera'],
      useCases: ['muebles', 'revestimiento']
    };
    
    await setDoc(doc(firestore, 'panels', panelDoc.id), panelDoc, { merge: true });
  }
}

/**
 * Función auxiliar para extraer el detalle usando HTML prerenderizado
 */
function scrapeProductDetailFromHtml(url: string, html: string) {
  try {
    const $ = cheerio.load(html);

    let name = $('h1.name').first().contents().filter(function() {
      return this.type === 'text';
    }).text().trim();
    if (!name) name = $('.page-title .base').text().trim();
    if (!name) name = $('h1').first().text().trim();

    const description = $('.product.info.overview').text().trim() || 
                        $('.description').first().text().trim() || 
                        $('.product.attribute.description .value').text().trim() || 
                        $('meta[name="description"]').attr('content') || 
                        "Tablero melamínico de alta calidad.";
    
    const aplicaciones = $('.product.attribute.usos .value').text().split(',').map(s => s.trim()).filter(Boolean) || [];
    
    let imageUrl = $('img.img-responsive.m-center').attr('src') ||
                   $('meta[property="og:image"]').attr('content') || 
                   $('.gallery-placeholder__image').attr('src') || "";

    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${BASE_URL}${imageUrl}`;
    }

    // Extraer propiedades adicionales de la ficha
    const isSmoothText = $('.product.attribute.liso').text().toLowerCase() || '';
    const isSmooth = isSmoothText.includes('si') || isSmoothText.includes('true');
    const surfaceTexture = $('.product.attribute.textura .value').text().trim() || undefined;
    const launchYearText = $('.product.attribute.lanzamiento .value').text().trim() || '';
    const launchYear = launchYearText ? parseInt(launchYearText) : undefined;
    const launch = !!launchYearText || description.toLowerCase().includes('lanzamiento');
    const sku = $('.code.hidden').text().trim() || $('.product.attribute.sku .value').text().trim() || $('.sku').text().trim() || "";

    // Heuristica para Linea
    let detectedLine = 'Línea Mesopotamia'; // Default para tests si falla
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('blend') || url.includes('-blend')) detectedLine = 'Línea Blend';
    else if (lowerDesc.includes('étnica') || url.includes('etnica')) detectedLine = 'Línea Étnica';
    else if (lowerDesc.includes('urban concept') || url.includes('urban-concept')) detectedLine = 'Línea Urban Concept';
    else if (lowerDesc.includes('nórdica') || url.includes('nordica')) detectedLine = 'Línea Nórdica';
    else if (lowerDesc.includes('hilados') || url.includes('hilados')) detectedLine = 'Línea Hilados';
    else if (lowerDesc.includes('nature') || url.includes('nature')) detectedLine = 'Línea Nature';

    const antiFingerprint = lowerDesc.includes('anti-huella') || lowerDesc.includes('soft touch') || lowerDesc.includes('perfect sense');
    const finish = lowerDesc.includes('mate') ? 'Mate' : (lowerDesc.includes('brillo') ? 'Brillante' : 'Seda / Natural');
    const hasGrain = !lowerDesc.includes('unícolor') && !name.toLowerCase().includes('blanco') && (lowerDesc.includes('veta') || lowerDesc.includes('madera') || !!detectedLine?.includes('Nature'));

    return { name, description, imageUrl, brand: 'Faplac', linea: detectedLine, isSmooth, surfaceTexture, launchYear, launch, sku, aplicaciones, antiFingerprint, finish, hasGrain };
  } catch (e) {
    return { name: "", description: "", imageUrl: "", brand: 'Faplac', isSmooth: false, launch: false, aplicaciones: [] };
  }
}
