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
import { TouchControls } from "./touch.js";
import { Beams } from "./beams.js";
import { Hud } from "./hud.js";
import { Menu } from "./menu.js";
import { Gate } from "./gate.js";
import { WorldTwo } from "./world-two.js";
import { WorldThree } from "./world-three.js";
import { WorldFour } from "./world-four.js";
import { CAMP } from "./isles.js";
import { isleAt } from "./world.js";
import { Sound } from "./sound.js";
import { Dust } from "./fx.js";
import { Bubbles } from "./bubbles.js";
import { CourtStory } from "./story.js";
import { Credits } from "./credits.js";
import { drawColliders } from "./debug-colliders.js";
import {
  settings,
  saveSettings,
  progress,
  reach,
  finish as finishGame,
  resetProgress,
  CHAPTERS,
} from "./store.js";
import * as COURT from "./court.js";

const params = new URLSearchParams(location.search);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.querySelector("#view");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
// A machine without a graphics chip draws in software (SwiftShader, llvmpipe). It gets a
// lighter picture, and the worlds beyond the doors compile when first reached, not at load.
const software = (() => {
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = gl.getParameter(
      info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER,
    );
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
})();
const PIXEL_RATIO = { high: 1.5, balanced: 1.1, fast: 0.85 };
const pixelRatio = () =>
  Math.min(
    devicePixelRatio,
    software ? 0.75 : PIXEL_RATIO[settings.quality] || 1.5,
  );
renderer.setPixelRatio(pixelRatio());
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
fitCamera();
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
renderer.setPixelRatio(pixelRatio());
// The rig asks for PCFSoftShadowMap, which r186 removed and swaps for PCFShadowMap at the
// first shadow pass. Every shader keys on the shadow type, so set the real one before
// anything compiles, or everything compiled at load is compiled again in play.
renderer.shadowMap.type = THREE.PCFShadowMap;

// --- assets -----------------------------------------------------------------------------
const MOVING = new Set([
  "hero_explorer",
  "far_gate",
  "glyph_stela",
  "warden",
  "customs_booth",
  "confiscation_bin",
  "crystal_emitter",
  "lumen_plant",
  "sun_disc",
  "stamp_plate",
  "path_lantern",
  "floating_isle",
  "light_pylon",
  "ice_casing",
  "glow_mushroom",
]);
const ASSETS = [
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
  "warden",
  "sun_disc",
  "customs_booth",
  "confiscation_bin",
  "queue_post",
  "crystal_emitter",
  "lumen_plant",
  "expedition_tent",
  "supply_crates",
  "clay_urns",
  "fallen_head",
  "boulder_cluster",
  "desert_agave",
  "glyph_banner",
  "stamp_plate",
  "path_lantern",
  "expedition_rope",
  "floating_isle",
  "light_pylon",
  "ice_block",
  "ice_spire",
  "ice_casing",
  "snow_pine",
  "frost_cairn",
  "wild_tree",
  "fern_cluster",
  "glow_mushroom",
  "rubble_pile",
];
const available = new Map();
async function probe(name) {
  try {
    const inst = await ASSET(`./assets/${name}.js`, {
      keepHierarchy: MOVING.has(name),
    });
    let meshes = 0;
    inst.traverse((o) => o.isMesh && meshes++);
    available.set(name, meshes > 0);
  } catch {
    available.set(name, false);
  }
}
const assets = {
  has: (name) => !!available.get(name),
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
const input = new Input(canvas, settings);
const touch = new TouchControls(input, canvas);
const hud = new Hud(input, settings);
const sound = new Sound(settings);
const dust = new Dust(scene);
const bubbles = new Bubbles();
const follow = new FollowCamera(camera, world);
const hero = new Hero(world, level);
const credits = new Credits(document.querySelector("#credits"), input);
let heroModel, animator, beams, gate, worldTwo, worldThree, worldFour, story;
// The explorer wears the rig's patched materials in the court and plain copies in the other
// worlds, which have their own light and no cascades.
const heroLooks = new Map();

const state = {
  mode: "loading",
  where: "court",
  chapter: null,
  paused: false,
  time: 0,
  cinematic: null,
  intro: null,
  crossing: null,
  fps: 0,
  frames: 0,
  fpsClock: 0,
};

const loadBar = document.querySelector("#load-fill");
const loadStep = document.querySelector("#load-step");
function loading(fraction, text) {
  loadBar.style.width = `${Math.round(fraction * 100)}%`;
  if (text) {
    loadStep.textContent = text;
    // Each loading step is a mark on the page's timeline, so a slow start can be taken apart.
    performance.mark(text);
  }
}
const frameYield = () => new Promise((r) => requestAnimationFrame(() => r()));

async function load() {
  loading(0.02, "Unpacking the expedition…");
  let done = 0;
  await Promise.all(
    ASSETS.map((name) =>
      probe(name).then(() => loading(0.02 + (0.4 * ++done) / ASSETS.length)),
    ),
  );
  loading(0.44, "Carving the sunken court…");
  await frameYield();
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
  gate = new Gate({ scene, world, renderer, sound, assets });
  await gate.build({ ...COURT.GATE, glyphs: ["twin", "spiral", "peak"] });
  gate.buildChannels(level.stelae);
  gate.onOpen = () => {
    if (state.where === "court") sound.setMusic("court-open");
  };
  gate.onIgnition = () => {
    hud.flash(0.55);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      dust.burst(
        gate.center.x + Math.cos(a) * 6,
        0,
        gate.center.z + 3 + Math.sin(a) * 3.2,
        1.6,
        6,
      );
    }
  };
  beams.onLit = (stela) => {
    sound.play("chime", stela.id);
    level.lightStela(stela);
    gate.feed(stela.id);
    hud.light(stela.glyph);
    if (level.stelae.every((s) => s.lit)) openCourtGate();
  };

  loading(0.56, "Opening a door to somewhere else…");
  await frameYield();
  worldTwo = new WorldTwo(renderer, assets, { bubbles, sound, hud, Gate });
  await worldTwo.build();
  gate.destination = worldTwo;
  loading(0.68, "Charting the sky beyond…");
  await frameYield();
  worldThree = new WorldThree(renderer, assets, { sound, hud, Gate });
  await worldThree.build();
  worldTwo.exitGate.destination = worldThree;
  loading(0.71, "Freezing the reach beyond…");
  await frameYield();
  worldFour = new WorldFour(renderer, assets, { sound, hud, Gate });
  await worldFour.build();

  loading(0.74, "Dressing the explorer…");
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
    if (o.isMesh) {
      o.castShadow = true;
      heroLooks.set(o, { court: o.material, plain: o.material.clone() });
    }
  });
  if (heroModel.userData.grip?.hands)
    hero.hands = heroModel.userData.grip.hands;
  scene.add(heroModel);
  animator = new HeroAnimator(heroModel);
  // Hang at the depth where the palms, not the fingertips, meet the lip.
  const reach = animator.hangReach(0.3);
  if (reach) hero.hands = reach + 0.015;
  await worldTwo.wire({
    hero,
    heroModel,
    follow,
    dust,
    state,
    onKnockout: knockedOut,
    palm: heroModel.userData.joints.rightHand ? animator.ik.right?.palm : null,
  });
  await worldThree.wire({
    hero,
    heroModel,
    follow,
    dust,
    state,
    palm: heroModel.userData.joints.rightHand ? animator.ik.right?.palm : null,
  });
  worldThree.isles.onRead = () => openNotes("mira");
  await worldFour.wire({
    hero,
    heroModel,
    follow,
    dust,
    state,
    palm: heroModel.userData.joints.rightHand ? animator.ik.right?.palm : null,
  });
  worldFour.onFinale = () => finale();
  story = new CourtStory({ hero, level, beams, gate, hud });
  const N = COURT.NOTES;
  level.notes = {
    box: {
      shape: "box",
      minX: N.x - 0.5,
      maxX: N.x + 0.5,
      minZ: N.z - 0.5,
      maxZ: N.z + 0.5,
      minY: 8,
      maxY: 9.4,
    },
    use: () => openNotes(),
  };
  hero.spawn(COURT.START.x, COURT.START.z, 8, COURT.START.yaw);
  follow.snap(hero);
  if (params.has("colliders")) {
    drawColliders(scene, world);
    drawColliders(worldTwo.scene, worldTwo.world);
    drawColliders(worldThree.scene, worldThree.world);
    drawColliders(worldFour.scene, worldFour.world);
  }
  if (params.has("debug"))
    window.__FD__ = {
      THREE,
      worldTwo,
      worldThree,
      worldFour,
      level,
      hero,
      gate,
      renderer,
      follow,
    };

  await precompile();
  loading(1, "Ready.");
  wireMenu();
  document.querySelector("#loading").classList.add("leaving");
  setTimeout(() => (document.querySelector("#loading").hidden = true), 700);
  toTitle();
  window.__READY__ = true;
  // Development shortcuts: ?chapter=floor|checkpoint starts there, ?w2=1 is the checkpoint.
  const auto =
    params.get("chapter") || (params.has("w2") ? "checkpoint" : null);
  if (auto) startChapter(auto);
}

// Every shader the game will need, compiled behind the loading screen: the court as the rig
// draws it, the second world as seen through the first door (clipped) and as walked in, the
// third world through the far door and in the closing shot, each with the explorer in it.
// Nothing compiles during play, so crossing a door costs nothing.
async function precompile() {
  // A program depends on where it draws: into a render target it skips tone mapping and
  // writes linear colour. Every scene here draws into one (a composer or a portal), so each
  // is compiled with that target bound, and with the portal's clipping plane where it has one.
  const compile = async (target, sceneToCompile, planes = []) => {
    renderer.setRenderTarget(target);
    renderer.clippingPlanes = planes;
    await renderer.compileAsync(sceneToCompile, camera);
    renderer.clippingPlanes = [];
    renderer.setRenderTarget(null);
  };
  loading(0.78, "Lighting the court…");
  await rig.ready;
  rig.refresh(scene);
  await compile(rig.post?.rt ?? null, scene);
  rig.render(camera, 0.016);
  if (software) {
    state.programs = renderer.info.programs.length;
    return;
  }
  loading(0.84, "Lighting the checkpoint…");
  await frameYield();
  await compile(gate.target, worldTwo.scene, [worldTwo.clipPlane]);
  gate.disc.visible = true;
  gate.uniforms.uClear.value = 1;
  camera.position.set(15, 3, 24);
  camera.lookAt(gate.center);
  gate.renderView(camera);
  rig.render(camera, 0.016);
  gate.disc.visible = false;
  gate.uniforms.uClear.value = 0;
  goTo("two");
  worldTwo.prepareForCompile(true);
  await compile(worldTwo.composer.readBuffer, worldTwo.scene);
  worldTwo.render(camera, 0.016);
  loading(0.92, "Lighting the sky beyond…");
  await frameYield();
  worldThree.prepareForCompile(true);
  await compile(worldTwo.exitGate.target, worldThree.scene, [
    worldThree.clipPlane,
  ]);
  worldTwo.exitGate.renderView(camera);
  goTo("three", { arrive: true });
  worldThree.prepareForCompile(true);
  await compile(worldThree.composer.readBuffer, worldThree.scene);
  worldThree.render(camera, 0.016);
  worldThree.prepareForCompile(false);
  loading(0.96, "Lighting the frozen reach…");
  await frameYield();
  goTo("four", { arrive: true });
  worldFour.prepareForCompile(true);
  await compile(worldFour.ring.target, worldFour.forest.scene, [
    worldFour.forest.clipPlane,
  ]);
  camera.position.set(1, 4, -146);
  camera.lookAt(worldFour.ring.center);
  worldFour.ring.renderView(camera);
  await compile(worldFour.composer.readBuffer, worldFour.scene);
  worldFour.render(camera, 0.016);
  worldFour.prepareForCompile(false);
  worldTwo.prepareForCompile(false);
  goTo("court");
  hero.spawn(COURT.START.x, COURT.START.z, 8, COURT.START.yaw);
  state.programs = renderer.info.programs.length;
}

// --- where the explorer is: the court, the checkpoint, or the sky beyond -------------------
function dressHero(where) {
  for (const [mesh, look] of heroLooks)
    mesh.material = where === "court" ? look.court : look.plain;
}

function goTo(where, opts = {}) {
  if (state.where === "two" && where !== "two") worldTwo.leave();
  if (state.where === "three" && where !== "three") worldThree.leave();
  if (state.where === "four" && where !== "four") worldFour.leave();
  state.where = where;
  dressHero(where);
  if (where === "court") {
    worldTwo.active = false;
    worldThree.active = false;
    worldFour.active = false;
    heroModel.removeFromParent();
    scene.add(heroModel);
    hero.world = world;
    hero.level = level;
    follow.world = world;
    dust.moveTo(scene, 0xd9b88a);
    hud.setAddress(["twin", "spiral", "peak"]);
    for (const s of level.stelae) if (s.lit) hud.light(s.glyph);
  } else if (where === "two") {
    worldThree.active = false;
    worldFour.active = false;
    worldTwo.enter(opts);
    dust.moveTo(worldTwo.scene, 0x6a5a78);
  } else if (where === "three") {
    worldTwo.active = false;
    worldFour.active = false;
    worldThree.enter(opts);
    dust.moveTo(worldThree.scene, 0xe8dcc4);
  } else {
    worldTwo.active = false;
    worldThree.active = false;
    worldFour.enter(opts);
    dust.moveTo(worldFour.scene, 0xeaf2f8);
  }
}

// --- chapters, the title and the pause menu ---------------------------------------------------
function resetWorlds() {
  state.reading = false;
  hud.showNotes(false);
  hud.clearSubtitle();
  level.reset();
  gate.reset();
  worldTwo.reset();
  worldThree.reset();
  worldFour.reset();
  bubbles.clear();
  hud.setAddress(["twin", "spiral", "peak"]);
  state.cinematic = null;
  state.crossing = null;
  state.intro = null;
  hud.letterbox(false);
  hud.hideHealth();
}

function startChapter(id) {
  const chapter = CHAPTERS.find((c) => c.id === id) || CHAPTERS[0];
  const fromTitle = state.mode === "title";
  resetWorlds();
  state.chapter = chapter.id;
  state.paused = false;
  state.mode = "play";
  menu.close({ fade: true });
  credits.stop();
  hud.show();
  hud.clearHint();
  input.clear();
  sound.start();
  sound.startMusic();
  if (chapter.id === "checkpoint") {
    // Arriving from the Levels menu, the court behind the first door is already solved.
    solveCourt();
    goTo("two", { arrive: true });
    worldTwo.startStory();
    sound.setMusic("world2");
  } else if (chapter.id === "isles") {
    // And for the isles, the checkpoint behind the far door as well.
    solveCourt();
    worldTwo.solve();
    goTo("three", { arrive: true });
    worldThree.startStory();
    sound.setMusic("isles");
  } else if (chapter.id === "frost") {
    // And for the frozen reach, Mira's ring opened behind it.
    solveCourt();
    worldTwo.solve();
    worldThree.solve();
    goTo("four", { arrive: true });
    worldFour.startStory();
    sound.setMusic("frost");
  } else {
    goTo("court");
    if (chapter.id === "floor")
      hero.spawn(COURT.FLOOR.x, COURT.FLOOR.z, 0, COURT.FLOOR.yaw);
    else hero.spawn(COURT.START.x, COURT.START.z, 8, COURT.START.yaw);
    story.start(chapter.id);
    sound.setMusic("court");
  }
  devSpawn();
  // Development shortcut: ?barrier=1 starts the checkpoint with its barrier already up.
  if (params.has("barrier") && chapter.id === "checkpoint")
    worldTwo.devOpenBarrier();
  follow.snap(hero);
  follow.pitch = 0.28;
  // Glide from the title shot down behind the explorer rather than cutting; from the
  // terrace, the opening shot tells what happened here first.
  state.intro = fromTitle
    ? { t: 0, pos: camera.position.clone(), quat: camera.quaternion.clone() }
    : null;
  if (chapter.id === "court" && !params.has("at")) {
    state.intro = null;
    state.cinematic = story.introShot();
  }
  hud.chapter(`Level ${chapter.level}`, chapter.title, chapter.start);
  reach(chapter.id);
  state.programsAtStart ??= renderer.info.programs.length;
  lockPointer();
  // Development shortcut: ?lit=1 lights the court's address at once.
  if (params.has("lit") && (chapter.id === "court" || chapter.id === "floor"))
    for (const s of level.stelae) {
      s.lit = true;
      beams.onLit(s);
    }
}

// The first expedition's field notes, found in their camp on the terrace, and Mira's journal
// in her last camp on the isles.
function openNotes(which = "first") {
  state.reading = which;
  hud.clearHint();
  hud.showNotes(true, which);
  sound.play("paper");
  return true;
}

function closeNotes() {
  const which = state.reading;
  state.reading = false;
  hud.showNotes(false);
  sound.play("paper");
  input.clear();
  if (which === "first" && !story.notesRead) {
    story.notesRead = true;
    hud.subtitle("They went through the door. Then so will I.", 4);
    story.holdHints(4.3);
  }
  if (which === "mira" && !worldThree.isles.read) {
    worldThree.isles.read = true;
    const ring = worldThree.isles.ring;
    ring.ignite(0);
    setTimeout(() => ring.ignite(1), 450);
    for (const g of CAMP.glyphs) if (g) hud.light(g);
    hud.objective("");
    hud.setMarkers([]);
    hud.subtitle("Two glyphs of three. Then I'll find the third.", 4.2);
    setTimeout(() => {
      if (state.mode === "play" && state.where === "three")
        worldThree.openRing(state);
    }, 2200);
  }
}

// The court as the explorer left it: every stela lit and the first door open.
function solveCourt() {
  for (const s of level.stelae) {
    s.lit = true;
    level.lightStela(s);
  }
  for (const ch of gate.channels.values()) {
    ch.running = ch.done = true;
    ch.progress = 1;
    ch.uniforms.uProgress.value = 1;
  }
  gate.forceOpen();
}

// Development shortcut: ?at=x,z,feet[,yawDeg] starts elsewhere in the current world.
function devSpawn() {
  const at = params.get("at")?.split(",").map(Number);
  if (at?.length >= 3)
    hero.spawn(at[0], at[1], at[2], ((at[3] ?? 180) * Math.PI) / 180);
}

function toTitle() {
  resetWorlds();
  hud.clearChapter();
  goTo("court");
  hero.spawn(COURT.START.x, COURT.START.z, 8, COURT.START.yaw);
  state.mode = "title";
  state.paused = false;
  hud.hide();
  credits.stop();
  document.exitPointerLock?.();
  refreshMainMenu();
  menu.open("main");
  sound.setMusic?.("court");
}

function pause(on) {
  if (state.mode !== "play" || state.paused === on) return;
  state.paused = on;
  if (on) {
    const chapter = CHAPTERS.find((c) => c.id === state.chapter);
    document.querySelector("#pause-where").textContent =
      `Level ${chapter?.level ?? 1} · ${chapter?.title ?? ""}`;
    document.querySelector("#pause-objective").textContent =
      document.querySelector("#objective").textContent;
    menu.open("pause", { paused: true });
    document.exitPointerLock?.();
    sound.duck(true);
  } else {
    menu.close();
    input.clear();
    sound.duck(false);
    lockPointer();
  }
}

function lockPointer() {
  if (!params.has("nolock") && !input.usingTouch) input.lockPointer();
}

const menu = new Menu(document.querySelector("#menu"), {
  onAction: (action, el) => menuAction(action, el),
  onChange: (el) => settingChanged(el),
});

let confirmAction = null;
function menuAction(action, el) {
  sound.start();
  sound.play("ui");
  switch (action) {
    case "continue":
      return startChapter(progress.last || "court");
    case "new":
      return startChapter("court");
    case "levels":
      refreshLevels();
      return menu.push("levels");
    case "settings":
      return menu.push("settings");
    case "controls":
      refreshControls();
      return menu.push("controls");
    case "credits":
      menu.close({ fade: true });
      skipHelp();
      return credits.play(() => {
        refreshMainMenu();
        menu.open("main");
      });
    case "chapter":
      return startChapter(el.dataset.chapter);
    case "resume":
    case "back-root":
      if (state.mode === "play") return pause(false);
      return;
    case "restart":
      return startChapter(state.chapter === "floor" ? "floor" : state.chapter);
    case "title":
      return toTitle();
    case "reset-progress":
      confirmAction = () => {
        resetProgress();
        refreshMainMenu();
        menu.back();
      };
      document.querySelector("#confirm-text").textContent =
        "Forget every level reached in this browser?";
      return menu.push("confirm");
    case "confirm-yes":
      confirmAction?.();
      confirmAction = null;
      return menu.back();
    case "back":
      return menu.back();
  }
}

function refreshMainMenu() {
  const cont = document.querySelector('#menu [data-action="continue"]');
  cont.hidden = !progress.last || progress.last === "court";
  const chapter = CHAPTERS.find((c) => c.id === progress.last);
  if (chapter) cont.textContent = `Continue · ${chapter.title}`;
  document.querySelector('[data-help="menu"]').innerHTML = input.usingTouch
    ? "Tap to choose"
    : `${hud.keys("KeyW", "KeyS")} or mouse to choose · <kbd>Enter</kbd> to confirm`;
}

function skipHelp() {
  document.querySelector('[data-help="skip"]').innerHTML = input.usingTouch
    ? "Tap to skip"
    : "<kbd>Esc</kbd> or <kbd>Enter</kbd> to skip";
}

function refreshLevels() {
  const list = document.querySelector("#level-list");
  list.innerHTML = "";
  for (const n of [1, 2, 3, 4]) {
    const starts = CHAPTERS.filter((c) => c.level === n);
    const open = starts.filter((c) => progress.reached.has(c.id));
    const card = document.createElement("div");
    card.className = `level-card${["", "", " two", " three", " four"][n]}${open.length ? "" : " locked"}`;
    card.innerHTML = `<p class="num">Level ${n}</p><h3>${starts[0].title}</h3><p class="blurb">${starts[0].blurb}</p>`;
    for (const c of starts) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.action = "chapter";
      b.dataset.chapter = c.id;
      b.textContent = c.start;
      b.disabled = !progress.reached.has(c.id);
      card.appendChild(b);
    }
    if (!open.length) {
      const p = document.createElement("p");
      p.className = "state";
      p.textContent =
        n === 2
          ? "Open the first far door to reach it."
          : n === 3
            ? "Open the far door beyond the checkpoint to reach it."
            : "Follow Mira through her ring on the isles to reach it.";
      card.appendChild(p);
    } else if (n === 4 && progress.finished) {
      const p = document.createElement("p");
      p.className = "state";
      p.textContent = "Completed.";
      card.appendChild(p);
    }
    list.appendChild(card);
  }
}

function refreshControls() {
  const k = (c) => `<kbd>${input.keyLabel(c)}</kbd>`;
  const rows = input.usingTouch
    ? touchControls()
    : [
        [`${k("KeyW")}${k("KeyA")}${k("KeyS")}${k("KeyD")}`, "Move"],
        ["Mouse", "Look"],
        ["<kbd>Space</kbd>", "Jump, climb up"],
        [`${k("KeyE")} hold`, "Grab a block, turn a mirror, talk, take"],
        [`${k("KeyC")}`, "Hang from an edge, let go"],
        ["<kbd>Shift</kbd> hold", "Walk without falling off edges"],
        [`${k("KeyQ")} or right click`, "Roll"],
        [`${k("KeyR")} or left click`, "Throw the disc"],
        ["<kbd>Esc</kbd>", "Pause"],
      ];
  document.querySelector("#controls-keys").innerHTML = rows
    .map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`)
    .join("");
}

// The on-screen controls, by the names their buttons carry. Some only show when they apply.
function touchControls() {
  return [
    ["Stick", "Move: a light push walks and stops at edges, a full push runs"],
    ["Drag the picture", "Look"],
    ["<kbd>Jump</kbd>", "Jump, climb up"],
    ["<kbd>Use</kbd> hold", "Grab a block, turn a mirror, talk, take"],
    ["<kbd>Hang</kbd>", "Hang from an edge, let go"],
    ["<kbd>Throw</kbd>", "Throw the disc, while you carry it"],
    ["<kbd>Roll</kbd>", "Roll, beyond the first door"],
    ["<kbd>II</kbd>", "Pause"],
  ];
}

function wireMenu() {
  const bind = (id, key, parse = Number) => {
    const el = document.getElementById(id);
    if (el.type === "checkbox") el.checked = !!settings[key];
    else el.value = settings[key];
    el.dataset.setting = key;
    el.dataset.parse = parse === Number ? "number" : "string";
  };
  bind("set-sensitivity", "sensitivity");
  bind("set-invert", "invertY");
  bind("set-volume", "volume");
  bind("set-music", "music");
  bind("set-effects", "effects");
  bind("set-quality", "quality", String);
  bind("set-markers", "markers");
  bind("set-hints", "hints");
  bind("set-shake", "shake");
  skipHelp();
}

function settingChanged(el) {
  const key = el.dataset?.setting;
  if (!key) return;
  settings[key] =
    el.type === "checkbox"
      ? el.checked
      : el.dataset.parse === "number"
        ? Number(el.value)
        : el.value;
  saveSettings();
  if (key === "volume" || key === "music" || key === "effects")
    sound.applyVolumes();
  if (key === "quality") resize();
}

// --- the court's gate, the crossings and the ending ------------------------------------------
function openCourtGate() {
  // The camera leaves the explorer, frames the ring through the charge and the ignition,
  // pushes in as the membrane clears onto the other world, then hands back.
  gate.open(state, [
    { at: 0, eye: [8, -2.4, 17], look: [0, -2.2, 3] },
    { at: 1.7, eye: [6, -2.6, 16.5], look: [0, -0.6, 0] },
    { at: 5.1, eye: [3.5, -2.5, 13.5], look: [0, -0.4, 0] },
    // High enough to see over the stelae into the opened ring.
    { at: 8.4, eye: [3.4, -1.3, 10.2], look: [0, -0.9, -2] },
    { at: 9.2, eye: [3.2, -1.3, 9.8], look: [0, -0.9, -2] },
  ]);
}

function cross(to, opts = {}) {
  if (state.crossing) return;
  state.crossing = { t: 0, to, opts, swapped: false };
  hud.warp();
  sound.play("cross");
}

function updateCrossing(dt) {
  const c = state.crossing;
  if (!c) return;
  c.t += dt;
  if (!c.swapped && c.t > 0.42) {
    c.swapped = true;
    // Whatever the last world was saying stays behind with it.
    hud.clearSubtitle();
    hud.clearChapter();
    if (c.to === "three" && c.opts.back) {
      // Back out of Mira's ring's twin: the camp on the isles, the ring still open.
      goTo("three", { back: c.opts.x || 0 });
      follow.snap(hero, false);
      state.chapter = "isles";
      sound.setMusic("isles");
    } else if (c.to === "four") {
      const R = worldThree.isles.ring;
      goTo("four", {
        through: {
          x: hero.pos.x - R.center.x,
          z: hero.pos.z - R.center.z,
          feet: hero.feet - R.daisTop,
        },
      });
      state.chapter = "frost";
      worldFour.startStory();
      sound.setMusic("frost");
      if (reach("frost"))
        setTimeout(
          () =>
            hud.chapter("Level 4", "The Frozen Reach", "Beyond Mira's ring"),
          900,
        );
    } else if (c.to === "two" && c.opts.back) {
      // Back out of the far door from the isles: the checkpoint as it was left.
      goTo("two", { back: c.opts.x || 0 });
      follow.snap(hero, false);
      state.chapter = "checkpoint";
      sound.setMusic("world2");
    } else if (c.to === "two") {
      // Keep the explorer's offset from the gate so the step through is continuous.
      const off = {
        x: hero.pos.x - gate.center.x,
        z: hero.pos.z - gate.center.z,
        feet: hero.feet - gate.daisTop,
      };
      goTo("two", { through: off });
      state.chapter = "checkpoint";
      worldTwo.startStory();
      sound.setMusic("world2");
      if (reach("checkpoint"))
        setTimeout(
          () =>
            hud.chapter("Level 2", "The Checkpoint", "Beyond the first door"),
          900,
        );
    } else if (c.to === "court") {
      // Out of the first door the way the explorer walked into its twin: still heading
      // south, and the camera keeps the heading it had, so held keys keep going the same way.
      goTo("court");
      hero.spawn(
        gate.center.x + (c.opts.x || 0),
        gate.center.z + 0.9,
        gate.daisTop + 0.02,
        0,
      );
      follow.snap(hero, false);
      sound.setMusic(gate.isOpen ? "court-open" : "court");
      state.chapter = "floor";
      story.start("floor");
    } else if (c.to === "three") {
      const E = worldTwo.exitGate;
      goTo("three", {
        through: {
          x: hero.pos.x - E.center.x,
          z: hero.pos.z - E.center.z,
          feet: hero.feet - E.daisTop,
        },
      });
      state.chapter = "isles";
      worldThree.startStory();
      sound.setMusic("isles");
      if (reach("isles"))
        setTimeout(
          () => hud.chapter("Level 3", "The Dawn Isles", "Beyond the far door"),
          900,
        );
    }
  }
  if (c.t > 1.15) state.crossing = null;
}

// The great ring open onto the forest: the explorer steps up to it, the camera closes in on
// the world beyond, the title comes up, then the credits roll back to the menu.
function finale() {
  finishGame();
  sound.setMusic("finale");
  state.cinematic = worldFour.finaleShot(hero, () => {
    state.mode = "credits";
    hud.hide();
    document.exitPointerLock?.();
    skipHelp();
    credits.play(() => toTitle());
  });
  setTimeout(() => {
    if (state.cinematic && state.where === "four")
      hud.subtitle("Their trail goes on, through door after door.", 4.5);
  }, 5200);
}

// Knocked out at the checkpoint: the case is closed and the explorer rejoins the queue.
function knockedOut(respawn) {
  state.processing = true;
  hud.processed(() => {
    respawn();
    follow.snap(hero);
    state.processing = false;
  });
}

// --- loop ---------------------------------------------------------------------------------
const timer = new THREE.Timer();
function frame(now) {
  requestAnimationFrame(frame);
  timer.update(now);
  const raw = timer.getDelta();
  // Real time down to 20 frames a second, as on a busy phone; slower than that, the game slows.
  const dt = Math.min(raw, 1 / 20);
  state.time += dt;
  state.frames++;
  state.fpsClock += raw;
  if (state.fpsClock >= 0.5) {
    state.fps = state.frames / state.fpsClock;
    state.frames = 0;
    state.fpsClock = 0;
  }
  input.poll();
  menu.poll(dt);
  // The rig counts draws across its passes; the other worlds render without it.
  if (!renderer.info.autoReset) renderer.info.reset();

  if (state.mode === "title") {
    // A slow crane over the court behind the menu.
    const t = state.time * 0.05;
    camera.position.set(
      17 + Math.sin(t) * 6,
      12.5 + Math.sin(t * 0.7) * 1.5,
      39.5 - Math.cos(t) * 1.5,
    );
    camera.lookAt(15, 5, 11);
    level.update(dt);
    beams?.update(dt);
    gate?.update(dt);
  } else if (state.mode === "play") {
    if (state.reading) {
      if (["interact", "skip", "pause"].some((a) => input.pressed(a)))
        closeNotes();
    } else {
      if (!state.paused && input.pressed("pause")) pause(true);
      if (!state.paused) step(dt);
    }
  } else if (state.mode === "credits") {
    worldFour.ambient(dt);
    if (state.cinematic) {
      state.cinematic.update(dt, camera);
      if (state.cinematic.done) state.cinematic = null;
    }
    placeHero(dt);
  }
  credits.update(dt);
  touch.update({
    play: state.mode === "play" && !state.paused && !state.reading,
    cinematic: !!state.cinematic,
    holding: state.where !== "court" && hero.holding,
    prompt: hero.prompt,
    hanging: hero.state === "hang",
    beyond: state.where !== "court",
  });
  if (state.mode !== "loading") render(dt);
  input.endFrame();
  publish();
}

function render(dt) {
  if (state.where === "two") worldTwo.render(camera, dt);
  else if (state.where === "three") worldThree.render(camera, dt);
  else if (state.where === "four") worldFour.render(camera, dt);
  else {
    gate.renderPortal(camera);
    rig.render(camera, dt);
  }
}

function step(dt) {
  const move = input.move;
  const look = input.takeLook(dt);
  const blocked = !!state.cinematic || state.processing;
  const commands = {
    move: blocked ? { x: 0, y: 0 } : move,
    camYaw: follow.yaw,
    jump: !blocked && input.pressed("jump"),
    jumpHeld: !blocked && input.held("jump"),
    interactPressed: !blocked && input.pressed("interact"),
    interactHeld: !blocked && input.held("interact"),
    drop: !blocked && input.pressed("drop"),
    walk: !blocked && (input.held("walk") || input.touchWalk),
    roll: !blocked && input.pressed("roll"),
  };
  // A cinematic can be skipped with Enter or jump.
  if (state.cinematic?.skip && (input.pressed("skip") || input.pressed("jump")))
    state.cinematic.skip();
  // Substeps of at most 1/50 s keep ledge catches reliable at low frame rates.
  const sub = Math.max(1, Math.ceil(dt * 50 - 1e-6));
  for (let i = 0; i < sub; i++) {
    hero.update(dt / sub, commands);
    commands.jump =
      commands.interactPressed =
      commands.drop =
      commands.roll =
        false;
  }
  for (const e of hero.events.splice(0)) onHeroEvent(e);

  if (state.where === "court") {
    level.update(dt);
    beams.update(dt);
    gate.update(dt);
    story.update(dt);
    if (!state.crossing && gate.crossed(hero)) cross("two");
  } else if (state.where === "two") {
    worldTwo.update(dt, hero, state, {
      throw: !blocked && input.pressed("throw"),
      camera,
    });
    if (!state.crossing && worldTwo.returnCrossed(hero))
      cross("court", { x: hero.pos.x - worldTwo.gateCenter.x });
    if (!state.crossing && worldTwo.exitGate.crossed(hero)) cross("three");
  } else if (state.where === "three") {
    worldThree.update(dt, hero, state, {
      throw: !blocked && input.pressed("throw"),
      camera,
    });
    if (!state.crossing && worldThree.returnCrossed(hero))
      cross("two", { back: true, x: hero.pos.x - worldThree.gateCenter.x });
    if (!state.crossing && worldThree.isles.ring.crossed(hero)) cross("four");
  } else if (state.where === "four") {
    worldFour.update(dt, hero, state, {
      throw: !blocked && input.pressed("throw"),
      camera,
    });
    if (!state.crossing && worldFour.returnCrossed(hero))
      cross("three", { back: true, x: hero.pos.x - worldFour.gateCenter.x });
  }
  updateCrossing(dt);
  bubbles.update(dt, camera);
  placeHero(dt);
  dust.update(dt);
  if (state.cinematic) {
    state.cinematic.update(dt, camera, settings.shake ? 1 : 0);
    hud.letterbox(!!state.cinematic.letterbox);
    if (state.cinematic.done) {
      state.cinematic = null;
      hud.letterbox(false);
      // Glide back to the explorer from wherever the shot ended.
      state.intro = {
        t: 0,
        pos: camera.position.clone(),
        quat: camera.quaternion.clone(),
      };
      follow.snap(hero, false);
    }
  } else {
    follow.shakeScale = settings.shake ? 1 : 0;
    follow.update(dt, hero, look, move);
  }
  if (state.intro && !state.cinematic) {
    state.intro.t = Math.min(1, state.intro.t + dt / (reduced ? 0.01 : 1.4));
    const k = state.intro.t * state.intro.t * (3 - 2 * state.intro.t);
    camera.position.lerpVectors(state.intro.pos, camera.position.clone(), k);
    camera.quaternion.slerpQuaternions(
      state.intro.quat,
      camera.quaternion.clone(),
      k,
    );
    if (state.intro.t >= 1) state.intro = null;
  }
  // Development shortcut: ?cam=x,y,z,tx,ty,tz holds the camera still for inspection.
  const fixed = params.get("cam")?.split(",").map(Number);
  if (fixed?.length === 6) {
    camera.position.set(fixed[0], fixed[1], fixed[2]);
    camera.lookAt(fixed[3], fixed[4], fixed[5]);
  }
  hud.updateMarkers(camera, hero.pos);
  hud.prompt(state.cinematic || state.reading ? "" : hero.prompt);
  sound.update(dt, hero, state.where === "court" ? beams : null);
}

function placeHero(dt) {
  // Sand banked against the court's walls lifts the feet onto its slope.
  const lift =
    state.where === "court" &&
    ["ground", "grab", "shove", "turn", "roll"].includes(hero.state)
      ? level.driftAt(hero.pos.x, hero.pos.z, hero.feet)
      : 0;
  animator.update(dt, hero, reduced, lift);
  if (animator.footfall) {
    animator.footfall = 0;
    const f = hero.facing;
    dust.burst(
      hero.pos.x - f.x * 0.25,
      hero.feet + lift,
      hero.pos.z - f.z * 0.25,
      0.25,
      3,
    );
  }
}

function onHeroEvent(e) {
  if (e === "land-hard") follow.shake = settings.shake ? 0.8 : 0;
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
  if (e === "strain" && state.where === "four" && !state.iceStrainHinted) {
    state.iceStrainHinted = true;
    hud.hint(
      "Ice",
      "A block of ice cannot be pulled, and it will not slide off the ice. Push it from another side.",
      7,
    );
  } else if (e === "strain" && !state.strainHinted) {
    state.strainHinted = true;
    hud.hint(
      "Blocks",
      "It will not budge that way: something is in the way, or the floor ends. Try another side.",
      7,
    );
  }
  if (e === "respawn")
    hud.blackout(
      hero.lastFall === "water"
        ? "The cold water throws you back."
        : hero.lastFall !== "deep"
          ? "Too far to fall."
          : state.where === "three"
            ? "The clouds close over the fall."
            : state.where === "four"
              ? "The ice swallows the fall."
              : "The dark swallows the fall.",
    );
  sound.play(e);
}

function publish() {
  const info = renderer.info.render;
  const cp = worldTwo?.checkpoint;
  window.__GAME__ = {
    mode: state.mode,
    where: state.where,
    chapter: state.chapter,
    paused: state.paused,
    menu: menu.screen,
    pos: [hero.pos.x, hero.pos.z],
    feet: hero.feet,
    state: hero.state,
    fps: Math.round(state.fps),
    speed: hero.speed,
    score: level.stelae.filter((s) => s.lit).length,
    over: state.mode === "credits" || state.mode === "ending",
    draws: info.calls,
    tris: info.triangles,
    programs: renderer.info.programs?.length ?? 0,
    programsAtLoad: state.programs ?? 0,
    programsAtStart: state.programsAtStart ?? 0,
    camYaw: follow.yaw,
    cinematic: !!state.cinematic,
    crossing: !!state.crossing,
    step: state.where === "court" ? story?.step?.id : cp?.step,
    objective: document.querySelector("#objective")?.textContent,
    mirrors: level.mirrors.map((m) => ({
      id: m.id,
      yaw: m.yaw,
      locked: m.locked?.ref?.id || null,
    })),
    lit: level.stelae.filter((s) => s.lit).map((s) => s.id),
    gateOpen: !!gate?.isOpen,
    health: cp?.health,
    checkpoint: cp?.phase,
    plates: cp?.plates?.map((p) => ({ glyph: p.glyph, stamped: p.stamped })),
    disc: worldTwo?.disc
      ? { state: worldTwo.disc.state, charged: worldTwo.disc.charged }
      : null,
    guards: cp?.guards.map((g) => ({
      state: g.state,
      glyph: g.glyph,
      hp: g.hp,
      hostile: g.hostile,
      pos: [g.pos.x, g.pos.z],
      target: g.target ? [g.target.x, g.target.z] : null,
    })),
    exitOpen: !!worldTwo?.exitGate?.isOpen,
    isles: islesTelemetry(),
    frozen: frozenTelemetry(),
    credits: credits.running,
    assets: Object.fromEntries(available),
  };
}

// What the play-through steers by on the isles: progress, the disc, the pylons and their
// bridges, and where the things to reach are.
function islesTelemetry() {
  const I = worldThree?.isles;
  if (!I) return null;
  const xz = (v) => [+v.x.toFixed(2), +v.z.toFixed(2), +v.y.toFixed(2)];
  return {
    step: I.guideKey,
    reached: I.reached,
    on: I.on,
    read: I.read,
    disc: worldThree.disc
      ? { state: worldThree.disc.state, charged: worldThree.disc.charged }
      : null,
    isles: I.isles.map((i) => ({
      id: i.id,
      at: [
        +i.collider.x.toFixed(2),
        +i.collider.z.toFixed(2),
        +i.collider.maxY.toFixed(2),
      ],
    })),
    wells: I.wells.map((w) => xz(w.center)),
    pylons: I.pylons.map((p) => ({
      id: p.id,
      lens: xz(p.lens),
      emit: xz(p.emit),
      to: p.to,
      on: p.bridge.on,
      left: +p.bridge.left.toFixed(2),
    })),
    note: I.notePos ? xz(I.notePos) : null,
    ring: I.ring
      ? {
          x: +I.ring.center.x.toFixed(2),
          z: +I.ring.center.z.toFixed(2),
          phase: I.ring.phase,
        }
      : null,
    ferry: I.isle("ferry")?.run
      ? {
          z: +I.isle("ferry").collider.z.toFixed(2),
          a: +I.isle("ferry").run.a.toFixed(2),
          b: +I.isle("ferry").run.b.toFixed(2),
        }
      : null,
    stones: I.isles
      .filter((i) => i.crumble)
      .map((i) => ({ id: i.id, phase: i.phase })),
    // The rim of each isle facing the next one: where to take off.
    edges: I.isles.slice(0, -1).map((a, k) => {
      const c = a.collider,
        b = I.isles[k + 1].collider;
      const ang = Math.atan2(b.z - c.z, b.x - c.x);
      const r = isleAt(
        c,
        c.x + Math.cos(ang) * 99,
        c.z + Math.sin(ang) * 99,
      ).rim;
      return [
        +(c.x + Math.cos(ang) * r).toFixed(2),
        +(c.z + Math.sin(ang) * r).toFixed(2),
      ];
    }),
  };
}

// A tall phone screen sees the world through a slot: widen the vertical view there, so the
// horizontal one keeps enough of the level around the explorer to play by.
function fitCamera() {
  const aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  camera.fov = aspect < 1 ? Math.min(80, 58 + (1 - aspect) * 40) : 58;
  camera.updateProjectionMatrix();
}

// What the play-through steers by in the frozen reach.
function frozenTelemetry() {
  const F = worldFour?.frozen;
  if (!F) return null;
  const r = (v) => +v.toFixed(2);
  return {
    reached: F.reached,
    section: F.guideKey,
    block: F.blocks.map((b) => ({ x: r(b.x), z: r(b.z), state: b.state }))[0],
    floes: F.floes.map((f) => r(f.x)),
    thin: F.thin.map((t) => t.phase),
    broken: F.broken,
    freed: F.freed,
    ring: worldFour.ring.phase,
    disc: worldFour.disc
      ? { state: worldFour.disc.state, charged: worldFour.disc.charged }
      : null,
  };
}

function resize() {
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(innerWidth, innerHeight);
  fitCamera();
  rig.resize(innerWidth, innerHeight);
  gate?.resize();
  worldTwo?.resize(innerWidth, innerHeight);
  worldThree?.resize(innerWidth, innerHeight);
  worldFour?.resize(innerWidth, innerHeight);
}
addEventListener("resize", resize);
input.onUnlock = () => {
  if (state.reading) closeNotes();
  if (state.mode === "play" && !state.paused) pause(true);
};
canvas.addEventListener("click", () => {
  if (state.mode === "play" && !state.paused) lockPointer();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause(true);
});
window.__START__ = () => startChapter(progress.last || "court");

load().catch((e) => {
  console.error(e?.stack || e);
  loading(1, "Something broke while loading. Reload the page to try again.");
});
frame();
