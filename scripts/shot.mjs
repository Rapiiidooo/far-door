// Development probe: loads the game, starts it, optionally holds keys, and saves a
// screenshot plus every console message. Real key events, never game hooks, drive it.
//   node scripts/shot.mjs <out.png> [--keys=KeyW:1500,Space:100] [--wait=ms] [--url=...]
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(
  process.argv.slice(3).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.length ? rest.join("=") : true];
  }),
);
const out = process.argv[2] || "shot.png";
const url = args.url || "http://localhost:3002/?nolock=1";
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({
  width: Number(args.w || 1280),
  height: Number(args.h || 720),
});
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: "load" });
await page
  .waitForFunction(() => window.__READY__ === true, { timeout: 60000 })
  .catch(() => logs.push("timeout: not ready"));
if (!args.title) {
  await page.click("#start").catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));
}
if (args.keys)
  for (const step of String(args.keys).split(",")) {
    const [code, ms] = step.split(":");
    if (code === "wait") {
      await new Promise((r) => setTimeout(r, Number(ms)));
      continue;
    }
    const keys = code.split("+");
    for (const k of keys) await page.keyboard.down(k);
    await new Promise((r) => setTimeout(r, Number(ms || 100)));
    for (const k of keys.reverse()) await page.keyboard.up(k);
    const g = await page.evaluate(() => window.__GAME__);
    console.log(
      `${step.padEnd(18)} -> ${g.state.padEnd(6)} pos ${g.pos.map((v) => v.toFixed(2)).join(",")} feet ${g.feet.toFixed(2)}`,
    );
  }
await new Promise((r) => setTimeout(r, Number(args.wait || 800)));
const game = await page.evaluate(() => window.__GAME__);
await page.screenshot({ path: out });
console.log(JSON.stringify(game));
for (const l of logs) console.log(l);
await browser.close();
