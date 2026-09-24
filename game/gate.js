import * as THREE from "three";
import { glyphMaterial, makeGlyph } from "./glyphs.js";

// A far door: the carved ring, its three address medallions, and the opening set piece.
// The medallions ignite one by one; with all three lit the ring charges (energy runs round
// its grooves from the medallions, dust shakes loose, the ground rumbles), then ignites: a
// flash, a shockwave across the floor, a membrane of pure light that fills the ring and
// clears from the centre onto a live view of the world beyond, rendered each frame from
// the matching point behind its twin gate.

const TURQUOISE = new THREE.Color(0x39e3d0);
// From the far_gate asset: groove radii and the medallions' clock positions.
const GROOVES = [3.775, 3.985, 4.195];
const MEDALLIONS = [
  ["medallionLeft", 210],
  ["medallionTop", 90],
  ["medallionRight", -30],
];
const CHARGE = 3.4,
  REVEAL = 3.2;

export class Gate {
  // `view: false` for a ring that never shows another world: its membrane is plain light,
  // and it spares a screen-sized render target.
  constructor({ scene, world, renderer, sound, assets, view = true }) {
    this.scene = scene;
    this.hasView = view;
    this.world = world;
    this.renderer = renderer;
    this.sound = sound;
    this.assets = assets;
    this.channels = new Map();
    this.time = 0;
    this.destination = null;
    this.phase = "closed";
    this.phaseT = 0;
    this.lit = [false, false, false];
    const size = view
      ? renderer.getDrawingBufferSize(new THREE.Vector2())
      : new THREE.Vector2(1, 1);
    this.target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 2,
    });
    this.portalCam = new THREE.PerspectiveCamera();
    this.frustum = new THREE.Frustum();
    this.viewProjection = new THREE.Matrix4();
    this.sphere = new THREE.Sphere();
  }

  // `glyphs` are the address in medallion order (left, top, right). `model` may be passed
  // already built (the second world recolours its own); otherwise the asset is loaded.
  async build({ x, z, yaw = 0, glyphs, model, colliders = true }) {
    model = model || (await this.assets.make("far_gate")) || fallbackGate();
    model.position.set(x, model.position.y, z);
    model.rotation.y = yaw;
    this.scene.add(model);
    this.model = model;
    const portal = model.userData.portal || {
      center: [0, 4.5, 0],
      radius: 3.5,
    };
    const s = model.scale.x;
    this.center = new THREE.Vector3(
      x + portal.center[0] * s,
      model.position.y + portal.center[1] * s,
      z + portal.center[2] * s,
    );
    this.radius = portal.radius * s;
    this.daisTop = this.center.y - this.radius;
    this.parts = model.userData.parts || {};
    this.glyphs = glyphs;
    // Every glowing part gets its own material so it can light independently.
    this.litMaterials = new Map();
    for (const [name, node] of Object.entries(this.parts))
      node.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.emissive = TURQUOISE.clone();
        o.material.emissiveIntensity = 0;
        this.litMaterials.set(o, { name, glow: 0 });
      });
    if (colliders) gateColliders(this.world, x, z, this.daisTop);
    // Each medallion carries one glyph of the address.
    this.medallionGlyphs = [];
    model.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(model.matrixWorld).invert();
    MEDALLIONS.forEach(([part], i) => {
      const node = this.parts[part];
      // An address can be missing a glyph: its medallion stays blank.
      if (!node || !glyphs[i]) return;
      const box = new THREE.Box3().setFromObject(node).applyMatrix4(inverse);
      const c = box.getCenter(new THREE.Vector3());
      const mat = glyphMaterial();
      const mark = makeGlyph(glyphs[i], (box.max.x - box.min.x) * 0.72, mat);
      mark.position.set(c.x, c.y, box.max.z + 0.01);
      model.add(mark);
      this.medallionGlyphs[i] = mat;
    });
    this.buildPortal();
    this.buildEnergy();
    this.buildBlast();
    this.buildSparks();
    this.buildDust();
  }

  // --- the opening -------------------------------------------------------------------------
  buildPortal() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.uniforms = {
      uView: { value: this.target.texture },
      uRes: { value: size },
      uFill: { value: 0 },
      uClear: { value: 0 },
      uTime: { value: 0 },
      uHasView: { value: 1 },
    };
    // Seen from its front only: from behind, a door shows its own back, not the world beyond.
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: PORTAL_FS,
    });
    mat.toneMapped = true;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius - 0.02, 96),
      mat,
    );
    disc.position.copy(this.center);
    disc.visible = false;
    disc.renderOrder = 4;
    this.scene.add(disc);
    this.disc = disc;
    this.light = new THREE.PointLight(TURQUOISE, 0, 30, 1.5);
    this.light.position.copy(this.center).add(new THREE.Vector3(0, 0, 1.5));
    this.scene.add(this.light);
  }

  // Energy running round the three grooves on both faces, spreading from the medallions.
  buildEnergy() {
    this.energyU = {
      uFill: { value: 0 },
      uPower: { value: 0 },
      uTime: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.energyU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uFill; uniform float uPower; uniform float uTime; varying vec2 vP;
        float band(float r, float c) { return exp(-pow((r - c) * 26.0, 2.0)); }
        void main() {
          float r = length(vP);
          float a = degrees(atan(vP.y, vP.x));
          float d = 360.0;
          for (int i = 0; i < 3; i++) {
            float m = i == 0 ? 90.0 : (i == 1 ? -30.0 : 210.0);
            float x = abs(mod(a - m + 540.0, 360.0) - 180.0);
            d = min(d, x);
          }
          float reach = uFill * 62.0;
          float lit = smoothstep(reach + 4.0, reach - 4.0, d);
          float head = exp(-pow((d - reach) / 3.0, 2.0)) * step(0.02, uFill) * (1.0 - step(0.999, uFill));
          float bands = band(r, ${GROOVES[0].toFixed(3)}) + band(r, ${GROOVES[1].toFixed(3)}) + band(r, ${GROOVES[2].toFixed(3)});
          float flow = 0.65 + 0.35 * sin(radians(a) * 24.0 - uTime * 7.0 + r * 3.0);
          vec3 col = vec3(0.35, 1.6, 1.45) * bands * (lit * flow * 1.4 + head * 5.0) * uPower;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const geo = new THREE.RingGeometry(3.68, 4.3, 160, 1);
    this.energy = [];
    for (const side of [1, -1]) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(this.center);
      m.position.z += side * 0.47;
      if (side < 0) m.rotation.y = Math.PI;
      m.renderOrder = 5;
      m.frustumCulled = false;
      this.scene.add(m);
      this.energy.push(m);
    }
  }

  // The ignition: a flash at the heart of the ring, a ring of light blown out of the opening
  // and a shockwave across the floor.
  buildBlast() {
    const flare = document.createElement("canvas");
    flare.width = flare.height = 128;
    const ctx = flare.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, "rgba(210,255,248,0.85)");
    g.addColorStop(0.5, "rgba(80,230,210,0.3)");
    g.addColorStop(1, "rgba(40,200,190,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(flare);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(3, 3.4, 3.3),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0,
        toneMapped: false,
        fog: false,
      }),
    );
    this.flash.position.copy(this.center);
    this.flash.renderOrder = 7;
    this.scene.add(this.flash);

    const waveMat = (width) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uRadius: { value: 1 },
          uAge: { value: 1 },
          uWidth: { value: width },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          uniform float uRadius; varying vec2 vP;
          void main() { vP = position.xy * uRadius; gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uRadius, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uRadius; uniform float uAge; uniform float uWidth; varying vec2 vP;
          void main() {
            float r = length(vP);
            float band = exp(-pow((r - uRadius * 0.92) / uWidth, 2.0)) + 0.3 * exp(-pow((r - uRadius * 0.8) / (uWidth * 2.5), 2.0));
            float fade = (1.0 - uAge) * (1.0 - uAge);
            gl_FragColor = vec4(vec3(0.7, 2.4, 2.2) * band * fade, 1.0);
          }`,
      });
    this.ground = new THREE.Mesh(
      new THREE.CircleGeometry(1, 128),
      waveMat(0.9),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(
      this.center.x,
      this.daisTop - 0.93,
      this.center.z + 0.5,
    );
    this.ground.visible = false;
    this.ground.renderOrder = 6;
    this.ground.frustumCulled = false;
    this.scene.add(this.ground);
    this.ring = new THREE.Mesh(new THREE.CircleGeometry(1, 128), waveMat(0.35));
    this.ring.position.copy(this.center);
    this.ring.visible = false;
    this.ring.renderOrder = 6;
    this.ring.frustumCulled = false;
    this.scene.add(this.ring);
  }

  // Motes of the far world's light spilling from the rim; they blow outwards at ignition.
  buildSparks() {
    const count = 260;
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    geo.setAttribute("seed", new THREE.BufferAttribute(seeds, 3));
    this.sparkU = {
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uBurst: { value: 0 },
      uRadius: { value: this.radius },
      uScale: { value: innerHeight * 0.5 },
    };
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: this.sparkU,
      vertexShader: /* glsl */ `
        attribute vec3 seed; uniform float uTime; uniform float uOpen; uniform float uBurst; uniform float uRadius; uniform float uScale;
        varying float vA;
        void main() {
          float life = fract(seed.x + uTime * (0.08 + seed.y * 0.1));
          float ang = seed.z * 6.2832 + life * (0.6 + seed.y);
          float r = uRadius * (0.92 + 0.14 * seed.y) + life * 0.8 + uBurst * (2.0 + seed.x * 9.0);
          vec3 p = vec3(cos(ang) * r, sin(ang) * r, life * (1.5 + seed.x * 3.0) + uBurst * seed.y * 6.0);
          vA = max(uOpen, uBurst * 1.5) * sin(life * 3.1416) * (0.5 + 0.5 * seed.z);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (0.06 + seed.x * 0.08) * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(0.5, 2.2, 2.0) * smoothstep(0.5, 0.0, d) * vA, 1.0);
        }`,
    });
    this.sparks = new THREE.Points(geo, mat);
    this.sparks.position.copy(this.center);
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 6;
    this.scene.add(this.sparks);
  }

  // Grit shaken loose from the ring's crown while it charges.
  buildDust() {
    const count = 220;
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    geo.setAttribute("seed", new THREE.BufferAttribute(seeds, 3));
    this.dustU = {
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uScale: { value: innerHeight * 0.5 },
      uFloor: { value: -this.radius },
    };
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: this.dustU,
      vertexShader: /* glsl */ `
        attribute vec3 seed; uniform float uTime; uniform float uAmount; uniform float uScale; uniform float uFloor;
        varying float vA;
        void main() {
          float t = fract(seed.x + uTime * (0.55 + seed.y * 0.5));
          float ang = radians(20.0 + seed.z * 140.0);
          float r = 4.5 + seed.y * 0.2;
          vec3 p = vec3(cos(ang) * r * (0.7 + seed.x * 0.3), sin(ang) * r, (seed.y - 0.5) * 1.2);
          p.y -= 9.0 * t * t;
          p.x += (seed.x - 0.5) * t * 1.4;
          vA = uAmount * (1.0 - t) * step(uFloor, p.y);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (0.05 + seed.x * 0.06) * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(0.78, 0.62, 0.44), smoothstep(0.5, 0.1, d) * vA * 0.8);
        }`,
    });
    this.dust = new THREE.Points(geo, mat);
    this.dust.position.copy(this.center);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  // --- the floor channels from the stelae (first court only) -----------------------------------
  buildChannels(stelae) {
    const dormant = new THREE.MeshStandardMaterial({
      color: 0x1d5f63,
      roughness: 0.35,
      metalness: 0.2,
    });
    for (const s of stelae) {
      const z0 = s.z - 0.4,
        z1 = this.center.z + 3.05;
      const len = z0 - z1;
      const inlay = new THREE.Mesh(new THREE.PlaneGeometry(0.22, len), dormant);
      inlay.rotation.x = -Math.PI / 2;
      inlay.position.set(s.x, 0.012, (z0 + z1) / 2);
      inlay.receiveShadow = true;
      this.scene.add(inlay);
      const uniforms = { uProgress: { value: 0 }, uTime: { value: 0 } };
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, len),
        new THREE.ShaderMaterial({
          uniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform float uProgress; uniform float uTime; varying vec2 vUv;
            void main() {
              float along = 1.0 - vUv.y;
              float lit = step(along, uProgress);
              float head = exp(-pow((along - uProgress) * 18.0, 2.0)) * step(uProgress, 0.999);
              float core = exp(-pow((vUv.x - 0.5) * 7.0, 2.0));
              float pulse = 0.75 + 0.25 * sin(along * 40.0 - uTime * 6.0);
              vec3 c = vec3(0.22, 0.89, 0.82) * core * (lit * pulse * 1.6 + head * 6.0);
              gl_FragColor = vec4(c, 1.0);
            }`,
        }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(s.x, 0.02, (z0 + z1) / 2);
      glow.renderOrder = 3;
      this.scene.add(glow);
      this.channels.set(s.id, {
        uniforms,
        progress: 0,
        running: false,
        done: false,
        slot: this.glyphs.indexOf(s.glyph),
        head: new THREE.Vector3(s.x, 0.3, z0),
        from: z0,
        to: z1,
      });
    }
  }

  feed(id) {
    const ch = this.channels.get(id);
    if (ch && !ch.running) ch.running = true;
  }

  // Lights one medallion and its glyph with a bright pulse.
  ignite(slot) {
    if (this.lit[slot]) return;
    this.lit[slot] = true;
    this.glow(MEDALLIONS[slot][0], 1.6);
    const mark = this.medallionGlyphs[slot];
    if (mark) mark.emissiveIntensity = 3;
    this.pulse = 1;
    this.sound?.play("medallion", slot);
    this.onIgnite?.(slot);
  }

  get allLit() {
    return this.lit.every(Boolean);
  }

  glow(partName, amount) {
    for (const [, v] of this.litMaterials)
      if (v.name === partName) v.glow = amount;
  }

  // The set piece. `shots` frame it; the gate hands back when the membrane has cleared.
  // It arms first: medallions still unlit either finish lighting through their channels or,
  // with `sequence`, ignite one after another; the charge starts once all three burn.
  open(state, shots, { sequence = false } = {}) {
    if (this.phase !== "closed") return;
    this.phase = "arming";
    this.phaseT = 0;
    this.sequence = sequence;
    this.disc.visible = true;
    if (state && shots) state.cinematic = new OpeningShot(this, shots);
  }

  // Skips straight to an open gate (a replay, or a cinematic skipped).
  forceOpen() {
    for (let i = 0; i < 3; i++) if (!this.lit[i]) this.ignite(i);
    if (this.phase !== "open") this.onOpen?.();
    this.phase = "open";
    this.phaseT = 99;
    this.blastT = undefined;
    this.rumble = 0;
    this.disc.visible = true;
    this.ground.visible = this.ring.visible = false;
    this.flash.material.opacity = 0;
  }

  get isOpen() {
    return this.phase === "open";
  }

  update(dt) {
    this.time += dt;
    this.phaseT += dt;
    const u = this.uniforms;
    u.uTime.value = this.time;
    this.energyU.uTime.value = this.time;
    this.sparkU.uTime.value = this.time;
    this.dustU.uTime.value = this.time;
    for (const ch of this.channels.values()) {
      ch.uniforms.uTime.value = this.time;
      if (!ch.running || ch.done) continue;
      ch.progress = Math.min(1, ch.progress + dt / 1.6);
      ch.uniforms.uProgress.value = ch.progress;
      ch.head.z = ch.from + (ch.to - ch.from) * ch.progress;
      if (ch.progress >= 1) {
        ch.done = true;
        this.ignite(ch.slot);
      }
    }
    this.pulse = Math.max(0, (this.pulse || 0) - dt * 1.6);

    const phase = this.phase,
      t = this.phaseT;
    let power = 0,
      fill = 0,
      light = 0,
      dust = 0;
    if (phase === "arming") {
      if (this.sequence) {
        const next = this.lit.indexOf(false);
        if (next >= 0 && t > 0.5 + 0.55 * this.lit.filter(Boolean).length)
          this.ignite(next);
      }
      power = 0.3;
      if (this.allLit && t > 0.4) {
        this.phase = "charge";
        this.phaseT = 0;
        this.sound?.play("rumble");
      }
    } else if (phase === "charge") {
      const k = Math.min(1, t / CHARGE);
      fill = k;
      power = 0.6 + 0.6 * k;
      dust = Math.min(1, t / 0.8);
      light = 6 + 22 * k * k + Math.sin(this.time * 31) * 4 * k;
      this.rumble = k;
      if (t >= CHARGE) this.ignition();
    } else if (phase === "reveal") {
      const k = Math.min(1, t / REVEAL);
      fill = 1;
      power = 1.4 - 0.6 * k;
      dust = Math.max(0, 1 - t / 1.2);
      u.uFill.value = 1;
      u.uClear.value = smooth(0.12, 1, k) * 1.02;
      light = 30 + 60 * Math.max(0, 1 - t / 0.6);
      if (t >= REVEAL) {
        this.phase = "open";
        this.phaseT = 0;
        this.onOpen?.();
      }
    } else if (phase === "open") {
      fill = 1;
      power = 0.8;
      u.uFill.value = 1;
      u.uClear.value = 1.02;
      light = 30 + Math.sin(this.time * 2.3) * 3;
    }
    this.energyU.uFill.value = fill;
    this.energyU.uPower.value = power;
    this.dustU.uAmount.value = dust;
    this.light.intensity = (light + this.pulse * 25) * (this.lightScale ?? 1);
    this.sparkU.uOpen.value = phase === "open" || phase === "reveal" ? 1 : 0;

    // The ignition's blast: the flash sprite, the floor shockwave and the ring of light.
    if (this.blastT !== undefined) {
      this.blastT += dt;
      const b = this.blastT;
      this.flash.material.opacity = Math.max(0, 1 - b / 0.7);
      this.flash.scale.setScalar(2 + 22 * Math.sqrt(Math.min(1, b / 0.35)));
      const g = Math.min(1, b / 1.6);
      this.ground.visible = g < 1;
      this.ground.material.uniforms.uRadius.value =
        5 + 45 * (1 - Math.pow(1 - g, 2.2));
      this.ground.material.uniforms.uAge.value = g;
      const r = Math.min(1, b / 1.1);
      this.ring.visible = r < 1;
      this.ring.material.uniforms.uRadius.value =
        this.radius * (1 + 2.2 * (1 - Math.pow(1 - r, 2)));
      this.ring.material.uniforms.uAge.value = r;
      this.sparkU.uBurst.value =
        Math.max(0, 1 - b / 1.4) * Math.min(1, b / 0.1);
      if (b > 2) this.blastT = undefined;
    }

    for (const [mesh, v] of this.litMaterials) {
      const target =
        v.name === "grooves"
          ? phase === "closed"
            ? 0
            : 0.4 + fill * 1.2
          : v.glow * (1 + this.pulse * 0.8);
      const m = mesh.material;
      m.emissiveIntensity +=
        (target - m.emissiveIntensity) * Math.min(1, dt * 4);
    }
  }

  ignition() {
    this.phase = "reveal";
    this.phaseT = 0;
    this.blastT = 0;
    this.rumble = 0;
    this.uniforms.uFill.value = 1;
    this.uniforms.uClear.value = 0;
    this.sound?.play("ignite");
    this.onIgnition?.();
  }

  // Crossing the ring plane inside the opening, going through it towards -Z.
  crossed(hero) {
    if (!this.isOpen) return false;
    const inside =
      Math.abs(hero.pos.x - this.center.x) < this.radius - 0.9 &&
      hero.feet > this.daisTop - 0.3 &&
      hero.feet < this.daisTop + 2;
    const was = this.lastZ ?? hero.pos.z;
    this.lastZ = hero.pos.z;
    return inside && was >= this.center.z && hero.pos.z < this.center.z;
  }

  renderPortal(camera) {
    if (!this.destination || !this.disc.visible) return;
    if (this.uniforms.uClear.value <= 0) return;
    // Only draw the far world when the window is on screen and seen from its front.
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(
      this.viewProjection.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    this.sphere.set(this.center, this.radius);
    if (
      !this.frustum.intersectsSphere(this.sphere) ||
      camera.position.z < this.center.z - 0.5
    )
      return;
    this.renderView(camera);
  }

  // Draws the destination from the matching viewpoint into the portal's target. Also used at
  // load time so every shader the view needs is compiled before play.
  renderView(camera) {
    const d = this.destination;
    const cam = this.portalCam;
    cam.copy(camera);
    cam.position.sub(this.center).add(d.gateCenter);
    cam.updateMatrixWorld();
    const r = this.renderer;
    const prevTarget = r.getRenderTarget(),
      prevPlanes = r.clippingPlanes;
    r.setRenderTarget(this.target);
    r.clippingPlanes = [d.clipPlane];
    d.renderInto(r, cam);
    r.clippingPlanes = prevPlanes;
    r.setRenderTarget(prevTarget);
  }

  resize() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    if (this.hasView) this.target.setSize(size.x, size.y);
    this.uniforms.uRes.value.copy(size);
  }

  reset() {
    this.phase = "closed";
    this.phaseT = 0;
    this.lit = [false, false, false];
    this.pulse = 0;
    this.blastT = undefined;
    this.rumble = 0;
    this.lastZ = undefined;
    for (const ch of this.channels.values()) {
      ch.progress = 0;
      ch.running = ch.done = false;
      ch.uniforms.uProgress.value = 0;
    }
    for (const [mesh, v] of this.litMaterials) {
      v.glow = 0;
      mesh.material.emissiveIntensity = 0;
    }
    for (const m of this.medallionGlyphs) if (m) m.emissiveIntensity = 0;
    this.uniforms.uFill.value = 0;
    this.uniforms.uClear.value = 0;
    this.sequence = false;
    this.disc.visible = false;
    this.flash.material.opacity = 0;
    this.ground.visible = this.ring.visible = false;
    this.sparkU.uBurst.value = 0;
    this.light.intensity = 0;
  }
}

const PORTAL_FS = /* glsl */ `
  uniform sampler2D uView; uniform vec2 uRes; uniform float uFill; uniform float uClear; uniform float uTime; uniform float uHasView;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;
    // The membrane of light fills the ring from its rim inwards...
    float membrane = smoothstep(1.0 - uFill - 0.06, 1.0 - uFill + 0.02, r);
    float n = noise(c * 7.0 + vec2(uTime * 0.25, -uTime * 0.18)) * 0.6 + noise(c * 19.0 - uTime * 0.4) * 0.4;
    vec3 light = mix(vec3(0.85, 1.0, 0.98), vec3(0.3, 0.95, 0.88), clamp(r * 0.7 + n * 0.4, 0.0, 1.0)) * (1.5 + n * 0.9);
    // ...then clears from the centre onto the world beyond.
    float front = uClear * 1.1;
    float cleared = (1.0 - smoothstep(front - 0.14, front, r)) * uHasView;
    vec2 suv = gl_FragCoord.xy / uRes;
    float rim = smoothstep(0.8, 1.0, r);
    suv += c * 0.015 * sin(r * 34.0 - uTime * 3.0) * rim;
    vec3 view = texture2D(uView, suv).rgb * 0.92;
    float edge = smoothstep(front - 0.22, front - 0.02, r) * (1.0 - smoothstep(front - 0.02, front + 0.04, r)) * step(0.001, uClear) * (1.0 - step(1.0, uClear));
    vec3 col = mix(light * membrane, view, cleared);
    col += vec3(0.22, 0.89, 0.82) * (pow(rim, 4.0) * 1.2 * max(uFill, cleared) + edge * 5.0);
    float alpha = max(membrane, cleared);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// The camera's part in the set piece: `shots` is a list of { at, eye, look } keyframes in
// seconds from the start, relative to the gate centre; the camera eases between them,
// shakes with the rumble and the blast, and is done once the membrane has cleared.
class OpeningShot {
  constructor(gate, shots) {
    this.gate = gate;
    this.shots = shots;
    this.t = 0;
    this.from = null;
    this.end = shots[shots.length - 1].at;
    this.letterbox = true;
    // A camera, not a plain Object3D: only cameras look down their -Z when told to lookAt.
    this.probe = new THREE.PerspectiveCamera();
  }

  pose(t, out) {
    const s = this.shots;
    let i = 0;
    while (i < s.length - 2 && t > s[i + 1].at) i++;
    const a = s[i],
      b = s[i + 1];
    const k = b.cut ? (t >= b.at ? 1 : 0) : smooth(a.at, b.at, t);
    const c = this.gate.center;
    const eye = new THREE.Vector3(...a.eye)
      .lerp(new THREE.Vector3(...b.eye), k)
      .add(c);
    const look = new THREE.Vector3(...a.look)
      .lerp(new THREE.Vector3(...b.look), k)
      .add(c);
    out.position.copy(eye);
    out.lookAt(look);
    return out;
  }

  update(dt, camera, shake = 1) {
    this.t += dt;
    if (!this.from)
      this.from = {
        pos: camera.position.clone(),
        quat: camera.quaternion.clone(),
      };
    this.pose(Math.min(this.t, this.end), this.probe);
    const blendIn = smooth(0, 1.1, this.t);
    camera.position.lerpVectors(this.from.pos, this.probe.position, blendIn);
    camera.quaternion.slerpQuaternions(
      this.from.quat,
      this.probe.quaternion,
      blendIn,
    );
    const g = this.gate;
    const quake =
      shake *
      ((g.rumble || 0) * 0.09 +
        (g.blastT !== undefined ? Math.max(0, 0.35 - g.blastT * 0.25) : 0));
    if (quake > 0) {
      camera.position.x += (Math.random() - 0.5) * quake;
      camera.position.y += (Math.random() - 0.5) * quake;
    }
    if (this.t >= this.end && g.isOpen) this.done = true;
  }

  skip() {
    this.gate.forceOpen();
    this.done = true;
  }
}

// Measured from the generated gate: a 12 x 6 m lower tier, an 11 x 4.4 m upper tier whose
// floor is 2 cm above the bottom of the opening, a buttress on each side, and the ring. The
// opening is a circle whose lowest point touches the upper tier, so the ring's lower arc
// rises from the floor on either side of the centre line: it is built as low steps the
// feet climb onto, then the ring is solid beside the opening at body height.
export function gateColliders(world, x, z, daisTop) {
  const top = daisTop + 0.02;
  const R = 3.5;
  const arc = (d) => R - Math.sqrt(Math.max(0, R * R - d * d));
  world.add(x - 6, -10, z - 3, x + 6, top - 0.5, z + 3, "gate");
  world.add(x - 5.5, -10, z - 2.2, x + 5.5, top, z + 2.2, "gate");
  for (const side of [-1, 1]) {
    for (const [a, b] of [
      [0.7, 1.1],
      [1.1, 1.5],
      [1.5, 1.9],
      [1.9, 2.25],
    ])
      world.add(
        x + side * (side > 0 ? a : b),
        top - 0.5,
        z - 0.58,
        x + side * (side > 0 ? b : a),
        top + arc((a + b) / 2),
        z + 0.58,
        "gate",
        null,
        { grab: false },
      );
    const inner = x + side * 2.25,
      outer = x + side * 4.6,
      edge = x + side * 5.5;
    world.add(
      Math.min(inner, outer),
      top,
      z - 0.6,
      Math.max(inner, outer),
      top + 9,
      z + 0.6,
      "gate",
      null,
      { grab: false },
    );
    world.add(
      Math.min(outer, edge),
      top,
      z - 1.3,
      Math.max(outer, edge),
      top + 2.9,
      z + 1.3,
      "gate",
      null,
      { grab: false },
    );
  }
}

function fallbackGate() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({
    color: 0xb57f4f,
    roughness: 0.9,
  });
  const basalt = new THREE.MeshStandardMaterial({
    color: 0x3a3531,
    roughness: 0.8,
  });
  const crystal = new THREE.MeshStandardMaterial({
    color: 0x1d5f63,
    roughness: 0.3,
  });
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 6), stone);
  step1.position.y = 0.25;
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.5, 4.4), stone);
  step2.position.y = 0.75;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.0, 0.5, 16, 72),
    basalt,
  );
  ring.scale.z = 1.1;
  ring.position.y = 4.5;
  const grooves = new THREE.Mesh(
    new THREE.TorusGeometry(4.0, 0.08, 6, 72),
    crystal,
  );
  grooves.position.set(0, 4.5, 0.56);
  const medallion = (angle) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.1, 24),
      crystal,
    );
    m.rotation.x = Math.PI / 2;
    m.position.set(Math.sin(angle) * 4.0, 4.5 + Math.cos(angle) * 4.0, 0.6);
    return m;
  };
  const medallionTop = medallion(0),
    medallionRight = medallion((Math.PI * 2) / 3),
    medallionLeft = medallion((-Math.PI * 2) / 3);
  for (const o of [
    step1,
    step2,
    ring,
    grooves,
    medallionTop,
    medallionLeft,
    medallionRight,
  ]) {
    o.castShadow = o.receiveShadow = true;
    g.add(o);
  }
  g.userData.parts = { grooves, medallionTop, medallionLeft, medallionRight };
  g.userData.portal = { center: [0, 4.5, 0], radius: 3.5 };
  return g;
}
