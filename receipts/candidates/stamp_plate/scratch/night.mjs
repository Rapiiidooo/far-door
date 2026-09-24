// Throwaway driver for night.html (adapted from crystal_emitter/scratch). usage:
//   node night.mjs --out=<png> [--q=<extra query>] <asset.js>...
// Serves the far-door folder read-only, so the page can load the game's own
// vendored three.js and assetlib, and screenshots the composed views.
import { createRequire } from 'module';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const files = args.filter((a) => !a.startsWith('--'));
const outPng = path.resolve(opt('out', 'night.png'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
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
await page.setViewport({ width: 2600, height: 2000 });
const here = '/' + path.relative(ROOT, path.dirname(new URL(import.meta.url).pathname));
const srcs = files.map((f) => 'src=' + encodeURIComponent('/' + path.relative(ROOT, path.resolve(f)))).join('&');
await page.goto(`${base}${here}/night.html?${srcs}&${opt('q', '')}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 180000 });
const info = await page.evaluate(() => window.__INFO__);
const canvas = await page.$('canvas');
await canvas.screenshot({ path: outPng });
console.log(info.ok ? 'ok' : 'FAIL ' + info.error, outPng);
await browser.close();
server.close();
