// Throwaway: node scene.mjs <out.png> <d> <az> <pose-json|-> <file.js>... (files relative to far-door/)
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const [out, d, az, pose, ...files] = process.argv.slice(2);
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
await page.setViewport({ width: 1280, height: 720 });
const urls = files.map((f) => '/' + path.relative(ROOT, path.resolve(f))).join(',');
const q = `files=${encodeURIComponent(urls)}&d=${d}&az=${az}` + (pose !== '-' ? `&pose=${encodeURIComponent(pose)}` : '');
await page.goto(`http://127.0.0.1:${server.address().port}/receipts/candidates/hero_explorer_v2/a/scratch/scene.html?${q}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 120000 });
await page.screenshot({ path: out });
console.log(out);
await browser.close();
server.close();
