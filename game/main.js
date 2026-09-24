import * as THREE from "three";
import { createRig } from "./rig.js";
import { CSMShader } from "three/addons/csm/CSMShader.js";
import { ASSET } from "./assetlib.js";
import { World } from "./world.js";
import { Level } from "./level.js";
import { Hero } from "./hero.js";
import { HeroAnimator, placeholderHero } from "./hero-anim.js";
import { FollowCamera } from "./follow-camera.js";
import { Input } from "./input.js";
import { Beams } from "./beams.js";
import { Hud } from "./hud.js";
import { Gate } from "./gate.js";
import { WorldTwo } from "./world-two.js";
import { Sound } from "./sound.js";
import { Dust } from "./fx.js";
import * as COURT from "./court.js";

const params = new URLSearchParams(location.search);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.querySelector("#view");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

// The r186 cascaded-shadow chunk predates r186's own lighting chunk and never fills
// material.dfg, so every fully metallic surface renders black under the rig's shadows.
// Copy the missing block from the core chunk until the addon catches up.
{
  const core = THREE.ShaderChunk.lights_fragment_begin;
  const block = core.slice(
    core.indexOf("#ifdef STANDARD"),
    core.indexOf("IncidentLight directLight;"),
  );
  if (block && !CSMShader.lights_fragment_begin.includes("material.dfg"))
    CSMShader.lights_fragment_begin = CSMShader.lights_fragment_begin.replace(
      "IncidentLight directLight;",
      block + "IncidentLight directLight;",
    );
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  58,
  innerWidth / innerHeight,
  0.1,
  1200,
);
camera.position.set(21, 11, 44);
camera.lookAt(15, 4, 12);
const rig = createRig(THREE, renderer, scene, {
  hour: 15.2,
  azimuth: 236,
  maxElevation: 58,
  camera,
  fogStart: 60,
  fogDensity: 0.0032,
  exposure: 0.86,
});

// --- assets -----------------------------------------------------------------------------
const MOVING = new Set(["hero_explorer", "far_gate", "glyph_stela"]);
const available = new Map();
async function probe(name) {
  const inst = await ASSET(`./assets/${name}.js`, {
    keepHierarchy: MOVING.has(name),
  });
  let meshes = 0;
  inst.traverse((o) => o.isMesh && meshes++);
  available.set(name, meshes > 0);
}
const assets = {
  async make(name, opts = {}) {
    if (!available.get(name)) return null;
    return ASSET(`./assets/${name}.js`, {
      surfaces: true,
      keepHierarchy: MOVING.has(name),
      ...opts,
    });
  },
};

// --- game objects ------------------------------------------------------------------------
const world = new World();
const level = new Level(scene, world, assets);
const input = new Input(canvas);
const hud = new Hud(input);
const sound = new Sound();
const dust = new Dust(scene);
const follow = new FollowCamera(camera, world);
const hero = new Hero(world, level);
let heroModel, animator, beams, gate, worldTwo;

const state = {
  mode: "loading",
  time: 0,
  cinematic: null,
  fps: 0,
  frames: 0,
  fpsClock: 0,
};

async function load() {
  await Promise.all(
    [
      "hero_explorer",
      "push_block",
      "sun_mirror",
      "glyph_stela",
      "far_gate",
      "guardian_colossus",
      "temple_facade",
      "broken_column",
      "brazier",
      "basalt_spire",
    ].map(probe),
  );
  await level.build();
  beams = new Beams(
    scene,
    world,
    level,
    COURT.LIGHT.source,
    COURT.LIGHT.height,
  );
  level.turnMirror = (mirror, delta) => {
    if (beams.turn(mirror, delta)) sound.play("lock");
  };
  beams.onLit = (stela) => {
    sound.play("chime", stela.id);
    gate.feed(stela);
    hud.light(stela.id);
    const lit = level.stelae.filter((s) => s.lit).length;
    if (lit < 3)
      hud.objective(
        lit === 1
          ? "One glyph of the address is lit."
          : "Two glyphs lit. One remains.",
      );
  };
  gate = new Gate(scene, world, level, assets, renderer, sound);
  await gate.build(COURT.GATE);
  worldTwo = new WorldTwo(renderer, assets);
  await worldTwo.build();
  gate.destination = worldTwo;

  // The explorer keeps flat colours: procedural cloth grain washes its canvas out to white.
  heroModel =
    (await assets.make("hero_explorer", { surfaces: false })) ||
    placeholderHero();
  // Pale canvas turns blue-white in the rig's cool shade; a deeper khaki keeps it warm.
  heroModel.traverse((o) => {
    const c = o.isMesh && o.material.color;
    if (c && Math.abs(c.getHex() - 0xcdbf9f) < 0x030303) {
      o.material = o.material.clone();
      o.material.color.setHex(0x9e8660);
    }
  });
  if (heroModel.userData.grip?.hands)
    hero.hands = heroModel.userData.grip.hands;
  scene.add(heroModel);
  animator = new HeroAnimator(heroModel);
  hero.spawn(COURT.START.x, COURT.START.z, 8, COURT.START.yaw);
  // Development shortcut: ?at=x,z,feet starts elsewhere in the court.
  const at = params.get("at")?.split(",").map(Number);
  if (at?.length === 3) hero.spawn(at[0], at[1], at[2], Math.PI);
  follow.snap(hero);
  follow.pitch = 0.28;
  rig.refresh(scene);
  // Development shortcut: ?lit=1 lights the address to test the gate and the second world.
  if (params.has("lit"))
    for (const s of level.stelae) {
      s.lit = true;
      beams.onLit(s);
    }
  hud.ready(() => begin());
  state.mode = "title";
  window.__READY__ = true;
}

function begin() {
  if (state.mode !== "title") return;
  input.lockPointer();
  sound.start();
  hud.hideTitle();
  hud.show();
  state.mode = "play";
  // Glide from the title shot down behind the explorer rather than cutting.
  state.intro = {
    t: 0,
    pos: camera.position.clone(),
    quat: camera.quaternion.clone(),
  };
  hud.objective("Find a way down into the court.");
}

// Objectives follow progress, and a hint appears if the court puzzle stalls.
const guide = { floor: false, floorTime: 0, blockHint: false, open: false };
function updateGuide(dt) {
  if (
    !guide.floor &&
    hero.state === "ground" &&
    Math.abs(hero.feet) < 0.05 &&
    hero.pos.z < 34
  ) {
    guide.floor = true;
    hud.objective("Bring the sunlight to the three stelae before the gate.");
  }
  if (guide.floor) guide.floorTime += dt;
  const blocked = level.blocks.some(
    (b) => b.x === COURT.BLOCKS[0].x && b.z === COURT.BLOCKS[0].z,
  );
  if (guide.floor && blocked && guide.floorTime > 25 && !guide.blockHint) {
    guide.blockHint = true;
    hud.objective("Something stands in the sunlight by the west wall.");
  }
  if (!guide.open && gate.isOpen && !state.cinematic) {
    guide.open = true;
    hud.objective("The gate is open. Step through.");
  }
}
window.__START__ = begin;

// --- loop ---------------------------------------------------------------------------------
const timer = new THREE.Timer();
function frame(now) {
  requestAnimationFrame(frame);
  timer.update(now);
  const raw = timer.getDelta();
  const dt = Math.min(raw, 1 / 30);
  state.time += dt;
  state.frames++;
  state.fpsClock += raw;
  if (state.fpsClock >= 0.5) {
    state.fps = state.frames / state.fpsClock;
    state.frames = 0;
    state.fpsClock = 0;
  }
  input.poll();
  // The rig counts draws across its passes; the second world renders without it.
  if (!renderer.info.autoReset) renderer.info.reset();

  if (state.mode === "title") {
    // A slow crane over the court behind the title.
    const t = state.time * 0.05;
    camera.position.set(
      17 + Math.sin(t) * 6,
      12.5 + Math.sin(t * 0.7) * 1.5,
      39.5 - Math.cos(t) * 1.5,
    );
    camera.lookAt(15, 5, 11);
    if (input.pressed("jump") || input.pressed("interact")) begin();
  } else if (state.mode === "play" || state.mode === "world2") {
    const paused = !input.locked && !input.usingPad && !params.has("nolock");
    if (paused && state.mode !== "end") hud.pause(true);
    else hud.pause(false);
    if (!paused) step(dt);
  }
  // The end card sits over the second world, so it keeps drawing after the finale.
  if (worldTwo?.active) worldTwo.render(camera, dt);
  else {
    gate?.renderPortal(camera);
    rig.render(camera, dt);
  }
  input.endFrame();
  publish();
}

function step(dt) {
  const move = input.move;
  const look = input.takeLook(dt);
  const view = state.cinematic ? null : look;
  const commands = {
    move,
    camYaw: follow.yaw,
    jump: input.pressed("jump"),
    interactPressed: input.pressed("interact"),
    interactHeld: input.held("interact"),
    drop: input.pressed("drop"),
    walk: input.held("walk"),
  };
  if (state.cinematic) {
    for (const k of Object.keys(commands))
      if (k !== "camYaw") commands[k] = k === "move" ? { x: 0, y: 0 } : false;
  }
  // Two physics substeps keep ledge catches reliable at low frame rates.
  const sub = dt > 1 / 50 ? 2 : 1;
  for (let i = 0; i < sub; i++) {
    hero.update(dt / sub, commands);
    commands.jump = false;
    commands.interactPressed = false;
    commands.drop = false;
  }
  for (const e of hero.events.splice(0)) onHeroEvent(e);
  if (state.mode === "play") {
    level.update(dt);
    beams.update(dt);
    gate.update(dt, hero, state);
    updateGuide(dt);
    if (gate.crossed(hero)) enterWorldTwo();
  } else if (state.mode === "world2") {
    worldTwo.update(dt, hero, state);
    if (worldTwo.finished && state.mode !== "end") finish();
  }
  place(dt);
  dust.update(dt);
  if (state.cinematic) state.cinematic.update(dt, camera);
  else follow.update(dt, hero, view || { x: 0, y: 0 }, move);
  if (state.intro) {
    state.intro.t = Math.min(1, state.intro.t + dt / (reduced ? 0.01 : 1.6));
    const k = state.intro.t * state.intro.t * (3 - 2 * state.intro.t);
    camera.position.lerpVectors(state.intro.pos, camera.position.clone(), k);
    camera.quaternion.slerpQuaternions(
      state.intro.quat,
      camera.quaternion.clone(),
      k,
    );
    if (state.intro.t >= 1) state.intro = null;
  }
  hud.prompt(hero.prompt);
  sound.update(dt, hero, beams);
}

function place(dt) {
  heroModel.position.set(hero.pos.x, hero.feet + hero.stepLift, hero.pos.z);
  heroModel.rotation.y = hero.yaw;
  animator.update(dt, hero, reduced);
}

function onHeroEvent(e) {
  if (e === "land-hard") follow.shake = 0.8;
  if (e === "land" || e === "land-hard")
    dust.burst(
      hero.pos.x,
      hero.feet,
      hero.pos.z,
      e === "land-hard" ? 1.4 : 0.7 * hero.landing + 0.3,
      10,
    );
  if (e === "push" || e === "pull") {
    const b = hero.grip?.ref;
    if (b) dust.burst(b.x, 0, b.z, 1.1, 16);
  }
  if (e === "respawn") hud.flash();
  sound.play(e);
}

function enterWorldTwo() {
  state.mode = "world2";
  hud.flash(0.9);
  sound.play("cross");
  worldTwo.enter(hero, follow, gate, heroModel, world);
  // The dust follows the explorer through, darker on black sand.
  for (const p of dust.items) {
    worldTwo.scene.add(p.sprite);
    p.sprite.material.color.setHex(0x6a5a78);
  }
  hud.objective("");
  setTimeout(() => hud.objective("A new world. Walk to the edge."), 1600);
}

function finish() {
  state.mode = "end";
  document.exitPointerLock?.();
  hud.end(() => location.reload());
}

function publish() {
  const info = renderer.info.render;
  window.__GAME__ = {
    mode: state.mode,
    pos: [hero.pos.x, hero.pos.z],
    feet: hero.feet,
    state: hero.state,
    fps: Math.round(state.fps),
    speed: hero.speed,
    score: level.stelae.filter((s) => s.lit).length,
    over: state.mode === "end",
    draws: info.calls,
    tris: info.triangles,
    camYaw: follow.yaw,
    cinematic: !!state.cinematic,
    mirrors: level.mirrors.map((m) => ({
      id: m.id,
      yaw: m.yaw,
      locked: m.locked?.ref?.id || null,
    })),
    lit: level.stelae.filter((s) => s.lit).map((s) => s.id),
    gateOpen: !!gate?.isOpen,
    assets: Object.fromEntries(available),
  };
}

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  rig.resize(innerWidth, innerHeight);
  gate?.resize(innerWidth, innerHeight);
  worldTwo?.resize(innerWidth, innerHeight);
});
document
  .querySelector("#resume")
  .addEventListener("click", () => input.lockPointer());
canvas.addEventListener("click", () => {
  if (state.mode === "play" || state.mode === "world2") input.lockPointer();
});

load();
frame();
