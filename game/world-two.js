import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { World } from "./world.js";
import { terrainMaterial } from "./terrain.js";
import { gateColliders } from "./gate.js";

// The second world: a black-sand plateau under a violet sky, a ringed giant on the
// horizon, and a cliff edge above a plain of basalt spires. Lit by a cold star with warm
// planetshine as the second colour temperature.

const STAR = new THREE.Vector3(0.78, 0.3, 0.55).normalize();
const PLANET = new THREE.Vector3(-0.18, 0.2, -1).normalize();

export class WorldTwo {
  constructor(renderer, assets) {
    this.renderer = renderer;
    this.assets = assets;
    this.scene = new THREE.Scene();
    this.world = new World();
    this.time = 0;
    this.active = false;
    this.finished = false;
    this.gateCenter = new THREE.Vector3();
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  }

  async build() {
    const s = this.scene;
    s.fog = new THREE.FogExp2(0x4a3452, 0.0026);
    s.background = new THREE.Color(0x1a1028);
    this.sky = this.buildSky();
    s.add(this.sky);

    const star = new THREE.DirectionalLight(0xd4e2ff, 3.4);
    star.position.copy(STAR).multiplyScalar(60);
    star.castShadow = true;
    star.shadow.mapSize.set(2048, 2048);
    const sc = star.shadow.camera;
    sc.left = sc.bottom = -45;
    sc.right = sc.top = 45;
    sc.near = 1;
    sc.far = 160;
    star.shadow.bias = -0.0004;
    star.shadow.normalBias = 0.03;
    s.add(star, star.target);
    this.star = star;
    const shine = new THREE.DirectionalLight(0xff9f7a, 0.75);
    shine.position.copy(PLANET).multiplyScalar(50);
    s.add(shine, shine.target);
    s.add(new THREE.HemisphereLight(0x7a64b8, 0x2a1e30, 1.25));

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.add(this.buildSky(true));
    s.environment = pmrem.fromScene(envScene, 0.04).texture;
    s.environmentIntensity = 0.45;
    pmrem.dispose();

    this.buildGround();
    await this.buildGate();
    await this.buildSpires();

    this.composer = null;
    this.makeComposer();
  }

  buildSky(forEnv = false) {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(900, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uStar: { value: STAR }, uPlanet: { value: PLANET } },
        vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir; uniform vec3 uStar; uniform vec3 uPlanet;
          float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 horizon = vec3(0.36, 0.17, 0.27), mid = vec3(0.1, 0.05, 0.19), zenith = vec3(0.018, 0.01, 0.05);
            vec3 col = mix(horizon, mid, smoothstep(-0.02, 0.22, h));
            col = mix(col, zenith, smoothstep(0.22, 0.85, h));
            float p = max(dot(d, uPlanet), 0.0);
            col += vec3(0.5, 0.26, 0.2) * pow(p, 6.0) * 0.5 * (1.0 - smoothstep(0.0, 0.5, h));
            float s = max(dot(d, uStar), 0.0);
            col += vec3(0.55, 0.6, 0.85) * pow(s, 24.0) * 0.5 + vec3(1.0, 1.0, 1.2) * pow(s, 1800.0) * 30.0;
            vec3 cell = floor(d * 380.0);
            float twinkle = step(0.9982, hash(cell)) * smoothstep(0.08, 0.35, h);
            col += vec3(0.9, 0.9, 1.0) * twinkle * (0.6 + hash(cell + 3.0) * 1.6);
            col = mix(col, vec3(0.1, 0.06, 0.12), smoothstep(0.0, -0.08, h));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    g.add(dome);
    // The ringed giant, low on the horizon, lit from the star's side.
    const planetMat = new THREE.ShaderMaterial({
      fog: false,
      uniforms: { uStar: { value: STAR } },
      vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vP; void main() { vN = normalize(mat3(modelMatrix) * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vN; varying vec3 vP; uniform vec3 uStar;
        void main() {
          float lat = vP.y / 185.0;
          float bands = sin(lat * 26.0 + sin(lat * 7.0 + vP.x * 0.01) * 1.6) * 0.5 + 0.5;
          vec3 a = vec3(0.78, 0.45, 0.32), b = vec3(0.95, 0.78, 0.55), c = vec3(0.55, 0.28, 0.3);
          vec3 base = mix(mix(a, b, bands), c, smoothstep(0.55, 0.9, sin(lat * 9.0 + 1.0) * 0.5 + 0.5) * 0.5);
          float light = smoothstep(-0.25, 0.6, dot(normalize(vN), uStar));
          vec3 col = base * (0.035 + 0.62 * light);
          float rim = pow(1.0 - abs(normalize(vN).z), 3.0);
          col += vec3(0.9, 0.55, 0.45) * rim * 0.25 * light;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(185, 64, 48),
      planetMat,
    );
    planet.position.copy(PLANET).multiplyScalar(780);
    planet.rotation.z = 0.35;
    g.add(planet);
    const ringMat = new THREE.ShaderMaterial({
      fog: false,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vP;
        void main() {
          float r = length(vP.xy);
          float t = (r - 245.0) / 170.0;
          float bands = sin(t * 60.0) * 0.25 + sin(t * 17.0) * 0.35 + 0.55;
          float edge = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.9, 1.0, t)) * (1.0 - smoothstep(0.42, 0.46, t) * (1.0 - smoothstep(0.5, 0.54, t)));
          vec3 col = vec3(0.95, 0.8, 0.66) * (0.5 + bands * 0.6);
          gl_FragColor = vec4(col * 0.55, edge * bands * 0.6);
        }`,
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(245, 415, 160, 1),
      ringMat,
    );
    ring.position.copy(planet.position);
    ring.rotation.set(-1.25, 0.2, 0.35);
    g.add(ring);
    for (const [dir, r, color] of [
      [new THREE.Vector3(0.55, 0.42, -0.72), 16, 0xc9c3d6],
      [new THREE.Vector3(-0.62, 0.3, -0.72), 9, 0xe3b9a0],
    ]) {
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(r, 24, 16),
        new THREE.MeshBasicMaterial({ color, fog: false }),
      );
      moon.position.copy(dir.normalize()).multiplyScalar(820);
      g.add(moon);
    }
    // The sky draws first and never occludes: the plain's far edge must hide the giant's foot.
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.material.depthTest = false;
      o.material.depthWrite = false;
      o.renderOrder = -10;
    });
    void forEnv;
    return g;
  }

  buildGround() {
    const sand = terrainMaterial("sand", 0x4a4058, 0.9),
      rock = terrainMaterial("rock", 0x2a2830, 0.92);
    // The plateau: flat along the path, rising into dunes and ridges at its sides.
    const geo = new THREE.PlaneGeometry(120, 90, 180, 135);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i) - 20;
      p.setZ(i, z);
      const side = Math.max(0, Math.abs(x) - 9);
      const dune =
        Math.sin(x * 0.21 + z * 0.08) * 0.6 +
        Math.sin(x * 0.05 - z * 0.13) * 1.2;
      let y =
        Math.min(side * 0.35, 12) +
        (side > 0 ? dune * Math.min(1, side / 6) : 0);
      y += Math.sin(x * 1.3 + z * 0.9) * 0.03;
      if (z < -56) y = -140;
      p.setY(i, y);
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, sand);
    ground.receiveShadow = true;
    this.scene.add(ground);
    // The cliff below the edge and the plain far beneath it.
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(120, 140, 6), rock);
    cliff.position.set(0, -70.2, -59);
    cliff.receiveShadow = true;
    this.scene.add(cliff);
    // The plain: flat below the cliff, rising into long mesas towards the horizon.
    const plainGeo = new THREE.PlaneGeometry(2400, 2400, 160, 160).rotateX(
      -Math.PI / 2,
    );
    const q = plainGeo.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i),
        z = q.getZ(i);
      const far = Math.min(1, Math.max(0, (Math.hypot(x, z + 60) - 260) / 500));
      const ridge = Math.max(
        0,
        Math.sin(x * 0.006 + Math.sin(z * 0.004) * 2) * 0.6 +
          Math.sin(x * 0.017 - z * 0.011) * 0.4,
      );
      const mesa = Math.min(1, ridge * 2.2) ** 3;
      q.setY(i, far * mesa * 90 + Math.sin(x * 0.05 + z * 0.03) * 1.5);
    }
    plainGeo.computeVertexNormals();
    const plain = new THREE.Mesh(plainGeo, rock);
    plain.position.y = -140;
    plain.receiveShadow = true;
    this.scene.add(plain);
    // Beacons of the network, burning far out on the plain.
    const beaconMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.6, 3.2, 2.9),
      toneMapped: false,
    });
    let seed = 5;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 9; i++) {
      const a = (rand() - 0.5) * 1.6,
        d = 180 + rand() * 480;
      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.4 + rand() * 1.6, 0),
        beaconMat,
      );
      beacon.position.set(
        Math.sin(a) * d,
        -136 + rand() * 6,
        -60 - Math.cos(a) * d,
      );
      beacon.scale.y = 2.4;
      this.scene.add(beacon);
    }

    const w = this.world;
    w.add(-15, -10, -56, 15, 0, 12, "rock");
    w.add(-40, -10, -60, -15, 20, 12, "rock");
    w.add(15, -10, -60, 40, 20, 12, "rock");
    w.add(-40, -10, 12, 40, 20, 20, "rock");
  }

  async buildGate() {
    const model = (await this.assets.make("far_gate")) || null;
    const g = model || new THREE.Group();
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      // Ash and basalt instead of sandstone: the same builders, another world.
      const c = o.material.color;
      const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
      if (c.r > c.b * 1.3)
        o.material.color.setRGB(lum * 0.55, lum * 0.5, lum * 0.66);
    });
    const parts = g.userData.parts || {};
    for (const node of Object.values(parts))
      node.traverse((o) => {
        if (!o.isMesh) return;
        o.material.emissive = new THREE.Color(0x39e3d0);
        o.material.emissiveIntensity = 1.1;
      });
    this.scene.add(g);
    const portal = g.userData.portal || { center: [0, 4.5, 0], radius: 3.5 };
    this.gateCenter.set(portal.center[0], portal.center[1], portal.center[2]);
    this.daisTop = this.gateCenter.y - portal.radius;
    this.clipPlane.set(new THREE.Vector3(0, 0, -1), this.gateCenter.z - 0.05);
    gateColliders(this.world, 0, 0, this.daisTop);
    // The door behind the explorer: its rings glow, then settle as the way closes.
    this.gateLight = new THREE.PointLight(0x39e3d0, 0, 30, 1.5);
    this.gateLight.position
      .copy(this.gateCenter)
      .add(new THREE.Vector3(0, 0, -2));
    this.scene.add(this.gateLight);
    this.gateParts = parts;
  }

  async buildSpires() {
    const place = async (x, y, z, scale, yaw, solid) => {
      const spire = (await this.assets.make("basalt_spire")) || fallbackSpire();
      spire.position.set(x, y, z);
      spire.scale.multiplyScalar(scale);
      spire.rotation.y = yaw;
      this.scene.add(spire);
      if (solid)
        this.world.add(
          x - 2 * scale,
          -10,
          z - 2 * scale,
          x + 2 * scale,
          9 * scale,
          z + 2 * scale,
          "rock",
        );
    };
    let seed = 11;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const near = [
      [-11, -12, 1.0],
      [12, -20, 1.2],
      [-12, -31, 0.9],
      [11.5, -40, 1.1],
      [-10.5, -47, 0.8],
      [9, 6, 0.9],
    ];
    for (const [x, z, s] of near) await place(x, 0, z, s, rand() * 6, true);
    for (let i = 0; i < 26; i++) {
      const a = (rand() - 0.5) * 1.9,
        d = 120 + rand() * 520;
      await place(
        Math.sin(a) * d,
        -140,
        -60 - Math.cos(a) * d,
        2.5 + rand() * 5,
        rand() * 6,
        false,
      );
    }
    // Another door, far out on the plain.
    const far = (await this.assets.make("far_gate")) || null;
    if (far) {
      far.position.set(-70, -140, -330);
      far.rotation.y = 0.5;
      far.scale.setScalar(2.2);
      far.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.color.multiplyScalar(0.45);
        }
      });
      this.scene.add(far);
    }
  }

  makeComposer() {
    const r = this.renderer;
    const size = r.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(r, rt);
    this.composer.setPixelRatio(r.getPixelRatio());
    this.composer.setSize(size.x, size.y);
    this.pass = new RenderPass(this.scene, new THREE.PerspectiveCamera());
    this.composer.addPass(this.pass);
    this.composer.addPass(new UnrealBloomPass(size, 0.55, 0.4, 1.1));
    this.composer.addPass(new OutputPass());
  }

  // Seen through the first gate: drawn into the portal's render target by the caller.
  renderInto(renderer, camera) {
    this.sky.position.copy(camera.position);
    this.followShadow(camera.position);
    renderer.render(this.scene, camera);
  }

  followShadow(p) {
    const t = new THREE.Vector3(Math.round(p.x), 0, Math.round(p.z));
    this.star.target.position.copy(t);
    this.star.position.copy(t).addScaledVector(STAR, 60);
    this.star.target.updateMatrixWorld();
  }

  enter(hero, follow, gate, heroModel, courtWorld) {
    this.active = true;
    const dx = this.gateCenter.x - gate.center.x,
      dz = this.gateCenter.z - gate.center.z,
      dy = this.daisTop - gate.daisTop;
    hero.pos.x += dx;
    hero.pos.z += dz;
    hero.feet += dy;
    hero.world = this.world;
    hero.level = { interactables: () => [], moveBlock: () => false };
    follow.world = this.world;
    follow.target.x += dx;
    follow.target.z += dz;
    follow.target.y += dy;
    heroModel.removeFromParent();
    this.scene.add(heroModel);
    this.gateLight.intensity = 60;
    this.hero = hero;
    this.follow = follow;
    void courtWorld;
  }

  update(dt, hero, state) {
    this.time += dt;
    this.gateLight.intensity = Math.max(4, this.gateLight.intensity - dt * 25);
    if (!this.finale && hero.pos.z < -44) {
      this.finale = new Finale(this, hero);
      state.cinematic = this.finale;
    }
    if (this.finale?.done) this.finished = true;
  }

  render(camera) {
    this.sky.position.copy(camera.position);
    this.followShadow(
      this.hero
        ? new THREE.Vector3(this.hero.pos.x, 0, this.hero.pos.z)
        : camera.position,
    );
    this.pass.camera = camera;
    this.composer.render();
  }

  resize(w, h) {
    this.composer?.setSize(w, h);
  }
}

// The last shot: the camera rises past the explorer and over the edge, to the giant.
class Finale {
  constructor(two, hero) {
    this.two = two;
    this.hero = hero;
    this.t = 0;
    this.done = false;
    this.from = null;
  }

  update(dt, camera) {
    this.t += dt;
    if (!this.from)
      this.from = {
        pos: camera.position.clone(),
        quat: camera.quaternion.clone(),
      };
    const h = this.hero;
    const k = Math.min(1, this.t / 7);
    const e = k * k * (3 - 2 * k);
    const eye = new THREE.Vector3(
      h.pos.x + 3,
      h.feet + 3 + e * 10,
      h.pos.z + 7 - e * 24,
    );
    const look = new THREE.Vector3(
      h.pos.x - 20 * e,
      h.feet + 1 + e * 40,
      h.pos.z - 60 - e * 200,
    );
    const m = new THREE.Matrix4().lookAt(eye, look, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    const blend = Math.min(1, this.t / 1.5);
    camera.position.lerpVectors(this.from.pos, eye, blend);
    camera.quaternion.slerpQuaternions(this.from.quat, q, blend);
    if (this.t > 8.5) this.done = true;
  }
}

function fallbackSpire() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({
    color: 0x2a2830,
    roughness: 0.85,
    flatShading: true,
  });
  for (const [x, z, h, tilt] of [
    [0, 0, 9, 0.08],
    [1.2, 0.6, 6, -0.12],
    [-1.0, -0.4, 4.5, 0.15],
  ]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, h, 6), m);
    c.position.set(x, h / 2, z);
    c.rotation.z = tilt;
    c.castShadow = c.receiveShadow = true;
    g.add(c);
  }
  return g;
}
