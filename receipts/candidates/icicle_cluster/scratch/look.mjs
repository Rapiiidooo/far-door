// Scratch driver for look.html, not a gate. usage:
//   node look.mjs --out=<png> [--q=<extra query string>] <asset.js>
// Serves the far-door folder read-only so the page can use the game's vendored three.js
// (r186) and assetlib, then screenshots the composed views.
import { createRequire } from 'module';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const file = args.find((a) => !a.startsWith('--'));
const outPng = path.resolve(opt('out', 'look.png'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') console.log('  console:', m.text()); });
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
await page.setViewport({ width: 2600, height: 2000 });
const here = '/' + path.relative(ROOT, path.dirname(new URL(import.meta.url).pathname));
const src = encodeURIComponent('/' + path.relative(ROOT, path.resolve(file)) + '?v=' + Date.now());
await page.goto(`${base}${here}/look.html?src=${src}&${opt('q', '')}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 180000 });
const info = await page.evaluate(() => window.__INFO__);
const canvas = await page.$('canvas');
await canvas.screenshot({ path: outPng });
console.log(info && info.ok ? 'ok ' + JSON.stringify(info) : 'FAIL ' + (info && info.error), outPng);
await browser.close();
server.close();
