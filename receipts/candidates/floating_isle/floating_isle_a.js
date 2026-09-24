// floating_isle, candidate A (primitives): a dawn limestone cap built from a squashed
// sphere segment for the domed top and three frusta for the chamfered, overhanging rim;
// under it four isle-rock tiers, each a frustum side and a chamfer frustum whose bottom cap
// is the visible step, every tier with its own number of sides, turn and stretch so the
// strata do not line up, drifting sideways as they descend to a cone tip 9 m below the top.
// Flat shaded. Fragments are small frustum stacks, tufts are clusters of three-sided cones
// and the boulders are stretched dodecahedra.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = name;
    return m;
  };
  const LIME = mat(0xeadcc0, 'stone', 0.9);
  const ROCK = mat(0x9b7658, 'stone', 0.92);
  const SAGE = mat(0x7a8766, 'foliage', 0.85);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const E3 = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const PARTS = new Map();
  const put = (m, geo, matrix) => {
    if (matrix) geo.applyMatrix4(matrix);
    const o = geo.index ? geo.toNonIndexed() : geo;
    o.computeVertexNormals();
    if (!PARTS.has(m)) PARTS.set(m, []);
    PARTS.get(m).push(o);
  };
  const place = (o, q, s) => new THREE.Matrix4().compose(o, q, s);
  // a frustum from radius r0 at y0 down to radius r1 at y1, in a frame (turn, stretch, drift)
  const frustum = (m, r0, y0, r1, y1, seg, f, closed = false) =>
    put(m, new THREE.CylinderGeometry(r0, r1, y0 - y1, seg, 1, !closed),
      place(V(f.dx, (y0 + y1) / 2, f.dz), E3(0, f.yaw, 0), V(f.sx, 1, f.sz)));

  // --- the cap: top centre at y = 0 -----------------------------------------------------------
  const capF = { yaw: 0.3, sx: 1.03, sz: 0.97, dx: 0, dz: 0 };
  const RS = (6.45 ** 2 + 0.46 ** 2) / (2 * 0.46);
  put(LIME, new THREE.SphereGeometry(RS, 14, 3, 0, Math.PI * 2, 0, Math.asin(6.45 / RS)), place(V(0, -RS, 0), E3(0, capF.yaw, 0), V(capF.sx, 1, capF.sz)));
  frustum(LIME, 6.45, -0.46, 6.9, -0.78, 14, capF);
  frustum(LIME, 6.9, -0.78, 6.9, -1.56, 14, capF);
  frustum(LIME, 6.9, -1.56, 6.62, -1.8, 14, capF, true);

  // --- four rock tiers and the tip, each its own stratum -------------------------------------
  const TIERS = [
    // [top radius, top y, side foot radius, foot y, chamfer radius, chamfer y, sides]
    [6.25, -1.8, 6.0, -3.4, 5.5, -3.72, 13],
    [4.6, -3.72, 4.38, -5.3, 3.95, -5.6, 11],
    [3.2, -5.6, 3.0, -7.0, 2.6, -7.28, 12],
    [1.95, -7.28, 1.75, -8.2, 1.35, -8.42, 9],
  ];
  TIERS.forEach(([r0, y0, r1, y1, r2, y2, seg], i) => {
    const t = (i + 1) / TIERS.length;
    const f = { yaw: rnd() * 6, sx: 1 + 0.12 * (rnd() - 0.5), sz: 1 + 0.12 * (rnd() - 0.5), dx: 0.8 * t * t, dz: -0.5 * t * t };
    frustum(ROCK, r0, y0 + 0.02, r1, y1, seg, f);
    frustum(ROCK, r1, y1, r2, y2, seg, f, true);
  });
  put(ROCK, new THREE.ConeGeometry(1.3, 0.62, 9, 1, true).rotateX(Math.PI), place(V(0.8, -8.69, -0.5), E3(0, 0.4, 0), V(1, 1, 1)));

  // --- three fragments floating below, tilted -------------------------------------------------
  const frag = (s, capped, o, tilt, seg) => {
    const q = E3(tilt[0], rnd() * 6, tilt[1]);
    const at = (y) => place(o.clone().add(V(0, y * s, 0).applyQuaternion(q)), q, V(s, s, s));
    if (capped) {
      put(LIME, new THREE.CylinderGeometry(0.86, 1.0, 0.3, seg, 1, false), at(-0.15));
      put(ROCK, new THREE.CylinderGeometry(0.9, 0.62, 0.66, seg, 1, false), at(-0.63));
    } else {
      put(ROCK, new THREE.CylinderGeometry(0.8, 1.0, 0.3, seg, 1, false), at(-0.15));
      put(ROCK, new THREE.CylinderGeometry(0.95, 0.62, 0.66, seg, 1, false), at(-0.63));
    }
    put(ROCK, new THREE.CylinderGeometry(0.5, 0.42, 0.34, seg, 1, false), at(-1.13));
    put(ROCK, new THREE.ConeGeometry(0.44, 0.5, seg, 1, true).rotateX(Math.PI), at(-1.55));
  };
  frag(1.15, true, V(0.9, -10.05, -0.55), [0.08, -0.1], 11);
  frag(0.8, false, V(5.6, -6.2, 1.9), [0.2, 0.14], 9);
  frag(0.55, false, V(-5.2, -4.8, -3.6), [-0.16, 0.22], 8);

  // --- the top: tufts of sage grass and two boulders, the centre left clear -------------------
  const domeY = (x, z) => Math.sqrt(RS * RS - (x / capF.sx) ** 2 - (z / capF.sz) ** 2) - RS;
  const tuft = (x, z, s) => {
    const base = V(x, domeY(x, z) - 0.03, z);
    const n = 6, turn0 = rnd() * 6;
    for (let k = 0; k < n; k++) {
      const a = turn0 + (k / n) * Math.PI * 2 + rnd() * 0.5, lean = 0.3 + 0.55 * rnd();
      const h = s * (0.34 + 0.18 * rnd());
      const q = E3(0, -a, 0).multiply(E3(0, 0, -lean));
      const tip = V(0, h / 2, 0).applyQuaternion(q);
      put(SAGE, new THREE.ConeGeometry(0.035 * s, h, 3, 1, true), place(base.clone().add(tip), q, V(1, 1, 1)));
    }
  };
  // six patches of tufts round the rim, the centre left clear
  const TUFTS = [];
  for (const [px, pz, sp, n] of [[3.7, 1.5, 0.9, 4], [-2.3, 4.0, 0.8, 4], [-4.9, -0.7, 0.75, 3], [1.6, -4.9, 0.8, 3], [5.3, -2.1, 0.5, 2], [-3.5, -4.0, 0.65, 3]]) {
    for (let k = 0; k < n; k++) { const a = rnd() * 6.3, r = sp * Math.sqrt(rnd()); TUFTS.push([px + Math.cos(a) * r, pz + Math.sin(a) * r]); }
  }
  for (const [x, z] of TUFTS) tuft(x, z, 1.1 + 0.5 * rnd());
  for (const [x, z, s, h] of [[-3.4, 1.6, 0.7, 0.55], [2.9, -3.0, 0.5, 0.42]]) {
    put(ROCK, new THREE.DodecahedronGeometry(1, 0), place(V(x, domeY(x, z) + h * 0.55, z), E3(rnd(), rnd() * 6, rnd()), V(s * 1.1, h, s)));
  }

  // --- merge per material, UVs projected over each merged box --------------------------
  const merged = (geos) => {
    let n = 0;
    for (const x of geos) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const x of geos) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      o += x.attributes.position.count;
    }
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    const uv = new Float32Array(n * 2);
    for (let t = 0; t < n; t += 3) {
      const a = V(pos[t * 3], pos[t * 3 + 1], pos[t * 3 + 2]);
      const f = V(pos[t * 3 + 3], pos[t * 3 + 4], pos[t * 3 + 5]).sub(a).cross(V(pos[t * 3 + 6], pos[t * 3 + 7], pos[t * 3 + 8]).sub(a));
      const fx = Math.abs(f.x), fy = Math.abs(f.y), fz = Math.abs(f.z);
      for (let k = t; k < t + 3; k++) {
        const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
        const [u, v] = fy >= fx && fy >= fz ? [x, z] : fx >= fz ? [z, y] : [x, y];
        uv[k * 2] = u / su; uv[k * 2 + 1] = v / sv;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  };
  const meshes = new Map();
  for (const [m, geos] of PARTS) { const me = new THREE.Mesh(merged(geos), m); meshes.set(m, me); g.add(me); }

  // --- placement: lowest point on y = 0, centred on x and z (measured on vertices) -------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mm) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  // the walkable top at the asset's centre (x = z = 0 after the shift), cast down onto the cap
  g.updateMatrixWorld(true);
  const hit = new THREE.Raycaster(V(0, box.max.y - box.min.y + 5, 0), V(0, -1, 0)).intersectObject(meshes.get(LIME), false)[0];
  g.userData.top = hit ? Math.round(hit.point.y * 1000) / 1000 : null;
  return g;
}
