// Serves the far-door folder, opens scratch/preview.html in headless Chrome and saves the
// game-like preview of the candidates. Usage: node preview.mjs [a,b,c] [out.png]
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const names = process.argv[2] || 'a,b,c';
const close = process.argv.includes('--close');
const out = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : path.join(ROOT, 'receipts/candidates/mira_scarf/scratch/ingame_preview.png');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };

const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
const n = names.split(',').length;
await page.setViewport({ width: (close ? 900 : 640) * n, height: close ? 1120 : 1200 });
page.on('console', (m) => console.log('page:', m.text()));
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/receipts/candidates/mira_scarf/scratch/preview.html?names=${names}${close ? '&close=1' : ''}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 120000 });
console.log(JSON.stringify(await page.evaluate(() => window.__INFO__)));
await page.screenshot({ path: out });
await browser.close();
server.close();
console.log('wrote', out);
