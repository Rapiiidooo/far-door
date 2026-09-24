// Scratch: render the composite sheet (view.html) to scratch/view.png.
// usage: node view.mjs ice_casing_a,ice_casing_b [size]
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from '/Users/rapido/perso/bittensor/404/far-door/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAND = path.resolve(HERE, '..');
const THREE_DIR = '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build';
const STELA = '/Users/rapido/perso/bittensor/404/far-door/game/assets/glyph_stela.js';
const files = process.argv[2] || 'ice_casing_a';
const size = +(process.argv[3] || 300);
const out = process.argv[4] || path.join(HERE, 'view.png');

const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = null;
  if (u === '/view.html') f = path.join(HERE, 'view.html');
  else if (u === '/stela.js') f = STELA;
  else if (u.startsWith('/three/')) f = path.join(THREE_DIR, u.slice(7));
  else if (u.startsWith('/cand/')) f = path.join(CAND, u.slice(6));
  if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
const n = files.split(',').length;
await page.setViewport({ width: size * 7, height: size * n, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('page:', m.text()));
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/view.html?files=${files}&size=${size}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 120000 });
await page.screenshot({ path: out });
await browser.close();
server.close();
console.log('wrote', out);
