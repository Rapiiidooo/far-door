// Picks by eye, in the game: installs each of an asset's three candidates in turn as the game's
// asset, captures the same in-game view with the HUD hidden, and saves the three frames to
// outputs/compare/. The chosen candidate is then copied into game/assets/ by hand.
//   node scripts/compare-candidates.mjs <asset> "<query>" [ring]
// `query` is the page's development parameters, for example "chapter=frost&cam=x,y,z,tx,ty,tz";
// `ring` opens the frozen reach's great ring, to look through it at the forest.
import puppeteer from "puppeteer-core";
import { copyFile, mkdir } from "node:fs/promises";

const [asset, query, ring] = process.argv.slice(2);
const dir = `receipts/candidates/${asset}`;
await mkdir("outputs/compare", { recursive: true });
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
for (const k of ["a", "b", "c"]) {
  await copyFile(`${dir}/${asset}_${k}.js`, `game/assets/${asset}.js`);
  await page.goto(`http://localhost:3002/?nolock=1&debug=1&${query}`, {
    waitUntil: "load",
  });
  await page.waitForFunction(() => window.__READY__ === true, {
    timeout: 90000,
  });
  if (ring)
    await page.evaluate(() => {
      const F = window.__FD__.worldFour;
      F.ring.ignite(2);
      F.ring.forceOpen();
    });
  await new Promise((r) => setTimeout(r, 2200));
  await page.evaluate(() => {
    document.querySelector("#hud").style.visibility = "hidden";
    document.querySelector("#chapter-card")?.classList.remove("on");
    document.querySelector("#subtitle")?.classList.remove("on");
  });
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `outputs/compare/${asset}_${k}.png` });
}
await browser.close();
