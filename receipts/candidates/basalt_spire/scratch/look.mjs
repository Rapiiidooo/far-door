// Scratch: node look.mjs <asset.js> <out.png> '<shots json>' [w] [h] [sky] [ground]
import { createRequire } from 'module';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/harness/verify.mjs');
const puppeteer = require('puppeteer');
const [asset, out, shots, w = '900', h = '600', sky = '#c9b79a', ground = '#b08a60', extra = ''] = process.argv.slice(2);
const here = path.dirname(new URL(import.meta.url).pathname);
const assetDir = path.dirname(path.resolve(asset));
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = u.startsWith('/asset/') ? path.join(assetDir, u.slice(7)) : path.join(here, u);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const n = JSON.parse(shots).length;
await page.setViewport({ width: +w * n, height: +h });
const qs = new URLSearchParams({ src: `/asset/${path.basename(asset)}?t=${Date.now()}`, shots, w, h, sky, ground, ...Object.fromEntries(new URLSearchParams(extra)) });
await page.goto(`http://127.0.0.1:${port}/look.html?${qs}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 120000 });
const info = await page.evaluate(() => window.__INFO__);
await page.screenshot({ path: out });
await browser.close(); server.close();
console.log(JSON.stringify(info));
