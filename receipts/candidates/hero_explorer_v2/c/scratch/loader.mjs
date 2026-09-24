// Throwaway: run loader.html headless and print what the game's loader returned.
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const puppeteer = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json')('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REL = '/' + path.relative(ROOT, HERE);
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setViewport({ width: 900, height: 600 });
await page.goto(`http://127.0.0.1:${server.address().port}${REL}/loader.html?src=${encodeURIComponent(path.dirname(REL) + '/hero_explorer_c.js')}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 60000 });
console.log(JSON.stringify(await page.evaluate(() => window.__OUT__)));
await page.screenshot({ path: path.join(HERE, 'shots', 'loader.png') });
await browser.close(); server.close();
