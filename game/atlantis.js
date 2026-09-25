import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// The sixth world, only glimpsed: through the last door, at the castle's gate, a city under the
// sea. Its door opens in open water at the origin, facing +z, thirty metres over a plain of pale
// sand; ahead and below, the city rises in three rings round a domed temple, crystals lit on its
// towers, while shoals turn in the blue, mantas glide over it, kelp sways and light falls in
// shafts from the surface. It is drawn into the door's portal and nowhere else. The buildings,
// the creatures and the plants are recipe assets (the sea wave in receipts/candidates/sea/);
// the sand, the water and the light are drawn here.

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const CITY = V(0, 0, -125);
// The rings of the city about the temple's island: [inner radius, outer radius, height, houses,
// towers]. The gaps between them are the old canals, spanned by four bridges.
const RINGS = [
  [32, 42, 4, 26, 6],
  [56, 68, 4.5, 38, 8],
  [86, 98, 5, 54, 12],
];
const GAPS = [
  [24, 32],
  [42, 56],
  [68, 86],
];
// Shoals: [centre, orbit radius, ellipse, turns a second, count, length, colours]. The first
// turns just beyond the door, so the view has depth from its first frame.
const SHOALS = [
  [V(0, 26, -21), 8, 0.5, 0.34, 90, 0.75, [0xffc857, 0xffe28a, 0xff9f43]],
  [V(0, 40, -125), 22, 1, -0.2, 70, 0.8, [0x9fc8e8, 0xd6e8f5, 0x6fa8dc]],
  [V(0, 15, -95), 55, 0.45, 0.07, 60, 1.3, [0x3a6fd8, 0xff7a5c, 0x5fe0e0]],
];
// Mantas: [centre, orbit radius, ellipse, turns a second, span].
const MANTAS = [
  [V(0, 38, -80), 40, 0.6, 0.075, 6],
  [V(25, 30, -150), 30, 0.8, -0.1, 5],
];
const CORALS = [0xff6f91, 0xff9a3c, 0x9b6bff, 0xffd45c, 0x4fd1c5, 0xe84a5f];
const KELP = 110,
  CORAL = 140,
  SNOW = 260,
  BUBBLES = 32;
// Where bubbles rise: the temple's lantern and four vents in the sand.
const VENTS = [
  V(0, 49, -125),
  V(-30, 0, -40),
  V(34, 0, -48),
  V(-48, 0, -112),
  V(52, 0, -140),
];
// The water's colour at the horizon, in linear light: the fog and the sky meet in it.
const WATER = [0.012, 0.11, 0.17];

export class AtlantisView {
  constructor(assets) {
    this.assets = assets;
    this.scene = new THREE.Scene();
    // The door hangs in open water, thirty metres over the sand.
    this.gateCenter = V(0, 30, 0);
    this.clipPlane = new THREE.Plane(V(0, 0, -1), this.gateCenter.z - 0.05);
    // Where the closing glide ends, and what it looks at: the temple's dome.
    this.glideEnd = V(0, 21, -52);
    this.temple = V(CITY.x, 24, CITY.z);
    this.time = 0;
    this.u = { uTime: { value: 0 } };
    this.crystals = [];
  }

  async build() {
    const s = this.scene;
    const water = new THREE.Color().setRGB(...WATER);
    s.background = water;
    s.fog = new THREE.FogExp2(water, 0.0052);
    this.sky = this.buildSky();
    s.add(this.sky);
    const sun = new THREE.DirectionalLight(0xd9f7ff, 2);
    sun.position.set(20, 80, 30);
    s.add(sun, new THREE.HemisphereLight(0xa6ecff, 0x10303f, 1.3));
    const rand = seeded(29);
    this.buildFloor();
    await this.buildCity(rand);
    await this.buildKelp(rand);
    await this.buildCoral(rand);
    await this.buildShoals(rand);
    this.buildShafts();
    this.buildMotes(rand);
  }

  // Sand in slow dunes, levelled under the city.
  floorAt(x, z) {
    const d = Math.hypot(x - CITY.x, z - CITY.z);
    const dunes =
      Math.sin(x * 0.07 + z * 0.03) * 0.9 + Math.cos(z * 0.09 - x * 0.05) * 0.6;
    return dunes * smooth(100, 135, d) - 0.4;
  }

  buildSky() {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(450, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.u,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            vec3 deep = vec3(0.002, 0.02, 0.04), mid = vec3(${WATER.join(", ")}), high = vec3(0.07, 0.33, 0.42);
            vec3 col = mix(deep, mid, smoothstep(-0.6, 0.0, d.y));
            col = mix(col, high, smoothstep(0.05, 0.95, d.y));
            // The sun through the surface, broken by its ripples.
            vec2 s = d.xz / max(d.y, 0.1);
            float ripple = 0.6 + 0.4 * sin(s.x * 9.0 + uTime * 0.8) * sin(s.y * 7.0 - uTime * 0.6);
            col += vec3(0.7, 0.95, 1.0) * pow(max(0.0, dot(d, normalize(vec3(0.1, 1.0, -0.4)))), 16.0) * ripple;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    dome.renderOrder = -10;
    return dome;
  }

  buildFloor() {
    const geo = new THREE.PlaneGeometry(640, 640, 128, 128)
      .rotateX(-Math.PI / 2)
      .translate(0, 0, -200);
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const sand = new THREE.Color(0xcdb98a),
      dark = new THREE.Color(0x8f8a70),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i);
      p.setY(i, this.floorAt(x, z));
      const patch = 0.5 + 0.5 * Math.sin(x * 0.11) * Math.cos(z * 0.13 + 1.7);
      c.copy(sand)
        .lerp(dark, patch * 0.35)
        .toArray(colors, i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      flatShading: true,
    });
    this.scene.add(new THREE.Mesh(geo, caustic(mat, this.u)));
  }

  // Copies of a recipe asset at many placements, [x, y, z, width, height, depth, yaw] from
  // `origin`, one draw call per material: each merged mesh of the asset becomes an
  // InstancedMesh, and `look` gives its material its part in the sea.
  async instances(name, list, look, origin = CITY) {
    const o = await this.assets?.make(name, { surfaces: false });
    if (!o || !list.length) return [];
    o.updateMatrixWorld(true);
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      up = V(0, 1, 0),
      at = V(0, 0, 0),
      k = V(1, 1, 1);
    const made = [];
    o.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const inst = new THREE.InstancedMesh(
        mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),
        look(mesh.material.clone()),
        list.length,
      );
      list.forEach(([x, y, z, w, h, d, yaw], i) => {
        at.set(origin.x + x, y, origin.z + z);
        inst.setMatrixAt(
          i,
          m.compose(at, q.setFromAxisAngle(up, yaw), k.set(w, h, d)),
        );
      });
      inst.computeBoundingSphere();
      this.scene.add(inst);
      made.push(inst);
    });
    return made;
  }

  // Stone and copper take the caustic light; what glows keeps its glow, and the cyan crystals
  // pulse (see update).
  stone(material) {
    if (material.emissiveIntensity <= 1) return caustic(material, this.u);
    if (material.emissive.b > material.emissive.r) this.crystals.push(material);
    return material;
  }

  // The city: its rings of wall and bridges and its temple, houses round the rings with none
  // on the avenue from the door, towers taller towards the temple and two obelisks at the
  // avenue's mouth.
  async buildCity(rand) {
    const houses = [],
      towers = [];
    RINGS.forEach(([ri, ro, h, count, spires], k) => {
      for (let i = 0; i < count; i++) {
        const a = ((i + rand() * 0.6) / count) * Math.PI * 2;
        if (Math.abs(wrap(a)) < 0.12) continue;
        const r = ri + 2.5 + rand() * (ro - ri - 5);
        houses.push([
          Math.sin(a) * r,
          h,
          Math.cos(a) * r,
          0.75 + rand() * 0.75,
          0.6 + rand() * 0.9,
          0.75 + rand() * 0.55,
          a,
        ]);
      }
      for (let j = 0; j < spires; j++) {
        const a = ((j + 0.5) / spires) * Math.PI * 2;
        if (Math.abs(wrap(a)) < 0.3) continue;
        const r = (ri + ro) / 2,
          R = 1.8 + rand() * 0.8;
        const H = [24, 19, 15][k] + rand() * 5;
        towers.push([Math.sin(a) * r, h, Math.cos(a) * r, R, H / 20, R, 0]);
      }
    });
    for (const side of [-1, 1])
      towers.push([
        Math.sin(side * 0.15) * 92,
        5,
        Math.cos(side * 0.15) * 92,
        1.3,
        0.85,
        1.3,
        0,
      ]);
    const look = (m) => this.stone(m);
    await this.instances("sea_rings", [[0, -1, 0, 1, 1, 1, 0]], look);
    await this.instances("sea_temple", [[0, -0.6, 0, 1, 1, 1, 0]], look);
    await this.instances("sea_house", houses, look);
    await this.instances("sea_tower", towers, look);
  }

  // Kelp in two stands either side of the way down, and round the outer ring.
  async buildKelp(rand) {
    const list = [];
    for (let i = 0; i < KELP; i++) {
      let x, z;
      if (i < 70) {
        x = (i % 2 ? 1 : -1) * (9 + rand() * 34);
        z = -6 - rand() * 60;
      } else {
        const a = rand() * Math.PI * 2,
          r = 104 + rand() * 30;
        x = CITY.x + Math.sin(a) * r;
        z = CITY.z + Math.cos(a) * r;
      }
      const w = 1.6 + rand() * 1.2;
      list.push([
        x,
        this.floorAt(x, z) - 0.3,
        z,
        w,
        10 + rand() * 14,
        w,
        rand() * 6.3,
      ]);
    }
    await this.instances(
      "sea_kelp",
      list,
      (m) => swaying(m, this.u),
      V(0, 0, 0),
    );
  }

  // Heads of coral on the sand below the door and in the old canals, in reef colours.
  async buildCoral(rand) {
    const list = [];
    for (let i = 0; i < CORAL; i++) {
      let x, z;
      if (i < 70) {
        x = (rand() * 2 - 1) * 45;
        z = -4 - rand() * 22;
      } else {
        const [from, to] = GAPS[i % 3];
        const a = rand() * Math.PI * 2,
          r = from + 1.5 + rand() * (to - from - 3);
        x = CITY.x + Math.sin(a) * r;
        z = CITY.z + Math.cos(a) * r;
      }
      const s = 1.4 * (0.6 + rand() * 1.6);
      list.push([
        x,
        this.floorAt(x, z) - 0.1,
        z,
        s * (0.8 + rand() * 0.5),
        s * (0.6 + rand() * 0.8),
        s * (0.8 + rand() * 0.5),
        rand() * 6.3,
      ]);
    }
    const [mesh] = await this.instances(
      "sea_coral",
      list,
      (m) => caustic(m, this.u),
      V(0, 0, 0),
    );
    const c = new THREE.Color();
    list.forEach((_, i) =>
      mesh?.setColorAt(i, c.set(CORALS[Math.floor(rand() * CORALS.length)])),
    );
  }

  // Shoals of reef fish and a pair of mantas, each on its own orbit.
  async buildShoals(rand) {
    const fish = [];
    for (const [c, radius, ellipse, speed, count, size, colors] of SHOALS)
      for (let i = 0; i < count; i++)
        fish.push({
          orbit: [
            c.x + (rand() - 0.5) * 3,
            c.y + (rand() - 0.5) * 4,
            c.z + (rand() - 0.5) * 3,
            radius + (rand() - 0.5) * 4,
          ],
          swim: [
            speed * (0.92 + rand() * 0.16),
            rand() * 0.9,
            ellipse,
            size * (0.8 + rand() * 0.4),
          ],
          motion: [1, 0],
          color: colors[Math.floor(rand() * colors.length)],
        });
    await this.swimmers("reef_fish", fish);
    await this.swimmers(
      "manta_ray",
      MANTAS.map(([c, radius, ellipse, speed, span]) => ({
        orbit: [c.x, c.y, c.z, radius],
        swim: [speed, rand() * 6.3, ellipse, span],
        motion: [0, 1],
      })),
    );
  }

  // Swimmers from a recipe asset: every mesh of it becomes an InstancedMesh centred on the
  // swimmer's middle, placed, turned and set swimming by the vertex shader alone. Its palest
  // material takes each swimmer's colour, when the swimmers have one.
  async swimmers(name, list) {
    const o = await this.assets?.make(name, { surfaces: false });
    if (!o) return;
    o.updateMatrixWorld(true);
    const middle = new THREE.Box3().setFromObject(o).getCenter(V(0, 0, 0));
    const n = list.length;
    const orbit = new Float32Array(n * 4),
      swim = new Float32Array(n * 4),
      motion = new Float32Array(n * 2);
    list.forEach((f, i) => {
      orbit.set(f.orbit, i * 4);
      swim.set(f.swim, i * 4);
      motion.set(f.motion, i * 2);
    });
    const c = new THREE.Color(),
      hsl = {};
    o.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry
        .clone()
        .applyMatrix4(mesh.matrixWorld)
        .translate(-middle.x, -middle.y, -middle.z);
      geometry.setAttribute(
        "aOrbit",
        new THREE.InstancedBufferAttribute(orbit, 4),
      );
      geometry.setAttribute(
        "aSwim",
        new THREE.InstancedBufferAttribute(swim, 4),
      );
      geometry.setAttribute(
        "aMotion",
        new THREE.InstancedBufferAttribute(motion, 2),
      );
      const material = swimming(mesh.material.clone(), this.u);
      const inst = new THREE.InstancedMesh(geometry, material, n);
      if (list[0].color !== undefined && material.color.getHSL(hsl).l > 0.5) {
        material.color.set(0xffffff);
        list.forEach((f, i) => inst.setColorAt(i, c.set(f.color)));
      }
      // Every one is placed by the shader, far from where its matrix says.
      inst.frustumCulled = false;
      this.scene.add(inst);
    });
  }

  // Shafts of light from the surface, widening as they fall and fading towards the sand.
  buildShafts() {
    const parts = [
      [-16, -42, 0.2],
      [18, -60, -0.15],
      [-34, -96, 0.1],
      [26, -118, -0.2],
      [0, -150, 0.12],
      [-54, -168, -0.1],
      [48, -84, 0.18],
    ].map(([x, z, lean], i) => {
      const g = new THREE.CylinderGeometry(1.5, 9, 130, 16, 1, true)
        .rotateZ(lean)
        .rotateX(lean * 0.5)
        .translate(x, 60, z);
      g.setAttribute(
        "seed",
        new THREE.Float32BufferAttribute(
          new Array(g.attributes.position.count).fill(i),
          1,
        ),
      );
      return g;
    });
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        attribute float seed;
        varying float vFade;
        varying float vSeed;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        void main() {
          vFade = uv.y;
          vSeed = seed;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying float vFade;
        varying float vSeed;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        void main() {
          vec3 toEye = cameraPosition - vWorld;
          float edge = pow(abs(dot(normalize(vNormalW), normalize(toEye))), 2.0);
          float flicker = 0.65 + 0.35 * sin(uTime * 0.5 + vSeed * 1.7) * sin(uTime * 0.23 + vSeed);
          float far = exp(-length(toEye) * 0.005);
          gl_FragColor = vec4(0.55, 0.9, 1.0, edge * smoothstep(0.0, 0.7, vFade) * flicker * far * 0.14);
        }`,
    });
    this.scene.add(new THREE.Mesh(mergeGeometries(parts), mat));
  }

  // Snow of the sea drifting before the door, and bubbles rising from the vents.
  buildMotes(rand) {
    const n = SNOW + VENTS.length * BUBBLES;
    const pos = new Float32Array(n * 3),
      info = new Float32Array(n * 2);
    let i = 0;
    for (; i < SNOW; i++) {
      pos.set([(rand() - 0.5) * 70, 6 + rand() * 36, -3 - rand() * 80], i * 3);
      info.set([0, rand()], i * 2);
    }
    for (const v of VENTS)
      for (let j = 0; j < BUBBLES; j++, i++) {
        pos.set(
          [v.x + (rand() - 0.5) * 1.2, v.y, v.z + (rand() - 0.5) * 1.2],
          i * 3,
        );
        info.set([1, rand()], i * 2);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("info", new THREE.BufferAttribute(info, 2));
    const motes = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.u,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uTime;
          attribute vec2 info;
          varying float vKind;
          void main() {
            vec3 p = position;
            float s = info.y;
            vKind = info.x;
            if (info.x > 0.5) {
              // A bubble rises forty metres from its vent, wobbling, then starts again.
              p.y += mod(uTime * (2.0 + s * 1.5) + s * 40.0, 40.0);
              p.x += sin(uTime * 3.0 + s * 20.0) * 0.25;
            } else {
              p.y -= mod(uTime * 0.3 + s * 30.0, 30.0) - 15.0;
              p.x += sin(uTime * 0.25 + s * 17.0) * 1.5;
              p.z += cos(uTime * 0.2 + s * 11.0);
            }
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (info.x > 0.5 ? 60.0 + s * 40.0 : 26.0) / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vKind;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = vKind > 0.5
              ? smoothstep(0.5, 0.4, d) * (0.25 + 0.75 * smoothstep(0.2, 0.42, d))
              : smoothstep(0.5, 0.0, d) * 0.45;
            gl_FragColor = vec4(0.8, 0.96, 1.0, a);
          }`,
      }),
    );
    motes.frustumCulled = false;
    this.scene.add(motes);
  }

  update(dt) {
    this.time += dt;
    this.u.uTime.value = this.time;
    for (const m of this.crystals)
      m.emissiveIntensity = 2.4 + Math.sin(this.time * 1.3) * 0.5;
  }

  // Drawn by the last door's portal, from the point matching the viewer's.
  renderInto(renderer, camera) {
    this.sky.position.copy(camera.position);
    renderer.render(this.scene, camera);
  }
}

// Light from the rippling surface, thrown on everything that faces up: bright threads that
// drift over the sand and the stone.
function caustic(material, u) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSeaPos;")
      .replace(
        "#include <fog_vertex>",
        `#include <fog_vertex>
#ifdef USE_INSTANCING
  vSeaPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vSeaPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
varying vec3 vSeaPos;
float seaCaustic(vec2 p) {
  p *= 0.2;
  float a = sin(p.x * 3.1 + sin(p.y * 2.3 + uTime * 0.9)) + sin(p.y * 2.7 + sin(p.x * 1.9 - uTime * 0.7));
  float b = sin(p.x * 1.7 - p.y * 2.9 + uTime * 0.5 + sin(p.y * 1.1));
  return pow(1.0 - abs(a) * 0.5, 7.0) * (0.75 + 0.25 * b);
}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  float seaUp = dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
  totalEmissiveRadiance += diffuseColor.rgb * vec3(0.5, 0.85, 1.0) * seaCaustic(vSeaPos.xz) * smoothstep(0.1, 0.8, seaUp) * 1.1;`,
      );
  };
  material.customProgramCacheKey = () => "fd-caustic";
  return material;
}

const KELP_SWAY = /* glsl */ `#include <begin_vertex>
  float kelpH = transformed.y;
#ifdef USE_INSTANCING
  vec2 kelpRoot = instanceMatrix[3].xz;
#else
  vec2 kelpRoot = vec2(0.0);
#endif
  float kelpW = uTime * 0.7 - dot(kelpRoot, vec2(0.05, 0.03)) + kelpH * 2.4;
  transformed.x += sin(kelpW) * kelpH * kelpH * 0.8;
  transformed.z += cos(kelpW * 0.8 + 1.1) * kelpH * kelpH * 0.55;`;

const SWIM_PARS = /* glsl */ `#include <common>
uniform float uTime;
attribute vec4 aOrbit;
attribute vec4 aSwim;
attribute vec2 aMotion;
mat3 swimFrame;
vec3 swimAt;`;

// Where a swimmer is on its orbit (aOrbit: centre and radius; aSwim: turns a second, phase,
// ellipse, length), and the frame it faces along, which turns its normals too.
const SWIM_FRAME = /* glsl */ `
  float swimA = uTime * aSwim.x + aSwim.y;
  float swimSeed = aSwim.y * 7.13 + aOrbit.w;
  swimAt = aOrbit.xyz + vec3(cos(swimA) * aOrbit.w, sin(swimA * 2.0 + swimSeed) * 1.2, sin(swimA) * aOrbit.w * aSwim.z);
  swimAt += vec3(sin(uTime * 0.9 + swimSeed), sin(uTime * 1.3 + swimSeed * 1.7) * 0.5, cos(uTime * 0.7 + swimSeed * 2.3)) * 0.6;
  vec3 swimDir = normalize(vec3(-sin(swimA) * aOrbit.w, 0.0, cos(swimA) * aOrbit.w * aSwim.z) * sign(aSwim.x));
  vec3 swimSide = normalize(cross(vec3(0.0, 1.0, 0.0), swimDir));
  swimFrame = mat3(swimSide, cross(swimDir, swimSide), swimDir);
  vec3 objectNormal = swimFrame * normal;
#ifdef USE_TANGENT
  vec3 objectTangent = vec3(tangent.xyz);
#endif`;

// A fish's tail beats and a manta's wings flap (aMotion), then the body is set on its way.
const SWIM_MOVE = /* glsl */ `
  vec3 transformed = vec3(position);
  transformed.x += sin(uTime * 10.0 + swimSeed * 3.0 - position.z * 5.0) * 0.12 * smoothstep(0.2, -0.55, position.z) * aMotion.x;
  transformed.y += sin(uTime * 1.5 + swimSeed) * 0.35 * pow(abs(position.x), 1.5) * aMotion.y;
  transformed = swimFrame * (transformed * aSwim.w) + swimAt;`;

function swaying(material, u) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", KELP_SWAY);
  };
  material.customProgramCacheKey = () => "fd-kelp";
  return material;
}

function swimming(material, u) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", SWIM_PARS)
      .replace("#include <beginnormal_vertex>", SWIM_FRAME)
      .replace("#include <begin_vertex>", SWIM_MOVE);
  };
  material.customProgramCacheKey = () => "fd-swim";
  return material;
}

function wrap(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
