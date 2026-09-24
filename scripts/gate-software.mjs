// The jam gate's load under its 4G profile and 2x CPU, with the software renderer forced, so the
// ready time can be judged as a machine without a GPU would see it.
//   node scripts/gate-software.mjs [url]
import puppeteer from "puppeteer-core";

const url = process.argv[2] || "https://fardoor.rapidoai.dev/";
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
  ],
});
const page = await browser.newPage();
await page.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
await page.setCacheEnabled(false);
const cdp = await page.createCDPSession();
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 60,
  downloadThroughput: (4 * 1024 * 1024) / 8,
  uploadThroughput: (1 * 1024 * 1024) / 8,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const t0 = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 120000 });
const loaded = (Date.now() - t0) / 1000;
await page.waitForFunction("window.__READY__ === true", { timeout: 180000 });
const ready = (Date.now() - t0) / 1000;
const renderer = await page.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl2");
  const d = gl?.getExtension("WEBGL_debug_renderer_info");
  return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?";
});
const g = await page.evaluate(
  () =>
    window.__GAME__ && {
      draws: window.__GAME__.draws,
      tris: window.__GAME__.tris,
      fps: window.__GAME__.fps,
    },
);
const marks = await page.evaluate(() =>
  performance
    .getEntriesByType("mark")
    .map((m) => `${(m.startTime / 1000).toFixed(1)}s ${m.name}`),
);
console.log(JSON.stringify({ renderer, loaded, ready, game: g, errors }));
console.log(marks.join("\n"));
await browser.close();
