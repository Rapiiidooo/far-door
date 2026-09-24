// Throwaway: node closeup.mjs jobs.json  -> renders each job to its png
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json');
const puppeteer = require('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/receipts/candidates/hero_explorer_v2/b/scratch/closeup.html`;
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const job of jobs) {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  const tile = job.tile || 420, cols = job.cols || job.views.length, rows = Math.ceil(job.views.length / cols);
  await page.setViewport({ width: tile * cols, height: tile * rows });
  await page.goto(`${base}#${encodeURIComponent(JSON.stringify(job))}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__DONE__', { timeout: 120000 });
  await page.screenshot({ path: job.out });
  const info = await page.evaluate(() => window.__INFO__);
  console.log(job.out, JSON.stringify(info));
  await page.close();
}
await browser.close();
server.close();
