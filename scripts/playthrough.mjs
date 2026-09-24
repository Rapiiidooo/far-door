// The game's own gate: plays the whole prototype from the title to the end card with real
// key events, steering by the telemetry the game publishes (position, camera heading,
// mirror catches, the isles' pylons), and saves a screenshot at each milestone.
//   node scripts/playthrough.mjs [outDir] [--url=http://localhost:3002/?nolock=1]
//   [--from=w2 | --from=w3] starts at the checkpoint or on the isles instead of the title.
import puppeteer from "puppeteer-core";
import { mkdir, rm, writeFile } from "node:fs/promises";

const out = process.argv[2] || "outputs/playthrough";
const fromW2 = process.argv.includes("--from=w2");
const fromW3 = process.argv.includes("--from=w3");
const url =
  process.argv.find((a) => a.startsWith("--url="))?.slice(6) ||
  `http://localhost:3002/?nolock=1`;
await rm(out, { recursive: true, force: true });
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
// Right-button drag turns the camera without pointer lock.
async function turnTo(x, z) {
  for (let i = 0; i < 14; i++) {
    const st = await state();
    const want = Math.atan2(x - st.pos[0], z - st.pos[1]);
    const d = Math.atan2(
      Math.sin(want - st.camYaw),
      Math.cos(want - st.camYaw),
    );
    if (Math.abs(d) < 0.06) return;
    await page.mouse.move(640, 360);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(
      640 - Math.max(-120, Math.min(120, d / 0.0026)),
      360,
      { steps: 4 },
    );
    await page.mouse.up({ button: "right" });
    await sleep(40);
  }
}
// A running jump from one isle to the next: a run-up straight at it from inside the rim,
// the jump at the rim, and steering through the air onto it.
// A jump from wherever the explorer stands: run at the edge and take off just before it. The
// crumbling stones leave no time for a run-up.
async function hop(edge, target, id) {
  const [ex, ez] = edge,
    [tx, tz] = target;
  const d = Math.hypot(tx - ex, tz - ez);
  const ux = (tx - ex) / d,
    uz = (tz - ez) / d;
  let s,
    t0 = Date.now();
  for (;;) {
    s = await state();
    const along = (s.pos[0] - ex) * ux + (s.pos[1] - ez) * uz;
    const keys = steer(s, tx, tz).keys;
    if (along > -0.45) {
      await hold(new Set([...keys, "Space"]));
      break;
    }
    await hold(new Set(keys));
    if (Date.now() - t0 > 4000) throw new Error(`run at ${id} stalled`);
    await sleep(16);
  }
  await sleep(380);
  t0 = Date.now();
  for (;;) {
    s = await state();
    await hold(new Set(steer(s, tx, tz).keys));
    if (s.state === "ground" && s.isles?.on === id) break;
    if (Date.now() - t0 > 5000)
      throw new Error(
        `hop to ${id}: ${s.state} at ${s.pos.map((v) => v.toFixed(2))} feet ${s.feet.toFixed(2)}`,
      );
    await sleep(25);
  }
  await hold(new Set());
  return s;
}
async function leap(edge, target, id) {
  const [ex, ez] = edge,
    [tx, tz] = target;
  const d = Math.hypot(tx - ex, tz - ez);
  const ux = (tx - ex) / d,
    uz = (tz - ez) / d;
  await go(ex - ux * 3.6, ez - uz * 3.6, { tol: 0.3 });
  await turnTo(tx, tz);
  let s,
    t0 = Date.now();
  for (;;) {
    s = await state();
    const along = (s.pos[0] - ex) * ux + (s.pos[1] - ez) * uz;
    const keys = steer(s, tx, tz).keys;
    if (along > -0.5) {
      await hold(new Set([...keys, "Space"]));
      break;
    }
    await hold(new Set(keys));
    if (Date.now() - t0 > 5000) throw new Error(`run-up to ${id} stalled`);
    await sleep(16);
  }
  await sleep(380);
  t0 = Date.now();
  for (;;) {
    s = await state();
    await hold(new Set(steer(s, tx, tz).keys));
    if (s.state === "ground" && s.isles?.on === id) break;
    if (Date.now() - t0 > 5000)
      throw new Error(
        `leap to ${id}: ${s.state} at ${s.pos.map((v) => v.toFixed(2))} feet ${s.feet.toFixed(2)}`,
      );
    await sleep(25);
  }
  await hold(new Set());
  return s;
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
  if (fromW2 || fromW3) {
    // The Levels menu, unlocked by a previous run in this profile or not at all: start the
    // checkpoint or the isles through the development shortcut instead.
    await page.goto(url + (fromW3 ? "&chapter=isles" : "&chapter=checkpoint"), {
      waitUntil: "load",
    });
    await page.waitForFunction(() => window.__READY__ === true, {
      timeout: 60000,
    });
  } else {
    await page.click('button[data-action="new"]');
    // The opening shot plays first; Enter skips it.
    await sleep(1500);
    await tap(["Enter"], 80);
  }
  await sleep(1200);
  let s = await state();
  note(`start ${s.pos.map((v) => v.toFixed(1))} feet ${s.feet}`);

  if (fromW3) {
    // Straight to the isles below.
  } else if (!fromW2) {
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
    // North of the block the boulders are in the way, so it is pulled south, out of the beam.
    await tap(["KeyE"], 150);
    await tap(["KeyE", "KeyS"], 900);
    await sleep(700);
    s = await state();
    note(`pulled the block off the beam`);

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

    // The gate's set piece: the channels arm it, the ring charges, then it ignites.
    await until((s) => s.cinematic, 3000, "the gate wakes");
    await sleep(3600);
    await shot("gate-charge");
    await sleep(1900);
    await shot("gate-ignition");
    await sleep(2200);
    await shot("gate-reveal");
    await until((s) => s.gateOpen && !s.cinematic, 20000, "gate opening");
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
    // Walk at the ring's centre until the crossing takes the explorer through.
    await go(15, 9, { walk: false, timeout: 8000 }).catch(() => {});
    await hold(new Set());
    s = await until((s) => s.where === "two", 8000, "cross the gate");
  } else {
    s = await until(
      (s) => s.where === "two",
      8000,
      "start in the second world",
    );
  }
  if (!fromW3) await checkpoint(s);
  await isles();
  // Nothing compiled since the first level started: every door crossed without a stall.
  s = await state();
  note(
    `shader programs at the first start ${s.programsAtStart}, at the end ${s.programs}`,
  );
  if (s.programs !== s.programsAtStart)
    throw new Error(
      `shaders compiled during play: ${s.programsAtStart} -> ${s.programs}`,
    );
  s = await until((s) => s.credits, 20000, "credits");
  await sleep(6000);
  await shot("credits");
  await tap(["Escape"], 100);
  s = await until((s) => s.mode === "title", 6000, "back to the title");
  await shot("title-after");
  note("reached the credits and returned to the title");
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

// The checkpoint, from the first door to the far door.
async function checkpoint(s) {
  note(`crossed into the second world at ${s.pos.map((v) => v.toFixed(2))}`);
  await sleep(1500);
  await shot("world-two");

  // The briefing at the booth.
  await go(-0.5, -12, { walk: false });
  await go(-4, -24.2, { walk: false });
  s = await until(
    (s) => s.checkpoint === "stamps",
    25000,
    "the clerk's briefing",
  );
  note("briefed by the clerk");
  await shot("briefing");

  // The offence: the sun disc out of the confiscation bin, in front of every Warden.
  // Round the queue's ropes rather than through them.
  await go(-7.2, -24.2);
  await go(-7.9, -27.6);
  await go(-7.9, -28.05, { tol: 0.15, timeout: 3000 }).catch(() => {});
  await tap(["KeyE"], 150);
  s = await until((s) => s.disc?.state === "held", 3000, "take the disc");
  note("took the disc; the Wardens are coming");
  await sleep(900);
  await shot("alarm");

  // The stamps: stand on each plate until its own Warden winds up over it, then step away.
  const PLATES = { crescent: [-8, -19.5], waves: [0, -22.8], disc: [8, -19.5] };
  const t0 = Date.now();
  let throws = 0,
    dodges = 0,
    fightShot = false;
  for (;;) {
    s = await state();
    const open = s.plates.filter((p) => !p.stamped);
    if (!open.length) break;
    if (Date.now() - t0 > 180000)
      throw new Error(
        `plates not stamped: ${JSON.stringify(s.plates)} guards ${JSON.stringify(s.guards)}`,
      );
    const plate = open[0];
    const [px, pz] = PLATES[plate.glyph];
    const warden = s.guards.find((g) => g.glyph === plate.glyph);
    // Out of the way of any stamp that is not the one we want.
    const threat = s.guards.find(
      (g) =>
        g.state === "windup" &&
        g.target &&
        Math.hypot(g.target[0] - s.pos[0], g.target[1] - s.pos[1]) < 1.2,
    );
    if (threat) {
      const onPlate =
        Math.hypot(threat.target[0] - px, threat.target[1] - pz) < 0.9;
      const away = Math.atan2(
        s.pos[0] - threat.pos[0],
        s.pos[1] - threat.pos[1],
      );
      const tx = s.pos[0] + Math.sin(away) * 2.4,
        tz = s.pos[1] + Math.cos(away) * 2.4;
      await hold(new Set(steer(s, tx, tz).keys));
      await sleep(onPlate ? 450 : 350);
      await hold(new Set());
      dodges++;
      if (!fightShot) {
        fightShot = true;
        await shot("stamp-ring");
      }
      await sleep(500);
      continue;
    }
    // The matching Warden has to be on the hunt: a disc to its mask sees to that.
    if (
      !warden.hostile &&
      warden.state !== "break" &&
      s.disc?.state === "held"
    ) {
      await turnTo(warden.pos[0], warden.pos[1]);
      await tap(["KeyR"], 80);
      throws++;
      await sleep(700);
      continue;
    }
    // Wait on the plate for it.
    const d = Math.hypot(px - s.pos[0], pz - s.pos[1]);
    if (d > 0.4) {
      await go(px, pz, { tol: 0.35, walk: d < 1.5, timeout: 6000 }).catch(
        () => {},
      );
      continue;
    }
    await sleep(120);
  }
  note(
    `plates stamped with ${throws} throws and ${dodges} dodges, health ${s.health}`,
  );
  await sleep(1200);
  await shot("stamped");

  // The lamp: from the plaza, a throw at the lamp passes through the crystal's beam first.
  s = await until((s) => s.checkpoint === "lamp", 6000, "lamp phase");
  for (let i = 0; i < 8; i++) {
    s = await state();
    if (s.checkpoint === "open") break;
    await until((s) => s.disc?.state === "held", 6000, "disc back in hand");
    await go(-1.8, -23.2, { tol: 0.4 });
    await turnTo(-4, -31.4);
    await tap(["KeyR"], 80);
    await sleep(1600);
  }
  s = await until((s) => s.checkpoint === "open", 3000, "light the lamp");
  note("lamp lit, barrier up");
  await sleep(1800);
  await shot("barrier-open");

  // The far door: onto its dais, through the set piece, and through.
  await go(-0.4, -30, { walk: false, timeout: 20000 });
  await go(0, -38, { walk: false, timeout: 20000 });
  // Its set piece starts as soon as the explorer sets foot on the dais.
  await go(0, -41.6, { walk: false, timeout: 8000 }).catch(() => {});
  await hold(new Set());
  s = await until((s) => s.cinematic, 6000, "the far door wakes");
  await sleep(4700);
  await shot("far-door-ignition");
  s = await until(
    (s) => s.exitOpen && !s.cinematic,
    20000,
    "the far door opens",
  );
  await shot("far-door-open");
  await hold(new Set(["KeyW"]));
  s = await until(
    (s) => s.where === "three",
    8000,
    "step through the far door",
  );
  await hold(new Set());
}

// The dawn isles: three jumps, then four pylons woken with a disc charged in the crystals'
// beams, their bridges crossed, and Mira's journal read at her camp.
async function isles() {
  let s = await until(
    (s) => s.where === "three" && s.isles?.edges,
    8000,
    "arrive on the isles",
  );
  note(`on the isles at ${s.pos.map((v) => v.toFixed(2))}`);
  await sleep(1800);
  await shot("isles-arrival");
  const L = s.isles;
  const at = Object.fromEntries(L.isles.map((i) => [i.id, i.at]));
  const ids = L.isles.map((i) => i.id);
  for (let k = 0; k < 3; k++)
    await leap(L.edges[k], at[ids[k + 1]], ids[k + 1]);
  note("jumped across to the isle of the first pylon");
  await shot("isles-jumps");
  const pylon = (s, id) => s.isles.pylons.find((p) => p.id === id);
  const charge = async (well) => {
    for (let i = 0; i < 5; i++) {
      let s = await until(
        (s) => s.isles.disc?.state === "held",
        6000,
        "the disc in hand",
      );
      if (s.isles.disc.charged) return;
      await turnTo(well[0], well[1]);
      await tap(["KeyR"], 80);
      await sleep(1300);
    }
    throw new Error("could not charge the disc");
  };
  const wake = async (id, well) => {
    for (let i = 0; i < 5; i++) {
      let s = await state();
      if (pylon(s, id).on) return;
      if (!s.isles.disc?.charged) await charge(well);
      s = await until(
        (s) => s.isles.disc?.state === "held",
        6000,
        "the disc in hand",
      );
      const p = pylon(s, id);
      await turnTo(p.lens[0], p.lens[1]);
      await tap(["KeyR"], 80);
      await until((s) => pylon(s, id).on, 2500, `wake ${id}`).catch(() => {});
    }
    if (!pylon(await state(), id).on) throw new Error(`could not wake ${id}`);
  };
  const W = L.wells;
  // Beside a pylon's plinth, and on its bridge just past the threshold.
  const dirOf = (p) => Math.sign(p.to - p.emit[1]);
  const beside = (p) => [p.lens[0] + 1.25, p.lens[1]];
  const onto = (p, k = 0.4) => [p.emit[0], p.emit[1] + dirOf(p) * k];
  const walkTo = ([x, z], opts = {}) =>
    go(x, z, { tol: 0.4, walk: false, ...opts });
  // A clear spot 2.4 m from a crystal, towards the middle of its isle.
  const near = (w, id) => {
    const [ax, az] = at[id];
    const d = Math.hypot(ax - w[0], az - w[1]) || 1;
    return [w[0] + ((ax - w[0]) / d) * 2.4, w[1] + ((az - w[1]) / d) * 2.4];
  };
  // The first pylon: crystal and pylon on the same isle.
  await walkTo(near(W[0], "well"));
  await wake("first", W[0]);
  note("woke the first pylon");
  await sleep(700);
  await shot("isles-bridge");
  s = await state();
  let p = pylon(s, "first");
  await walkTo(beside(p));
  await walkTo(onto(p));
  await walkTo([p.emit[0], p.to + dirOf(p) * 1.2], { timeout: 9000 });
  s = await until((s) => s.isles.on === "gap", 3000, "cross the first bridge");
  note("crossed the first bridge");
  // The second: its pylon stands on the far isle, facing back across the gap.
  p = pylon(s, "across");
  await walkTo(near(W[1], "gap"));
  await wake("across", W[1]);
  note("woke the pylon across the gap");
  s = await state();
  p = pylon(s, "across");
  await walkTo([p.emit[0], p.to + dirOf(p) * 0.6]);
  await walkTo(onto(p, -0.3), { timeout: 9000 });
  await walkTo(beside(p));
  s = await until(
    (s) => s.isles.on === "pair",
    3000,
    "cross the second bridge",
  );
  note("crossed the second bridge");
  // Two pylons in a row on one charge.
  await walkTo(near(W[2], "pair"));
  await charge(W[2]);
  await wake("twinA", W[2]);
  await wake("twinB", W[2]);
  note("woke both pylons of the pair");
  await shot("isles-pair");
  s = await state();
  p = pylon(s, "twinA");
  const q = pylon(s, "twinB");
  await walkTo(beside(p));
  await walkTo(onto(p));
  await walkTo([p.emit[0], p.to + dirOf(p) * 0.4], { timeout: 9000 });
  await walkTo(beside(q));
  await walkTo(onto(q));
  await walkTo([q.emit[0], q.to + dirOf(q) * 1.5], { timeout: 9000 });
  s = await until((s) => s.isles.on === "ledge", 3000, "reach the ledge");
  note("crossed both bridges of the pair");
  // The ferry: aboard while it rests off the ledge, off while it rests off the far isle.
  const k = (id) => ids.indexOf(id);
  const ferryAt = (end) => (s) =>
    Math.abs(s.isles.ferry.z - s.isles.ferry[end]) < 0.05;
  s = await state();
  const edge = s.isles.edges[k("ledge")];
  await go(edge[0], edge[1] + 3.6, { tol: 0.3 });
  await turnTo(edge[0], edge[1] - 6);
  await until((s) => !ferryAt("a")(s), 16000, "the ferry leaves");
  await until(ferryAt("a"), 16000, "the ferry returns");
  s = await state();
  await hop(s.isles.edges[k("ledge")], s.isles.isles[k("ferry")].at, "ferry");
  note("aboard the drifting isle");
  await shot("isles-ferry");
  s = await until(ferryAt("b"), 16000, "the ferry reaches the far isle");
  await hop(s.isles.edges[k("ferry")], at.far, "far");
  note("off the ferry onto the far isle");
  // The stones: one run, a jump from each before it falls.
  s = await state();
  await leap(s.isles.edges[k("far")], at.stone1, "stone1");
  for (const [from, to] of [
    ["stone1", "stone2"],
    ["stone2", "stone3"],
    ["stone3", "landing"],
  ]) {
    s = await state();
    await hop(s.isles.edges[k(from)], at[to], to);
  }
  s = await state();
  note(
    `crossed the crumbling stones: ${s.isles.stones.map((t) => t.phase).join(", ")}`,
  );
  await shot("isles-stones");
  // The relay: one charge for both pylons, the bridge between them crossed at once.
  await walkTo(near(W[3], "landing"));
  await charge(W[3]);
  await wake("relay1", W[3]);
  s = await state();
  p = pylon(s, "relay1");
  await walkTo(beside(p));
  await walkTo(onto(p));
  await walkTo([p.emit[0], p.to + dirOf(p) * 1.4], { timeout: 9000 });
  s = await until((s) => s.isles.on === "midway", 3000, "cross to midway");
  note(`on the small isle, ${s.isles.disc.charged ? "still glowing" : "dark"}`);
  await wake("relay2", W[3]);
  note("woke the far pylon of the relay");
  s = await state();
  p = pylon(s, "relay2");
  await walkTo([p.emit[0], p.to + dirOf(p) * 0.6]);
  await walkTo(onto(p, -0.3), { timeout: 9000 });
  await walkTo(beside(p));
  s = await until((s) => s.isles.on === "camp", 3000, "reach the camp");
  note("crossed to Mira's camp");
  await shot("isles-camp");
  // Her journal, in the open crate.
  const n = s.isles.note;
  // The prompt keeps its last text while hidden: only a showing one counts.
  const prompt = () =>
    page.evaluate(
      () => document.querySelector("#prompt.on")?.textContent || "",
    );
  // Round the crates until the journal is within reach and in front.
  for (let k = 0; k < 8 && !/journal/.test(await prompt()); k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 2;
    await go(n[0] + Math.sin(a) * 1.25, n[1] + Math.cos(a) * 1.25, {
      tol: 0.3,
      timeout: 4000,
    }).catch(() => {});
    await turnTo(n[0], n[1]);
    await tap(["KeyW"], 120);
    await sleep(200);
  }
  await tap(["KeyE"], 120);
  await sleep(600);
  s = await state();
  const reading = await page.evaluate(
    () => !document.querySelector("#notes").hidden,
  );
  if (!reading) throw new Error("Mira's journal did not open");
  await shot("mira-journal");
  await tap(["KeyE"], 120);
  s = await until((s) => s.isles.read && s.cinematic, 6000, "the finale");
  note("read Mira's journal; the finale plays");
  await sleep(7000);
  await shot("finale");
}
