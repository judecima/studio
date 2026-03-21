const puppeteer = require('puppeteer');
const fs = require('fs');

async function test() {
  const START_URL = 'https://www.egger.com/es/mobiliario-e-interiorismo/?country=CL';
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
       'Accept-Language': 'es-ES,es;q=0.9',
  });
  console.log('Going to URL...');
  try {
    await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch(e) {
    console.log('Timeout caught, continuing');
  }
  
  await new Promise(r => setTimeout(r, 6000));
  
  const html = await page.content();
  fs.writeFileSync('egger-dom.html', html);

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(v => v);
  });
  
  fs.writeFileSync('egger-links.json', JSON.stringify(links, null, 2));
  console.log(`Found ${links.length} total links.`);
  
  await browser.close();
}

test();
