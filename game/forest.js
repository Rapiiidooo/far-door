import * as THREE from "three";

// The fifth world, only glimpsed: through the great ring at the end of the frozen reach, a wild
// forest of huge old trees, ferns and mushrooms whose gills glow in the shade, under warm
// shafts of light. It is drawn into the ring's portal and nowhere else, as the promise of what
// comes next. Its own door stands at the origin, facing +z; the forest opens towards -z.

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// A clearing ringed with trees: [x, z, yaw, scale].
const TREES = [
  [-9, -14, 0.4, 0.95],
  [9.5, -12, 2.1, 1.05],
  [-4, -29, 1.3, 1.15],
  [12, -27, 0.2, 0.9],
  [-16, -33, 2.7, 1.1],
  [3, -44, 1.8, 1.2],
  [-9, -52, 0.9, 1],
  [16, -46, 2.4, 1.1],
  [-22, -18, 1.1, 0.9],
  [22, -20, 0.6, 1],
];
const FERNS = 34,
  MUSHROOMS = 12,
  SPORES = 240;

export class ForestView {
  constructor(assets) {
    this.assets = assets;
    this.scene = new THREE.Scene();
    // The ring's centre stands 4.5 m over the ground, as the great ring's does over the island.
    this.gateCenter = V(0, 4.5, 0);
    this.clipPlane = new THREE.Plane(V(0, 0, -1), this.gateCenter.z - 0.05);
    this.time = 0;
  }

  async build() {
    const s = this.scene;
    s.background = new THREE.Color(0x5f7c45);
    s.fog = new THREE.FogExp2(0x56713f, 0.019);
    this.sky = this.buildSky();
    s.add(this.sky);
    const sun = new THREE.DirectionalLight(0xffe2a0, 2.4);
    sun.position.set(-18, 40, -30);
    s.add(sun, sun.target);
    s.add(new THREE.HemisphereLight(0xd8eab0, 0x2f3d1c, 1.15));
    this.buildGround();
    const rand = seeded(11);
    for (const [x, z, yaw, k] of TREES)
      await this.put("wild_tree", x, z, yaw, k);
    for (let i = 0; i < FERNS; i++) {
      const a = rand() * Math.PI * 2,
        r = 3 + rand() * 26;
      const x = Math.cos(a) * r * 1.2,
        z = -6 - Math.abs(Math.sin(a) * r) * 1.4;
      await this.put("fern_cluster", x, z, rand() * 6.3, 0.8 + rand() * 0.7);
    }
    this.glow = [];
    for (let i = 0; i < MUSHROOMS; i++) {
      const t = TREES[i % TREES.length];
      const a = rand() * Math.PI * 2;
      const o = await this.put(
        "glow_mushroom",
        t[0] + Math.cos(a) * 2.6,
        t[1] + Math.sin(a) * 2.6,
        rand() * 6.3,
        0.8 + rand() * 0.5,
        { keepHierarchy: true },
      );
      o?.userData.parts?.glow?.traverse((m) => {
        if (!m.isMesh) return;
        m.material = m.material.clone();
        m.material.emissive = new THREE.Color(0xc3f25a);
        m.material.emissiveIntensity = 1.8;
        this.glow.push(m.material);
      });
    }
    for (const [x, z, yaw, k] of [
      [-5, -19, 0.8, 1.1],
      [6.5, -23, 2.3, 0.9],
      [-1.5, -38, 1.6, 1.3],
    ]) {
      const o = await this.put("boulder_cluster", x, z, yaw, k);
      // Mossed over: the forest's stone is green on top.
      o?.traverse((m) => {
        if (!m.isMesh) return;
        m.material = m.material.clone();
        m.material.color.lerp(new THREE.Color(0x4f7a3a), 0.55);
      });
    }
    this.buildShafts();
    this.buildSpores(rand);
  }

  async put(name, x, z, yaw, k, opts = {}) {
    const o = await this.assets.make(name, opts);
    if (!o) return null;
    o.position.set(x, this.heightAt(x, z), z);
    o.rotation.y = yaw;
    o.scale.multiplyScalar(k);
    this.scene.add(o);
    return o;
  }

  // Gentle rolls in the forest floor.
  heightAt(x, z) {
    return (
      Math.sin(x * 0.21) * 0.35 +
      Math.cos(z * 0.17 + x * 0.05) * 0.3 +
      Math.max(0, -z - 30) * 0.06
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
            vec3 low = vec3(0.34, 0.47, 0.26), high = vec3(0.72, 0.8, 0.52);
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
    const geo = new THREE.PlaneGeometry(160, 160, 64, 64).rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    // The plane is moved 50 m out along -z below: sample the floor where it will lie.
    for (let i = 0; i < p.count; i++)
      p.setY(i, this.heightAt(p.getX(i), p.getZ(i) - 50));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0x4a6b33,
        roughness: 0.95,
        flatShading: true,
      }),
    );
    ground.position.z = -50;
    this.scene.add(ground);
    // A worn path of paler moss runs from the door into the trees.
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 44, 1, 22).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x7d8c55, roughness: 1 }),
    );
    const pp = path.geometry.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const z = pp.getZ(i) - 24;
      pp.setX(i, pp.getX(i) + Math.sin(z * 0.12) * 2.2);
      pp.setY(i, this.heightAt(pp.getX(i), z) + 0.03);
      pp.setZ(i, z);
    }
    path.geometry.computeVertexNormals();
    this.scene.add(path);
  }

  // Warm shafts of light slanting down through gaps in the canopy.
  buildShafts() {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.0, 0.86, 0.5),
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    // Deep in the trees and slender, so they light the forest without veiling the view in.
    for (const [x, z, w] of [
      [-6, -30, 1.4],
      [7, -36, 1.8],
      [-12, -44, 1.6],
      [2, -52, 2],
    ]) {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.45, w, 26, 12, 1, true),
        mat,
      );
      shaft.position.set(x - 3, 12, z);
      shaft.rotation.set(0.22, 0, -0.18);
      this.scene.add(shaft);
    }
  }

  // Motes of spore drifting in the light.
  buildSpores(rand) {
    const pos = new Float32Array(SPORES * 3);
    for (let i = 0; i < SPORES; i++) {
      pos[i * 3] = (rand() - 0.5) * 36;
      pos[i * 3 + 1] = 0.4 + rand() * 8;
      pos[i * 3 + 2] = -4 - rand() * 40;
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

  update(dt) {
    this.time += dt;
    if (this.sporeU) this.sporeU.uTime.value = this.time;
    for (const m of this.glow || [])
      m.emissiveIntensity = 1.6 + Math.sin(this.time * 1.4) * 0.3;
  }

  // Drawn by the great ring's portal, from the point matching the viewer's.
  renderInto(renderer, camera) {
    this.sky.position.copy(camera.position);
    renderer.render(this.scene, camera);
  }
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
