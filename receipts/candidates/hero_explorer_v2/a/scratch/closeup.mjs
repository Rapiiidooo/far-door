// Throwaway: node closeup.mjs <out.png> <preset|json views> <file.js> [file.js ...]
// Files are paths relative to far-door/; renders one row per file.
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const HERE = '/receipts/candidates/hero_explorer_v2/a/scratch/';
const PRESETS = {
  full: { size: 420, views: [0, 90, 180, 270, 45].map((az) => ({ az, el: 12, dist: 4.6, at: [0, 0.95, 0], fov: 26 })) },
  upper: { size: 420, views: [0, 45, 90, 180, 315].map((az) => ({ az, el: 10, dist: 1.9, at: [0, 1.3, 0], fov: 26 })) },
  shoulders: { size: 420, views: [0, 60, 120, 180, 300].map((az) => ({ az, el: 25, dist: 1.2, at: [0, 1.4, 0], fov: 30 })) },
  hands: { size: 420, views: [0, 60, 90, 120, 180].map((az) => ({ az, el: 8, dist: 1.0, at: [0.26, 0.85, 0.12], fov: 26 })) },
  rhands: { size: 420, views: [0, 300, 270, 240, 180].map((az) => ({ az, el: 8, dist: 1.0, at: [-0.26, 0.85, 0.12], fov: 26 })) },
  hips: { size: 420, views: [0, 45, 90, 135, 180].map((az) => ({ az, el: 10, dist: 1.6, at: [0, 0.85, 0], fov: 26 })) },
};
const [out, which, ...files] = process.argv.slice(2);
const spec = { ...(PRESETS[which] || JSON.parse(which)), files: files.map((f) => '/' + path.relative(ROOT, path.resolve(f))) };
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
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setViewport({ width: spec.size * spec.views.length, height: spec.size * spec.files.length });
await page.goto(`http://127.0.0.1:${server.address().port}${HERE}closeup.html?spec=${encodeURIComponent(JSON.stringify(spec))}`, { waitUntil: 'load' });
await page.waitForFunction('window.__DONE__', { timeout: 120000 });
await page.screenshot({ path: out });
console.log(out);
await browser.close();
server.close();
