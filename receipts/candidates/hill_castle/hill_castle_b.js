// hill_castle, arm B: built from profiles.
// Five round towers on a pentagon, the keep at the back right of centre. Every
// tower is turned on a lathe from half-sections: a concave battered foot, a
// shaft that narrows as it rises, a bone roll moulding level with the wall
// walk, a corbelled crown, a roof whose eaves kick out in a bell-cast flare
// before the steep cone, and a bronze needle with a knop. Each curtain wall is
// its cross-section (battered foot, coping ledge, outer parapet, wall walk and
// inner kerb) extruded along the line between two towers, with its merlons as
// an extruded comb. The gate front is its elevation extruded through the wall,
// so the arch is a real passage with jambs and soffit, closed halfway by a dark
// door and framed by an extruded bone arch ring; combs crenellate its flat top.
// A lean-to range, also a swept cross-section, backs onto the long rear wall.
// Lit windows are extruded arches, merged into one lantern amber mesh,
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
  const ROOF = mat(0x4f7a3a, 0.76, 'tile');
  const BRONZE = mat(0x9a6a35, 0.45, 'metal', { metalness: 0.6 });
  // Lantern amber is light only; the dark base keeps an unlit window an opening.
  const GLOW = mat(0x3a3531, 0.62, null, { emissive: 0xffb24a, emissiveIntensity: 1.2 });

  // ---- helpers --------------------------------------------------------------------
  const buckets = new Map();
  const put = (geo, m) => {
    let b = buckets.get(m);
    if (!b) buckets.set(m, (b = []));
    b.push(geo);
    return geo;
  };
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const SEG = 18;
  // A lathe from [radius, height] pairs listed from the bottom up, so every face
  // looks outward; x and z place its axis.
  const lathe = (pts, x, z, m, seg = SEG) =>
    put(new THREE.LatheGeometry(pts.map(([r, y]) => V2(Math.max(r, 0), y)), seg).translate(x, 0, z), m);
  const extrude = (shape, depth, curve = 3) =>
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: curve });
  const poly = (pts) => new THREE.Shape(pts.map(([x, y]) => V2(x, y)));

  // An arched window, extruded 0.12 m and centred on its depth, facing +Z.
  const lit = [];
  const archShape = (w, hr) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, hr);
    s.absarc(0, hr, w / 2, 0, Math.PI, false);
    s.lineTo(-w / 2, 0);
    return s;
  };
  const arched = (x, y0, z, phi, w = 0.9, hr = 1.1) =>
    lit.push(extrude(archShape(w, hr), 0.12, 3).translate(0, 0, -0.06).rotateY(phi).translate(x, y0, z));

  // ---- plan -------------------------------------------------------------------------
  const WALK = 10.5, T = 2.2;
  const C = { x: 0, z: -1.2 };
  const TW = [
    // keep: the roof sits at H - 0.5 and rises `roof`; 26.5 - 0.5 + 12.15 + 3.85 = 42 m
    { x: 2.5, z: -8.4, r: 4.9, H: 26.5, roof: 12.15, spire: 3.85, body: BONE, levels: [6.0, 13.4, 17.2, 21.0], cols: 5, w: 1.0, hr: 1.25 },
    { x: -13.8, z: -4.0, r: 3.5, H: 21.5, roof: 10.2, spire: 2.9, body: SUNLIT, levels: [6.0, 13.2, 16.4], cols: 4, w: 0.9, hr: 1.1 },
    { x: 14.0, z: -3.4, r: 3.1, H: 19.2, roof: 9.4, spire: 2.7, body: BONE, levels: [6.0, 13.2], cols: 4, w: 0.85, hr: 1.05 },
    { x: 11.6, z: 6.8, r: 3.3, H: 14.8, roof: 7.8, spire: 2.3, body: SUNLIT, levels: [5.2, 7.9], cols: 5, w: 0.85, hr: 1.05 },
    { x: -11.4, z: 7.2, r: 3.1, H: 13.6, roof: 7.2, spire: 2.2, body: BONE, levels: [5.2, 7.9], cols: 5, w: 0.85, hr: 1.05 },
  ];
  const [KEEP, SL, SR, FR, FL] = TW;

  // Gate front: half width, the wall line it sits on, projection, height.
  const GX = 4.0, GZ = 7.6, PROJ = 1.0, GH = 13.4;
  const OW = 2.3, SPRING = 6.2, R_OUT = 3.25;
  const GBACK = GZ - T / 2, GFRONT = GZ + T / 2 + PROJ;
  const GATE_L = { x: -GX, z: GZ, r: 0 }, GATE_R = { x: GX, z: GZ, r: 0 };
  const WALLS = [[FL, GATE_L], [GATE_R, FR], [FR, SR], [SR, KEEP], [KEEP, SL], [SL, FL]];

  // ---- curtain walls: an extruded cross-section and an extruded comb of merlons --------
  const MW = 1.25, MH = 1.25, GAP = 1.0;
  const section = [
    [T / 2 + 0.75, 0], [T / 2 + 0.12, 2.4], [T / 2, 2.6],                    // battered foot
    [T / 2, WALK - 0.7], [T / 2 + 0.2, WALK - 0.58], [T / 2 + 0.2, WALK - 0.12], [T / 2, WALK], // coping
    [T / 2, WALK + 0.7], [T / 2 - 0.6, WALK + 0.7], [T / 2 - 0.6, WALK],     // parapet
    [-T / 2 + 0.35, WALK], [-T / 2 + 0.35, WALK + 0.45], [-T / 2, WALK + 0.45], // walk and kerb
    [-T / 2, 1.2], [-T / 2 - 0.35, 0],
  ];
  // The comb's foot sinks 0.3 m into the parapet and its crenel floors sit 2 cm
  // under the parapet top, so no face of it lies on a face of the wall.
  const comb = (m0, m1) => {
    const span = m1 - m0;
    const n = Math.max(1, Math.round((span + GAP) / (MW + GAP)));
    const w = Math.min(MW, span);
    const step = n > 1 ? (span - w) / (n - 1) : 0;
    const start = n > 1 ? m0 : m0 + (span - w) / 2;
    const pts = [[m0, -0.3], [m1, -0.3]];
    for (let i = n - 1; i >= 0; i--) {
      const a = start + i * step, b = a + w;
      pts.push([b, -0.02], [b, MH], [a, MH], [a, -0.02]);
    }
    return poly(pts);
  };
  for (const [a, b] of WALLS) {
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const n1x = uz, n1z = -ux;
    const outSign = n1x * ((a.x + b.x) / 2 - C.x) + n1z * ((a.z + b.z) / 2 - C.z) >= 0 ? 1 : -1;
    const nx = n1x * outSign, nz = n1z * outSign;
    const s0 = a.r ? 0 : -0.6, s1 = b.r ? L : L + 0.6;
    const sec = poly(section.map(([u, y]) => [u * outSign, y]));
    const beta = Math.atan2(ux, uz);         // local z runs along the wall, local x is n1
    const mid = (s0 + s1) / 2;
    put(extrude(sec, s1 - s0).translate(0, 0, -(s1 - s0) / 2).rotateY(beta).translate(a.x + ux * mid, 0, a.z + uz * mid), SUNLIT);
    const m0 = a.r ? a.r + 0.2 : 0.3, m1 = b.r ? L - b.r - 0.2 : L - 0.3;
    if (m1 - m0 > 0.8) {
      const off = T / 2 - 0.3;
      put(extrude(comb(m0, m1), 0.58).translate(0, 0, -0.29).rotateY(Math.atan2(-uz, ux))
        .translate(a.x + nx * off, WALK + 0.7, a.z + nz * off), SUNLIT);
    }
    // Against the long rear wall, a lean-to range: its cross-section extruded
    // along the wall under a sloping roof slab, with lit windows to the court.
    if (a === KEEP && b === SL) {
      const along = (profile, p0, p1, m) => {
        const pm = (p0 + p1) / 2;
        put(extrude(poly(profile.map(([u, y]) => [u * outSign, y])), p1 - p0).translate(0, 0, -(p1 - p0) / 2)
          .rotateY(beta).translate(a.x + ux * pm, 0, a.z + uz * pm), m);
      };
      const r0 = a.r + 0.9, r1 = L - b.r - 0.9;
      along([[-T / 2 + 0.05, 0], [-5.0, 0], [-5.0, 4.8], [-T / 2 + 0.05, 6.5]], r0, r1, BONE);
      along([[-T / 2 + 0.05, 6.72], [-T / 2 + 0.05, 6.42], [-5.4, 4.5], [-5.4, 4.8]], r0 - 0.3, r1 + 0.3, ROOF);
      for (let s = r0 + 1.4; s < r1 - 0.8; s += 2.2) {
        arched(a.x + ux * s - nx * 5.07, 1.7, a.z + uz * s - nz * 5.07, Math.atan2(-nx, -nz), 0.8, 1.0);
      }
    }
  }

  // ---- towers, turned ---------------------------------------------------------------------
  for (const t of TW) {
    const { x, z, r, H } = t;
    const top = r - 0.25, y0 = 2.8, y1 = H - 2.4;
    const rAt = (y) => r + (top - r) * (y - y0) / (y1 - y0);
    lathe([[r + 0.8, 0], [r + 0.62, 0.7], [r + 0.2, 2.2], [r, y0]], x, z, SAND);        // foot
    const b0 = WALK - 0.75, b1 = WALK - 0.05;
    lathe([[r, y0], [rAt(b0), b0]], x, z, t.body);                                       // shaft
    lathe([[rAt(b0), b0], [rAt(b0) + 0.22, b0 + 0.13], [rAt(b1) + 0.22, b1 - 0.15], [rAt(b1), b1]], x, z, BONE);
    lathe([[rAt(b1), b1], [top, y1]], x, z, t.body);
    lathe([[top, y1], [top + 0.12, y1 + 0.15], [top + 0.3, y1 + 0.5], [top + 0.5, y1 + 0.95],
      [top + 0.64, y1 + 1.1], [top + 0.64, H - 0.1], [top + 0.5, H], [0.4, H]], x, z, BONE);  // crown
    // roof: underside out to the lip, a bell-cast kick, then the straight cone
    const re = r + 1.1, base = H - 0.5, apex = base + t.roof;
    lathe([[0.01, H - 0.2], [r + 0.3, H - 0.2], [re, base - 0.2], [re + 0.02, base],
      [re - 0.5, base + 0.45], [re - 0.9, base + 1.05], [0.28, apex - 0.45], [0, apex]], x, z, ROOF);
    const s = t.spire, k = apex + 0.3 * s;
    lathe([[0.01, apex - 1.0], [0.3, apex - 1.0], [0.3, apex - 0.25], [0.13, apex + 0.1],
      [0.13, k - 0.34], [0.38, k], [0.13, k + 0.34], [0.07, apex + s - 0.7], [0, apex + s]], x, z, BRONZE, 8);

    // Windows stacked in columns. A level above the parapets goes all the way
    // round; lower ones only face out, and never where a wall meets the tower.
    const joins = [];
    for (const [a, b] of WALLS) {
      if (a === t) joins.push(Math.atan2(b.x - x, b.z - z));
      if (b === t) joins.push(Math.atan2(a.x - x, a.z - z));
    }
    const out = Math.atan2(x - C.x, z - C.z);
    const gap = (p, q) => Math.abs(Math.atan2(Math.sin(p - q), Math.cos(p - q)));
    for (const y of t.levels) {
      const round = y > WALK + 2.0;
      for (let k2 = 0; k2 < t.cols; k2++) {
        const phi = out + (k2 / t.cols) * Math.PI * 2 + (round ? 0 : Math.PI / t.cols);
        if (!round && (gap(phi, out) > Math.PI * 0.45 || joins.some((j) => gap(phi, j) < 0.6))) continue;
        const rr = rAt(y) + 0.03;
        arched(x + rr * Math.sin(phi), y, z + rr * Math.cos(phi), phi, t.w, t.hr);
      }
    }
  }

  // ---- gate front: its elevation extruded through the wall -------------------------------------
  {
    // outline with the arch cut up from the ground
    const s = new THREE.Shape();
    s.moveTo(-GX, 0);
    s.lineTo(-OW, 0);
    s.lineTo(-OW, SPRING);
    s.absarc(0, SPRING, OW, Math.PI, 0, true);
    s.lineTo(OW, 0);
    s.lineTo(GX, 0);
    s.lineTo(GX, GH);
    s.lineTo(-GX, GH);
    s.lineTo(-GX, 0);
    put(extrude(s, GFRONT - GBACK, 8).translate(0, 0, GBACK), SUNLIT);
    // a comb of merlons along each edge of its flat top
    for (const [ax, az, bx, bz, nx, nz] of [
      [-GX, GFRONT, GX, GFRONT, 0, 1], [GX, GFRONT, GX, GBACK, 1, 0], [GX, GBACK, -GX, GBACK, 0, -1], [-GX, GBACK, -GX, GFRONT, -1, 0],
    ]) {
      const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      put(extrude(comb(0, L), 0.58).translate(0, 0, -0.29).rotateY(Math.atan2(-uz, ux))
        .translate(ax - nx * 0.3, GH, az - nz * 0.3), SUNLIT);
    }

    // bone arch ring and imposts, proud of the face
    const ring = new THREE.Shape();
    ring.moveTo(R_OUT, SPRING);
    ring.absarc(0, SPRING, R_OUT, 0, Math.PI, false);
    ring.lineTo(-OW, SPRING);
    ring.absarc(0, SPRING, OW, Math.PI, 0, true);
    ring.lineTo(R_OUT, SPRING);
    put(extrude(ring, 0.26, 8).translate(0, 0, GFRONT - 0.06), BONE);
    for (const sx of [-1, 1]) {
      // mirrored by their points, never by a negative scale, which would turn the faces inside out
      put(extrude(poly([[OW, SPRING - 0.4], [R_OUT + 0.15, SPRING - 0.4], [R_OUT + 0.15, SPRING], [OW, SPRING]]
        .map(([x, y]) => [sx * x, y])), 0.3).translate(0, 0, GFRONT - 0.06), BONE);
      arched(sx * 1.6, 10.2, GFRONT + 0.01, 0, 0.8, 1.0);          // two lit windows over the arch
      arched(sx * 1.6, 10.2, GBACK - 0.01, Math.PI, 0.8, 1.0);     // and two to the court
    }
    // the door, halfway along the passage; a coping band across both faces
    put(extrude(archShape(2 * OW + 0.1, SPRING), 0.25, 8).translate(0, 0, (GBACK + GFRONT) / 2 - 0.12), BASALT);
    put(extrude(poly([[-GX - 0.2, WALK - 0.6], [GX + 0.2, WALK - 0.6], [GX + 0.2, WALK], [-GX - 0.2, WALK]]), GFRONT - GBACK + 0.4)
      .translate(0, 0, GBACK - 0.2), BONE);
    // sandstone footing either side, running 8 cm into the passage as a plinth
    for (const sx of [-1, 1]) {
      put(extrude(poly([[OW - 0.08, 0], [GX + 0.5, 0], [GX + 0.5, 0.4], [GX, 1.8], [OW - 0.08, 1.8]]
        .map(([x, y]) => [sx * x, y])), GFRONT - GBACK + 0.5).translate(0, 0, GBACK - 0.1), SAND);
    }
  }

  // ---- courtyard floor --------------------------------------------------------------------------------
  {
    const ring = [KEEP, SR, FR, { x: GX, z: GBACK }, { x: -GX, z: GBACK }, FL, SL];
    const shape = new THREE.Shape(ring.map((p) => V2(p.x, -p.z)));
    put(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, 0.12, 0), SAND);
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
