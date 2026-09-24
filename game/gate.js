import * as THREE from "three";
import { glyphMaterial, makeGlyph } from "./glyphs.js";

// The far door. Each lit stela sends light along a floor channel into one medallion; with
// all three lit, the rings of the gate fill and the opening becomes a live window onto the
// second world, rendered each frame from the matching point beyond its twin gate.

const TURQUOISE = new THREE.Color(0x39e3d0);

export class Gate {
  constructor(scene, world, level, assets, renderer, sound) {
    this.scene = scene;
    this.world = world;
    this.level = level;
    this.assets = assets;
    this.renderer = renderer;
    this.sound = sound;
    this.fed = [];
    this.channels = new Map();
    this.open = 0;
    this.opening = false;
    this.time = 0;
    this.sequence = null;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 2,
    });
    this.portalCam = new THREE.PerspectiveCamera();
    this.frustum = new THREE.Frustum();
    this.viewProjection = new THREE.Matrix4();
    this.sphere = new THREE.Sphere();
  }

  async build({ x, z, yaw }) {
    const model = (await this.assets.make("far_gate")) || fallbackGate();
    model.position.set(x, 0, z);
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
      portal.center[1] * s,
      z + portal.center[2] * s,
    );
    this.radius = portal.radius * s;
    this.daisTop = this.center.y - this.radius;
    this.parts = model.userData.parts || {};
    this.litMaterials = new Map();
    // Every glowing part gets its own material so it can light independently.
    for (const [name, node] of Object.entries(this.parts)) {
      node.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(0x000000);
        this.litMaterials.set(o, name);
      });
    }

    gateColliders(this.world, x, z, this.daisTop);
    // Each medallion carries the glyph of the stela that feeds it.
    this.medallionGlyphs = {};
    model.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(model.matrixWorld).invert();
    for (const [part, kind] of [
      ["medallionLeft", "twin"],
      ["medallionTop", "spiral"],
      ["medallionRight", "peak"],
    ]) {
      const node = this.parts[part];
      if (!node) continue;
      const box = new THREE.Box3().setFromObject(node).applyMatrix4(inverse);
      const c = box.getCenter(new THREE.Vector3());
      const mat = glyphMaterial();
      const mark = makeGlyph(kind, (box.max.x - box.min.x) * 0.72, mat);
      mark.position.set(c.x, c.y, box.max.z + 0.01);
      model.add(mark);
      this.medallionGlyphs[part] = mat;
    }
    this.buildPortal();
    this.buildChannels();
  }

  buildPortal() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.uniforms = {
      uView: { value: this.target.texture },
      uRes: { value: size },
      uReveal: { value: 0 },
      uTime: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uView; uniform vec2 uRes; uniform float uReveal; uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 c = vUv - 0.5;
          float r = length(c) * 2.0;
          if (r > 1.0) discard;
          float inside = 1.0 - smoothstep(uReveal - 0.06, uReveal, r);
          float rim = smoothstep(0.78, 1.0, r);
          vec2 suv = gl_FragCoord.xy / uRes;
          suv += c * 0.018 * sin(r * 34.0 - uTime * 3.0) * rim;
          vec3 view = texture2D(uView, suv).rgb * 0.8;
          float front = smoothstep(uReveal - 0.16, uReveal, r) * (1.0 - smoothstep(uReveal, uReveal + 0.02, r));
          vec3 glow = vec3(0.22, 0.89, 0.82) * (pow(rim, 4.0) * 1.1 + front * 3.0);
          vec3 col = view * inside + glow;
          float alpha = max(inside, clamp(front * 1.5 + pow(rim, 3.0) * uReveal, 0.0, 1.0));
          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
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
    this.light = new THREE.PointLight(TURQUOISE, 0, 26, 1.6);
    this.light.position.copy(this.center).add(new THREE.Vector3(0, 0, 1.5));
    this.scene.add(this.light);
  }

  // Dormant channels run from each stela to the dais: a hint before, a path of light after.
  buildChannels() {
    const dormant = new THREE.MeshStandardMaterial({
      color: 0x1d5f63,
      roughness: 0.35,
      metalness: 0.2,
    });
    for (const s of this.level.stelae) {
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
      });
    }
  }

  feed(stela) {
    const ch = this.channels.get(stela.id);
    if (ch) ch.running = true;
    this.fed.push(stela.id);
    lightStela(stela);
  }

  medallionFor(id) {
    return {
      left: "medallionLeft",
      top: "medallionTop",
      right: "medallionRight",
    }[id];
  }

  update(dt, hero, state) {
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    for (const [id, ch] of this.channels) {
      ch.uniforms.uTime.value = this.time;
      if (!ch.running || ch.done) continue;
      ch.progress = Math.min(1, ch.progress + dt / 1.6);
      ch.uniforms.uProgress.value = ch.progress;
      if (ch.progress >= 1) {
        ch.done = true;
        this.glow(this.medallionFor(id), 1);
        const mark = this.medallionGlyphs[this.medallionFor(id)];
        if (mark) mark.emissiveIntensity = 3;
        this.sound.play("medallion");
        if ([...this.channels.values()].every((c) => c.done))
          this.beginOpening(hero, state);
      }
    }
    for (const [mesh, name] of this.litMaterials) {
      const target = mesh.userData.glow || 0;
      const m = mesh.material;
      const now = m.emissiveIntensity * (m.emissive.r > 0 ? 1 : 0);
      m.emissive.copy(TURQUOISE);
      m.emissiveIntensity = now + (target * 1.5 - now) * Math.min(1, dt * 3);
      void name;
    }
    if (this.opening) {
      this.open = Math.min(1, this.open + dt / 3.2);
      const k = this.open * this.open * (3 - 2 * this.open);
      this.uniforms.uReveal.value = k * 1.02;
      this.disc.visible = true;
      this.light.intensity = 30 * k + Math.sin(this.time * 2.3) * 3 * k;
      if (!this.sparks) this.buildSparks();
      this.sparks.visible = true;
      this.sparks.material.uniforms.uTime.value = this.time;
      this.sparks.material.uniforms.uOpen.value = k;
    }
  }

  // Motes of the far world's light spill from the rim of the opening and drift out.
  buildSparks() {
    const count = 220;
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    geo.setAttribute("seed", new THREE.BufferAttribute(seeds, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpen: { value: 0 },
        uRadius: { value: this.radius },
        uScale: { value: innerHeight * 0.5 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 seed; uniform float uTime; uniform float uOpen; uniform float uRadius; uniform float uScale;
        varying float vA;
        void main() {
          float life = fract(seed.x + uTime * (0.08 + seed.y * 0.1));
          float ang = seed.z * 6.2832 + life * (0.6 + seed.y) ;
          float r = uRadius * (0.92 + 0.14 * seed.y) + life * 0.8;
          vec3 p = vec3(cos(ang) * r, sin(ang) * r, life * (1.5 + seed.x * 3.0));
          vA = uOpen * sin(life * 3.1416) * (0.5 + 0.5 * seed.z);
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

  glow(partName, amount) {
    for (const [mesh, name] of this.litMaterials)
      if (name === partName) mesh.userData.glow = amount;
  }

  beginOpening(hero, state) {
    if (this.opening) return;
    this.glow("grooves", 1);
    this.sound.play("gate");
    this.opening = true;
    state.cinematic = new GateShot(this, state);
  }

  get isOpen() {
    return this.open > 0.95;
  }

  // Crossing the ring plane from the court side, inside the opening.
  crossed(hero) {
    if (!this.isOpen) return false;
    const inside =
      Math.abs(hero.pos.x - this.center.x) < this.radius - 0.6 &&
      hero.feet > this.daisTop - 0.3;
    const was = this.lastZ ?? hero.pos.z;
    this.lastZ = hero.pos.z;
    return inside && was >= this.center.z && hero.pos.z < this.center.z;
  }

  renderPortal(camera) {
    if (!this.destination || !this.disc.visible) return;
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
    this.target.setSize(size.x, size.y);
    this.uniforms.uRes.value.copy(size);
  }
}

// Measured from the generated gate: a 12 x 6 m lower tier, an 11 x 4.4 m upper tier whose
// floor is 2 cm above the bottom of the opening, the ring solid beside the opening at body
// height, and a buttress on each side.
export function gateColliders(world, x, z, daisTop) {
  const top = daisTop + 0.02;
  world.add(x - 6, -10, z - 3, x + 6, 0.5, z + 3, "gate");
  world.add(x - 5.5, -10, z - 2.2, x + 5.5, top, z + 2.2, "gate");
  for (const side of [-1, 1]) {
    const inner = x + side * 1.95,
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
    );
    world.add(
      Math.min(outer, edge),
      top,
      z - 1.3,
      Math.max(outer, edge),
      3.9,
      z + 1.3,
      "gate",
    );
  }
}

function lightStela(stela) {
  if (stela.glyphMat) stela.glyphMat.emissiveIntensity = 2.6;
  const lens = stela.mesh.userData.parts?.lens;
  if (!lens) return;
  lens.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    o.material.emissive = TURQUOISE.clone();
    o.material.emissiveIntensity = 3;
  });
}

// The camera leaves the explorer, frames the gate as the window opens, then hands back.
class GateShot {
  constructor(gate, state) {
    this.gate = gate;
    this.state = state;
    this.t = 0;
    this.from = null;
  }

  update(dt, camera) {
    this.t += dt;
    const g = this.gate;
    if (!this.from)
      this.from = {
        pos: camera.position.clone(),
        quat: camera.quaternion.clone(),
      };
    const eye = new THREE.Vector3(
      g.center.x + 5,
      g.center.y - 1.5,
      g.center.z + 15,
    );
    const look = g.center.clone().add(new THREE.Vector3(0, -0.5, 0));
    const into = Math.min(1, this.t / 1.6),
      back = this.t > 5 ? Math.min(1, (this.t - 5) / 1.2) : 0;
    const k = into * into * (3 - 2 * into);
    const m = new THREE.Matrix4().lookAt(eye, look, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    camera.position.lerpVectors(this.from.pos, eye, k * (1 - back));
    camera.quaternion.slerpQuaternions(this.from.quat, q, k * (1 - back));
    if (this.t > 6.2) this.state.cinematic = null;
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
