// Throwaway: render a scratch look page in headless Chrome, far-door served as the web root.
// usage: node look.mjs --page=/receipts/.../look.html --out=<png prefix> --q='srcs=...&views=[[...]]'
import { createRequire } from 'module';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const args = process.argv.slice(2);
const get = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).slice(k.length + 3);
const query = get('q', '');
const pagePath = get('page', '/receipts/candidates/expedition_rope/scratch/look.html');
const out = get('out', path.join(path.dirname(new URL(import.meta.url).pathname), 'look'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('  console:', m.text()); });
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
const w = +get('w', 1280), h = +get('h', 720);
await page.setViewport({ width: w, height: h });
await page.goto(`${base}${pagePath}?w=${w}&h=${h}&${query}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__DONE__', { timeout: 240000 });
const info = await page.evaluate(() => window.__INFO__);
if (!info.ok) { console.log('FAIL', info.error); await browser.close(); server.close(); process.exit(1); }
console.log('info', JSON.stringify(info));
const n = await page.evaluate(() => window.__VIEWS__);
for (let i = 0; i < n; i++) {
  await page.evaluate((k) => window.shot(k), i);
  const file = `${out}_${i}.png`;
  await page.screenshot({ path: file });
  console.log('ok', file);
}
await browser.close();
server.close();
