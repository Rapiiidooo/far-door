// Throwaway: node scratch/scene.mjs <out-prefix> [poses] [distances] — renders scene.html front and back.
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
const [out, poses = 'rest,run,hang', ds = '4,8'] = process.argv.slice(2);
for (const d of ds.split(',')) for (const back of [0, 1]) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.setViewport({ width: 1280, height: 720 });
  const qs = new URLSearchParams({ d, back, poses, src: path.dirname(REL) + '/hero_explorer_c.js' });
  await page.goto(`http://127.0.0.1:${server.address().port}${REL}/scene.html?${qs}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__DONE__', { timeout: 90000 });
  const file = `${out}_${d}m_${back ? 'back' : 'front'}.png`;
  await page.screenshot({ path: file });
  console.log(file);
  await page.close();
}
await browser.close();
server.close();
