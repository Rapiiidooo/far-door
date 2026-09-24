import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { World } from "./world.js";
import { Frozen, ISLAND, SECTIONS, WATER } from "./frozen.js";
import { ForestView } from "./forest.js";
import { SunDisc, fallbackDisc } from "./disc.js";

// The fourth world and the fourth level: a frozen reach under a twilight sky with slow ribbons
// of aurora. Mira's ring on the isles, given two glyphs of three, opened halfway onto it; its
// twin stands at the origin and leads back. The level itself is in frozen.js. At its far end
// the great ring, its address made whole by the glyph freed from the ice, opens onto a wild
// forest, and the game closes on that view.

// Low and cold, off to the left and a little behind the way, so faces ahead are lit and the
// ice catches it across.
const SUN = new THREE.Vector3(-0.66, 0.32, 0.35).normalize();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ADDRESS = ["peak", "waves", "star"];
const SNOW = 1400;

export class WorldFour {
  constructor(renderer, assets, services = {}) {
    this.renderer = renderer;
    this.assets = assets;
    this.services = services;
    this.scene = new THREE.Scene();
    this.world = new World();
    this.time = 0;
    this.active = false;
    this.gateCenter = new THREE.Vector3();
    // Seen through Mira's ring, only what lies beyond the arrival ring is drawn.
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    this.said = new Set();
  }

  async build() {
    const s = this.scene;
    s.fog = new THREE.FogExp2(0xaebfd4, 0.0085);
    s.background = new THREE.Color(0x9fb2cc);
    this.sky = this.buildSky();
    s.add(this.sky);
    const sun = new THREE.DirectionalLight(0xffd9c2, 3.1);
    sun.position.copy(SUN).multiplyScalar(80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -26;
    sc.right = sc.top = 26;
    sc.near = 1;
    sc.far = 200;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    s.add(sun, sun.target);
    this.sun = sun;
    s.add(new THREE.HemisphereLight(0xc4d8f0, 0x6d7a90, 1.75));
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.add(this.buildSky());
    s.environment = pmrem.fromScene(envScene, 0.04).texture;
    s.environmentIntensity = 0.8;
    pmrem.dispose();

    this.buildSnow();
    this.frozen = new Frozen(s, this.world, this.assets, this.services);
    await this.frozen.build();
    await this.buildArrival();
    this.forest = new ForestView(this.assets);
    await this.forest.build();
    await this.buildRing();
    this.makeComposer();
  }

  // Twilight: a deep blue zenith over a rose horizon, stars, and ribbons of aurora that
  // wave slowly across the upper sky.
  buildSky() {
    const g = new THREE.Group();
    this.skyU = { uTime: { value: 0 }, uSun: { value: SUN } };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(900, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: this.skyU,
        vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir; uniform float uTime; uniform vec3 uSun;
          float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 horizon = vec3(0.93, 0.74, 0.72), mid = vec3(0.45, 0.55, 0.78), zenith = vec3(0.08, 0.12, 0.3);
            vec3 col = mix(horizon, mid, smoothstep(0.0, 0.25, h));
            col = mix(col, zenith, smoothstep(0.25, 0.9, h));
            float s = max(dot(d, uSun), 0.0);
            col += vec3(1.0, 0.72, 0.55) * pow(s, 10.0) * 0.4 + vec3(1.0, 0.9, 0.8) * pow(s, 400.0) * 1.5;
            // Stars, only high up where the sky is dark.
            vec2 g = floor(vec2(atan(d.z, d.x) * 180.0, h * 260.0));
            float star = step(0.996, h2(g)) * smoothstep(0.35, 0.7, h);
            col += vec3(0.9, 0.95, 1.0) * star * 0.8;
            // Aurora: curtains that wave along the sky, green at the foot, violet above.
            float a = atan(d.z, d.x);
            float wave = sin(a * 3.0 + uTime * 0.07) * 0.08 + sin(a * 7.0 - uTime * 0.11) * 0.03;
            float band = smoothstep(0.1, 0.0, abs(h - 0.42 - wave)) * smoothstep(-0.2, 0.6, sin(a * 2.0 + 1.3));
            float rays = 0.6 + 0.4 * sin(a * 90.0 + uTime * 0.6 + sin(a * 13.0) * 2.0);
            vec3 aur = mix(vec3(0.3, 1.0, 0.7), vec3(0.6, 0.4, 1.0), smoothstep(0.38, 0.55, h + wave));
            col += aur * band * rays * 0.55;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    dome.renderOrder = -10;
    g.add(dome);
    return g;
  }

  // Snow drifting down around the camera, wrapped so it never runs out.
  buildSnow() {
    const pos = new Float32Array(SNOW * 3);
    for (let i = 0; i < SNOW; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.snowU = {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
    };
    this.snow = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.snowU,
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `
          uniform float uTime; uniform vec3 uCenter;
          varying float vNear;
          void main() {
            vec3 p = position;
            p.y = mod(p.y - uTime * 0.9, 20.0) - 6.0;
            p.x += sin(uTime * 0.5 + position.z) * 0.6 + uTime * 0.35;
            p.xz = mod(p.xz - uCenter.xz + 20.0, 40.0) - 20.0 + uCenter.xz;
            p.y += uCenter.y;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            // Flakes brushing the lens would be blurred blotches: small, and gone up close.
            gl_PointSize = min(60.0 / -mv.z, 9.0);
            vNear = smoothstep(1.2, 3.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vNear;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), smoothstep(0.5, 0.15, d) * 0.85 * vNear);
          }`,
      }),
    );
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  // Mira's ring's twin, lit from the moment the explorer arrives and seen only from this side:
  // walking back through it leads to the isles.
  async buildArrival() {
    const { Gate } = this.services;
    this.arrival = new Gate({
      scene: this.scene,
      world: this.world,
      renderer: this.renderer,
      sound: this.services.sound,
      assets: this.assets,
      view: false,
    });
    await this.arrival.build({ x: 0, z: 0, glyphs: ["peak", "waves", null] });
    this.arrival.uniforms.uHasView.value = 0;
    this.arrival.disc.material.side = THREE.BackSide;
    this.arrival.lightScale = 0.25;
    this.arrival.forceOpen();
    this.gateCenter.copy(this.arrival.center);
    this.daisTop = this.arrival.daisTop;
    this.clipPlane.set(new THREE.Vector3(0, 0, -1), this.gateCenter.z - 0.05);
  }

  // The great ring on the island: two glyphs lit as on the isles, the third to be freed.
  async buildRing() {
    const { Gate } = this.services;
    this.ring = new Gate({
      scene: this.scene,
      world: this.world,
      renderer: this.renderer,
      sound: this.services.sound,
      assets: this.assets,
    });
    const model = await this.assets.make("far_gate");
    if (model) model.position.y = ISLAND.top;
    await this.ring.build({
      x: ISLAND.ring.x,
      z: ISLAND.ring.z,
      glyphs: ADDRESS,
      model,
    });
    this.ring.destination = this.forest;
    this.ring.lightScale = 0.6;
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
    this.composer.addPass(new UnrealBloomPass(size, 0.35, 0.5, 1.15));
    this.composer.addPass(new OutputPass());
  }

  // --- the explorer's side: Mira's disc, hints and lines ---------------------------------------
  async wire({ hero, heroModel, follow, dust, state, palm }) {
    this.hero = hero;
    this.heroModel = heroModel;
    this.follow = follow;
    this.dust = dust;
    this.state = state;
    this.palm = palm || null;
    const mesh =
      (await this.assets.make("sun_disc", { keepHierarchy: true })) ||
      fallbackDisc();
    this.disc = new SunDisc(mesh, this.world, this.services.sound);
    this.disc.scene = this.scene;
    const F = this.frozen;
    this.disc.beams.push(F.prism.beam);
    this.disc.targets.push(F.prism.target, F.casing.target);
    for (const b of F.blocks) this.disc.targets.push(b.target);
    const hud = this.services.hud;
    const k = (a) => hud.k(a);
    F.onDark = () => {
      if (this.time - (this.darkAt ?? -99) < 12) return;
      this.darkAt = this.time;
      hud.hint(
        "Light",
        `Only a glowing disc cuts this ice: throw it ${k("throw")} through the prism's beam first.`,
        8,
      );
    };
    F.onCrack = (n, of) => {
      if (n < of) hud.subtitle(n === 1 ? "It cracks." : "Once more.", 2);
    };
    F.onHeal = () =>
      this.once("heal", () =>
        hud.hint(
          "The ice heals",
          "Left alone for a few seconds, the ice closes again. Strike faster, while the disc still glows.",
          8,
        ),
      );
    F.onFree = () => {
      hud.light("star");
      hud.subtitle("A star. The address is whole.", 3.5);
      hud.objective("", "");
      hud.setMarkers([]);
      this.opening = { t: 0 };
    };
    F.onShatter = () =>
      this.once("shatter", () =>
        hud.subtitle("It shatters, and the pond freezes it again.", 3),
      );
    F.onRest = (b) => {
      if (Math.abs(b.x - 3) < 0.1 && Math.abs(b.z + 73) < 0.1)
        this.once("notch", () =>
          hud.subtitle("Right under the notch. Up I go.", 3),
        );
    };
  }

  hand() {
    const j = this.heroModel.userData.joints;
    return j.rightHand || j.rightLowerArm;
  }

  once(key, fn) {
    if (this.said.has(key)) return;
    this.said.add(key);
    fn();
  }

  // --- entering and leaving --------------------------------------------------------------------
  enter({ through = null, arrive = false } = {}) {
    this.active = true;
    const hero = this.hero;
    if (through) {
      // Stepping through Mira's ring: the same offset from its twin, still walking on.
      hero.pos.x = this.gateCenter.x + through.x;
      hero.pos.z = this.gateCenter.z + through.z;
      hero.feet = this.daisTop + through.feet;
      hero.safe = {
        x: this.gateCenter.x,
        z: this.gateCenter.z - 1.2,
        feet: this.daisTop + 0.02,
        yaw: Math.PI,
      };
    } else if (arrive) {
      const z = this.gateCenter.z - 4.4;
      hero.spawn(this.gateCenter.x, z, 0, Math.PI);
    }
    const F = this.frozen;
    hero.world = this.world;
    hero.level = {
      interactables: () => F.interactables(),
      use: (ref) => ref.use?.(),
      moveBlock: (ref, dir) => F.moveBlock(ref, dir, hero),
      isMoving: (ref) => F.isMoving(ref),
      blockBox: (ref) => ref.box,
    };
    this.follow.world = this.world;
    this.follow.snap(hero);
    this.heroModel.removeFromParent();
    this.scene.add(this.heroModel);
    if (this.disc && this.disc.state !== "held")
      this.disc.attach(this.hand(), this.palm);
    const hud = this.services.hud;
    hud.setAddress([ADDRESS[0], ADDRESS[1], F.freed ? ADDRESS[2] : null]);
    hud.light(ADDRESS[0]);
    hud.light(ADDRESS[1]);
    if (F.freed) hud.light(ADDRESS[2]);
  }

  leave() {
    this.active = false;
    this.disc?.stow();
  }

  startStory() {
    this.storyT = 0;
  }

  // Walking back through the ring the explorer came in by: it leads to Mira's camp.
  returnCrossed(hero) {
    const c = this.gateCenter;
    const inside =
      Math.abs(hero.pos.x - c.x) < this.arrival.radius - 0.9 &&
      hero.feet > this.daisTop - 0.3 &&
      hero.feet < this.daisTop + 2;
    const was = this.lastZ ?? hero.pos.z;
    this.lastZ = hero.pos.z;
    return inside && was < c.z && hero.pos.z >= c.z;
  }

  // --- the frame ---------------------------------------------------------------------------------
  update(dt, hero, state, { throw: throwPressed, camera }) {
    this.ambient(dt);
    this.arrival.update(dt);
    this.ring.update(dt);
    this.frozen.update(dt, hero);
    this.frozen.guide(this.services.hud, hero, this.disc);
    if (
      throwPressed &&
      this.disc.ready &&
      !state.cinematic &&
      ["ground", "air", "roll"].includes(hero.state) &&
      this.disc.throw(this.scene, camera, hero.yaw)
    )
      hero.throwT = 0;
    this.disc.update(dt, hero, () => (hero.catchT = 0));
    hero.throwT = (hero.throwT ?? 9) + dt;
    hero.catchT = (hero.catchT ?? 9) + dt;
    hero.holding = this.disc.ready;
    // Into the lake: the cold water throws the explorer back.
    if (hero.state === "air" && hero.feet < WATER - 1.2 && hero.pos.z < -100) {
      hero.lastFall = "water";
      this.dust?.burst(hero.pos.x, WATER, hero.pos.z, 1.6, 18);
      hero.respawn();
    }
    this.story(dt, hero);
    this.openRing(dt, state);
  }

  // The glyph freed: a breath, then the third medallion lights and the ring opens.
  openRing(dt, state) {
    const o = this.opening;
    if (!o) return;
    o.t += dt;
    const R = this.ring;
    if (!o.started && o.t > 1.6) {
      o.started = true;
      R.ignite(2);
      R.open(state, [
        { at: 0, eye: [9, -1.5, 16], look: [0, -0.5, 0] },
        { at: 2.2, eye: [6.5, -2, 13], look: [0, 0, 0] },
        { at: 5.6, eye: [3, -2.4, 10.5], look: [0, -0.2, -2] },
        { at: 8.6, eye: [1.4, -1.9, 8.2], look: [0, -0.4, -6] },
        { at: 9.4, eye: [1.3, -1.9, 7.9], look: [0, -0.4, -6] },
      ]);
    }
    if (o.started && !o.done && R.isOpen && !state.cinematic) {
      o.done = true;
      this.services.hud.subtitle("Green. Somewhere green, and warm.", 3.5);
      this.onFinale?.();
    }
  }

  // The lines and cards that come with progress, each once.
  story(dt, hero) {
    const hud = this.services.hud;
    const F = this.frozen;
    const k = (a) => hud.k(a);
    this.storyT = (this.storyT ?? 0) + dt;
    const past = (id) => F.reached >= SECTIONS.findIndex((s) => s.id === id);
    if (this.storyT > 2)
      this.once("arrive", () =>
        hud.subtitle("Ice. She came through here before me.", 3.5),
      );
    if (this.storyT > 6.5)
      this.once("ice", () =>
        hud.hint(
          "Ice",
          "On ice you gather speed slowly and slide a long way. Line up with the landing, run, and jump at the edge.",
          9,
        ),
      );
    if (past("pond") && hero.pos.z < -55)
      this.once("pond", () => {
        hud.subtitle("Blocks of ice. They will slide.", 3);
        hud.hint(
          "Blocks of ice",
          `Hold ${k("interact")} against a block and push: it slides until something stops it. It cannot be pulled.`,
          10,
        );
      });
    if (F.guideKey === "pond:true")
      this.once("stuck", () =>
        hud.hint(
          "Stuck",
          `Throw the disc ${k("throw")} at a stuck block: it shatters and forms again where it began.`,
          9,
        ),
      );
    if (past("lake"))
      this.once("lake", () =>
        hud.hint(
          "Thin ice",
          "Thin ice cracks a moment after you land on it, then breaks. Keep moving.",
          8,
        ),
      );
    if (past("floes"))
      this.once("floes", () =>
        hud.hint(
          "Floes",
          "The floes drift across the channel and rest at each side. Hop on as one passes in front of you.",
          9,
        ),
      );
    if (past("island"))
      this.once("island", () => {
        hud.subtitle("There. The third glyph, under the ice.", 3.5);
        hud.hint(
          "Frozen stone",
          `Charge the disc in the prism's beam, then strike the ice ${k("throw")} three times before it heals.`,
          10,
        );
      });
  }

  // Sky, snow and the forest beyond keep moving behind the closing shot and the credits.
  ambient(dt) {
    this.time += dt;
    this.skyU.uTime.value = this.time;
    this.snowU.uTime.value = this.time;
    this.forest.update(dt);
  }

  // Drawn by Mira's ring on the isles, from the point matching the viewer's.
  renderInto(renderer, camera) {
    this.sky.position.copy(camera.position);
    this.snowU.uCenter.value.copy(camera.position);
    renderer.render(this.scene, camera);
  }

  followShadow(p) {
    const t = V(Math.round(p.x), Math.round(p.y), Math.round(p.z));
    this.sun.target.position.copy(t);
    this.sun.position.copy(t).addScaledVector(SUN, 80);
    this.sun.target.updateMatrixWorld();
  }

  render(camera) {
    this.sky.position.copy(camera.position);
    this.snowU.uCenter.value.copy(camera.position);
    this.followShadow(
      this.hero
        ? V(this.hero.pos.x, this.hero.feet, this.hero.pos.z)
        : camera.position,
    );
    this.ring.renderPortal(camera);
    this.pass.camera = camera;
    this.composer.render();
  }

  // The door open onto the forest: the explorer steps up to it and the camera closes in on
  // the view beyond, then the title and the credits.
  finaleShot(hero, onDone) {
    return new FinaleShot(this, hero, onDone);
  }

  // Everything this world can show during play, shown once for the shader compiler: the
  // ring's membrane open onto the forest, and the disc in hand and glowing.
  prepareForCompile(on) {
    this.frozen.prepareForCompile(on);
    const R = this.ring;
    R.disc.visible = on || R.phase !== "closed";
    R.uniforms.uClear.value = on ? 1 : R.isOpen ? 1.02 : 0;
    if (on) {
      this.disc.attach(this.hand(), this.palm);
      this.disc.charge = 10;
    } else {
      this.disc.charge = 0;
      this.disc.stow();
    }
  }

  reset() {
    this.active = false;
    this.frozen.reset();
    this.arrival.forceOpen();
    this.ring.reset();
    this.ring.ignite(0);
    this.ring.ignite(1);
    this.said.clear();
    this.storyT = 0;
    this.opening = null;
    this.lastZ = undefined;
    if (this.disc) {
      this.disc.charge = 0;
      if (this.disc.state !== "held" && this.disc.state !== "hidden")
        this.disc.stow();
    }
  }

  resize(w, h) {
    this.composer?.setSize(w, h);
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.ring?.resize();
  }
}

class FinaleShot {
  constructor(four, hero, onDone) {
    this.four = four;
    this.hero = hero;
    this.onDone = onDone;
    this.t = 0;
    this.letterbox = true;
    this.ring = four.ring.center.clone();
    this.from = { x: hero.pos.x, z: hero.pos.z };
    // On the dais's first step, a little off the centre line, looking into the ring.
    this.to = { x: this.ring.x + 0.9, z: this.ring.z + 6.2 };
    this.titled = false;
  }

  update(dt, camera) {
    this.t += dt;
    const h = this.hero;
    const walk = smooth(0, 2.4, this.t);
    const x = this.from.x + (this.to.x - this.from.x) * walk,
      z = this.from.z + (this.to.z - this.from.z) * walk;
    const moving = this.t < 2.4;
    h.vel.x = moving ? (x - h.pos.x) / Math.max(dt, 1e-3) : 0;
    h.vel.z = moving ? (z - h.pos.z) / Math.max(dt, 1e-3) : 0;
    h.pos.x = x;
    h.pos.z = z;
    const ground = this.four.frozen.groundAt(x, z);
    h.feet = ground;
    const want = moving
      ? Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z)
      : Math.PI;
    h.yaw +=
      Math.atan2(Math.sin(want - h.yaw), Math.cos(want - h.yaw)) *
      Math.min(1, dt * 5);
    h.state = "ground";
    // Over the shoulder at the ring, then closing in on the forest beyond its membrane until
    // the view through the door fills the frame. Keys are relative to the ring's centre.
    const keys = [
      [0, [4.4, -1.8, 12], [0.4, -0.8, 0]],
      [4, [2, -1.6, 8.4], [0, -0.6, -4]],
      [9, [0.4, -0.9, 3.2], [0, -0.6, -12]],
      [15, [0.1, -0.6, 1.2], [0, -0.4, -20]],
    ];
    let i = 0;
    while (i < keys.length - 2 && this.t > keys[i + 1][0]) i++;
    const [ta, ea, la] = keys[i],
      [tb, eb, lb] = keys[i + 1];
    const q = smooth(ta, tb, this.t);
    const mix = (a, b) =>
      V(
        a[0] + (b[0] - a[0]) * q,
        a[1] + (b[1] - a[1]) * q,
        a[2] + (b[2] - a[2]) * q,
      );
    const eye = mix(ea, eb).add(this.ring);
    const look = mix(la, lb).add(this.ring);
    if (!this.start)
      this.start = {
        pos: camera.position.clone(),
        quat: camera.quaternion.clone(),
      };
    const probe = this.probe || (this.probe = new THREE.PerspectiveCamera());
    probe.position.copy(eye);
    probe.lookAt(look);
    const blend = smooth(0, 1.4, this.t);
    camera.position.lerpVectors(this.start.pos, probe.position, blend);
    camera.quaternion.slerpQuaternions(
      this.start.quat,
      probe.quaternion,
      blend,
    );
    if (!this.titled && this.t > 8.5) {
      this.titled = true;
      const card = document.querySelector("#chapter-card");
      card.querySelector(".kicker").textContent = "The network has more doors";
      card.querySelector("h2").textContent = "Far Door";
      card.querySelector(".sub").textContent = "To be continued.";
      card.classList.add("on");
      setTimeout(() => card.classList.remove("on"), 5600);
    }
    if (this.t > 14.5 && this.onDone) {
      const done = this.onDone;
      this.onDone = null;
      done();
    }
  }
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
