const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message, err.stack);
  });
  
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    return new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  // Try to click links
  const links = await page.$$('a');
  for (const link of links) {
    try {
      await link.click();
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
    } catch (e) {}
  }
  
  await browser.close();
})();
