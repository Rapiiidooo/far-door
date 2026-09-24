// Throwaway: run loader.html headless and print what the game's loader returned.
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const puppeteer = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json')('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setViewport({ width: 900, height: 600 });
await page.goto(`http://127.0.0.1:${server.address().port}/receipts/candidates/hero_explorer_v2/b/scratch/loader.html`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 60000 });
console.log(JSON.stringify(await page.evaluate(() => window.__OUT__), null, 1));
await page.screenshot({ path: 'loader.png' });
await browser.close(); server.close();
