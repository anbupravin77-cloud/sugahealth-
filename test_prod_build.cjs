const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');

(async () => {
  const app = express();
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const server = app.listen(3002);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => {
    errors.push(err);
    console.log('PROD PAGE ERROR:', err.message);
    console.log(err.stack);
  });
  page.on('console', msg => {
    console.log('PROD CONSOLE:', msg.type(), msg.text());
  });

  console.log('Loading prod build on :3002...');
  await page.goto('http://127.0.0.1:3002/', { waitUntil: 'networkidle0' });

  // Test various routes
  const routes = ['/weight-loss', '/hair-growth', '/sexual-health', '/about', '/consultation', '/admin'];
  for (const r of routes) {
    console.log('Navigating to', r);
    await page.goto('http://127.0.0.1:3002' + r, { waitUntil: 'networkidle0' });
  }

  console.log('Total prod errors:', errors.length);
  await browser.close();
  server.close();
})();
