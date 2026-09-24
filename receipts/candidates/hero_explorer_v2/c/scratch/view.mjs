// Throwaway: node scratch/view.mjs <pose>:<viewset>[:tag] ... [--sun] [--src=<file in c/>]
// Renders view.html headless for a named pose and a named set of close views.
import { createServer } from 'http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const puppeteer = createRequire('/Users/rapido/perso/bittensor/404/404-game-recipe/package.json')('puppeteer');
const ROOT = '/Users/rapido/perso/bittensor/404/far-door';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REL = '/' + path.relative(ROOT, HERE);
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const srcFlag = flags.find((f) => f.startsWith('--src='));
const src = path.join(path.dirname(REL), srcFlag ? srcFlag.slice(6) : 'hero_explorer_c.js');

const jobs = args.map((a) => a.split(':'));
const POSES = {
  rest: {},
  hang: { leftUpperArm: [-2.9], rightUpperArm: [-2.9] },
  run: { leftUpperLeg: [-1.0], leftLowerLeg: [1.2], rightUpperLeg: [0.6], rightLowerLeg: [0.3],
    leftUpperArm: [0.6], leftLowerArm: [-1.4], rightUpperArm: [-0.7], rightLowerArm: [-0.4] },
  runm: { rightUpperLeg: [-1.0], rightLowerLeg: [1.2], leftUpperLeg: [0.6], leftLowerLeg: [0.3],
    rightUpperArm: [0.6], rightLowerArm: [-1.4], leftUpperArm: [-0.7], leftLowerArm: [-0.4] },
  push: { leftUpperArm: [-1.4], rightUpperArm: [-1.4], leftLowerArm: [-0.5], rightLowerArm: [-0.5] },
  t: { leftUpperArm: [0, 0, 1.5], rightUpperArm: [0, 0, -1.5] },
  elbow: { leftLowerArm: [-2.27], rightLowerArm: [-2.27] },
  flex: { leftHand: [0.6, 0, 0.4], rightHand: [0.6, 0, 0.4] },
  back: { leftUpperArm: [0.785], rightUpperArm: [0.785] },
  thighs: { leftUpperLeg: [-1.047], rightUpperLeg: [0.611] },
  thighsm: { rightUpperLeg: [-1.047], leftUpperLeg: [0.611] },
  // two of the game's own extremes (hero-anim.js): the top of a jump and the roll tuck
  air: { leftUpperArm: [-0.9, 0, 0.75], rightUpperArm: [-0.9, 0, -0.75], leftLowerArm: [-0.4], rightLowerArm: [-0.4],
    leftUpperLeg: [-0.85, 0, 0.04], leftLowerLeg: [1.35], rightUpperLeg: [-0.55, 0, -0.04], rightLowerLeg: [1.1], spine: [0.28], head: [-0.2] },
  roll: { leftUpperArm: [-1.4, 0, 0.3], rightUpperArm: [-1.4, 0, -0.3], leftLowerArm: [-1.6], rightLowerArm: [-1.6],
    leftUpperLeg: [-1.9], rightUpperLeg: [-1.8], leftLowerLeg: [2.2], rightLowerLeg: [2.1], spine: [0.9], head: [0.5] },
};
// camera sets: az 0 = front (+Z), 90 = the figure's left (+X)
const sets = (poseName) => {
  const hy = poseName === 'hang' ? 1.5 : 1.38;
  const Y = poseName === 'hang' ? 1.05 : 0.9;
  return {
    full: [0, 90, 180, 270, 45, 315].map((az) => ({ az, el: 12, d: poseName === 'hang' ? 4.2 : 3.6, t: [0, Y, 0], fov: 34 })),
    shoulders: [[0, 5], [45, 20], [90, 10], [135, 20], [180, 5], [270, 10]].map(([az, el]) => ({ az, el, d: 1.5, t: [0, hy, 0], fov: 30 })),
    armL: [[0, 5], [60, 10], [90, 5], [120, 10], [180, 5], [45, 40]].map(([az, el]) => ({ az, el, d: 1.3, t: [0.25, 1.15, 0.05], fov: 34 })),
    handL: [[0, 0], [60, 10], [90, 0], [150, 10], [220, 10], [300, 10]].map(([az, el]) => ({ az, el, d: 0.6, t: [0.28, 0.87, 0.12], fov: 30 })),
    handR: [[0, 0], [300, 10], [270, 0], [210, 10], [140, 10], [60, 10]].map(([az, el]) => ({ az, el, d: 0.6, t: [-0.28, 0.87, 0.12], fov: 30 })),
    handsUp: [[0, 0], [60, 10], [90, 0], [150, 10], [200, 10], [300, 10]].map(([az, el]) => ({ az, el, d: 0.7, t: [0.27, 2.02, 0.06], fov: 30 })),
    hips: [[0, 8], [45, 15], [90, 5], [135, 15], [180, 8], [270, 5]].map(([az, el]) => ({ az, el, d: 1.9, t: [0, 0.9, 0], fov: 30 })),
    elbowL: [[0, 5], [60, 10], [90, 5], [135, 10], [180, 5], [110, 55]].map(([az, el]) => ({ az, el, d: 0.9, t: [0.25, 1.2, 0.05], fov: 30 })),
    legs: [[0, 5], [45, 10], [90, 3], [135, 10], [180, 5], [270, 3]].map(([az, el]) => ({ az, el, d: 2.6, t: [0, 0.72, 0.05], fov: 30 })),
  };
};
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'text/javascript' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
for (const [poseName, setName, extra] of jobs) {
  const views = sets(poseName)[setName];
  const pose = POSES[poseName];
  if (!views || !pose) { console.log('unknown job', poseName, setName); continue; }
  const out = path.join(HERE, 'shots', `${poseName}_${setName}${extra ? '_' + extra : ''}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  const size = setName === 'full' ? 480 : 400, cols = 3;
  await page.setViewport({ width: size * cols, height: size * Math.ceil(views.length / cols) });
  const qs = new URLSearchParams({ src, pose: JSON.stringify(pose), views: JSON.stringify(views), size, cols, sun: flags.includes('--sun') ? '1' : '0' });
  await page.goto(`http://127.0.0.1:${server.address().port}${REL}/view.html?${qs}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__DONE__', { timeout: 90000 });
  const res = await page.evaluate(() => window.__OUT__);
  if (!res.ok) console.log(res.error);
  await page.screenshot({ path: out });
  await page.close();
  console.log(out);
}
await browser.close();
server.close();
