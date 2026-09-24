// Scratch: render scratch/preview.html for the given modules into scratch/<out>.png.
//   node scratch/preview.mjs out.png glow_mushroom_a.js [...]
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '..');
const puppeteer = (await import('/Users/rapido/perso/bittensor/404/404-game-recipe/node_modules/puppeteer/lib/puppeteer/puppeteer.js')).default;
const [out, ...mods] = process.argv.slice(2);
const size = 360;
const server = createServer((req, res) => {
  const file = path.join(DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
page.on('console', (m) => console.log('page:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setViewport({ width: size * 5, height: size * mods.length });
const src = mods.map((m) => `/${m}?t=${Date.now()}`).join(',');
await page.goto(`${base}/scratch/preview.html?src=${encodeURIComponent(src)}&size=${size}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 90000 });
await page.screenshot({ path: path.join(HERE, out) });
await browser.close();
server.close();
console.log('wrote', path.join(HERE, out));
