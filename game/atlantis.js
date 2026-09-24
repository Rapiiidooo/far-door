import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// The sixth world, only glimpsed: through the last door, at the castle's gate, a city under the
// sea. Its door opens in open water at the origin, facing +z, thirty metres over a plain of pale
// sand; ahead and below, the city rises in three rings round a domed temple, crystals lit on its
// towers, while shoals turn in the blue, mantas glide over it, kelp sways and light falls in
// shafts from the surface. It is drawn into the door's portal and nowhere else, and built here
// in code, with no asset.

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
  constructor() {
    this.scene = new THREE.Scene();
    // The door hangs in open water, thirty metres over the sand.
    this.gateCenter = V(0, 30, 0);
    this.clipPlane = new THREE.Plane(V(0, 0, -1), this.gateCenter.z - 0.05);
    // Where the closing glide ends, and what it looks at: the temple's dome.
    this.glideEnd = V(0, 21, -52);
    this.temple = V(CITY.x, 24, CITY.z);
    this.time = 0;
    this.u = { uTime: { value: 0 } };
  }

  build() {
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
    this.buildCity(rand);
    this.buildKelp(rand);
    this.buildCoral(rand);
    this.buildShoals(rand);
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

  // Placements for instanced parts are [x, y, z, width, height, depth, yaw], from the city's
  // centre unless an origin is given; each part's geometry stands on y = 0 or is centred.
  instances(geometry, material, list, origin = CITY) {
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      up = V(0, 1, 0),
      at = V(0, 0, 0),
      k = V(1, 1, 1);
    list.forEach(([x, y, z, w, h, d, yaw], i) => {
      at.set(origin.x + x, y, origin.z + z);
      mesh.setMatrixAt(
        i,
        m.compose(at, q.setFromAxisAngle(up, yaw), k.set(w, h, d)),
      );
    });
    mesh.computeBoundingSphere();
    this.scene.add(mesh);
    return mesh;
  }

  buildCity(rand) {
    const u = this.u;
    const marble = caustic(
      new THREE.MeshStandardMaterial({
        color: 0xe4dccd,
        roughness: 0.7,
        flatShading: true,
      }),
      u,
    );
    const copper = caustic(
      new THREE.MeshStandardMaterial({
        color: 0x6fb8a6,
        roughness: 0.55,
        flatShading: true,
      }),
      u,
    );
    const gold = new THREE.MeshStandardMaterial({
      color: 0xd8a443,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0x4a3006,
      emissiveIntensity: 0.7,
    });
    this.crystal = new THREE.MeshStandardMaterial({
      color: 0xa8f8ff,
      emissive: 0x52eeff,
      emissiveIntensity: 2.6,
      roughness: 0.25,
    });
    const lit = (hex, k) =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(hex).multiplyScalar(k),
      });
    const add = (geometry, material, y) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(CITY.x, y, CITY.z);
      this.scene.add(m);
    };
    const blocks = [],
      roofs = [],
      columns = [],
      towers = [],
      spires = [],
      crystals = [],
      windows = [],
      rails = [];
    // The temple's island in three steps, a ring of columns about a lit sanctum, a copper dome
    // and a lantern crowned with a crystal.
    for (const [r, h] of [
      [24, 3],
      [20, 6],
      [16, 9],
    ])
      add(
        new THREE.CylinderGeometry(r, r + 0.8, h + 1, 64),
        marble,
        (h - 1) / 2,
      );
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      columns.push([Math.sin(a) * 13, 9, Math.cos(a) * 13, 1, 11, 1, 0]);
    }
    add(new THREE.CylinderGeometry(8.5, 8.5, 11, 40), marble, 14.5);
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * Math.PI * 2;
      windows.push([
        Math.sin(a) * 8.55,
        13,
        Math.cos(a) * 8.55,
        0.9,
        6,
        0.3,
        a,
      ]);
    }
    add(new THREE.CylinderGeometry(14.2, 14.2, 1.8, 64), marble, 20.9);
    add(
      new THREE.TorusGeometry(14.25, 0.35, 6, 96).rotateX(Math.PI / 2),
      gold,
      21.8,
    );
    add(
      new THREE.SphereGeometry(13.4, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      copper,
      21.8,
    );
    add(new THREE.CylinderGeometry(2.2, 2.6, 4, 20), marble, 37.2);
    add(new THREE.ConeGeometry(2.6, 6, 20), gold, 42.2);
    crystals.push([0, 47.8, 0, 1.5, 3.2, 1.5, 0]);

    RINGS.forEach(([ri, ro, h, houses, count], k) => {
      const V2 = (x, y) => new THREE.Vector2(x, y);
      add(
        new THREE.LatheGeometry(
          [V2(ri, -1), V2(ro, -1), V2(ro, h), V2(ri, h), V2(ri, -1)],
          128,
        ),
        marble,
        0,
      );
      for (const r of [ri - 0.05, ro + 0.05])
        rails.push(
          new THREE.TorusGeometry(r, 0.2, 6, 160)
            .rotateX(Math.PI / 2)
            .translate(CITY.x, h + 0.1, CITY.z),
        );
      // Houses of pale stone under copper roofs, lit windows on their faces; none on the
      // avenue that runs from the door to the temple.
      for (let i = 0; i < houses; i++) {
        const a = ((i + rand() * 0.6) / houses) * Math.PI * 2;
        if (Math.abs(wrap(a)) < 0.12) continue;
        const r = ri + 2.5 + rand() * (ro - ri - 5);
        const w = 3 + rand() * 3,
          d = 3 + rand() * 2.2,
          hh = 3 + rand() * 4.5;
        const x = Math.sin(a) * r,
          z = Math.cos(a) * r;
        blocks.push([x, h, z, w, hh, d, a]);
        roofs.push([x, h + hh, z, w * 1.02, 1.4 + rand() * 1.6, d * 1.02, a]);
        for (const side of [-1, 1])
          for (const lx of [-w * 0.22, w * 0.22]) {
            const lz = side * (d / 2 + 0.03);
            windows.push([
              x + Math.cos(a) * lx + Math.sin(a) * lz,
              h + hh * 0.5,
              z - Math.sin(a) * lx + Math.cos(a) * lz,
              0.7,
              1.1,
              0.1,
              a,
            ]);
          }
      }
      // Towers round each ring, taller towards the temple, none across the avenue.
      for (let j = 0; j < count; j++) {
        const a = ((j + 0.5) / count) * Math.PI * 2;
        if (Math.abs(wrap(a)) < 0.3) continue;
        const r = (ri + ro) / 2,
          R = 1.8 + rand() * 0.8,
          H = [24, 19, 15][k] + rand() * 5;
        const x = Math.sin(a) * r,
          z = Math.cos(a) * r;
        towers.push([x, h, z, R, H, R, 0]);
        spires.push([x, h + H, z, R * 1.25, R * 2.4, R * 1.25, 0]);
        crystals.push([
          x,
          h + H + R * 2.4 + 0.9,
          z,
          R * 0.45,
          R * 1.1,
          R * 0.45,
          0,
        ]);
      }
    });
    // Two obelisks at the avenue's mouth on the outer ring.
    for (const side of [-1, 1]) {
      const x = Math.sin(side * 0.15) * 92,
        z = Math.cos(side * 0.15) * 92;
      towers.push([x, 5, z, 1.3, 17, 1.3, 0]);
      spires.push([x, 22, z, 1.6, 3, 1.6, 0]);
      crystals.push([x, 26, z, 0.8, 1.8, 0.8, 0]);
    }
    // Four bridges over the canals, the first down the avenue, each on a pair of piers.
    for (let b = 0; b < 4; b++) {
      const a = (b * Math.PI) / 2;
      for (const [from, to] of GAPS) {
        const mid = (from + to) / 2;
        blocks.push([
          Math.sin(a) * mid,
          3.4,
          Math.cos(a) * mid,
          6,
          1.1,
          to - from + 1,
          a,
        ]);
        for (const s of [-2.2, 2.2])
          columns.push([
            Math.sin(a) * mid + Math.cos(a) * s,
            -1,
            Math.cos(a) * mid - Math.sin(a) * s,
            1,
            4.4,
            1,
            0,
          ]);
      }
    }
    const onGround = (g) => g.translate(0, 0.5, 0);
    this.instances(onGround(new THREE.BoxGeometry(1, 1, 1)), marble, blocks);
    this.instances(
      onGround(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4)),
      copper,
      roofs,
    );
    this.instances(
      onGround(new THREE.CylinderGeometry(0.8, 0.95, 1, 12)),
      marble,
      columns,
    );
    this.instances(
      onGround(new THREE.CylinderGeometry(1, 1.2, 1, 14)),
      marble,
      towers,
    );
    this.instances(onGround(new THREE.ConeGeometry(1, 1, 14)), copper, spires);
    this.instances(new THREE.OctahedronGeometry(1), this.crystal, crystals);
    this.instances(new THREE.BoxGeometry(1, 1, 1), lit(0xffc46e, 2.4), windows);
    this.scene.add(new THREE.Mesh(mergeGeometries(rails), lit(0x62eaff, 2.2)));
  }

  // Kelp in two stands either side of the way down, and round the outer ring. Each is two
  // crossed ribbons narrowing to the tip, swaying in the current.
  buildKelp(rand) {
    const ribbon = () => {
      const g = new THREE.PlaneGeometry(1, 1, 1, 10).translate(0, 0.5, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++)
        p.setX(i, p.getX(i) * (1 - 0.65 * p.getY(i)));
      return g;
    };
    const geo = mergeGeometries([ribbon(), ribbon().rotateY(Math.PI / 2)]);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5b8a3c,
      roughness: 0.8,
      side: THREE.DoubleSide,
      emissive: 0x0e2a10,
      emissiveIntensity: 0.6,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.u.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace("#include <begin_vertex>", KELP_SWAY);
    };
    mat.customProgramCacheKey = () => "fd-kelp";
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
    this.instances(geo, mat, list, V(0, 0, 0));
  }

  // Heads of coral on the sand below the door and in the old canals, in reef colours.
  buildCoral(rand) {
    const mat = caustic(
      new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true }),
      this.u,
    );
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
      const s = 0.6 + rand() * 1.6;
      list.push([
        x,
        this.floorAt(x, z),
        z,
        s * (0.8 + rand() * 0.5),
        s * (0.5 + rand() * 1.4),
        s * (0.8 + rand() * 0.5),
        rand() * 6.3,
      ]);
    }
    const mesh = this.instances(
      new THREE.IcosahedronGeometry(1, 0),
      mat,
      list,
      V(0, 0, 0),
    );
    const c = new THREE.Color();
    list.forEach((_, i) =>
      mesh.setColorAt(i, c.set(CORALS[Math.floor(rand() * CORALS.length)])),
    );
  }

  // Shoals and mantas, each on its own orbit, placed and turned by the vertex shader alone.
  buildShoals(rand) {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.25,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.u.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", SWIM_PARS)
        .replace("#include <beginnormal_vertex>", SWIM_FRAME)
        .replace("#include <begin_vertex>", SWIM_MOVE);
    };
    mat.customProgramCacheKey = () => "fd-swim";
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
    this.swimmers(fishGeometry(), mat, fish);
    this.swimmers(
      mantaGeometry(),
      mat,
      MANTAS.map(([c, radius, ellipse, speed, span]) => ({
        orbit: [c.x, c.y, c.z, radius],
        swim: [speed, rand() * 6.3, ellipse, span],
        motion: [0, 1],
        color: 0x2e4150,
      })),
    );
  }

  swimmers(geometry, material, list) {
    const n = list.length;
    const orbit = new Float32Array(n * 4),
      swim = new Float32Array(n * 4),
      motion = new Float32Array(n * 2);
    list.forEach((f, i) => {
      orbit.set(f.orbit, i * 4);
      swim.set(f.swim, i * 4);
      motion.set(f.motion, i * 2);
    });
    geometry.setAttribute(
      "aOrbit",
      new THREE.InstancedBufferAttribute(orbit, 4),
    );
    geometry.setAttribute("aSwim", new THREE.InstancedBufferAttribute(swim, 4));
    geometry.setAttribute(
      "aMotion",
      new THREE.InstancedBufferAttribute(motion, 2),
    );
    const mesh = new THREE.InstancedMesh(geometry, material, n);
    const c = new THREE.Color();
    list.forEach((f, i) => mesh.setColorAt(i, c.set(f.color)));
    // Every one is placed by the shader, far from where its matrix says.
    mesh.frustumCulled = false;
    this.scene.add(mesh);
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
    if (this.crystal)
      this.crystal.emissiveIntensity = 2.4 + Math.sin(this.time * 1.3) * 0.5;
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

// A fish a metre long, nose to +z, from three.js primitives: a deep, narrow body, a flat tail
// fin and a fin on its back.
function fishGeometry() {
  const body = new THREE.SphereGeometry(1, 8, 6)
    .scale(0.075, 0.17, 0.4)
    .translate(0, 0, 0.1);
  const tail = new THREE.ConeGeometry(0.2, 0.3, 4)
    .rotateX(Math.PI / 2)
    .scale(0.12, 1, 1)
    .translate(0, 0, -0.42);
  const fin = new THREE.ConeGeometry(0.06, 0.14, 4)
    .scale(0.15, 1, 1.8)
    .translate(0, 0.2, 0.04);
  return mergeGeometries([body, tail, fin]);
}

// A manta a metre across, nose to +z: a flat diamond of a body, its wings out along x, and a
// whip of a tail.
function mantaGeometry() {
  const body = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 4).scale(1, 1, 0.6);
  const tail = new THREE.CylinderGeometry(0.003, 0.012, 0.7, 3)
    .rotateX(Math.PI / 2)
    .translate(0, 0, -0.62);
  return mergeGeometries([body, tail]);
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
