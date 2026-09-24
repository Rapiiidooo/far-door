// mira_scarf, candidate C (a second reading, hand-built): the scarf folded in half and hung
// over the stone from front to back, the way one hangs a scarf over a chair back. The fold
// makes a loose loop that hangs behind the stone clear of the ground; over the top the outer
// half lies on the inner one, shifted to the right so both show; in front both halves come down
// and splay on the ground in a V, so the two fringed, striped ends lie side by side facing +Z.
// The stone is a low slab of frost slate built as a heightfield on an irregular polar grid
// (steep sides, a top that tilts down to the front). Each half is laid out in plan and draped:
// the inner half on the stone, the outer half on the stone and the inner half. The band is one
// hand-built sweep through both halves and the loop, a lens section whose thickness alternates
// ring by ring for the knit ribs, bending across its width where it lies on something. The
// fringes are short flared tassels with knotted roots. Frost: a skin over the flat of the top
// with a ragged edge, a few flecks on the shoulders and a dust of specks on the rib crests of
// the upper folds. About 0.66 m by 1.09 m and 0.34 m tall (the scarf is about 2.5 m long),
// front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, roughness, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const SLATE = mat(0x3d4654, 'stone', 0.9, { flatShading: true });
  const FROST = mat(0xe9f2f6, 'ground', 0.8, { flatShading: true, side: THREE.DoubleSide });
  const WOOL = mat(0xc2412d, 'fabric', 0.95, { flatShading: true, side: THREE.DoubleSide });
  const OCHRE = mat(0xd9a441, 'fabric', 0.95, { flatShading: true, side: THREE.DoubleSide });

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  let seed = 37;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const add = (geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
  const build = (pos, uv, idx) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (idx) geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };

  // --- the stone: a slab as a heightfield --------------------------------------------------------
  const SXR = 0.3, SZR = 0.255;
  const rim = (a) => 1 + 0.07 * Math.sin(2 * a + 1.1) + 0.05 * Math.sin(3 * a + 0.4) + 0.03 * Math.sin(5 * a + 2);
  // the top's height at (x, z), 0 off the stone: flat in the middle, falling steeply at the rim,
  // tilted down towards the front and a little to the left
  const slab = (x, z) => {
    const u = x / SXR, w = z / SZR, a = Math.atan2(w, u), r = Math.hypot(u, w) / rim(a);
    return r >= 1 ? 0 : Math.sqrt(1 - r ** 3.5) * (0.268 - 0.028 * w + 0.012 * u);
  };
  // The polar grid: rings at fractions RHO of the rim, twelve spokes at uneven angles. A point
  // of ring i can be pulled in towards ring i - 1; it stays on the heightfield.
  const RHO = [0, 0.3, 0.55, 0.75, 0.88, 0.96, 1], NSEC = 12, LAST = RHO.length - 1;
  const ang = Array.from({ length: NSEC }, (_, k) => (k / NSEC) * Math.PI * 2 + (rnd() - 0.5) * 0.16);
  const grid = (k, i, pull = 0) => {
    const a = ang[k % NSEC], f = (RHO[i] + (i ? (RHO[i - 1] - RHO[i]) * pull : 0)) * rim(a);
    const x = SXR * f * Math.cos(a), z = SZR * f * Math.sin(a);
    return V(x, i === LAST ? 0 : slab(x, z), z);
  };
  // a disc of rings 0..top on the grid, as one mesh; lift raises it, rag pulls its last ring in
  const disc = (top, lift, rag, m, closed) => {
    const pos = [], uv = [], idx = [];
    const at = (k, i) => grid(k, i, i === top ? rag[k % NSEC] : 0).addScaledVector(UP, lift);
    const vid = (k, i) => (i === 0 ? 0 : 1 + (i - 1) * NSEC + (k % NSEC));
    const c0 = at(0, 0);
    pos.push(c0.x, c0.y, c0.z);
    uv.push(0.5, 0.5);
    for (let i = 1; i <= top; i++) {
      for (let k = 0; k < NSEC; k++) {
        const q = at(k, i);
        pos.push(q.x, q.y, q.z);
        uv.push(0.5 + q.x / SXR / 2, 0.5 + q.z / SZR / 2);
      }
    }
    for (let k = 0; k < NSEC; k++) {
      idx.push(0, vid(k + 1, 1), vid(k, 1));
      for (let i = 1; i < top; i++) idx.push(vid(k, i), vid(k + 1, i), vid(k, i + 1), vid(k + 1, i), vid(k + 1, i + 1), vid(k, i + 1));
    }
    if (closed) {
      const b = pos.length / 3;
      pos.push(0, 0, 0);
      uv.push(0.5, 0.5);
      for (let k = 0; k < NSEC; k++) idx.push(b, vid(k, top), vid(k + 1, top));
    }
    return add(build(pos, uv, idx), m);
  };
  const none = Array(NSEC).fill(0);
  disc(LAST, 0, none, SLATE, true);
  // Frost: a skin 4 mm over the flat of the top (the same triangles as the stone under it) with
  // its edge pulled in unevenly, and a few flecks on the shoulders beyond it.
  const FROST_UP = 0.004;
  disc(3, FROST_UP, Array.from({ length: NSEC }, () => rnd() * 0.75), FROST, false);
  {
    const pos = [], uv = [];
    for (let j = 0; j < 7; j++) {
      const a = rnd() * Math.PI * 2, f = (0.74 + rnd() * 0.1) * rim(a);
      const cx = SXR * f * Math.cos(a), cz = SZR * f * Math.sin(a), r = 0.008 + rnd() * 0.01, t = rnd() * 6;
      for (let c = 0; c < 3; c++) {
        const b = t + (c * Math.PI * 2) / 3 + (rnd() - 0.5) * 0.8, x = cx + Math.cos(b) * r, z = cz + Math.sin(b) * r;
        pos.push(x, slab(x, z) + FROST_UP + 0.001, z);
        uv.push(c / 2, c % 2);
      }
    }
    add(build(pos, uv), FROST);
  }
  // what the scarf rests on: the stone and its frost
  const rest = (x, z) => { const h = slab(x, z); return h > 0 ? h + FROST_UP : 0; };

  // --- draping -----------------------------------------------------------------------------------
  const HW = 0.09, HT = 0.011, RIB = 0.2, STEP = 0.02, SLOPE = 2.2;
  const G = HT * (1 + RIB); // the centre line on the ground, where the rib crests touch it
  const DN = HT * (1 + RIB) + 0.001; // from the centre line down to just clear of the rib crests
  const outward = (list, dir) => {
    let last = -dir * 99;
    return list.filter(([x]) => (dir * x > dir * last ? ((last = x), true) : false));
  };
  // A plan path draped over a support: every centimetre the highest support across the width,
  // the envelope that hangs from it no steeper than SLOPE, pushed out along its normal by DN,
  // softened upward where it flares onto the ground. Returns the draped centre line.
  const drape = (pts, support) => {
    const plan = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z)), false, 'centripetal');
    const PL = plan.getLength(), NS = Math.ceil(PL / 0.01);
    const samp = [];
    for (let i = 0; i <= NS; i++) {
      const u = i / NS, p = plan.getPointAt(u), t = plan.getTangentAt(u), w = V(-t.z, 0, t.x).normalize();
      let s = 0;
      for (const f of [-1, -0.5, 0, 0.5, 1]) s = Math.max(s, support(p.x + w.x * f * HW, p.z + w.z * f * HW));
      samp.push({ sig: u * PL, s });
    }
    for (const a of samp) a.e = Math.max(0, ...samp.map((b) => b.s - SLOPE * Math.abs(a.sig - b.sig)));
    let prof = samp.map((a, i) => {
      const b0 = samp[Math.max(0, i - 1)], b1 = samp[Math.min(samp.length - 1, i + 1)];
      const ds = b1.sig - b0.sig, dy = b1.e - b0.e, l = Math.hypot(ds, dy);
      return a.e > 0 ? [a.sig - (dy / l) * DN, a.e + (ds / l) * DN] : [a.sig, G];
    });
    const peak = prof.reduce((bi, q, i) => (q[1] > prof[bi][1] ? i : bi), 0);
    prof = [...outward(prof.slice(0, peak + 1).reverse(), -1).reverse(), ...outward(prof.slice(peak + 1), 1)];
    for (let pass = 0; pass < 3; pass++) {
      prof = prof.map(([x, y], i) => {
        if (y > 0.08) return [x, y];
        const w = prof.slice(Math.max(0, i - 3), i + 4);
        return [x, Math.max(y, w.reduce((s, q) => s + q[1], 0) / w.length)];
      });
    }
    return prof.map(([sg, y]) => {
      const p = plan.getPointAt(Math.min(1, Math.max(0, sg / PL)));
      return V(p.x, Math.max(y, G), p.z);
    });
  };

  // the inner half, from its end on the ground at the front left, up over the stone and down
  // its back, where it stops at the top of the loop
  const inner = drape([[-0.215, 0.575], [-0.18, 0.49], [-0.12, 0.415], [-0.07, 0.345], [-0.04, 0.25], [-0.035, 0.12],
    [-0.035, 0], [-0.035, -0.12], [-0.035, -0.22], [-0.035, -0.34]], rest);
  const ipk = inner.reduce((bi, q, i) => (q.y > inner[bi].y ? i : bi), 0);
  const icut = inner.findIndex((q, i) => i > ipk && q.y < 0.15);
  const innerPart = inner.slice(0, icut + 1);
  // the inner half's top, for the outer half to lie on: the nearest point of its centre line in
  // plan, its thickness above that, following the stone's fall across the width as it does
  const innerTop = (x, z) => {
    let best = null, bd = HW + 0.012;
    for (const q of innerPart) {
      const d = Math.hypot(q.x - x, q.z - z);
      if (d < bd) { bd = d; best = q; }
    }
    if (!best) return 0;
    return best.y + DN + Math.min(0, rest(x, z) - rest(best.x, best.z)) - 0.001;
  };
  // the outer half, from the back of the stone over the inner half and down the front to its
  // end on the ground at the front right
  const outer = drape([[0.045, -0.34], [0.045, -0.22], [0.045, -0.12], [0.045, 0], [0.045, 0.12], [0.05, 0.25],
    [0.085, 0.34], [0.14, 0.415], [0.2, 0.49], [0.235, 0.575]], (x, z) => Math.max(rest(x, z), innerTop(x, z)));
  const opk = outer.reduce((bi, q, i) => (q.y > outer[bi].y ? i : bi), 0);
  const ostart = outer.findIndex((q) => q.y > outer[opk].y - 0.03);
  const outerPart = outer.slice(ostart);

  // the loop: on down from the inner half's last point, round a bottom clear of the ground,
  // up behind it as a loose teardrop and over onto the outer half at the back of the stone;
  // [height, offset on Z from that last point], drifting across to the outer half's line
  const A = innerPart[innerPart.length - 1], B = outerPart[0];
  const LOOP = [[0.105, -0.017], [0.07, -0.039], [0.058, -0.069], [0.072, -0.099], [0.11, -0.119],
    [0.16, -0.117], [0.21, -0.092], [0.255, -0.047], [0.285, 0.013]];
  const loop = LOOP.map(([y, dz], i) => V(A.x + ((B.x - A.x) * (i + 1)) / (LOOP.length + 1), y, A.z + dz));
  const thin = (list) => list.filter((q, i) => i % 2 === 0 || i === list.length - 1);
  const path = new THREE.CatmullRomCurve3([...thin(innerPart), ...loop, ...thin(outerPart)], false, 'centripetal');
  const L = path.getLength(), NR = Math.round(L / STEP);

  // --- rings ---------------------------------------------------------------------------------------
  // The width runs square to the path and level. Through the loop it is carried over from the
  // ring before (the path stands on end there and drifts sideways, which would swing a level
  // width round), and it never flips, so over the top the outer half lies upside down on the
  // inner one, as a folded scarf does.
  const nearest = (q) => {
    let bi = 0, bd = 1e9;
    for (let k = 0; k <= NR; k++) { const d = path.getPointAt(k / NR).distanceTo(q); if (d < bd) { bd = d; bi = k; } }
    return bi;
  };
  const kA = nearest(A), kB = nearest(B);
  const rings = [];
  let wPrev = null;
  for (let k = 0; k <= NR; k++) {
    const u = k / NR, p = path.getPointAt(u), t = path.getTangentAt(u);
    p.y = Math.max(p.y, G);
    const part = k <= kA ? 'inner' : k >= kB ? 'outer' : 'loop';
    let w = V(0, 0, 0).crossVectors(t, UP);
    if ((part === 'loop' || w.length() < 0.25) && wPrev) w = wPrev.clone().addScaledVector(t, -wPrev.dot(t));
    w.normalize();
    if (wPrev && w.dot(wPrev) < 0) w.negate();
    wPrev = w;
    const n = V(0, 0, 0).crossVectors(w, t).normalize();
    const up = n.y < 0 ? n.clone().negate() : n.clone();
    rings.push({ p, t, w, n, up, part, rib: k % 2 ? 1 - RIB : 1 + RIB });
  }
  // where a ring lies on something, how far each point across it drops onto that support
  const FS = [-1, -0.75, 0, 0.75, 1];
  const dn = HT * (1 + RIB);
  rings.forEach((r) => {
    r.raw = FS.map(() => 0);
    if (r.part === 'loop' || r.up.y < 0.5) return;
    const sup = r.part === 'inner' ? rest : (x, z) => Math.max(rest(x, z), innerTop(x, z));
    const hs = FS.map((f) => sup(r.p.x + r.w.x * f * HW - r.up.x * dn, r.p.z + r.w.z * f * HW - r.up.z * dn));
    const under = r.p.y - dn * r.up.y;
    if (under - Math.max(...hs) > 0.01) return;
    r.raw = hs.map((h) => Math.max(-0.03, Math.min(0, h + 0.002 - under)));
  });
  rings.forEach((r, k) => {
    const near = rings.slice(Math.max(0, k - 2), k + 3);
    r.drop = FS.map((f, j) => Math.min(r.raw[j], near.reduce((s, q) => s + q.raw[j], 0) / near.length));
  });
  const dropAt = (r, f) => {
    const i = Math.min(3, FS.findIndex((x, j) => f <= FS[j + 1] || j === 3)), s = (f - FS[i]) / (FS[i + 1] - FS[i]);
    return r.drop[i] * (1 - s) + r.drop[i + 1] * s;
  };
  // the lens section: [across, through] in units of HW and HT
  const SEC = [[-1, 0], [-0.75, 0.85], [0, 1], [0.75, 0.85], [1, 0], [0.75, -0.85], [0, -1], [-0.75, -0.85]];
  const point = (r, f, h) => r.p.clone().addScaledVector(r.w, f * HW).addScaledVector(r.n, h * HT * r.rib).addScaledVector(UP, dropAt(r, f));

  // --- the band --------------------------------------------------------------------------------------
  const out = { wool: { pos: [], uv: [] }, ochre: { pos: [], uv: [] } };
  const put = (o, a, ua) => { o.pos.push(a.x, a.y, a.z); o.uv.push(...ua); };
  for (let k = 0; k < NR; k++) {
    // both ends lie in front: two stripes near each, three rings of ochre, three of red, three of ochre
    const e = Math.min(k, NR - 1 - k);
    const o = (e >= 3 && e <= 5) || (e >= 9 && e <= 11) ? out.ochre : out.wool;
    const r0 = rings[k], r1 = rings[k + 1];
    for (let j = 0; j < SEC.length; j++) {
      const [fa, ha] = SEC[j], [fb, hb] = SEC[(j + 1) % SEC.length];
      const a = point(r0, fa, ha), b = point(r0, fb, hb), c = point(r1, fa, ha), d = point(r1, fb, hb);
      const ua = [(fa + 1) / 2, k / NR], ub = [(fb + 1) / 2, k / NR], uc = [(fa + 1) / 2, (k + 1) / NR], ud = [(fb + 1) / 2, (k + 1) / NR];
      put(o, a, ua); put(o, b, ub); put(o, c, uc);
      put(o, b, ub); put(o, d, ud); put(o, c, uc);
    }
  }
  for (const k of [0, NR]) {
    const r = rings[k], m = r.p.clone().addScaledVector(UP, dropAt(r, 0));
    for (let j = 0; j < SEC.length; j++) {
      const [fa, ha] = SEC[j], [fb, hb] = SEC[(j + 1) % SEC.length];
      put(out.wool, m, [0.5, 0.5]); put(out.wool, point(r, fa, ha), [(fa + 1) / 2, 0]); put(out.wool, point(r, fb, hb), [(fb + 1) / 2, 0]);
    }
  }
  add(build(out.wool.pos, out.wool.uv), WOOL);
  add(build(out.ochre.pos, out.ochre.uv), OCHRE);

  // --- the fringes: short tassels flaring from a knotted root, their wide ends on the ground -----
  const cone = new THREE.CylinderGeometry(0.0055, 0.014, 1, 5, 1); // narrow end up, towards the root
  const knot = new THREE.SphereGeometry(1, 5, 2);
  for (const [r, sign] of [[rings[0], -1], [rings[NR], 1]]) {
    const dirOut = r.t.clone().multiplyScalar(sign).setY(0).normalize();
    for (let k = 0; k < 5; k++) {
      const len = 0.058 + rnd() * 0.024;
      const dir = dirOut.clone().applyAxisAngle(UP, sign * ((k - 2) * 0.13 + (rnd() - 0.5) * 0.1));
      const root = r.p.clone().addScaledVector(dirOut, -0.002).addScaledVector(r.w, (k - 2) * 0.036 + (rnd() - 0.5) * 0.008);
      root.y = 0.014;
      const c = add(cone, WOOL);
      c.position.copy(root).addScaledVector(dir, len / 2);
      c.quaternion.setFromUnitVectors(UP, dir.clone().negate()); // the narrow end points back to the root
      c.scale.set(1, len, 1);
      const kn = add(knot, WOOL);
      kn.position.copy(root).addScaledVector(dir, 0.004);
      kn.scale.set(0.012, 0.011, 0.012);
    }
  }

  // --- frost on the upper folds: a dust of small specks on the rib crests that face up high ------
  {
    const pos = [], uv = [];
    rings.forEach((r, k) => {
      if (r.rib < 1 || r.up.y < 0.75 || r.p.y < 0.2 || k < 3 || k > NR - 3) return;
      // the inner half only shows beside the outer one, on its left
      const span = r.part === 'inner' ? [-0.95, -0.55] : [-0.7, 0.7];
      const count = Math.floor(rnd() * (r.up.y > 0.93 ? 4 : 2.5));
      for (let j = 0; j < count; j++) {
        const f = span[0] + rnd() * (span[1] - span[0]), sz = 0.005 + rnd() * rnd() * 0.012;
        const h = Math.abs(f) <= 0.75 ? 1 - 0.15 * (Math.abs(f) / 0.75) : 0.85 * (1 - (Math.abs(f) - 0.75) / 0.25);
        const c = r.p.clone().addScaledVector(r.w, f * HW).addScaledVector(r.up, h * HT * r.rib + 0.0012).addScaledVector(UP, dropAt(r, f));
        const t0 = rnd() * 6;
        for (let q = 0; q < 3; q++) {
          const b = t0 + (q * Math.PI * 2) / 3 + (rnd() - 0.5) * 0.9;
          const p = c.clone().addScaledVector(r.w, Math.cos(b) * sz * 1.6).addScaledVector(r.t, Math.sin(b) * sz * 0.7);
          pos.push(p.x, p.y, p.z);
          uv.push(q / 2, q % 2);
        }
      }
    });
    if (pos.length) add(build(pos, uv), FROST);
  }

  // --- the six lines -------------------------------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const p = nd.isMesh && nd.geometry.attributes.position; if (!p) return;
    const put2 = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (nd.isInstancedMesh) { for (let c = 0; c < nd.count; c++) { nd.getMatrixAt(c, im); put2(m4.multiplyMatrices(nd.matrixWorld, im)); } return; }
    put2(nd.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
