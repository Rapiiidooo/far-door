// Scratch: render scratch/preview.html for the given modules into scratch/<out>.png.
//   node scratch/preview.mjs out.png [--size=480] [--views=0:12,90:5] [--poses=a:25;b:-25,...] [--zoom=1] forest_deer_a.js [...]
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '..');
const puppeteer = (await import('/Users/rapido/perso/bittensor/404/404-game-recipe/node_modules/puppeteer/lib/puppeteer/puppeteer.js')).default;
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const [out, ...mods] = args.filter((a) => !a.startsWith('--'));
const size = +opt('size', 480);
const views = opt('views', '0:12,90:5,180:12,270:5,35:25');
const poses = opt('poses', '');
const zoom = opt('zoom', '1');
const target = opt('target', '');
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
page.on('pageerror', (e) => console.log('pageerror:', e.message));
const nViews = views.split(',').length;
await page.setViewport({ width: size * nViews, height: size * mods.length });
const src = mods.map((m) => `/${m}?t=${Date.now()}`).join(',');
const qs = new URLSearchParams({ src, size: String(size), views, poses, zoom, target });
await page.goto(`${base}/scratch/preview.html?${qs}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 90000 });
await page.screenshot({ path: path.join(HERE, out) });
await browser.close();
server.close();
console.log('wrote', path.join(HERE, out));
