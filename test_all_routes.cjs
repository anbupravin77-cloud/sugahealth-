const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
    console.log('PAGE ERROR:', err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  const routes = ['/', '/weight-loss', '/hair-growth', '/sexual-health', '/about', '/consultation', '/admin'];
  
  for (const r of routes) {
    console.log('--- Testing route:', r);
    await page.goto('http://127.0.0.1:3000' + r, { waitUntil: 'networkidle0' });
    await page.evaluate(() => new Promise(res => setTimeout(res, 500)));
  }

  // Now click all links on the home page and on weight-loss
  await page.goto('http://127.0.0.1:3000/weight-loss', { waitUntil: 'networkidle0' });
  const links = await page.$$('a');
  console.log(`Found ${links.length} links on /weight-loss`);
  for (let i = 0; i < links.length; i++) {
    try {
      const href = await page.evaluate(el => el.getAttribute('href'), links[i]);
      console.log(`Link ${i}: href=${href}`);
    } catch (e) {}
  }

  console.log('Total page errors caught:', errors.length);
  await browser.close();
})();
