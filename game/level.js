import * as THREE from "three";
import * as COURT from "./court.js";
import { FaceBuilder, greedyRects, terrainMaterial } from "./terrain.js";
import { glyphMaterial, makeGlyph } from "./glyphs.js";

// Builds the court from its map: colliders for the hero, merged terrain meshes, and the
// things that move (blocks slide one cell, mirrors turn on their drums).
export class Level {
  constructor(scene, world, assets) {
    this.scene = scene;
    this.world = world;
    this.assets = assets;
    this.root = new THREE.Group();
    this.root.name = "court";
    scene.add(this.root);
    this.blocks = [];
    this.mirrors = [];
    this.stelae = [];
    this.moving = [];
  }

  async build() {
    const { MAP, CELL, heightOf } = COURT;
    const rock = terrainMaterial("rock", 0xb57f4f),
      floor = terrainMaterial("floor", 0xc4935f),
      sand = terrainMaterial("sand", 0xd4a373, 0.98),
      dark = terrainMaterial("rock", 0x8a5433);
    this.materials = { rock, floor, sand, dark };
    // Faces on the outer rim of the map are never seen.
    const faces = new FaceBuilder({
      minX: 0,
      maxX: MAP[0].length * CELL,
      minZ: 0,
      maxZ: MAP.length * CELL,
    });
    const base = -10;

    // Cliffs get a ragged skyline: every cell its own height.
    const rects = greedyRects(MAP, heightOf, (ch) => ch === "#");
    for (const r of rects) {
      const x0 = r.i0 * CELL,
        x1 = (r.i1 + 1) * CELL,
        z0 = r.j0 * CELL,
        z1 = (r.j1 + 1) * CELL;
      this.world.add(x0, base, z0, x1, r.h, z1, "rock");
      const top =
        r.ch === "." ? floor : r.ch === "_" ? sand : r.ch === "~" ? dark : rock;
      faces.box(x0, base, z0, x1, r.h, z1, rock, top);
    }
    // Cliff heights follow a smooth noise around the rim, in 1.5 m steps, and runs of equal
    // height merge into broad slabs so the rim reads as rock rather than a row of pillars.
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const wave = (t) =>
      Math.sin(t * 0.9) * 0.5 +
      Math.sin(t * 2.3 + 1.7) * 0.3 +
      Math.sin(t * 0.37 + 4) * 0.2;
    const cliff = MAP.map((row, j) =>
      [...row].map((ch, i) => {
        if (ch !== "#") return "-";
        const lo = j <= 1 ? 18 : i === 0 ? 10 : j === MAP.length - 1 ? 14 : 13;
        const span = j <= 1 ? 6 : 4.5;
        const h =
          lo +
          (wave(i * 0.8 + j * 0.8) * 0.5 + 0.5) * span -
          (i === 0 && j === 10 ? 3.5 : 0);
        return String.fromCharCode(65 + Math.round(h / 1.5));
      }),
    );
    for (const r of greedyRects(
      cliff,
      (ch) => (ch.charCodeAt(0) - 65) * 1.5,
      (ch) => ch === "-",
    )) {
      const x0 = r.i0 * CELL,
        x1 = (r.i1 + 1) * CELL,
        z0 = r.j0 * CELL,
        z1 = (r.j1 + 1) * CELL;
      this.world.add(x0, base, z0, x1, r.h, z1, "rock");
      faces.box(x0, base, z0, x1, r.h, z1, rock);
      // Tumbled crown blocks break the straight top edge.
      const count = Math.ceil(((x1 - x0) * (z1 - z0)) / 6);
      for (let k = 0; k < count; k++) {
        if (rand() < 0.35) continue;
        const w = 0.9 + rand() * 1.6,
          d = 0.9 + rand() * 1.6,
          cx = x0 + 0.4 + rand() * (x1 - x0 - 0.8),
          cz = z0 + 0.4 + rand() * (z1 - z0 - 0.8);
        faces.box(
          cx - w / 2,
          r.h - 0.3,
          cz - d / 2,
          cx + w / 2,
          r.h + 0.5 + rand() * 1.8,
          cz + d / 2,
          rock,
        );
      }
    }
    for (const [x0, y0, z0, x1, y1, z1, kind] of COURT.EXTRA) {
      this.world.add(x0, y0, z0, x1, y1, z1, kind);
      faces.box(x0, y0, z0, x1, y1, z1, rock);
    }
    faces.build(this.root);

    for (const b of COURT.BLOCKS) await this.addBlock(b);
    for (const m of COURT.MIRRORS) await this.addMirror(m);
    for (const s of COURT.STELAE) await this.addStela(s);
    await this.addCatcher(COURT.LIGHT.source);
    await this.dress();
  }

  // Scenery that frames the court: the carved facade, the two seated guardians, fallen
  // columns and fire bowls. None of it moves; each piece gets a simple collider.
  async dress() {
    const put = async (name, x, z, yaw = 0, scale = 1) => {
      const o = await this.assets.make(name);
      if (!o) return null;
      o.position.set(x, 0, z);
      o.rotation.y = yaw;
      o.scale.multiplyScalar(scale);
      this.root.add(o);
      return o;
    };
    const facade = await put(
      "temple_facade",
      COURT.FACADE.x,
      COURT.FACADE.z + 1.5,
    );
    if (!facade) this.root.add(fallbackFacade(COURT.FACADE));
    this.world.add(
      COURT.FACADE.x - 8,
      -10,
      2,
      COURT.FACADE.x + 8,
      13,
      COURT.FACADE.z + 3,
      "rock",
    );
    for (const c of COURT.COLOSSI) {
      const o = await put("guardian_colossus", c.x, c.z, c.yaw);
      if (!o) this.root.add(fallbackColossus(c));
      this.world.add(c.x - 4.2, -10, c.z - 4.8, c.x + 4.2, 14, c.z + 4.8, "rock");
    }
    for (const [x, z, yaw] of COURT.COLUMNS) {
      await put("broken_column", x, z, yaw);
      this.world.add(x - 1.1, -10, z - 1.1, x + 1.1, 3.4, z + 1.1, "prop");
    }
    this.fires = [];
    const flame = flameMaterial();
    for (const [x, z] of COURT.BRAZIERS) {
      await put("brazier", x, z);
      const top = 0.98;
      this.world.add(x - 0.45, -10, z - 0.45, x + 0.45, 1.1, z + 0.45, "prop");
      const light = new THREE.PointLight(0xff9a4a, 6, 9, 1.8);
      light.position.set(x, top + 0.45, z);
      this.root.add(light);
      // Three crossed flame cards flicker independently above the coals.
      const tongues = [0, 1, 2].map((k) => {
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(0.55, 0.9).translate(0, 0.4, 0),
          flame,
        );
        card.position.set(x, top, z);
        card.rotation.y = (k * Math.PI) / 3;
        card.renderOrder = 8;
        this.root.add(card);
        return card;
      });
      this.fires.push({ light, x, z, top, tongues, seed: Math.random() * 10 });
    }
  }

  // --- blocks ---------------------------------------------------------------
  async addBlock({ id, x, z }) {
    const mesh = (await this.assets.make("push_block")) || fallbackBlock();
    mesh.position.set(x, 0, z);
    this.root.add(mesh);
    const box = this.world.add(
      x - 0.98,
      -10,
      z - 0.98,
      x + 0.98,
      1.9,
      z + 0.98,
      "block",
    );
    const block = { id, x, z, mesh, box, ref: null };
    block.ref = block;
    box.ref = block;
    this.blocks.push(block);
  }

  blockBox(block) {
    return block.box;
  }

  // Slides a block one cell if the cell ahead is level floor and empty.
  moveBlock(block, dir, duration) {
    const tx = block.x + dir.x * COURT.CELL,
      tz = block.z + dir.z * COURT.CELL;
    const w = this.world;
    if (!w.free(tx, tz, 0.9, 0.05, 1.85, block.box)) return false;
    if (Math.abs(w.ground(tx, tz, 0.9, 0, 0.05) - 0) > 0.01) return false;
    // The block must not slide under the explorer or over a mirror's drum.
    this.moving.push({
      block,
      from: { x: block.x, z: block.z },
      to: { x: tx, z: tz },
      t: 0,
      duration,
    });
    block.x = tx;
    block.z = tz;
    this.onBlockMoved?.(block);
    return true;
  }

  // --- mirrors --------------------------------------------------------------
  async addMirror({ id, x, z, yaw }) {
    const mesh = (await this.assets.make("sun_mirror")) || fallbackMirror();
    keepPolish(mesh);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = yaw;
    this.root.add(mesh);
    const box = this.world.add(
      x - 0.62,
      -10,
      z - 0.62,
      x + 0.62,
      1.95,
      z + 0.62,
      "mirror",
    );
    const mirror = { id, x, z, yaw, mesh, box, locked: null };
    mirror.ref = mirror;
    box.ref = mirror;
    this.mirrors.push(mirror);
  }

  // --- stelae ---------------------------------------------------------------
  async addStela({ id, x, z, yaw, glyph }) {
    const mesh = (await this.assets.make("glyph_stela")) || fallbackStela();
    mesh.position.set(x, 0, z);
    mesh.rotation.y = yaw;
    this.root.add(mesh);
    const box = this.world.add(
      x - 0.62,
      -10,
      z - 0.34,
      x + 0.62,
      2.4,
      z + 0.34,
      "stela",
    );
    const f = { x: Math.sin(yaw), z: Math.cos(yaw) };
    // The glyph sits in the stela's recessed panel and lights with its lens.
    const panel = mesh.userData.panel || { center: [0, 0.77, 0.3], size: 0.48 };
    const glyphMat = glyphMaterial();
    const mark = makeGlyph(glyph, panel.size * 0.85, glyphMat);
    mark.position.set(
      panel.center[0],
      panel.center[1],
      panel.center[2] + 0.004,
    );
    mesh.add(mark);
    this.stelae.push({
      id,
      x,
      z,
      yaw,
      glyph,
      mesh,
      box,
      facing: f,
      charge: 0,
      lit: false,
      glyphMat,
    });
  }

  async addCatcher({ x, z }) {
    const mesh = (await this.assets.make("sun_mirror")) || fallbackMirror();
    keepPolish(mesh);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = Math.PI / 2;
    mesh.scale.setScalar(1.15);
    this.root.add(mesh);
    this.world.add(x - 0.7, -10, z - 0.7, x + 0.7, 2.1, z + 0.7, "mirror");
  }

  interactables() {
    const list = [];
    for (const m of this.mirrors)
      list.push({ kind: "mirror", box: m.box, ref: m });
    for (const b of this.blocks)
      list.push({ kind: "block", box: b.box, ref: b });
    return list;
  }

  update(dt) {
    for (const mv of this.moving) {
      mv.t = Math.min(1, mv.t + dt / mv.duration);
      const k = mv.t * mv.t * (3 - 2 * mv.t);
      const x = mv.from.x + (mv.to.x - mv.from.x) * k,
        z = mv.from.z + (mv.to.z - mv.from.z) * k;
      const b = mv.block;
      b.mesh.position.set(x, 0, z);
      Object.assign(b.box, {
        minX: x - 0.98,
        maxX: x + 0.98,
        minZ: z - 0.98,
        maxZ: z + 0.98,
      });
    }
    this.moving = this.moving.filter((mv) => mv.t < 1);
    for (const m of this.mirrors) m.mesh.rotation.y = m.yaw;
    this.time = (this.time || 0) + dt;
    for (const f of this.fires || []) {
      const t = this.time + f.seed;
      const flick =
        0.8 +
        Math.sin(t * 13) * 0.08 +
        Math.sin(t * 23.7) * 0.06 +
        Math.sin(t * 5.3) * 0.06;
      f.light.intensity = 6 * flick;
      f.tongues.forEach((c, k) => {
        c.scale.set(
          0.85 + Math.sin(t * (7 + k) + k) * 0.12,
          flick * (0.9 + Math.sin(t * (9 + k * 2)) * 0.15),
          1,
        );
      });
    }
  }
}

// Procedural metal surfaces rust and dent everything metallic; a polished mirror face must
// stay smooth, so it keeps its flat material.
function keepPolish(root) {
  root.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m || m.metalness < 0.95 || m.roughness > 0.3) return;
    o.material = m.clone();
    o.material.map = o.material.roughnessMap = o.material.normalMap = null;
    o.material.needsUpdate = true;
  });
}

// --- stand-ins until the generated assets load ------------------------------------------
const flat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

function fallbackBlock() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 1.9, 1.9),
    flat(0xb57f4f),
  );
  m.position.y = 0.95;
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
}

function fallbackMirror() {
  const g = new THREE.Group();
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.62, 0.55, 20),
    flat(0xb57f4f),
  );
  drum.position.y = 0.275;
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.08, 28),
    flat(0xe0b56a, { metalness: 1, roughness: 0.18 }),
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 1.3;
  const fork = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.1, 0.12),
    flat(0x9a6a35, { metalness: 0.8 }),
  );
  fork.position.y = 0.62;
  for (const o of [drum, disc, fork]) {
    o.castShadow = o.receiveShadow = true;
    g.add(o);
  }
  return g;
}

function fallbackFacade({ x, z }) {
  const g = new THREE.Group();
  const m = flat(0xb57f4f);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(16, 13, 3), m);
  wall.position.set(x, 6.5, z + 1.5);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 6, 0.2),
    flat(0x140d09),
  );
  door.position.set(x, 3, z + 3.02);
  for (const o of [wall, door]) {
    o.castShadow = o.receiveShadow = true;
    g.add(o);
  }
  return g;
}

function fallbackColossus({ x, z }) {
  const g = new THREE.Group();
  const m = flat(0xb57f4f);
  for (const [w, h, d, y, oz] of [
    [6, 4, 8, 2, 0],
    [4, 6, 3, 7, -1.5],
    [2.2, 2.6, 2.2, 11.3, -1.2],
  ]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z + oz);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  }
  return g;
}

function fallbackStela() {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 2.4, 0.6),
    flat(0xb57f4f),
  );
  slab.position.y = 1.2;
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 24),
    flat(0x1d5f63, { emissive: 0x000000 }),
  );
  lens.position.set(0, 1.3, 0.301);
  lens.name = "lens";
  for (const o of [slab, lens]) {
    o.castShadow = o.receiveShadow = true;
    g.add(o);
  }
  g.userData.parts = { lens };
  return g;
}

// A soft flame: hot white core, orange body, fading to nothing at the tips and edges.
function flameMaterial() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 104, 2, 32, 80, 64);
  g.addColorStop(0, "rgba(255,250,220,1)");
  g.addColorStop(0.25, "rgba(255,190,90,0.9)");
  g.addColorStop(0.6, "rgba(230,90,30,0.45)");
  g.addColorStop(1, "rgba(120,30,10,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(32, 2);
  ctx.bezierCurveTo(52, 50, 62, 90, 32, 126);
  ctx.bezierCurveTo(2, 90, 12, 50, 32, 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({
    map: t,
    color: new THREE.Color(2.2, 1.6, 1.0),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });
}
