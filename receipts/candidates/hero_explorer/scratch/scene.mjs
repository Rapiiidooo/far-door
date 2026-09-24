// Throwaway: node scene.mjs <out-prefix> [files] — renders scene.html at 8 m and 15 m, front and back.
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/receipts/candidates/hero_explorer/scratch/scene.html`;
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const [out, files] = [process.argv[2], process.argv[3] || ''];
for (const [d, back] of [[8, 0], [8, 1], [15, 0], [15, 1]]) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`${base}?d=${d}&back=${back}${files ? '&files=' + files : ''}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__DONE__', { timeout: 60000 });
  const file = `${out}_${d}m_${back ? 'back' : 'front'}.png`;
  await page.screenshot({ path: file });
  console.log(file);
  await page.close();
}
await browser.close();
server.close();
