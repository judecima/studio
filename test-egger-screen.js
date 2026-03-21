const puppeteer = require('puppeteer');

async function test() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setExtraHTTPHeaders({
       'Accept-Language': 'es-ES,es;q=0.9',
  });
  
  try {
    await page.goto('https://www.egger.com/es/mobiliario-e-interiorismo/?country=CL', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'egger-splash.png', fullPage: true });

    await page.goto('https://www.egger.com/es/productos/?country=CL', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'egger-productos.png', fullPage: true });
    
  } catch(e) {
    console.log('Error', e);
  }
  
  await browser.close();
}

test();
