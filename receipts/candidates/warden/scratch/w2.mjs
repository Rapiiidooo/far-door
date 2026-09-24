// Throwaway: serve far-door and screenshot scratch/w2.html.
//   node w2.mjs <out.png> <asset path relative to far-door>[,more] [--q=extra&query]
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = (await import(require.resolve('puppeteer'))).default;
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const args = process.argv.slice(2);
const extra = (args.find((a) => a.startsWith('--q=')) || '--q=').slice(4);
const [out, list] = args.filter((a) => !a.startsWith('--'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const gpuArgs = process.env.GPU === '1'
  ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox']
  : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'];
const browser = await puppeteer.launch({ headless: true, args: gpuArgs });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('  [page]', m.text().slice(0, 200)); });
const qs = new URLSearchParams(extra);
const size = +(qs.get('size') || 420);
const nViews = (qs.get('views') || 'a,b,c,d,e').split(',').length;
await page.setViewport({ width: size * nViews, height: size * 2 });
const files = (list || '').split(',').filter(Boolean).map((f) => '/' + f).join(',');
await page.goto(`${BASE}/receipts/candidates/warden/scratch/w2.html?files=${encodeURIComponent(files)}&${extra}`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction('window.__DONE__', { timeout: 180000 });
console.log(JSON.stringify(await page.evaluate(() => window.__INFO__)));
const el = await page.$('canvas:last-of-type');
await el.screenshot({ path: out });
await browser.close();
server.close();
console.log(out);
