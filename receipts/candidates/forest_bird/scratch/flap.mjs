// Throwaway: render scratch/flap.html in headless Chrome with far-door served as the web root.
// usage: node flap.mjs [--page=ingame.html] --out=<png> --q='srcs=/receipts/...js,...&poses=0,40,-40&views=[[30,20,1.25]]&size=360'
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
const pageName = get('page', 'flap.html');
const out = get('out', path.join(path.dirname(new URL(import.meta.url).pathname), 'flap.png'));
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
await page.setViewport({ width: 400, height: 300 });
await page.goto(`${base}/receipts/candidates/forest_bird/scratch/${pageName}?${query}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__DONE__', { timeout: 240000 });
const info = await page.evaluate(() => window.__INFO__);
if (!info.ok) { console.log('FAIL', info.error); await browser.close(); server.close(); process.exit(1); }
await page.setViewport({ width: info.w, height: info.h });
const el = await page.$('canvas');
const shots = await page.evaluate(() => window.__VIEWS__ || 0);
if (shots) {
  for (let k = 0; k < shots; k++) {
    await page.evaluate((i) => window.shot(i), k);
    const file = out.replace(/\.png$/, `_${k}.png`);
    await el.screenshot({ path: file });
    console.log('ok', file, `${info.w}x${info.h}`);
  }
} else {
  await el.screenshot({ path: out });
  console.log('ok', out, `${info.w}x${info.h}`);
}
await browser.close();
server.close();
