// Scratch only: render scratch/context.html for a few camera positions.
//   node scratch/context.mjs <out-prefix> [a,b,c]
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const puppeteer = (await import('/Users/rapido/perso/bittensor/404/404-game-recipe/node_modules/puppeteer/lib/puppeteer/puppeteer.js')).default;
const [prefix = 'ctx', cands = 'a,b,c'] = process.argv.slice(2);

const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const shots = {
  far: { cam: '0,4,32,0,4.2,0', fov: 44, w: 1500, h: 620 },
  near: { cam: '0,3,14,0,4.4,0', fov: 70, w: 1500, h: 620 },
  quarter: { cam: '-15,5,13,-2,4,0', fov: 55, w: 1500, h: 620 },
};
for (const [name, s] of Object.entries(shots)) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('page:', m.text()); });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.setViewport({ width: s.w, height: s.h });
  await page.goto(`${base}/scratch/context.html?c=${cands}&cam=${s.cam}&fov=${s.fov}&w=${s.w}&h=${s.h}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__DONE__', { timeout: 90000 });
  await page.screenshot({ path: path.join(HERE, `${prefix}_${name}.png`) });
  await page.close();
}
await browser.close();
server.close();
console.log('done');
