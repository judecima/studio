const puppeteer = require('puppeteer');
const fs = require('fs');

async function test() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-ES,es;q=0.9' });
  
  await page.goto('https://www.egger.com/es/mobiliario-e-interiorismo/?country=CL', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 6000));
  
  const outerHtml = await page.evaluate(() => {
    // Find the element containing "H1181"
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.textContent && (el.textContent.includes('U250 PM') || el.textContent.includes('Beige Caramelo'))) {
         return el.parentElement?.parentElement?.parentElement?.parentElement?.outerHTML || el.outerHTML;
      }
    }
    return "Not found";
  });
  
  fs.writeFileSync('egger-product-html.txt', outerHtml);
  
  // also grab the cookiebot accept button string
  const cookiebotHtml = await page.evaluate(() => {
    return document.querySelector('#CybotCookiebotDialog')?.innerHTML;
  });
  fs.writeFileSync('cookiebot.html', cookiebotHtml || '');

  await browser.close();
}

test();
