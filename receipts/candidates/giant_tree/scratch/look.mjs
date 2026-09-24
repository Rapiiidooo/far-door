// Serve the candidates and the game's three (r186), render scratch/look.html, save a PNG.
//   node look.mjs [out.png] [names,comma,separated] [size] [views] [fog]
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '..');
const three = path.resolve(here, '../../../../node_modules/three/build');
const out = path.resolve(here, process.argv[2] || 'look.png');
const names = process.argv[3] || 'giant_tree_a,giant_tree_b,giant_tree_c';
const size = process.argv[4] || '420';
const view = process.argv[5] || '';
const fog = process.argv[6] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = null;
  if (u.startsWith('/c/')) f = path.join(assets, u.slice(3));
  else if (u.startsWith('/three/')) f = path.join(three, u.slice(7));
  else if (u === '/look.html') f = path.join(here, 'look.html');
  if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
page.on('console', (m) => console.log('page:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
const n = names.split(',').length;
const nv = view ? view.split(';').length : 4;
await page.setViewport({ width: nv * +size, height: n * +size });
await page.goto(`http://127.0.0.1:${server.address().port}/look.html?n=${names}&size=${size}${view ? `&view=${encodeURIComponent(view)}` : ''}${fog ? `&fog=${fog}` : ''}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 120000 });
await page.screenshot({ path: out });
await browser.close();
server.close();
console.log('wrote', out);
