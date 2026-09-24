// crystal_emitter, arm C: a second reading, extruded outlines.
// The ribs are read as the builders' crescent motif: three flat bronze
// crescents, extruded from their outline, rising from a bronze collar and
// leaning in until their points meet a small ring over the crystal. The square
// pedestal is chamfered outlines extruded upward; one deep channel climbs each
// face, cuts through the stepped capital and runs across its top into the
// collar, lit all the way, so the light visibly flows up into the crystal. The
// crystal is hand-built and irregular, a natural double-terminated point.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...o });
    if (name) m.name = name;
    return m;
  };
  const BASALT = mat(0x3a3531, 'stone', { roughness: 0.84 });
  const NIGHT = mat(0x2a2830, 'stone', { roughness: 0.92 });
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });
  // Lit parts keep the dormant-crystal body and carry the ancient light as
  // emission, so the game can dim or raise them. Unnamed and just under opaque,
  // so the loader's procedural surfaces leave them alone.
  const lit = (intensity, o = {}) => mat(0x1d5f63, null, {
    emissive: 0x39e3d0, emissiveIntensity: intensity, roughness: 0.3, metalness: 0.05,
    transparent: true, opacity: 0.94, ...o,
  });
  const CRYSTAL = lit(2.0, { roughness: 0.15, flatShading: true });
  const GLOW = lit(1.0);

  // ---- helpers --------------------------------------------------------------------
  const buckets = new Map();
  const add = (geo, m) => {
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(geo);
    return geo;
  };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  // Extrude an outline by `depth` along z; the bevel is pulled back onto the
  // drawn outline and out of the depth, so it chamfers without growing anything.
  const extrude = (pts, depth, bev = 0) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: depth - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev,
      bevelOffset: -bev, bevelSegments: 1, curveSegments: 1,
    });
    return geo.translate(0, 0, bev);
  };
  // an outline in the ground plane (x, z), extruded up from y0 to y1
  const rise = (pts, y0, y1, bev, m) => add(extrude(pts.map(([x, z]) => [x, -z]), y1 - y0, bev).rotateX(-Math.PI / 2).translate(0, y0, 0), m);
  // a square of half-width h with chamfered corners and, when n > 0, a slot of
  // half-width sw cut n deep into the middle of every face
  const square = (h, ch, sw = 0, n = 0) => {
    const pts = [];
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
      const P = (u, w) => [u * c - w * s, u * s + w * c];   // u along the face, w outward
      pts.push(P(-h + ch, -h));
      if (n > 0) pts.push(P(-sw, -h), P(-sw, -h + n), P(sw, -h + n), P(sw, -h));
      pts.push(P(h - ch, -h));
    }
    return pts;
  };

  // ---- pedestal ---------------------------------------------------------------------
  const SW = 0.07, FLOOR = 0.25, TOPY = 1.12;         // channel half-width, its floor, the capital's channel floor
  rise(square(0.5, 0.08), 0, 0.16, 0.02, NIGHT);
  rise(square(0.42, 0.07), 0.16, 0.32, 0.02, BASALT);
  rise(square(0.3, 0.045, SW, 0.3 - FLOOR), 0.32, 0.98, 0.015, BASALT);
  rise(square(0.36, 0.05), 0.98, 1.05, 0.015, BASALT);
  rise(square(0.41, 0.06), 1.05, TOPY, 0.015, BASALT);
  // the top tier is four corner blocks, leaving a cross-shaped channel over the capital
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const q = [[SW, SW], [0.41, SW], [0.41, 0.41 - 0.06], [0.41 - 0.06, 0.41], [SW, 0.41]].map(([x, z]) => [x * sx, z * sz]);
    if (sx * sz < 0) q.reverse();
    rise(q, TOPY, 1.2, 0.012, BASALT);
  }
  // the light: up each face in its channel, and across the capital into the collar
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, ox = Math.sin(a), oz = Math.cos(a);
    const up = new THREE.BoxGeometry(0.075, 0.93 - 0.37, 0.012).rotateY(a);
    add(up.translate(ox * (FLOOR + 0.006), (0.37 + 0.93) / 2, oz * (FLOOR + 0.006)), GLOW);
    const over = new THREE.BoxGeometry(0.075, 0.012, 0.4 - 0.19).rotateY(a);
    add(over.translate(ox * (0.4 + 0.19) / 2, TOPY + 0.006, oz * (0.4 + 0.19) / 2), GLOW);
  }

  // ---- collar in the crossing, lit dish ---------------------------------------------
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  add(lathe([[0.14, 1.11], [0.2, 1.11], [0.205, 1.22], [0.195, 1.245], [0.17, 1.255], [0.15, 1.245], [0.14, 1.23], [0.14, 1.11]], 32), BRONZE);
  add(lathe([[0.142, 1.232], [0.07, 1.222], [0.001, 1.218]], 32), GLOW);

  // ---- three crescent blades --------------------------------------------------------
  const circle = ([x1, y1], [x2, y2], [x3, y3]) => {
    const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    const s1 = x1 * x1 + y1 * y1, s2 = x2 * x2 + y2 * y2, s3 = x3 * x3 + y3 * y3;
    const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / d;
    const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / d;
    return [cx, cy, Math.hypot(x1 - cx, y1 - cy)];
  };
  // the blade's centre line is an arc from inside the collar to the ring on top;
  // its width swells to a belly and runs out to a point
  const BASE = [0.17, 1.16], BELLY = [0.4, 1.58], TIP = [0.075, 2.06];
  const [cx, cy, R] = circle(BASE, BELLY, TIP);
  const t0 = Math.atan2(BASE[1] - cy, BASE[0] - cx), t1 = Math.atan2(TIP[1] - cy, TIP[0] - cx);
  const N = 16, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = t0 + (t1 - t0) * t;
    const w = 0.105 * Math.sin(Math.PI * (0.22 + 0.78 * t)) / 2 + 0.004 * (1 - t);
    outer.push([cx + (R + w) * Math.cos(a), cy + (R + w) * Math.sin(a)]);
    inner.push([cx + (R - w) * Math.cos(a), cy + (R - w) * Math.sin(a)]);
  }
  const blade = [...outer, ...inner.reverse()];
  const THICK = 0.05;
  for (const deg of [60, 180, 300]) {
    const turn = (deg * Math.PI) / 180 - Math.PI / 2;   // local +x to azimuth deg from +Z
    add(extrude(blade, THICK, 0.01).translate(0, 0, -THICK / 2).rotateY(turn), BRONZE);
  }
  // the ring the points meet, and a disc finial on it
  add(new THREE.TorusGeometry(0.075, 0.018, 8, 24).rotateX(Math.PI / 2).translate(0, 2.058, 0), BRONZE);
  add(lathe([[0.001, 2.05], [0.03, 2.05], [0.045, 2.065], [0.045, 2.085], [0.03, 2.1], [0.001, 2.1]], 16), BRONZE);

  // ---- merge the static parts --------------------------------------------------
  let grooves = null;
  for (const [m, geos] of buckets) {
    const mesh = new THREE.Mesh(merge(geos), m);
    g.add(mesh);
    if (m === GLOW) grooves = mesh;
  }

  // ---- crystal: a natural double point, hand-built, centred on its origin -----
  const crystalGeometry = () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const lo = [], hi = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (rnd() - 0.5) * 0.25, r = 0.13 + rnd() * 0.035;
      lo.push(new THREE.Vector3(Math.sin(a) * r, -0.12 + (rnd() - 0.5) * 0.05, Math.cos(a) * r));
      hi.push(new THREE.Vector3(Math.sin(a) * r * 0.94, 0.1 + (rnd() - 0.5) * 0.06, Math.cos(a) * r * 0.94));
    }
    const top = new THREE.Vector3(0.018, 0.3, -0.012), bot = new THREE.Vector3(-0.012, -0.3, 0.015);
    const P = [];
    const face = (a, b, c) => {
      // keep every facet facing out, whatever order it was listed in
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const mid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
      if (n.dot(mid) < 0) [b, c] = [c, b];
      for (const p of [a, b, c]) P.push(p.x, p.y, p.z);
    };
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      face(lo[i], lo[j], hi[j]);
      face(lo[i], hi[j], hi[i]);
      face(hi[i], hi[j], top);
      face(lo[j], lo[i], bot);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((P.length / 3) * 2).fill(0), 2));
    geo.computeVertexNormals();
    return geo;
  };
  const crystal = new THREE.Mesh(crystalGeometry(), CRYSTAL);
  crystal.name = 'crystal';
  crystal.position.set(0, 1.63, 0);
  g.add(crystal);

  // ---- place: base on y = 0, centred on x and z ----------------------------------
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });

  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.parts = { crystal, grooves };
  g.userData.beam = [r3(crystal.position.x), r3(crystal.position.y), r3(crystal.position.z)];
  return g;
}
