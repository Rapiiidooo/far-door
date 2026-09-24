// Throwaway: render assets in a game-like scene. usage: node look.mjs <asset.js>... [--q=extra&query]
import { createRequire } from 'module';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const args = process.argv.slice(2);
const extra = (args.find((a) => a.startsWith('--q=')) || '--q=').slice(4);
const tag = (args.find((a) => a.startsWith('--tag=')) || '--tag=look').slice(6);
const files = args.filter((a) => !a.startsWith('--'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const f of files) {
  const abs = path.resolve(f);
  const rel = '/' + path.relative(ROOT, abs);
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('  console:', m.text()); });
  const vw = +((args.find((a) => a.startsWith('--vw=')) || '--vw=1600').slice(5));
  const vh = +((args.find((a) => a.startsWith('--vh=')) || '--vh=900').slice(5));
  await page.setViewport({ width: vw, height: vh });
  const here = '/' + path.relative(ROOT, path.dirname(new URL(import.meta.url).pathname));
  await page.goto(`${base}${here}/${process.env.PAGE || 'look.html'}?src=${encodeURIComponent(rel)}&${extra}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__DONE__', { timeout: 120000 });
  const info = await page.evaluate(() => window.__INFO__);
  const out = path.join(path.dirname(new URL(import.meta.url).pathname), `${tag}_${path.basename(f, '.js')}.png`);
  await page.screenshot({ path: out });
  console.log(info.ok ? 'ok' : 'FAIL ' + info.error, out);
  await page.close();
}
await browser.close();
server.close();
