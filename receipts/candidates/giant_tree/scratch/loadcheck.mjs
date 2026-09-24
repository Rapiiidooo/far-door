// Serve the game folder and the candidates, run loadcheck.html, save a PNG and print the checks.
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '..');
const game = path.resolve(here, '../../../../game');
const names = process.argv[2] || 'giant_tree_a,giant_tree_b,giant_tree_c';
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = null;
  if (u.startsWith('/c/')) f = path.join(assets, u.slice(3));
  else if (u.startsWith('/game/')) f = path.join(game, u.slice(6));
  else if (u === '/loadcheck.html') f = path.join(here, 'loadcheck.html');
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
page.on('console', (m) => { if (!/GL Driver/.test(m.text())) console.log('page:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setViewport({ width: 420 * names.split(',').length, height: 420 });
await page.goto(`http://127.0.0.1:${server.address().port}/loadcheck.html?n=${names}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 120000 });
await page.screenshot({ path: path.join(here, 'loadcheck.png') });
await browser.close();
server.close();
