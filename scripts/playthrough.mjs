// The game's own gate: plays the whole prototype from the title to the end card with real
// key events, steering by the telemetry the game publishes (position, camera heading,
// mirror catches), and saves a screenshot at each milestone.
//   node scripts/playthrough.mjs [outDir] [--url=http://localhost:3002/?nolock=1]
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";

const out = process.argv[2] || "outputs/playthrough";
const fromW2 = process.argv.includes("--from=w2");
const url =
  process.argv.find((a) => a.startsWith("--url="))?.slice(6) ||
  `http://localhost:3002/?nolock=1${fromW2 ? "&w2=1" : ""}`;
await mkdir(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on(
  "console",
  (m) => m.type() === "error" && !/404/.test(m.text()) && errors.push(m.text()),
);
const log = [];
const note = (text) => {
  log.push(text);
  console.log(text);
};
const state = () => page.evaluate(() => window.__GAME__);
const held = new Set();
async function hold(keys) {
  for (const k of [...held])
    if (!keys.has(k)) (await page.keyboard.up(k), held.delete(k));
  for (const k of keys)
    if (!held.has(k)) (await page.keyboard.down(k), held.add(k));
}
async function tap(keys, ms) {
  await hold(new Set(keys));
  await sleep(ms);
  await hold(new Set());
}
let shots = 0;
async function shot(name) {
  await page.screenshot({
    path: `${out}/${String(++shots).padStart(2, "0")}-${name}.png`,
  });
}
function steer(s, x, z) {
  const dx = x - s.pos[0],
    dz = z - s.pos[1],
    d = Math.hypot(dx, dz) || 1;
  const fx = Math.sin(s.camYaw),
    fz = Math.cos(s.camYaw);
  const f = (dx * fx + dz * fz) / d,
    r = (dx * -fz + dz * fx) / d;
  const keys = [];
  if (f > 0.38) keys.push("KeyW");
  if (f < -0.38) keys.push("KeyS");
  if (r > 0.38) keys.push("KeyD");
  if (r < -0.38) keys.push("KeyA");
  return { keys, d };
}
async function go(x, z, { tol = 0.35, walk = true, timeout = 12000 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await state();
    const { keys, d } = steer(s, x, z);
    if (d < tol) {
      await hold(new Set());
      return s;
    }
    if (walk && d < 1.5) keys.push("ShiftLeft");
    await hold(new Set(keys));
    await sleep(25);
  }
  const s = await state();
  throw new Error(
    `go ${x},${z} stuck at ${s.pos.map((v) => v.toFixed(2))} feet ${s.feet.toFixed(2)} ${s.state}`,
  );
}
async function jumpToward(x, z, ms = 800) {
  const s = await state();
  await tap([...steer(s, x, z).keys, "Space"], ms);
  await sleep(250);
}
async function until(test, timeout, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await state();
    if (test(s)) return s;
    await sleep(50);
  }
  const s = await state();
  throw new Error(
    `${label}: state ${s.state} pos ${s.pos.map((v) => v.toFixed(2))} feet ${s.feet.toFixed(2)}`,
  );
}
async function aim(mirror, target, key) {
  await hold(new Set(["KeyE"]));
  await sleep(200);
  const before = await state();
  if (before.state !== "turn")
    throw new Error(
      `could not take hold of ${mirror}: ${before.state} at ${before.pos.map((v) => v.toFixed(2))}`,
    );
  // Turn one way; if the mirror stops at the edge of its face, turn the other way.
  const t0 = Date.now();
  let dir = key,
    lastYaw = null,
    still = 0;
  await hold(new Set(["KeyE", dir]));
  for (;;) {
    const s = await state();
    const m = s.mirrors.find((m) => m.id === mirror);
    if (m.locked === target) break;
    if (Date.now() - t0 > 20000)
      throw new Error(`aim ${mirror} at ${target}: yaw ${m.yaw.toFixed(2)}`);
    still =
      lastYaw !== null && Math.abs(m.yaw - lastYaw) < 1e-4 && !m.locked
        ? still + 1
        : 0;
    lastYaw = m.yaw;
    if (still > 15) {
      dir = dir === "KeyA" ? "KeyD" : "KeyA";
      await hold(new Set(["KeyE", dir]));
      still = 0;
    }
    await sleep(40);
  }
  await hold(new Set(["KeyE"]));
  await sleep(700);
  await hold(new Set());
  await sleep(200);
}

try {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__READY__ === true, {
    timeout: 60000,
  });
  await shot("title");
  await page.click("#start");
  await sleep(1200);
  let s = await state();
  note(`start ${s.pos.map((v) => v.toFixed(1))} feet ${s.feet}`);

  if (!fromW2) {
    // The descent: run the terrace, jump the gap, hang down to the ledge, jump the chasm to
    // the crack, shimmy along it, climb out, and walk down the broken stair.
    await go(12, 37.2);
    await hold(new Set(["KeyA"]));
    await until((s) => s.pos[0] < 8.75, 3000, "run to the gap");
    await tap(["KeyA", "Space"], 500);
    s = await state();
    if (s.state === "hang") await tap(["KeyW"], 600);
    s = await until(
      (s) => s.state === "ground" && s.pos[0] < 6.2,
      3000,
      "land on the west platform",
    );
    note(`jumped the gap: ${s.pos.map((v) => v.toFixed(2))} feet ${s.feet}`);
    await go(4, 36.45);
    await tap(["KeyW"], 120);
    await tap(["KeyC"], 120);
    s = await until(
      (s) => s.state === "hang",
      2000,
      "hang from the platform edge",
    );
    note(`hanging from the edge, feet ${s.feet.toFixed(2)}`);
    await shot("hang");
    await tap(["KeyC"], 120);
    s = await until(
      (s) => s.state === "ground" && Math.abs(s.feet - 5.5) < 0.05,
      3000,
      "drop to the ledge",
    );
    await go(4.5, 34.5);
    await jumpToward(4.5, 30, 800);
    s = await until((s) => s.state === "hang", 3000, "catch the crack");
    note(`caught the crack at ${s.pos.map((v) => v.toFixed(2))}`);
    await hold(new Set(["KeyD"]));
    s = await until((s) => s.pos[0] > 8.6, 8000, "shimmy along the crack");
    await hold(new Set());
    await shot("shimmy");
    await tap(["KeyW"], 500);
    s = await until(
      (s) => s.state === "ground" && Math.abs(s.feet - 7) < 0.05,
      3000,
      "climb onto the platform",
    );
    note(`climbed up at ${s.pos.map((v) => v.toFixed(2))}`);
    await go(9, 27);
    await go(19, 27, { walk: false });
    s = await until(
      (s) => s.state === "ground" && Math.abs(s.feet) < 0.05,
      3000,
      "reach the court floor",
    );
    note("reached the court floor");
    await shot("court");

    // The block in the sunlight.
    await go(19, 25);
    await go(5, 23.4);
    await go(5, 22.3, { tol: 0.1, timeout: 3000 }).catch(() => {});
    await tap(["KeyE"], 150);
    await tap(["KeyE", "KeyW"], 900);
    await sleep(500);
    note("pushed the block");

    // Three mirrors, three stelae.
    await go(9, 23.3);
    await go(9, 21.9, { tol: 0.1, timeout: 3000 }).catch(() => {});
    await aim("m1", "left", "KeyD");
    s = await until(
      (s) => s.lit.includes("left"),
      3000,
      "light the left stela",
    );
    note(`lit: ${s.lit}`);
    await shot("first-glyph");
    await aim("m1", "m2", "KeyA");
    await go(9, 23.8);
    await go(20, 23.8, { walk: false });
    await go(21, 23.2);
    await go(21, 24.0, { tol: 0.1, timeout: 3000 }).catch(() => {});
    await aim("m2", "right", "KeyA");
    s = await until(
      (s) => s.lit.includes("right"),
      3000,
      "light the right stela",
    );
    note(`lit: ${s.lit}`);
    await aim("m2", "m3", "KeyA");
    await go(17.2, 25.3);
    await jumpToward(17.2, 27, 450);
    s = await until(
      (s) => s.state === "ground" && Math.abs(s.feet - 1) < 0.05,
      3000,
      "vault onto the low block",
    );
    await go(17.2, 27.5);
    await jumpToward(17.2, 31, 800);
    s = await until(
      (s) => s.state === "ground" && Math.abs(s.feet) < 0.05 && s.pos[1] > 29.8,
      3000,
      "land on the island",
    );
    note(`on the island ${s.pos.map((v) => v.toFixed(2))}`);
    await go(17, 30.35, { tol: 0.1, timeout: 3000 }).catch(() => {});
    await aim("m3", "top", "KeyA");
    s = await until((s) => s.lit.includes("top"), 3000, "light the top stela");
    note(`lit: ${s.lit}`);
    await shot("third-glyph");

    // The gate.
    await until((s) => s.gateOpen && !s.cinematic, 15000, "gate opening");
    await shot("gate-open");
    await go(17.2, 30.35);
    await jumpToward(17.2, 26.5, 800);
    s = await state();
    if (s.state === "hang") await tap(["KeyW"], 600);
    await until(
      (s) => s.state === "ground" && s.pos[1] < 28.1,
      3000,
      "leave the island",
    );
    await go(13.4, 19);
    await go(13.4, 15.8);
    await go(15, 15.3);
    await shot("portal");
    await hold(new Set(["KeyW"]));
    s = await until((s) => s.mode === "world2", 6000, "cross the gate");
    await hold(new Set());
  } else {
    s = await until(
      (s) => s.mode === "world2",
      6000,
      "start in the second world",
    );
  }
  note(`crossed into the second world at ${s.pos.map((v) => v.toFixed(2))}`);
  await sleep(1500);
  await shot("world-two");

  // The checkpoint: take the disc back, survive the guards, light the lamp.
  await go(0, -12, { walk: false });
  await go(-4.9, -21.6);
  await go(-5.6, -22.6, { tol: 0.1, timeout: 2500 }).catch(() => {});
  await tap(["KeyE"], 150);
  s = await until((s) => s.checkpoint === "alarm", 3000, "take the disc");
  note("took the disc back; alarm");
  await shot("alarm");
  await go(-3, -14, { walk: false });
  const t0 = Date.now();
  let throws = 0,
    rolls = 0,
    fightShot = false;
  for (;;) {
    s = await state();
    if (s.checkpoint === "locked") break;
    if (Date.now() - t0 > 60000)
      throw new Error(`fight did not end: ${JSON.stringify(s.guards)}`);
    const alive = (s.guards || []).filter(
      (g) => g.hp > 0 && g.state !== "gone",
    );
    if (!fightShot && alive.some((g) => g.state === "windup" || g.state === "chase")) {
      fightShot = true;
      await sleep(700);
      await shot("fight");
    }
    const near = alive
      .map((g) => ({
        g,
        d: Math.hypot(g.pos[0] - s.pos[0], g.pos[1] - s.pos[1]),
      }))
      .sort((a, b) => a.d - b.d)[0];
    if (
      near &&
      near.d < 2.4 &&
      (near.g.state === "windup" || near.g.state === "chase")
    ) {
      await tap(["KeyS", "KeyQ"], 120);
      rolls++;
    } else if (s.disc?.state === "held" && near) {
      await tap(["KeyR"], 80);
      throws++;
    } else if (s.pos[1] > -10) await tap(["KeyW"], 150);
    await sleep(120);
  }
  note(
    `guards cleared with ${throws} throws and ${rolls} rolls, health ${s.health}`,
  );
  await shot("cleared");
  await go(-3.7, -15.5);
  await sleep(600);
  for (let i = 0; i < 6; i++) {
    s = await state();
    if (s.checkpoint === "open") break;
    await until((s) => s.disc?.state === "held", 4000, "disc back in hand");
    await tap(["KeyR"], 80);
    await sleep(1500);
  }
  s = await until((s) => s.checkpoint === "open", 3000, "light the lamp");
  note("lamp lit, barrier open");
  await sleep(1800);
  await shot("barrier-open");
  await go(0, -30, { walk: false, timeout: 20000 });
  await go(0, -44.6, { walk: false, timeout: 20000 });
  await sleep(4000);
  await shot("finale");
  s = await until((s) => s.over, 15000, "end card");
  await sleep(1200);
  await shot("end");
  note("reached the end card");
} catch (e) {
  note(`FAILED: ${e.message}`);
  await shot("failure");
  process.exitCode = 1;
} finally {
  await hold(new Set()).catch(() => {});
  const s = await state().catch(() => null);
  note(`errors: ${errors.length ? errors.join(" | ") : "none"}`);
  await writeFile(
    `${out}/log.json`,
    JSON.stringify({ log, last: s, errors }, null, 2),
  );
  await browser.close();
}
