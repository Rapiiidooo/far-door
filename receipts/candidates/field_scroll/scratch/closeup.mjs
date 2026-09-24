// node scratch/closeup.mjs <name> <out.png> [views] [size] [ground]
// Serves far-door/ so the page can load node_modules/three (r186, the game's version).
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const puppeteer = (await import('/Users/rapido/perso/bittensor/404/404-game-recipe/node_modules/puppeteer/lib/puppeteer/puppeteer.js')).default;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');   // far-door/
const [name, out, views = '', size = '600', ground = '0'] = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const rel = path.relative(ROOT, HERE);
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const nViews = views ? views.split(',').length : 1;
await page.setViewport({ width: +size * nViews, height: +size });
page.on('console', (m) => console.log('page:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
const src = `/${rel}/../${name}.js?t=${Date.now()}`;
await page.goto(`${base}/${rel}/closeup.html?src=${encodeURIComponent(src)}&size=${size}&views=${encodeURIComponent(views)}&ground=${ground}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 60000 });
await page.screenshot({ path: out });
await browser.close();
server.close();
console.log('wrote', out);
