// Throwaway: node scene.mjs -> renders scene.html at 4 m and 8 m, front and back, rest and run.
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const puppeteer = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json')('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/receipts/candidates/hero_explorer_v2/b/scratch/scene.html`;
const browser = await puppeteer.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const files = ['/game/assets/hero_explorer.js', '/receipts/candidates/hero_explorer_v2/b/hero_explorer_b.js'];
const RUN = { leftUpperArm: [0.6], leftLowerArm: [-1.4], rightUpperArm: [-0.7], rightLowerArm: [-0.4], leftUpperLeg: [-1.0], leftLowerLeg: [1.2], rightUpperLeg: [0.6], rightLowerLeg: [0.3] };
for (const [d, back, poseName] of [[4, 1, 'rest'], [8, 1, 'rest'], [4, 0, 'rest'], [4, 1, 'run'], [8, 0, 'run']]) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`${base}#${encodeURIComponent(JSON.stringify({ files, d, back, pose: poseName === 'run' ? RUN : {} }))}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__DONE__', { timeout: 90000 });
  const file = `shots/dist_${poseName}_${d}m_${back ? 'back' : 'front'}.png`;
  await page.screenshot({ path: file });
  console.log(file);
  await page.close();
}
await browser.close();
server.close();
