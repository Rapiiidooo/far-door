// Throwaway: renders chosen views of one candidate through look.html.
// usage: node look.mjs <asset.js relative to field_radio/> <out.png> [views] [size] [game]
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const puppeteer = (await import('/Users/rapido/perso/bittensor/404/404-game-recipe/node_modules/puppeteer/lib/puppeteer/puppeteer.js')).default;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [asset, out, views = '0:25:1', size = '480', game = '0'] = process.argv.slice(2);
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const n = views.split(',').length, s = +size, w = game === '1' ? Math.round(s * 16 / 9) : s;
await page.setViewport({ width: w * n, height: s });
page.on('console', (m) => console.log('page:', m.text()));
await page.goto(`${base}/scratch/look.html?src=${encodeURIComponent('/' + asset + '?t=' + Date.now())}&size=${s}&views=${views}&game=${game}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 90000 });
const err = await page.evaluate(() => window.__ERR__);
if (err) console.log('ERROR', err);
await page.screenshot({ path: out });
await browser.close();
server.close();
console.log('wrote', out);
