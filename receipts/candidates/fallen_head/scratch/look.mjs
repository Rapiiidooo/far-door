// Throwaway: render a placement of assets in the game's own light.
// usage: node look.mjs --out=<png> --place='[[src,x,z,yaw],...]' --views='[[cx,cy,cz,lx,ly,lz,fov],...]' [--ground=sand] [--w=800 --h=450 --cols=2]
// src paths are relative to the far-door root, e.g. /game/assets/hero_explorer.js
import { createRequire } from 'module';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = path.resolve(arg('out', 'look.png'));
const params = new URLSearchParams({
  place: arg('place', '[]'), views: arg('views', '[]'), ground: arg('ground', 'floor'),
  w: arg('w', '800'), h: arg('h', '450'), cols: arg('cols', '2'), hour: arg('hour', '15.2'), az: arg('az', '236'),
});
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
const W = +params.get('w'), H = +params.get('h'), cols = +params.get('cols');
const n = JSON.parse(params.get('views')).length;
await page.setViewport({ width: W * cols, height: H * Math.ceil(n / cols) });
await page.goto(`${base}/receipts/candidates/fallen_head/scratch/look.html?${params}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 300000 });
const info = await page.evaluate(() => window.__INFO__);
const el = await page.$('#out');
await el.screenshot({ path: out });
console.log(info.ok ? 'ok' : 'FAIL ' + info.error, out);
await browser.close();
server.close();
