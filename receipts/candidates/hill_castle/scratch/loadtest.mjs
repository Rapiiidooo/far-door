// Scratch: serve the far-door folder read-only, run scratch/loadtest.html, print
// its findings and save its frame to scratch/loadtest.png.
//   node scratch/loadtest.mjs
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');   // far-door
const puppeteer = (await import('/Users/rapido/perso/bittensor/404/404-game-recipe/node_modules/puppeteer/lib/puppeteer/puppeteer.js')).default;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setViewport({ width: 1260, height: 420 });
await page.goto(`http://127.0.0.1:${server.address().port}/receipts/candidates/hill_castle/scratch/loadtest.html`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 120000 });
console.log(JSON.stringify(await page.evaluate(() => window.__RESULT__), null, 1));
await page.screenshot({ path: path.join(HERE, 'loadtest.png') });
await browser.close();
server.close();
