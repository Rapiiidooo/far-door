// light_pylon, arm C: a second reading in cut masonry.
// Every stone is a hand-built chamfered block (six faces, twelve edge strips and
// eight corners written triangle by triangle), mapped between a bottom and a top
// rectangle so a course can taper and keep planar faces. The plinth's middle course
// is a pinwheel of four blocks, so each face shows one joint. The shaft is three
// courses, a proud bone limestone band and a head; its two grooves are real
// channels where the courses stop short over a burnt sienna core set 3.5 cm back.
// The head is forked: a slot runs through it and each cheek is notched in a V. The
// bronze is cut too: the ring is a sixteen-sided band with a stepped face; the yoke
// is a faceted crescent that passes through the slot, stands 2.5 cm off the ring
// and rises as two short arms whose claws grip its rim; the threshold is a
// two-layer plate whose front sill holds the crystal slot.
// 1.1 x 2.8 x 1.65 m. The ring's centre is 2.35 m up, so its flat top is the 2.8 m
// and its lowest facet sits in the head's notch, 10 cm below the shaft's top.
export default function (THREE) {
  const g = new THREE.Group();
  const V = THREE.Vector3;

  // ---- materials ------------------------------------------------------------
  const stone = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SAND = stone(0xb57f4f, 0.9);
  const SUNLIT = stone(0xd4a373, 0.86);
  const SIENNA = stone(0x8a5433, 0.94);
  const BONE = stone(0xe6d3ae, 0.82);
  const BRONZE = new THREE.MeshStandardMaterial({ color: 0x9a6a35, roughness: 0.5, metalness: 0.6 });
  BRONZE.name = 'metal';
  // Dormant crystal, one material per lit part so the game can light each one on
  // its own (raise emissiveIntensity). Unnamed and just under opaque so the
  // loader's procedural surfaces leave it alone.
  const crystal = () => new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 0,
    roughness: 0.22, metalness: 0.05, transparent: true, opacity: 0.94,
  });
  const LENS = crystal(), SLOT = crystal();

  // ---- triangles, bucketed per material ---------------------------------------
  const BUCKETS = new Map();
  const bucket = (mat) => {
    if (!BUCKETS.has(mat)) BUCKETS.set(mat, { P: [], N: [] });
    return BUCKETS.get(mat);
  };
  const e1 = new V(), e2 = new V(), fn = new V();
  // one flat triangle, wound so its normal agrees with `out`; slivers are dropped
  const tri = (b, a, p, q, out) => {
    e1.subVectors(p, a); e2.subVectors(q, a); fn.crossVectors(e1, e2);
    const len = fn.length();
    if (len < 1e-9) return;
    if (fn.dot(out) < 0) { [p, q] = [q, p]; fn.negate(); }
    fn.divideScalar(len);
    for (const v of [a, p, q]) { b.P.push(v.x, v.y, v.z); b.N.push(fn.x, fn.y, fn.z); }
  };
  // a planar polygon whose points run round it, fanned from the first
  const poly = (b, pts, out) => { for (let i = 1; i < pts.length - 1; i++) tri(b, pts[0], pts[i], pts[i + 1], out); };

  // ---- chamfered blocks -------------------------------------------------------
  // Built round the origin in box space, each polygon sorted round its centroid,
  // then mapped into place between the bottom rectangle bt = [x0, x1, z0, z1] at y0
  // and the top rectangle tp at y1, then through xf if given. Faces stay planar.
  const S = [-1, 1];
  const lerp = (a, b, t) => a + (b - a) * t;
  const block = (mat, bt, y0, y1, ch, tp = bt, xf = null) => {
    const H = [(bt[1] - bt[0]) / 2, (y1 - y0) / 2, (bt[3] - bt[2]) / 2];
    const p = (s, full) => s.map((k, i) => k * (i === full ? H[i] : H[i] - ch));
    const faces = [];
    for (let i = 0; i < 3; i++) for (const s of S) {
      const f = [];
      for (const a of S) for (const c of S) { const sg = []; sg[i] = s; sg[(i + 1) % 3] = a; sg[(i + 2) % 3] = c; f.push(p(sg, i)); }
      faces.push(f);
    }
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3, k = (i + 2) % 3;
      for (const si of S) for (const sj of S) {
        const f = [];
        for (const sk of S) { const sg = []; sg[i] = si; sg[j] = sj; sg[k] = sk; f.push(p(sg, i), p(sg, j)); }
        faces.push(f);
      }
    }
    for (const sx of S) for (const sy of S) for (const sz of S) faces.push([0, 1, 2].map((i) => p([sx, sy, sz], i)));
    const map = ([x, y, z]) => {
      const u = (x + H[0]) / (2 * H[0]), v = (y + H[1]) / (2 * H[1]), w = (z + H[2]) / (2 * H[2]);
      const q = new V(lerp(lerp(bt[0], bt[1], u), lerp(tp[0], tp[1], u), v), lerp(y0, y1, v),
        lerp(lerp(bt[2], bt[3], w), lerp(tp[2], tp[3], w), v));
      return xf ? q.applyMatrix4(xf) : q;
    };
    const b = bucket(mat), mid = map([0, 0, 0]);
    const c = new V(), d = new V(), u = new V(), w = new V(), n0 = new V();
    for (const f of faces) {
      const pts = f.map((q) => new V(q[0], q[1], q[2]));
      c.set(0, 0, 0); for (const q of pts) c.add(q); c.multiplyScalar(1 / pts.length);
      n0.copy(c).normalize();
      u.subVectors(pts[0], c); u.addScaledVector(n0, -u.dot(n0)).normalize();
      w.crossVectors(n0, u);
      const ang = (q) => { d.subVectors(q, c); return Math.atan2(d.dot(w), d.dot(u)); };
      pts.sort((q, r) => ang(q) - ang(r));
      const world = pts.map((q) => map([q.x, q.y, q.z]));
      const cw = new V(); for (const q of world) cw.add(q); cw.multiplyScalar(1 / world.length);
      poly(b, world, cw.sub(mid));
    }
  };

  // ---- faceted sweeps round an axis parallel to z through o --------------------
  // A closed (r, z) profile swept as an n-sided band whose flats sit at the
  // profile's radii, from angle a0 to a1 (0 at +x, counter-clockwise seen from +z).
  // The profile may be a function of the fraction swept, so a band can taper. A
  // partial sweep is closed with flat end caps. zs = -1 mirrors it towards -z.
  const sweep = (mat, profile, n, o, a0 = Math.PI / n, a1 = a0 + Math.PI * 2, zs = 1) => {
    const b = bucket(mat);
    const prof = typeof profile === 'function' ? profile : () => profile;
    const steps = Math.max(1, Math.round(Math.abs(a1 - a0) / ((Math.PI * 2) / n)));
    const da = (a1 - a0) / steps, sec = 1 / Math.cos(Math.PI / n);
    const full = Math.abs(Math.abs(a1 - a0) - Math.PI * 2) < 1e-6;
    const P = [];
    for (let k = 0; k <= steps; k++) P.push(prof(k / steps));
    let area = 0;
    for (let i = 0; i < P[0].length; i++) {
      const [r0, z0] = P[0][i], [r1, z1] = P[0][(i + 1) % P[0].length];
      area += r0 * z1 - r1 * z0;
    }
    const sg = area > 0 ? 1 : -1;
    const at = (k, [r, z]) => {
      const a = a0 + k * da, R = r * sec;
      return new V(o[0] + R * Math.cos(a), o[1] + R * Math.sin(a), o[2] + zs * z);
    };
    const out = new V();
    const m = P[0].length;
    for (let i = 0; i < m; i++) {
      for (let k = 0; k < steps; k++) {
        const pa = P[k][i], pb = P[k][(i + 1) % m], qa = P[k + 1][i], qb = P[k + 1][(i + 1) % m];
        const nr = sg * (pb[1] - pa[1]), nz = -sg * (pb[0] - pa[0]);
        const am = a0 + (k + 0.5) * da;
        out.set(nr * Math.cos(am), nr * Math.sin(am), zs * nz);
        const q0 = at(k, pa), q1 = at(k + 1, qa), q2 = at(k + 1, qb), q3 = at(k, pb);
        tri(b, q0, q1, q2, out); tri(b, q0, q2, q3, out);
      }
    }
    if (!full) {
      const dir = Math.sign(a1 - a0);
      for (const [k, a, s] of [[0, a0, -1], [steps, a1, 1]]) {
        out.set(-Math.sin(a) * s * dir, Math.cos(a) * s * dir, 0);
        poly(b, P[k].map((pt) => at(k, pt)), out);
      }
    }
  };

  // ---- plinth: 1.1 m square, two tiers ---------------------------------------
  const sq = (h) => [-h, h, -h, h];
  block(SIENNA, sq(0.55), 0, 0.12, 0.03);                        // burnt sienna lower course
  // the rest of the lower tier, a pinwheel of four 0.68 x 0.42 m blocks
  for (const r of [[-0.55, 0.13, 0.13, 0.55], [0.13, 0.55, -0.13, 0.55], [-0.13, 0.55, -0.55, -0.13], [-0.55, -0.13, -0.55, 0.13]]) {
    block(SAND, r, 0.12, 0.3, 0.022);
  }
  block(SUNLIT, sq(0.425), 0.3, 0.5, 0.025);                     // upper tier, 0.85 m

  // ---- shaft: 1.5 m, tapering from 0.5 to 0.36 m -----------------------------
  const Y0 = 0.5, Y1 = 2.0;
  const hw = (y) => 0.25 - (0.07 * (y - Y0)) / (Y1 - Y0);
  const course = (mat, y0, y1, ch, grow = 0) => block(mat, sq(hw(y0) + grow), y0, y1, ch, sq(hw(y1) + grow));
  const G = 0.06, DEEP = 0.035;                                  // groove height and depth
  const GROOVES = [1.02, 1.38];                                  // groove bottoms
  course(SAND, Y0, GROOVES[0], 0.018);
  course(SAND, GROOVES[0] + G, GROOVES[1], 0.018);
  course(SAND, GROOVES[1] + G, 1.7, 0.018);
  // the channels' dark floors: a core reaching 1 cm into the courses either side
  for (const y of GROOVES) course(SIENNA, y - 0.01, y + G + 0.01, 0.004, -DEEP);
  course(BONE, 1.7, 1.8, 0.012, 0.012);                          // bone limestone band, proud
  // the head, forked: a slot 0.16 m wide runs through it for the crescent, and each
  // cheek has a V notch at the top where the ring's lowest facet sits
  const SLOTZ = 0.08, NY = 1.9, NXB = 0.06, NXT = 0.105, HY = 1.8;
  const rect = (y, x0, x1, s) => {                               // null: the shaft's own face
    const h = hw(y);
    return [x0 ?? -h, x1 ?? h, ...[s * SLOTZ, s * h].sort((a, b) => a - b)];
  };
  for (const s of S) {
    block(SUNLIT, rect(HY, null, null, s), HY, NY, 0.012, rect(NY, null, null, s));
    block(SUNLIT, rect(NY, null, -NXB, s), NY, Y1, 0.012, rect(Y1, null, -NXT, s));
    block(SUNLIT, rect(NY, NXB, null, s), NY, Y1, 0.012, rect(Y1, NXT, null, s));
  }

  // ---- ring: a sixteen-sided bronze band, 0.9 m across flats, 0.1 m thick -------
  const CY = 2.35, N = 16;
  const RING = [[0.31, -0.02], [0.325, -0.035], [0.35, -0.035], [0.36, -0.05], [0.435, -0.05], [0.45, -0.035],
    [0.45, 0.035], [0.435, 0.05], [0.36, 0.05], [0.35, 0.035], [0.325, 0.035], [0.31, 0.02]];
  sweep(BRONZE, RING, N, [0, CY, 0]);
  // four rivets on the face, peened through to the back
  const RIVET = [[0, 0], [0.026, 0], [0.026, 0.009], [0.017, 0.019], [0, 0.021]];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, x = 0.3975 * Math.cos(a), y = CY + 0.3975 * Math.sin(a);
    sweep(BRONZE, RIVET, 8, [x, y, 0.047]);
    sweep(BRONZE, RIVET, 8, [x, y, -0.047], undefined, undefined, -1);
  }

  // ---- yoke: a faceted crescent through the head's slot, rising as two arms ------
  // It follows the ring's facets 2.5 cm off its edge, from 8:30 round to 3:30,
  // thinning from 7 cm under the ring to 4.5 cm horns. Each horn ends in a claw
  // that crosses the gap and grips the ring's rim, front and back.
  const RC = 0.475;
  const CRADLE = (s) => {
    const u = Math.abs(2 * s - 1), ro = RC + 0.045 + 0.025 * (1 - u * u);
    return [[RC, -0.075], [ro - 0.01, -0.075], [ro, -0.065], [ro, 0.065], [ro - 0.01, 0.075], [RC, 0.075]];
  };
  const deg = Math.PI / 180;
  sweep(BRONZE, CRADLE, N, [0, CY, 0], -168.75 * deg, -11.25 * deg);
  for (const a of [-15 * deg, -165 * deg]) {
    const xf = new THREE.Matrix4().makeTranslation(0, CY, 0).multiply(new THREE.Matrix4().makeRotationZ(a));
    for (const s of S) block(BRONZE, [0.405, 0.51, ...[s * 0.045, s * 0.07].sort((p, q) => p - q)], -0.04, 0.04, 0.008, undefined, xf);
    block(BRONZE, [0.44, 0.482, -0.046, 0.046], -0.035, 0.035, 0.004, undefined, xf);   // through the gap
  }

  // ---- lens: its own mesh, domed on both faces, centred on its own origin -------
  // Its rim runs 8 mm into the ring, so the ring's bore is the lens's edge.
  const turn = (pts, segs) => {
    const geo = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), segs);
    const nr = geo.attributes.normal, v = new V();
    for (let k = 0; k < nr.count; k++) { v.fromBufferAttribute(nr, k).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    return geo.rotateX(Math.PI / 2);                             // lathe axis y -> z
  };
  const LR = 0.31, LRIM = 0.318, RIM = 0.015, DOME = 0.042;
  const front = [];
  for (let i = 0; i <= 6; i++) { const r = LRIM * (1 - i / 6); front.push([r, RIM + (DOME - RIM) * (1 - (r / LRIM) ** 2)]); }
  const back = front.map(([r, h]) => [r, -h]).reverse();
  const lensGeos = [turn(back, 32), turn([[LRIM, -RIM], [LRIM, RIM]], 32), turn(front, 32)];

  // ---- threshold plate: 1.1 x 0.55 x 0.04 m, in front of the plinth -------------
  // Two layers: a base slab, and a top plate stepped in 3 cm at the sides and back
  // whose front sill holds the slot, with a lip in front of it.
  const PZ0 = 0.55, PZ1 = 1.1, PT = 0.04, BASE = 0.02, STEP = 0.03;
  const SX = 0.4, SZ0 = 1.01, SZ1 = 1.07, GAP = 0.003, TX = 0.55 - STEP;
  block(BRONZE, [-0.55, 0.55, PZ0, PZ1], 0, BASE, 0.006);
  const TOP = (x0, x1, z0, z1) => block(BRONZE, [x0, x1, z0, z1], BASE - 0.002, PT, 0.006);
  TOP(-TX, TX, PZ0 + STEP, SZ0 - GAP);
  TOP(-TX, -SX - GAP, SZ0 - GAP, SZ1 + GAP);
  TOP(SX + GAP, TX, SZ0 - GAP, SZ1 + GAP);
  TOP(-TX, TX, SZ1 + GAP, PZ1);
  // the slot's crystal, its own mesh, laid on the channel floor
  const slotTop = PT - 0.005;
  block(SLOT, [-SX, SX, SZ0, SZ1], BASE + 0.0005, slotTop, 0.003);

  // ---- meshes -----------------------------------------------------------------
  // UVs are projected from each face's dominant axis over the mesh's box, so the
  // loader's surfaces keep one texel density across big and small parts.
  const build = ({ P, N: NN }) => {
    const n = P.length / 3, pos = new Float32Array(P), nor = new Float32Array(NN), uv = new Float32Array(n * 2);
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    for (let k = 0; k < n; k++) {
      const ax = Math.abs(nor[k * 3]), ay = Math.abs(nor[k * 3 + 1]), az = Math.abs(nor[k * 3 + 2]);
      const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
      const [a, c] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
      uv[k * 2] = a / su; uv[k * 2 + 1] = c / sv;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  };
  const slotGeo = build(BUCKETS.get(SLOT));
  BUCKETS.delete(SLOT);
  const slotC = [0, (BASE + slotTop) / 2, (SZ0 + SZ1) / 2];
  const slot = new THREE.Mesh(slotGeo.translate(-slotC[0], -slotC[1], -slotC[2]), SLOT);
  slot.name = 'slot';
  slot.position.set(...slotC);
  g.add(slot);

  // merged without the zero-area triangles LatheGeometry leaves at each apex
  const lensGeo = new THREE.BufferGeometry();
  {
    const P = [], NN = [], U = [], a = new V(), b = new V(), c = new V();
    for (const x of lensGeos.map((q) => (q.index ? q.toNonIndexed() : q))) {
      const p = x.attributes.position, nr = x.attributes.normal, uv = x.attributes.uv;
      for (let i = 0; i < p.count; i += 3) {
        a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
        if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-14) continue;
        for (let k = i; k < i + 3; k++) {
          P.push(p.getX(k), p.getY(k), p.getZ(k));
          NN.push(nr.getX(k), nr.getY(k), nr.getZ(k));
          U.push(uv.getX(k), uv.getY(k));
        }
      }
    }
    lensGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    lensGeo.setAttribute('normal', new THREE.Float32BufferAttribute(NN, 3));
    lensGeo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  }
  const lens = new THREE.Mesh(lensGeo, LENS);
  lens.name = 'lens';
  lens.position.set(0, CY, 0);
  g.add(lens);

  for (const [mat, b] of BUCKETS) g.add(new THREE.Mesh(build(b), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) -----
  const box = new THREE.Box3(), v = new V(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const p = nd.isMesh && nd.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (nd.isInstancedMesh) { for (let c = 0; c < nd.count; c++) { nd.getMatrixAt(c, im); put(m.multiplyMatrices(nd.matrixWorld, im)); } return; }
    put(nd.matrixWorld);
  });
  const c = box.getCenter(new V());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  const r3 = (x, y, z) => [+(x - c.x).toFixed(3), +(y - box.min.y).toFixed(3), +(z - c.z).toFixed(3)];
  g.userData.parts = { lens, slot };
  g.userData.lens = { center: r3(0, CY, 0), radius: LR };           // the lens's middle, on the ring's axis
  g.userData.emit = r3(0, PT, SZ1);                                  // middle of the slot's front edge, plate top
  return g;
}
