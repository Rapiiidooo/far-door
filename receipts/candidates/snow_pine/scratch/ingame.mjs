// Scratch preview: serves far-door, renders scratch/ingame.html at two distances.
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const HERE = path.join(ROOT, 'receipts/candidates/snow_pine/scratch');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
for (const [dist, camy] of [[15, 3.2], [30, 4.5]]) {
  const page = await browser.newPage();
  page.on('console', (m) => console.log('page:', m.text()));
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.setViewport({ width: 1500, height: 640 });
  await page.goto(`${base}/receipts/candidates/snow_pine/scratch/ingame.html?dist=${dist}&camy=${camy}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__DONE__', { timeout: 120000 });
  console.log(dist, JSON.stringify(await page.evaluate(() => window.__INFO__)));
  await page.screenshot({ path: path.join(HERE, `ingame_${dist}m.png`) });
  await page.close();
}
await browser.close();
server.close();
