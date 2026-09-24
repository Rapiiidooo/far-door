// hill_castle, arm A: assembled from primitives.
// Five round towers on an irregular ring, joined by crenellated curtain walls,
// with a gatehouse at the front. A tower is a stack of cylinders: a battered
// sandstone foot, the shaft, a band level with the wall walk, a corbel and an
// eave band, under a steep one-segment cone and a bronze needle spire with a
// knop. A wall is a box turned onto the line between two towers, with a base
// course, a bone coping band and an outer parapet of merlons. The gate is a
// real recess: two piers, nine radial box voussoirs whose inner ends make the
// soffit, spandrels stepped along the ring behind them and a dark basalt back.
// A gabled hall fills the back of the courtyard. Every lit window is a box with
// a half-cylinder head, all merged into one lantern amber mesh,
// userData.parts.windows. One mesh per material.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials ----------------------------------------------------------------
  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    if (name) m.name = name;
    return m;
  };
  const BONE = mat(0xe6d3ae, 0.84, 'stone');
  const SUNLIT = mat(0xd4a373, 0.88, 'stone');
  const SAND = mat(0xb57f4f, 0.9, 'stone');
  const BASALT = mat(0x3a3531, 0.96, 'stone');
  const ROOF = mat(0x4f7a3a, 0.78, 'tile');
  const BRONZE = mat(0x9a6a35, 0.45, 'metal', { metalness: 0.6 });
  // Lantern amber is light only: the glass is dark basalt, so the windows still
  // read as openings if the game dims them. Its roughness is its own, so the
  // loader's surface pass never gives it another material's clone.
  const GLOW = mat(0x3a3531, 0.62, null, { emissive: 0xffb24a, emissiveIntensity: 1.2 });

  // ---- helpers --------------------------------------------------------------------
  const buckets = new Map();
  const put = (geo, m) => {
    let b = buckets.get(m);
    if (!b) buckets.set(m, (b = []));
    b.push(geo);
    return geo;
  };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const ONE = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  // Bake a pose into the geometry: turn about z (in the face plane), then about y.
  const pose = (geo, x, y, z, ry = 0, rz = 0) =>
    geo.applyMatrix4(M.compose(P.set(x, y, z), Q.setFromEuler(E.set(0, ry, rz, 'YXZ')), ONE));
  const box = (w, h, d, x, y, z, m, ry = 0, rz = 0) =>
    put(pose(new THREE.BoxGeometry(w, h, d), x, y, z, ry, rz), m);
  const slab = (x0, x1, y0, y1, z0, z1, m) => {
    if (Math.abs(x1 - x0) < 0.01) return;
    box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, m);
  };
  const cyl = (rTop, rBot, h, x, y0, z, m, seg = 20, open = false) =>
    put(pose(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open), x, y0 + h / 2, z), m);
  const flat = (geo) => {
    const f = geo.toNonIndexed();
    f.computeVertexNormals();
    return f;
  };

  // An arched window facing the direction phi (0 is +Z), its sill at y0.
  const lit = [];
  const arched = (x, y0, z, phi, w = 0.9, hr = 1.1, d = 0.16) => {
    const a = new THREE.BoxGeometry(w, hr, d).translate(0, hr / 2, 0);
    const b = new THREE.CylinderGeometry(w / 2, w / 2, d, 6, 1, false, Math.PI / 2, Math.PI)
      .rotateX(Math.PI / 2)
      .translate(0, hr, 0);
    for (const geo of [a, b]) lit.push(pose(geo, x, y0, z, phi));
  };

  // ---- plan -------------------------------------------------------------------------
  const WALK = 10.0;        // top of the curtain walls
  const T = 2.2;            // wall thickness
  const C = { x: 0, z: -1.5 };
  const TW = [
    // keep: 26 - 0.35 + 12.35 + 4 = 42 m to the spire tip
    { x: -9.6, z: -7.0, r: 4.8, H: 26.0, roof: 12.35, spire: 4.0, body: BONE, band: SUNLIT, rows: [14.6, 19.6], low: [5.6], w: 1.0, hr: 1.3 },
    { x: 2.0, z: -10.2, r: 2.7, H: 18.0, roof: 9.2, spire: 2.6, body: SUNLIT, band: BONE, rows: [13.4], low: [5.6], w: 0.85, hr: 1.05 },
    { x: 12.2, z: -7.2, r: 3.9, H: 20.5, roof: 10.2, spire: 3.0, body: BONE, band: SUNLIT, rows: [13.2, 16.4], low: [5.6], w: 0.9, hr: 1.1 },
    { x: 13.8, z: 5.2, r: 3.2, H: 14.5, roof: 7.6, spire: 2.2, body: SUNLIT, band: BONE, rows: [], low: [5.2, 10.6], w: 0.85, hr: 1.05 },
    { x: -13.6, z: 6.0, r: 3.4, H: 16.5, roof: 8.2, spire: 2.4, body: BONE, band: SUNLIT, rows: [12.3], low: [5.2], w: 0.85, hr: 1.05 },
  ];
  const [KEEP, BACKT, RIGHTT, FR, FL] = TW;

  // Gatehouse: half width, back and front faces, height; the opening and its ring.
  const GX = 4.2, GZ0 = 5.8, GZ1 = 10.0, GH = 15.0;
  const OW = 2.2, SPRING = 6.2, R_IN = OW, R_OUT = 3.1, R_MID = (R_IN + R_OUT) / 2;
  const REC = GZ1 - 1.6;    // the dark back of the recess
  const GATE_L = { x: -GX, z: 7.6, r: 0 }, GATE_R = { x: GX, z: 7.6, r: 0 };

  // Ring neighbours of each tower, for the walls and for where windows may go.
  const WALLS = [[FL, GATE_L], [GATE_R, FR], [FR, RIGHTT], [RIGHTT, BACKT], [BACKT, KEEP], [KEEP, FL]];

  // ---- battlements: a parapet strip on the outer edge with merlons on it -------------
  const MW = 1.3, MH = 1.3, GAP = 1.0, PT = 0.6;
  const battlement = (ax, az, ux, uz, nx, nz, off, s0, s1, m0, m1, y, m) => {
    // the line runs from a + u*s0 to a + u*s1; merlons only between m0 and m1
    const ry = Math.atan2(-uz, ux);
    const cx = ax + nx * off, cz = az + nz * off;
    const Ls = s1 - s0, sm = (s0 + s1) / 2;
    box(Ls, 0.6, PT, cx + ux * sm, y + 0.3, cz + uz * sm, m, ry);
    const span = m1 - m0;
    const n = Math.max(1, Math.floor((span + GAP) / (MW + GAP)));
    const used = n * MW + (n - 1) * GAP;
    for (let i = 0; i < n; i++) {
      const s = m0 + (span - used) / 2 + MW / 2 + i * (MW + GAP);
      box(MW, MH, PT, cx + ux * s, y + 0.6 + MH / 2, cz + uz * s, m, ry);
    }
  };

  // ---- curtain walls ------------------------------------------------------------------
  for (const [a, b] of WALLS) {
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    let nx = uz, nz = -ux;
    if (nx * ((a.x + b.x) / 2 - C.x) + nz * ((a.z + b.z) / 2 - C.z) < 0) { nx = -nx; nz = -nz; }
    const ry = Math.atan2(-uz, ux);
    // run into the gatehouse where there is no tower to hide the end
    const s0 = a.r ? 0 : -1.0, s1 = b.r ? L : L + 1.0, sm = (s0 + s1) / 2, Ls = s1 - s0;
    const mx = a.x + ux * sm, mz = a.z + uz * sm;
    box(Ls, WALK, T, mx, WALK / 2, mz, SUNLIT, ry);
    box(Ls, 1.8, T + 0.8, mx, 0.9, mz, SAND, ry);
    box(Ls, 0.6, 0.24, mx + nx * T / 2, WALK - 0.3, mz + nz * T / 2, BONE, ry);
    const m0 = a.r ? a.r + 0.25 : 0.35, m1 = b.r ? L - b.r - 0.25 : L - 0.35;
    battlement(a.x, a.z, ux, uz, nx, nz, T / 2 - PT / 2, s0, s1, m0, m1, WALK, SUNLIT);
  }

  // ---- towers -------------------------------------------------------------------------
  const SEG = 20;
  for (const t of TW) {
    const { x, z, r, H } = t;
    cyl(r, r + 0.6, 2.4, x, 0, z, SAND, SEG, true);                  // battered foot
    cyl(r, r, H - 4.3, x, 2.4, z, t.body, SEG, true);                // shaft
    cyl(r + 0.16, r + 0.16, 0.55, x, WALK - 0.6, z, t.band, SEG);    // band level with the walk
    cyl(r + 0.5, r, 0.7, x, H - 1.9, z, BONE, SEG, true);            // corbel
    cyl(r + 0.5, r + 0.5, 1.2, x, H - 1.2, z, BONE, SEG);            // eave band
    const base = H - 0.35, apex = base + t.roof;
    cyl(0, r + 1.0, t.roof, x, base, z, ROOF, SEG);                  // steep cone
    cyl(0, 0.2, t.spire + 1.0, x, apex - 1.0, z, BRONZE, 8);         // needle spire
    put(pose(new THREE.SphereGeometry(0.32, 8, 6), x, apex + 0.3 * t.spire, z), BRONZE);

    // Windows: every row above the parapets goes all the way round; lower rows
    // only face out, and never where a wall meets the tower.
    const joins = [];
    for (const [a, b] of WALLS) {
      if (a === t) joins.push(Math.atan2(b.x - x, b.z - z));
      if (b === t) joins.push(Math.atan2(a.x - x, a.z - z));
    }
    const out = Math.atan2(x - C.x, z - C.z);
    const gap = (p, q) => Math.abs(Math.atan2(Math.sin(p - q), Math.cos(p - q)));
    const rr = r + 0.02;
    t.rows.forEach((y, i) => {
      const n = r > 3 ? 5 : 4;
      for (let k = 0; k < n; k++) {
        const phi = out + ((k + (i % 2) * 0.5) / n) * Math.PI * 2;
        arched(x + rr * Math.sin(phi), y, z + rr * Math.cos(phi), phi, t.w, t.hr);
      }
    });
    t.low.forEach((y, i) => {
      for (let k = -3; k <= 3; k++) {
        const phi = out + (k + (i % 2) * 0.5) * (Math.PI / 5);
        if (gap(phi, out) > Math.PI * 0.42) continue;
        if (joins.some((j) => gap(phi, j) < 0.62)) continue;
        arched(x + rr * Math.sin(phi), y, z + rr * Math.cos(phi), phi, t.w, t.hr);
      }
    });
  }

  // ---- gatehouse ------------------------------------------------------------------------
  slab(-GX, GX, 0, GH, GZ0, REC, SUNLIT);                              // core behind the recess
  slab(-OW, OW, 0, SPRING + R_IN, REC - 0.02, REC + 0.05, BASALT);      // the dark of the passage
  for (const s of [-1, 1]) {
    slab(s * OW, s * GX, 0, SPRING, REC, GZ1, SUNLIT);                  // pier
    slab(s * R_OUT, s * GX, SPRING, SPRING + R_OUT, REC, GZ1, SUNLIT);  // beside the ring
    // spandrels, stepped along the ring's mid-line so the voussoirs hide the steps
    for (let y = 0; y < R_OUT - 1e-6; y += 0.4) {
      const xin = Math.sqrt(Math.max(0, R_MID * R_MID - y * y));
      slab(s * xin, s * R_OUT, SPRING + y, SPRING + Math.min(R_OUT, y + 0.4), REC, GZ1, SUNLIT);
    }
    slab(s * OW, s * (GX + 0.4), 0, 1.8, REC, GZ1 + 0.4, SAND);          // base course, front
    arched(s * 1.55, 11.0, GZ1 + 0.02, 0, 0.8, 1.0);                     // two lit windows above
    arched(s * 1.8, 11.0, GZ0 - 0.02, Math.PI, 0.8, 1.0);                // and two to the court
  }
  slab(-GX, GX, SPRING + R_OUT, GH, REC, GZ1, SUNLIT);                  // above the arch
  slab(-GX - 0.4, GX + 0.4, 0, 1.8, GZ0 - 0.4, REC, SAND);              // base course, sides and back
  slab(-GX - 0.12, GX + 0.12, WALK - 0.6, WALK, GZ0 - 0.12, GZ1 + 0.12, BONE); // coping band
  {
    const N = 9, VW = 2 * R_OUT * Math.sin(Math.PI / (2 * N)) + 0.04;
    for (let k = 0; k < N; k++) {
      const a = ((k + 0.5) / N) * Math.PI;
      const key = k === (N - 1) / 2;
      const len = key ? 1.25 : R_OUT - R_IN, rc = R_IN + len / 2;
      const front = GZ1 + (key ? 0.32 : 0.18);
      box(len, key ? VW * 1.15 : VW, front - REC, rc * Math.cos(a), SPRING + rc * Math.sin(a), (REC + front) / 2, BONE, 0, a);
    }
  }
  // battlements all round the gatehouse top
  for (const [ax, az, bx, bz, nx, nz] of [
    [-GX, GZ1, GX, GZ1, 0, 1], [GX, GZ1, GX, GZ0, 1, 0], [GX, GZ0, -GX, GZ0, 0, -1], [-GX, GZ0, -GX, GZ1, -1, 0],
  ]) {
    const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    battlement(ax, az, ux, uz, nx, nz, -PT / 2, 0, L, 0.35, L - 0.35, GH, SUNLIT);
  }

  // ---- courtyard floor and the hall at its back ----------------------------------------------
  {
    const ring = [KEEP, BACKT, RIGHTT, FR, { x: GX, z: GZ0 }, { x: -GX, z: GZ0 }, FL];
    const shape = new THREE.Shape(ring.map((p) => new THREE.Vector2(p.x, -p.z)));
    put(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, 0.12, 0), SAND);
  }
  {
    const X0 = -4.3, X1 = 8.0, Z0 = -7.0, Z1 = -2.4, HH = 7.5, RH = 3.8;
    slab(X0, X1, 0, HH, Z0, Z1, BONE);
    // A three-sided cylinder turned onto x is a gable prism: apex up, base at -0.5.
    const prism = (len, halfW, rise, open) => {
      const p = new THREE.CylinderGeometry(1, 1, len, 3, 1, open).rotateZ(-Math.PI / 2).rotateX(-Math.PI / 2);
      p.scale(1, rise / 1.5, halfW / 0.866);
      return flat(p);
    };
    // stone gables under an open-ended roof that overhangs them
    put(prism(X1 - X0, (Z1 - Z0) / 2, RH - 0.1, false).translate((X0 + X1) / 2, HH + (RH - 0.1) / 3, (Z0 + Z1) / 2), BONE);
    put(prism(X1 - X0 + 1.0, (Z1 - Z0) / 2 + 0.55, RH + 0.3, true).translate((X0 + X1) / 2, HH - 0.25 + (RH + 0.3) / 3, (Z0 + Z1) / 2), ROOF);
    for (const x of [-2.2, 0.6, 3.4, 6.2]) arched(x, 3.6, Z1 + 0.02, 0, 0.9, 1.2);
  }

  // ---- one mesh per material; the windows are their own mesh ------------------------------------
  const merge = (geos) => {
    const parts = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of parts) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of parts) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      if (x.attributes.uv) uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  for (const [m, geos] of buckets) g.add(new THREE.Mesh(merge(geos), m));
  const windows = new THREE.Mesh(merge(lit), GLOW);
  windows.name = 'windows';
  g.add(windows);

  // ---- place: base on y = 0, centred on x and z -----------------------------------------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mat4) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });

  g.userData.parts = { windows };
  return g;
}
