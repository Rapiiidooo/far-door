// Throwaway: node loader.mjs <asset path relative to far-door> — prints what game/assetlib.js makes of it.
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
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() !== 'log') console.log('console:', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/receipts/candidates/hero_explorer_v2/a/scratch/loader.html?src=${encodeURIComponent('/' + process.argv[2])}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 60000 });
console.log(JSON.stringify(await page.evaluate(() => window.__OUT__), null, 1));
await browser.close();
server.close();
