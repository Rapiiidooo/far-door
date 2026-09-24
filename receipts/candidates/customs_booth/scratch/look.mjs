// Throwaway: serve far-door and screenshot scratch/look.html.
//   node look.mjs <out.png> "<query string for look.html>"
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = (await import(require.resolve('puppeteer'))).default;
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const [out, query] = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('  [page]', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
const q = new URLSearchParams(query);
const S = +(q.get('size') || 420);
const ns = q.get('src').split(',').length, nv = (q.get('views') || 'a;b;c;d;e').split(';').length;
const cols = +(q.get('cols') || (ns > 1 ? ns : Math.min(3, nv))), rows = Math.ceil((ns * nv) / cols);
await page.setViewport({ width: S * cols, height: S * rows });
await page.goto(`http://127.0.0.1:${server.address().port}/receipts/candidates/customs_booth/scratch/look.html?${query}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 180000 });
console.log(JSON.stringify(await page.evaluate(() => window.__INFO__)));
await (await page.$('canvas')).screenshot({ path: out });
await browser.close();
server.close();
console.log(out);
