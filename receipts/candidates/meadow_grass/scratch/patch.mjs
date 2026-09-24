// Scratch: render scratch/patch.html in headless Chrome with far-door served as the web root.
// usage: node patch.mjs --out=<png> --q='srcs=...&mode=isles&views=[[...]]&cw=640&ch=360'
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
const out = get('out', path.join(path.dirname(new URL(import.meta.url).pathname), 'patch.png'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('  console:', m.text()); });
page.on('pageerror', (e) => console.log('  pageerror:', e.message));
const p = new URLSearchParams(query);
const cw = +(p.get('cw') || 640), ch = +(p.get('ch') || 360);
const nv = JSON.parse(p.get('views') || '[[0]]').length, nr = (p.get('srcs') || '').split(',').filter(Boolean).length;
await page.setViewport({ width: cw * nv, height: ch * nr });
await page.goto(`${base}/receipts/candidates/meadow_grass/scratch/patch.html?${query}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__DONE__', { timeout: 240000 });
const info = await page.evaluate(() => window.__INFO__);
if (!info.ok) { console.log('FAIL', info.error); await browser.close(); server.close(); process.exit(1); }
for (const n of info.notes || []) console.log(' ', n);
await page.screenshot({ path: out });
console.log('ok', out);
await browser.close();
server.close();
