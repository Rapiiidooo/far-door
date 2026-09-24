import * as THREE from "three";
import { plantGrass, clumps } from "./grass.js";
import { AtlantisView } from "./atlantis.js";

// The fifth world, only glimpsed: through the great ring at the end of the frozen reach, a wild
// forest of huge old trees, ferns and mushrooms whose gills glow in the shade, under warm
// shafts of light. It is drawn into the ring's portal and nowhere else, as the promise of what
// comes next. Its own door stands at the origin, facing +z; the forest opens towards -z along
// an avenue that keeps the view open, past a stag grazing in the clearing, to a giant tree
// ringed with fairy lights and, on a hill in the haze, a castle. The closing shot flies on
// through it, up the castle's hill, to a last door at the castle's gate that opens on the sea.

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Trees either side of the avenue, near to far: [x, z, yaw, scale]. The avenue stays open
// towards the giant tree (a little right of the door's axis) and the castle (further left).
const TREES = [
  [-13, -15, 0.4, 0.95],
  [13.5, -13, 2.1, 1.05],
  [-22, -18, 1.1, 0.9],
  [22, -20, 0.6, 1],
  [-17.5, -29, 1.3, 1.15],
  [13.5, -27, 0.2, 0.9],
  [-29, -38, 2.2, 1.05],
  [27, -35, 0.9, 1.1],
  [-22, -47, 2.7, 1.1],
  [19, -48, 2.4, 1.1],
  [-35, -62, 1.5, 1.2],
  [30, -60, 2.9, 1.15],
  [-27, -80, 0.3, 1.1],
  [33, -84, 1.1, 1.05],
  [-44, -96, 1.9, 1.25],
  [44, -104, 0.5, 1.2],
  [-30, -118, 2.6, 1.15],
  [-12, -126, 1.2, 1.05],
  [38, -132, 2.0, 1.2],
  [-52, -140, 0.8, 1.3],
  [-24, -150, 2.3, 1.2],
  [52, -150, 1.4, 1.25],
];
// The forest going on into the far country, bigger so it reads through the haze.
const FAR_TREES = [
  [-62, -178, 0.3, 1.5],
  [-44, -190, 1.9, 1.4],
  [-8, -186, 2.6, 1.35],
  [34, -182, 0.8, 1.45],
  [58, -196, 1.4, 1.5],
  [80, -170, 2.2, 1.4],
  [-90, -205, 0.6, 1.55],
  [-52, -226, 2.4, 1.5],
  [6, -222, 1.1, 1.45],
  [44, -236, 0.2, 1.5],
  [-108, -250, 1.7, 1.6],
  [96, -248, 2.9, 1.55],
  [-70, -262, 0.9, 1.5],
  [28, -270, 1.6, 1.55],
];
// The giant tree to the right of the avenue, and the castle on its hill to the left.
// The giant's hollow faces the door; both are set a little into the ground, so no root tip or
// wall stands clear of it.
const GIANT = { x: 26, z: -150, yaw: -0.17, scale: 1.1, sink: 1.2 };
const CASTLE = { x: -40, z: -285, yaw: 0.28, scale: 1.45, sink: 1.5 };
// Hills of the far country: [x, z, height, radius, flat]. A flat hill has a plateau on top.
const HILLS = [
  [CASTLE.x, CASTLE.z, 44, 66, true],
  [60, -300, 30, 80],
  [-150, -320, 36, 90],
  [150, -250, 24, 70],
];
// The last door, on the hill nine metres before the castle's front, facing the forest.
const LAST = { x: -34.5, z: -263, glyphs: ["waves", "spiral", "crescent"] };
// The closing shot's way from the door, [x, z, height over the ground]: down the avenue, left
// of the giant, between the far trees and up the castle's hill, to where it waits before the
// last door while it lights.
const FLIGHT = [
  [-1.2, -16, 3.4],
  [-2, -44, 3.8],
  [5.5, -80, 5],
  [4.5, -112, 7],
  [-4, -148, 9],
  [-15, -170, 11],
  [-25, -192, 13],
  [-30, -216, 18],
  [-33, -234, 18],
  [-34, -243, 15],
];
const FERNS = 70,
  MEADOW = 80,
  MUSHROOMS = 22,
  SPORES = 280,
  FAIRIES = 90;

export class ForestView {
  // `services` (Gate, renderer, sound) build the last door; without them there is none.
  constructor(assets, services = {}) {
    this.assets = assets;
    this.services = services;
    this.scene = new THREE.Scene();
    // The ring's centre stands 4.5 m over the ground, as the great ring's does over the island.
    this.gateCenter = V(0, 4.5, 0);
    this.clipPlane = new THREE.Plane(V(0, 0, -1), this.gateCenter.z - 0.05);
    this.time = 0;
    this.glow = [];
  }

  async build() {
    const s = this.scene;
    s.background = new THREE.Color(0x6a8750);
    // Light enough to see the far country: the giant tree clear, the castle in the haze.
    s.fog = new THREE.FogExp2(0x6a8750, 0.0046);
    this.sky = this.buildSky();
    s.add(this.sky);
    const sun = new THREE.DirectionalLight(0xffe2a0, 2.4);
    sun.position.set(-18, 40, -30);
    s.add(sun, sun.target);
    s.add(new THREE.HemisphereLight(0xd8eab0, 0x2f3d1c, 1.15));
    this.buildGround();
    this.buildRanges();
    const rand = seeded(11);
    await this.instance("wild_tree", [...TREES, ...FAR_TREES]);
    const ferns = [];
    for (let i = 0; i < FERNS; i++) {
      const a = rand() * Math.PI * 2,
        r = 3 + rand() * 40;
      const x = Math.cos(a) * r * 1.3,
        z = -5 - Math.abs(Math.sin(a) * r) * 1.6;
      // Clear of the avenue's middle, where the stag walks.
      if (Math.abs(x) < 2.5 && z < -18) continue;
      ferns.push([x, z, rand() * 6.3, 0.8 + rand() * 0.8]);
    }
    // More along the closing shot's way through the far country, from their own seed.
    const way = seeded(37);
    for (let i = 0; i < 44; i++) {
      const z = -84 - way() * 136;
      const x = flightX(z) + (i % 2 ? 1 : -1) * (3 + way() * 18);
      ferns.push([x, z, way() * 6.3, 0.9 + way() * 0.9]);
    }
    await this.instance("fern_cluster", ferns);
    await this.buildMeadow();
    const shrooms = [];
    for (let i = 0; i < MUSHROOMS; i++) {
      const t = TREES[i % TREES.length];
      const a = rand() * Math.PI * 2;
      shrooms.push([
        t[0] + Math.cos(a) * 2.8,
        t[1] + Math.sin(a) * 2.8,
        rand() * 6.3,
        0.8 + rand() * 0.6,
      ]);
    }
    await this.instance("glow_mushroom", shrooms, {
      glow: 0xc3f25a,
      intensity: 1.8,
    });
    await this.instance(
      "boulder_cluster",
      [
        [-5, -19, 0.8, 1.1],
        [6.5, -23, 2.3, 0.9],
        [-7.5, -40, 1.6, 1.3],
        [9, -70, 0.4, 1.4],
        [-10, -92, 2.8, 1.5],
      ],
      { moss: 0x4f7a3a },
    );
    await this.buildGiant();
    await this.buildCastle();
    await this.buildLastDoor();
    await this.buildDeer();
    await this.buildBirds();
    this.buildShafts();
    this.buildSpores(rand);
    this.buildFairies(rand);
  }

  // Many copies of one asset in a draw call per material: each mesh of one instance becomes an
  // InstancedMesh placed at every spot. `glow` relights the asset's glowing part; `moss`
  // greens its stone.
  async instance(name, spots, opts = {}) {
    const o = await this.assets.make(name, { keepHierarchy: !!opts.glow });
    if (!o || !spots.length) return;
    o.updateMatrixWorld(true);
    const glowing = new Set();
    o.userData.parts?.glow?.traverse((m) => m.isMesh && glowing.add(m));
    const place = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      up = V(0, 1, 0);
    o.traverse((m) => {
      if (!m.isMesh) return;
      let material = m.material;
      if (glowing.has(m)) {
        material = material.clone();
        material.emissive = new THREE.Color(opts.glow);
        material.emissiveIntensity = opts.intensity;
        this.glow.push(material);
      } else if (opts.moss) {
        material = material.clone();
        material.color.lerp(new THREE.Color(opts.moss), 0.55);
      }
      const inst = new THREE.InstancedMesh(m.geometry, material, spots.length);
      spots.forEach(([x, z, yaw, k], i) => {
        place.compose(
          V(x, this.heightAt(x, z), z),
          q.setFromAxisAngle(up, yaw),
          V(k, k, k),
        );
        inst.setMatrixAt(i, place.clone().multiply(m.matrixWorld));
      });
      inst.computeBoundingSphere();
      this.scene.add(inst);
    });
  }

  // Grass over the whole floor in clumps, thickest by the door and widening with the avenue,
  // off the path and clear of the trunks. Its own seed, so nothing else moves.
  async buildMeadow() {
    const rand = seeded(23);
    const centres = [];
    for (let i = 0; i < MEADOW; i++) {
      const z = -1 - 88 * Math.pow(rand(), 1.5);
      const x = (rand() * 2 - 1) * (9 + 0.25 * -z);
      centres.push([x, z, 1.2 + rand() * 1.6, 4 + Math.floor(rand() * 5)]);
    }
    const ground = (x, z) => {
      if (z > -0.4 || (z > -72 && Math.abs(x - pathX(z)) < 1.7)) return null;
      for (const [tx, tz, , k] of [...TREES, ...FAR_TREES])
        if ((x - tx) ** 2 + (z - tz) ** 2 < (2.4 * k) ** 2) return null;
      return this.heightAt(x, z);
    };
    // And either side of the closing shot's way, as far as the castle's hill.
    const way = seeded(31);
    const beyond = [];
    for (let i = 0; i < 36; i++) {
      const z = -90 - way() * 125;
      const x = flightX(z) + (i % 2 ? 1 : -1) * (5 + way() * 16);
      beyond.push([x, z, 1.4 + way() * 1.6, 4 + Math.floor(way() * 4)]);
    }
    await plantGrass(
      this.assets,
      this.scene,
      [...clumps(centres, ground, rand), ...clumps(beyond, ground, way)],
      { cell: 20 },
    );
  }

  async put(name, x, z, yaw, k, opts = {}, sink = 0) {
    const o = await this.assets.make(name, opts);
    if (!o) return null;
    o.position.set(x, this.heightAt(x, z) - sink, z);
    o.rotation.y = yaw;
    o.scale.multiplyScalar(k);
    this.scene.add(o);
    return o;
  }

  // Gentle rolls in the forest floor, rising slowly into the far country and its hills. A flat
  // hill sets its plateau level over whatever rolls beneath it.
  heightAt(x, z) {
    let h = this.rolling(x, z);
    for (const [hx, hz, height, r, flat] of HILLS) {
      const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / r ** 2;
      if (!flat) h += height * Math.exp(-d2 / (2 * 0.55 ** 2));
      else {
        const m = Math.exp(-d2 * d2 * 1.6);
        h = h * (1 - m) + (this.rolling(hx, hz) + height) * m;
      }
    }
    return h;
  }

  rolling(x, z) {
    return (
      Math.sin(x * 0.21) * 0.35 +
      Math.cos(z * 0.17 + x * 0.05) * 0.3 +
      Math.min(14, Math.max(0, -z - 30) * 0.06) +
      Math.max(0, -z - 90) * 0.02 * Math.sin(x * 0.02 + 1.3) * 4
    );
  }

  buildSky() {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            float h = normalize(vDir).y;
            vec3 low = vec3(0.4, 0.52, 0.31), high = vec3(0.72, 0.8, 0.52);
            vec3 col = mix(low, high, smoothstep(0.0, 0.6, h));
            col += vec3(1.0, 0.86, 0.5) * pow(max(0.0, dot(normalize(vDir), normalize(vec3(-0.4, 0.7, -0.6)))), 12.0) * 0.5;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    dome.renderOrder = -10;
    g.add(dome);
    return g;
  }

  buildGround() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a6b33,
      roughness: 0.95,
      flatShading: true,
    });
    // A fine floor where the forest is near, and a coarse one for the far country, sunk a
    // little under the fine one wherever both lie.
    const near = (x, z) => Math.abs(x) < 88 && z > -128;
    for (const [w, d, nx, nz, cz, fine] of [
      [180, 160, 90, 80, -50, true],
      [760, 620, 110, 90, -250, false],
    ]) {
      const geo = new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          z = p.getZ(i) + cz;
        p.setY(i, this.heightAt(x, z) - (!fine && near(x, z) ? 0.6 : 0));
      }
      geo.computeVertexNormals();
      const ground = new THREE.Mesh(geo, mat);
      ground.position.z = cz;
      this.scene.add(ground);
    }
    // A worn path of paler moss runs from the door down the avenue.
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 70, 1, 140).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x7d8c55, roughness: 1 }),
    );
    const pp = path.geometry.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const z = pp.getZ(i) - 37;
      pp.setX(i, pp.getX(i) + pathX(z));
      pp.setY(i, this.heightAt(pp.getX(i), z) + 0.1);
      pp.setZ(i, z);
    }
    path.geometry.computeVertexNormals();
    this.scene.add(path);
  }

  // Two ranges of mountains on the horizon, in the haze's own colours, so the far country ends
  // in peaks rather than in fog.
  buildRanges() {
    for (const [r, top, color, seed] of [
      [470, 95, 0x93ab86, 3],
      [360, 60, 0x7d9870, 7],
    ]) {
      const rand = seeded(seed);
      const pos = [];
      const n = 64,
        from = -1.25,
        to = 1.25;
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const a = from + ((to - from) * i) / n;
        const h =
          top * (0.45 + 0.55 * Math.abs(Math.sin(a * 5.3 + seed))) +
          rand() * top * 0.25;
        const x = Math.sin(a) * r,
          z = -Math.cos(a) * r;
        const cur = [x, h, z];
        if (prev) {
          pos.push(prev[0], -20, prev[2], x, -20, z, x, h, z);
          pos.push(prev[0], -20, prev[2], x, h, z, prev[0], prev[1], prev[2]);
        }
        prev = cur;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(
        g,
        new THREE.MeshBasicMaterial({
          color,
          fog: false,
          side: THREE.DoubleSide,
        }),
      );
      m.renderOrder = -5;
      this.scene.add(m);
    }
  }

  // The giant: taller than anything in the forest, its pods glowing, fairies about its crown.
  async buildGiant() {
    const o = await this.put(
      "giant_tree",
      GIANT.x,
      GIANT.z,
      GIANT.yaw,
      GIANT.scale,
      { keepHierarchy: true },
      GIANT.sink,
    );
    o?.userData.parts?.glow?.traverse((m) => {
      if (!m.isMesh) return;
      m.material = m.material.clone();
      m.material.emissive = new THREE.Color(0xc3f25a);
      m.material.emissiveIntensity = 2.2;
      this.glow.push(m.material);
    });
  }

  async buildCastle() {
    const o = await this.put(
      "hill_castle",
      CASTLE.x,
      CASTLE.z,
      CASTLE.yaw,
      CASTLE.scale,
      { keepHierarchy: true },
      CASTLE.sink,
    );
    this.windows = [];
    this.castleMats = [];
    const lit = new Set();
    o?.userData.parts?.windows?.traverse((m) => {
      if (!m.isMesh) return;
      lit.add(m);
      m.material = m.material.clone();
      m.material.emissive = new THREE.Color(0xffb24a);
      m.material.emissiveIntensity = 2.4;
      m.material.fog = false;
      this.windows.push(m.material);
    });
    // Hazed by hand instead of by the fog, which at this distance would swallow it whole:
    // a pale castle on its hill, its windows lit.
    o?.traverse((m) => {
      if (!m.isMesh || lit.has(m)) return;
      m.material = m.material.clone();
      m.material.fog = false;
      this.castleMats.push({
        material: m.material,
        base: m.material.color.clone(),
      });
    });
    this.hazeCastle(V(0, 0, 0));
  }

  // The castle's haze by hand, as thick as the fog would lay at the viewer's distance but never
  // past what keeps it in sight, so it clears as the closing shot flies up to it.
  hazeCastle(eye) {
    const d = Math.hypot(eye.x - CASTLE.x, eye.z - CASTLE.z);
    const haze = Math.min(0.62, 1 - Math.exp(-((0.0046 * d) ** 2)));
    if (Math.abs(haze - (this.haze ?? -1)) < 0.004) return;
    this.haze = haze;
    for (const { material, base } of this.castleMats)
      material.color.copy(base).lerp(this.scene.fog.color, haze);
  }

  // The last door and the sea beyond it. Its view needs a screen-sized target only once the
  // closing shot is on its way (see wake), so it starts at a single pixel.
  async buildLastDoor() {
    const { Gate, renderer, sound } = this.services;
    if (!Gate || !renderer) return;
    this.atlantis = new AtlantisView();
    this.atlantis.build();
    const gate = new Gate({
      scene: this.scene,
      world: null,
      renderer,
      sound,
      assets: this.assets,
    });
    const model = await this.assets.make("far_gate");
    if (model) model.position.y = this.heightAt(LAST.x, LAST.z) - 0.5;
    await gate.build({
      x: LAST.x,
      z: LAST.z,
      glyphs: LAST.glyphs,
      model,
      colliders: false,
    });
    gate.destination = this.atlantis;
    gate.lightScale = 0.6;
    gate.target.setSize(1, 1);
    this.lastGate = gate;
    this.buildFlight();
  }

  // The closing shot's way as a smooth curve from the great ring's view to the waiting point,
  // and the eye's target along it: at first straight through the ring, then ahead along the
  // way, and at last the door with the castle over it.
  buildFlight() {
    const pts = [V(0.1, this.gateCenter.y - 0.6, 1.2)];
    for (const [x, z, over] of FLIGHT)
      pts.push(V(x, this.heightAt(x, z) + over, z));
    this.flight = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    this.flightFrom = V(0, this.gateCenter.y - 0.4, -20);
    this.flightTo = this.lastGate.center.clone().add(V(0, 3, 0));
    this.castleTop = V(
      CASTLE.x,
      this.heightAt(CASTLE.x, CASTLE.z) + 22,
      CASTLE.z,
    );
  }

  flightLook(k, out) {
    out.copy(this.flight.getPointAt(Math.min(1, k + 0.06)));
    out.y -= 1.5;
    out.lerp(this.flightFrom, 1 - smooth(0, 0.08, k));
    // Up at the castle on its hill as the way climbs towards it.
    out.lerp(this.castleTop, 0.6 * smooth(0.45, 0.8, k));
    return out.lerp(this.flightTo, smooth(0.8, 1, k));
  }

  // The closing shot begins: the last door's view gets its full size.
  wake() {
    if (!this.lastGate || this.awake) return;
    this.awake = true;
    this.lastGate.resize();
  }

  resize() {
    if (this.awake) this.lastGate.resize();
  }

  reset() {
    if (!this.lastGate) return;
    this.lastGate.reset();
    this.lastGate.target.setSize(1, 1);
    this.awake = false;
  }

  // Everything the last door can show, shown once for the shader compiler.
  prepareForCompile(on) {
    const G = this.lastGate;
    if (!G) return;
    G.disc.visible = on || G.phase !== "closed";
    G.uniforms.uClear.value = on ? 1 : G.isOpen ? 1.02 : 0;
    G.ground.visible = G.ring.visible = on;
  }

  // A stag in the clearing: it walks from one grazing spot to the next along the avenue,
  // lowers its head to graze, looks up, and walks on.
  async buildDeer() {
    const o = await this.assets.make("forest_deer", { keepHierarchy: true });
    if (!o) return;
    this.scene.add(o);
    this.deer = {
      o,
      parts: o.userData.parts || {},
      spots: [
        [-12, -24],
        [-2.5, -26],
        [4, -30],
        [11, -35],
        [2.5, -40],
        [-6, -35],
      ],
      // Grazing in the avenue when the door opens, in plain view.
      at: 1,
      next: 2,
      pos: V(-2.5, 0, -26),
      phase: "graze",
      t: 0,
      wait: 3,
      yaw: 0,
      stride: 0,
    };
    this.placeDeer(0);
  }

  placeDeer(dt) {
    const d = this.deer;
    if (!d) return;
    d.t += dt;
    const P = d.parts;
    let walking = false;
    if (d.phase === "graze") {
      // Head down to the grass, then up to look around before the next spot.
      const k = d.t / d.wait;
      const down = k < 0.75 ? Math.min(1, k * 4) : Math.max(0, (1 - k) * 4);
      if (P.head) P.head.rotation.x = down * 0.85;
      if (d.t >= d.wait) {
        d.phase = "walk";
        d.t = 0;
      }
    } else {
      const [tx, tz] = d.spots[d.next];
      const dx = tx - d.pos.x,
        dz = tz - d.pos.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      d.yaw +=
        Math.atan2(Math.sin(want - d.yaw), Math.cos(want - d.yaw)) *
        Math.min(1, dt * 2.5);
      const step = Math.min(dist, 1.25 * dt);
      d.pos.x += Math.sin(d.yaw) * step;
      d.pos.z += Math.cos(d.yaw) * step;
      walking = true;
      if (dist < 0.3) {
        d.at = d.next;
        d.next = (d.next + 1) % d.spots.length;
        d.phase = "graze";
        d.t = 0;
        d.wait = 3 + ((d.at * 1.7) % 3);
      }
      if (P.head) P.head.rotation.x *= 1 - Math.min(1, dt * 3);
    }
    // A walk: diagonal legs together, the body dipping as they swing.
    d.stride += walking ? dt * 5.2 : 0;
    const swing = walking ? Math.sin(d.stride) * 0.38 : 0;
    const settle = (g, a) => {
      if (g) g.rotation.x += (a - g.rotation.x) * Math.min(1, dt * 8);
    };
    settle(P.frontLeft, swing);
    settle(P.backRight, swing);
    settle(P.frontRight, -swing);
    settle(P.backLeft, -swing);
    const dip = (1 - Math.cos(swing)) * 1.0;
    d.o.position.set(d.pos.x, this.heightAt(d.pos.x, d.pos.z) - dip, d.pos.z);
    d.o.rotation.y = d.yaw;
  }

  // Birds: a flight about the giant's crown, and a pair that crosses the avenue.
  async buildBirds() {
    this.birds = [];
    const flights = [
      { cx: GIANT.x, cz: GIANT.z, cy: 62, r: 32, speed: 0.2, n: 4, k: 3.6 },
      { cx: -2, cz: -38, cy: 13, r: 24, speed: 0.17, n: 2, k: 2.4 },
    ];
    for (const f of flights)
      for (let i = 0; i < f.n; i++) {
        const o = await this.assets.make("forest_bird", {
          keepHierarchy: true,
        });
        if (!o) return;
        o.scale.setScalar(f.k);
        this.scene.add(o);
        this.birds.push({
          o,
          parts: o.userData.parts || {},
          f,
          a: (i / f.n) * Math.PI * 2 + i * 0.4,
          dy: (i % 2) * 3 - 1.5,
          dr: i * 3,
          seed: i * 1.9 + f.r,
        });
      }
  }

  placeBirds(dt) {
    for (const b of this.birds || []) {
      const { f } = b;
      b.a += dt * f.speed;
      const r = f.r + b.dr;
      const x = f.cx + Math.cos(b.a) * r,
        z = f.cz + Math.sin(b.a) * r * 0.7;
      const y = f.cy + b.dy + Math.sin(b.a * 3 + b.seed) * 2;
      b.o.position.set(x, y, z);
      // Facing along the circle, banked into the turn.
      b.o.rotation.set(0, Math.atan2(-Math.sin(b.a), Math.cos(b.a) * 0.7), 0.2);
      // Flapping in bursts, gliding between.
      const cycle = (this.time + b.seed) % 3.2;
      const flap = cycle < 1.3 ? Math.sin(cycle * 14) * 0.7 : 0.08;
      if (b.parts.leftWing) b.parts.leftWing.rotation.z = flap;
      if (b.parts.rightWing) b.parts.rightWing.rotation.z = -flap;
    }
  }

  // Warm shafts of light slanting down through gaps in the canopy.
  buildShafts() {
    const mat = (this.shaftMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.0, 0.86, 0.5),
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }));
    this.shafts = [];
    // Deep in the trees and slender, so they light the forest without veiling the view in.
    for (const [x, z, w] of [
      [-8, -30, 1.4],
      [9, -38, 1.8],
      [-14, -46, 1.6],
      [15, -55, 2],
      [-20, -70, 2.2],
    ]) {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.45, w, 26, 12, 1, true),
        mat,
      );
      shaft.position.set(x - 3, 12, z);
      this.shafts.push(shaft.position);
      shaft.rotation.set(0.22, 0, -0.18);
      this.scene.add(shaft);
    }
  }

  // Motes of spore drifting in the light.
  buildSpores(rand) {
    const pos = new Float32Array(SPORES * 3);
    for (let i = 0; i < SPORES; i++) {
      pos[i * 3] = (rand() - 0.5) * 40;
      pos[i * 3 + 1] = 0.4 + rand() * 8;
      pos[i * 3 + 2] = -4 - rand() * 50;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.sporeU = { uTime: { value: 0 } };
    const spores = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.sporeU,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uTime;
          void main() {
            vec3 p = position;
            float k = p.x * 1.7 + p.z * 0.9;
            p.x += sin(uTime * 0.4 + k) * 0.6;
            p.y += sin(uTime * 0.3 + k * 1.3) * 0.5;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = 70.0 / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          void main() {
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(vec3(0.82, 1.0, 0.45) * 1.6, smoothstep(0.5, 0.0, d) * 0.8);
          }`,
      }),
    );
    spores.frustumCulled = false;
    this.scene.add(spores);
  }

  // Fairies: bright motes that dart and hover, a swarm about the giant's crown and a few along
  // the avenue, each with a warm core and a halo of spore lime.
  buildFairies(rand) {
    const pos = new Float32Array(FAIRIES * 3),
      seed = new Float32Array(FAIRIES);
    for (let i = 0; i < FAIRIES; i++) {
      let x, y, z;
      if (i < 60) {
        const a = rand() * Math.PI * 2,
          r = 8 + rand() * 20;
        x = GIANT.x + Math.cos(a) * r;
        z = GIANT.z + Math.sin(a) * r;
        y = this.heightAt(GIANT.x, GIANT.z) + 18 + rand() * 32;
      } else {
        x = (rand() - 0.5) * 16;
        z = -8 - rand() * 40;
        y = this.heightAt(x, z) + 1 + rand() * 4;
      }
      pos.set([x, y, z], i * 3);
      seed[i] = rand();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    this.fairyU = { uTime: { value: 0 } };
    const fairies = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.fairyU,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uTime;
          attribute float seed;
          varying float vBlink;
          void main() {
            vec3 p = position;
            float t = uTime * (0.6 + seed) + seed * 40.0;
            // A dart now and then between slow loops.
            float dart = smoothstep(0.85, 1.0, sin(t * 0.7));
            p += vec3(sin(t * 1.3), sin(t * 2.1) * 0.6, cos(t * 1.1)) * (0.8 + dart * 2.5);
            vBlink = 0.55 + 0.45 * sin(uTime * (3.0 + seed * 4.0) + seed * 12.0);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (150.0 + seed * 90.0) / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vBlink;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float core = smoothstep(0.16, 0.0, d);
            float halo = smoothstep(0.5, 0.0, d) * 0.5;
            vec3 c = vec3(1.0, 0.93, 0.68) * core * 2.2 + vec3(0.76, 0.95, 0.35) * halo;
            gl_FragColor = vec4(c * vBlink, (core + halo) * vBlink);
          }`,
      }),
    );
    fairies.frustumCulled = false;
    this.scene.add(fairies);
  }

  update(dt) {
    this.time += dt;
    if (this.sporeU) this.sporeU.uTime.value = this.time;
    if (this.fairyU) this.fairyU.uTime.value = this.time;
    for (const m of this.glow)
      m.emissiveIntensity = 1.6 + Math.sin(this.time * 1.4) * 0.3;
    (this.windows || []).forEach(
      (m, i) =>
        (m.emissiveIntensity =
          2.3 +
          Math.sin(this.time * 5.1 + i) * 0.12 +
          Math.sin(this.time * 1.3) * 0.1),
    );
    this.placeDeer(dt);
    this.placeBirds(dt);
    this.lastGate?.update(dt);
    this.atlantis?.update(dt);
  }

  // Drawn by the great ring's portal, from the point matching the viewer's.
  // The last door's view of the sea is drawn first, into its own target.
  renderInto(renderer, camera) {
    this.hazeCastle(camera.position);
    // A shaft seen from inside or right by it is a pale pane: it fades as the camera nears.
    let near = Infinity;
    for (const p of this.shafts || [])
      near = Math.min(
        near,
        Math.hypot(camera.position.x - p.x, camera.position.z - p.z),
      );
    if (this.shaftMat) this.shaftMat.opacity = 0.05 * smooth(4, 12, near);
    this.lastGate?.renderPortal(camera);
    this.sky.position.copy(camera.position);
    renderer.render(this.scene, camera);
  }
}

// Where the closing shot's way crosses depth z, between its points.
function flightX(z) {
  let prev = [0, 0];
  for (const [x, fz] of FLIGHT) {
    if (z >= fz) {
      const k = (z - prev[1]) / (fz - prev[1]);
      return prev[0] + (x - prev[0]) * k;
    }
    prev = [x, fz];
  }
  return prev[0];
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Where the path's middle runs at depth z: it wanders, then bears right towards the giant.
function pathX(z) {
  return Math.sin(z * 0.09) * 2.2 + Math.max(0, -z - 30) * 0.08;
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
