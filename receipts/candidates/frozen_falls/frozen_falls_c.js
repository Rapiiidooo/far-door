// frozen_falls, candidate C: a second reading, the fall as a chandelier.
// The water that came over the lip froze into six broad lobes that roll over the brow and
// run down the rock, each swelling into a rounded, frosted head at its own height: the
// heads together are the bulge. Below them the curtain breaks into separate pillars hung
// from the heads, some reaching down into the apron and some hanging free in points, over
// a glaze of deep ice on the rock. Every part is a hand-built loft: rings of an uneven
// polygon along a path, each ring's points nudged so the facets are chunky and irregular,
// and anything that reaches behind the rock or below the ground is flattened onto it,
// which gives the flat back and the flat base. The brow's deep-ice core, the frost crust on
// top and the apron are lofted along the width; the lobes, the pillars, the glaze and the
// icicles are lofted down the fall.
export default function (THREE) {
  const g = new THREE.Group();
  g.userData.mounts = 'back';

  const mat = (hex, rough) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, flatShading: true });
  // Ice has no recipe in the contract's list, so its materials stay unnamed; the game gives
  // ice its gloss and translucency at load.
  const ICE = mat(0xa9d2e3, 0.35);
  const DEEP = mat(0x5b9bbd, 0.4);
  const FROST = mat(0xe9f2f6, 0.85);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const X = V(1, 0, 0), Y = V(0, 1, 0);
  // -1..1, fixed per point, so every load builds the same ice
  const hash = (a, b, c) => { const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return (h - Math.floor(h)) * 2 - 1; };

  // --- triangles, bucketed per material --------------------------------------------------
  const buckets = new Map([[ICE, []], [DEEP, []], [FROST, []]]);
  const n0 = V(0, 0, 0), e1 = V(0, 0, 0), e2 = V(0, 0, 0), cen = V(0, 0, 0);
  // Built against the rock at z = 0 and the ground at y = 0; nothing may pass behind or below.
  const flat = (p) => V(p.x, Math.max(0, p.y), Math.max(0, p.z));
  // One triangle, wound away from a point inside its solid, painted by what it faces.
  const face = (a, b, c, inside, paint) => {
    let A = flat(a), B = flat(b), C = flat(c);
    n0.crossVectors(e1.subVectors(B, A), e2.subVectors(C, A));
    if (n0.lengthSq() < 1e-8) return;
    n0.normalize();
    cen.copy(A).add(B).add(C).divideScalar(3);
    if (n0.dot(e1.subVectors(cen, inside)) < 0) { [B, C] = [C, B]; n0.negate(); }
    const m = n0.z < -0.9 ? DEEP : paint(n0, cen);   // whatever lies flat on the rock
    buckets.get(m).push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
  };
  // Paint rules: frost on what looks up, deep ice on undersides, the part's own colour else.
  const paintWith = (base, frostAbove, frostWhere = () => true) => (n, c) => {
    if (n.y > frostAbove && frostWhere(c)) return FROST;
    if (n.y < -0.3) return DEEP;
    return base;
  };

  // --- the loft ---------------------------------------------------------------------------
  // rings: [{ p, sa, sb }] along a path; section: [[a, b], ...], a across the part (along
  // `side`), b out of the rock. Ends are 'flat' or 'point' (an apex `tip` metres beyond the
  // ring). `jit` nudges every ring point by that fraction of the section.
  const loft = (rings, section, { side, paint, start = 'flat', end = 'flat', tip0 = 0.3, tip1 = 0.3, jit = 0.08, seed = 1 }) => {
    const K = rings.length, n = section.length;
    const R = rings.map((r, k) => {
      const a = rings[Math.max(0, k - 1)].p, b = rings[Math.min(K - 1, k + 1)].p;
      const T = V(0, 0, 0).subVectors(b, a).normalize();
      const O = V(0, 0, 0).crossVectors(T, side).normalize();
      if (O.z < 0) O.negate();
      const S = V(0, 0, 0).crossVectors(O, T).normalize();
      if (S.dot(side) < 0) S.negate();
      const pts = section.map(([sa, sb], i) => r.p.clone()
        .addScaledVector(S, (sa + jit * hash(seed, k, i)) * r.sa)
        .addScaledVector(O, (sb + jit * hash(seed, k, i + 37)) * r.sb));
      return { T, c: r.p, pts };
    });
    for (let k = 0; k < K - 1; k++) {
      const r0 = R[k], r1 = R[k + 1], mid = r0.c.clone().add(r1.c).multiplyScalar(0.5);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        face(r0.pts[i], r0.pts[j], r1.pts[i], mid, paint);
        face(r0.pts[j], r1.pts[j], r1.pts[i], mid, paint);
      }
    }
    const cap = (r, dir, kind, len) => {
      const apex = r.c.clone().addScaledVector(dir, kind === 'point' ? len : 0);
      const inside = r.c.clone().addScaledVector(dir, -0.2);
      for (let i = 0; i < n; i++) face(r.pts[i], r.pts[(i + 1) % n], apex, inside, paint);
    };
    cap(R[0], R[0].T.clone().negate(), start, tip0);
    cap(R[K - 1], R[K - 1].T, end, tip1);
  };
  const along = (xs, f) => xs.map((x, k) => f(x, k));
  // 0 in the middle of the width, 1 at the ends
  const endness = (x, half) => Math.min(1, Math.abs(x) / half);

  // --- the lip ----------------------------------------------------------------------------
  // A deep-ice core lofted along the width fills the brow behind the lobes, down to where
  // their backs come onto the rock, and a thin crust of frost lies along the top where the
  // lobes leave the rock.
  const CORE = [[0.45, -0.3], [0.45, 0.2], [0.1, 0.5], [-0.35, 0.42], [-0.9, 0.25], [-1.45, 0.1], [-1.45, -0.3]];
  loft(along([-1.7, -1.1, -0.55, 0, 0.55, 1.1, 1.7], (x, k) => ({ p: V(x, 7.35, 0.2), sa: 1 - 0.2 * endness(x, 1.8), sb: 1 })),
    CORE, { side: Y, paint: () => DEEP, jit: 0.05, seed: 2 });
  const CRUST = [[0.07, -0.3], [0.07, 0.2], [0.02, 0.34], [-0.08, 0.36], [-0.1, -0.3]];
  loft(along([-1.62, -1.25, -0.88, -0.5, -0.12, 0.26, 0.64, 1.02, 1.36, 1.64], (x, k) => {
    const e = endness(x, 1.7) ** 2, sb = 0.95 - 0.35 * e + 0.25 * hash(4, k, 1);
    return { p: V(x, 7.86 - 0.1 * e + 0.04 * hash(4, k, 2), 0.3 * sb), sa: 1, sb };
  }), CRUST, { side: Y, paint: () => FROST, start: 'point', end: 'point', tip0: 0.1, tip1: 0.1, jit: 0.14, seed: 4 });

  // --- the upper curtain: six broad lobes that roll over the brow and swell into heads ----
  // Each lobe leaves the rock at the top, rolls over the brow, tucks in under it and runs
  // down the rock, then swells into a rounded head at its own height; together the heads
  // are the bulge, frosted on top and dark underneath. On the rock face each section is as
  // deep as it needs to be for its back to stay on the rock.
  const LOBE = [[-1, -0.35], [-0.88, 0.3], [-0.4, 0.72], [0.25, 0.8], [0.8, 0.42], [1, -0.35]];
  // over the brow: [y, centre out, depth]
  const BROW = [[7.76, 0.14, 0.24], [7.6, 0.44, 0.33], [7.3, 0.6, 0.36], [6.86, 0.42, 0.42]];
  // down the rock: [height above the head, front of the ice, width factor]
  const RUN = [[1.7, 0.6, 1.03], [0.9, 0.92, 1.16], [0.35, 1.28, 1.3], [-0.1, 1.24, 1.22], [-0.42, 0.9, 0.82]];
  const LOBES = [
    { xt: -1.46, xb: -1.74, sa: 0.34, k: 0.86, head: 4.3 }, { xt: -0.9, xb: -1.06, sa: 0.4, k: 1.0, head: 4.85 },
    { xt: -0.34, xb: -0.38, sa: 0.37, k: 1.05, head: 4.05 }, { xt: 0.22, xb: 0.28, sa: 0.42, k: 1.02, head: 4.6 },
    { xt: 0.8, xb: 0.94, sa: 0.37, k: 0.95, head: 4.95 }, { xt: 1.36, xb: 1.66, sa: 0.36, k: 0.88, head: 4.2 },
  ];
  LOBES.forEach((l, li) => {
    const brow = BROW.map(([y, z, sb], k) => ({ p: V(l.xt, y + 0.03 * hash(li, k, 9), z * l.k), sa: l.sa * (0.9 + 0.05 * k), sb: sb * l.k }));
    const run = RUN.map(([dy, f, w], k) => {
      const y = l.head + dy, front = f * l.k + 0.04 * hash(li, k, 5), sb = (front + 0.12) / 1.15;
      const t = Math.min(1, (6.86 - y) / (6.86 - l.head));
      return { p: V(l.xt + (l.xb - l.xt) * t, y, front - 0.8 * sb), sa: l.sa * w, sb };
    });
    loft(brow.concat(run), LOBE, { side: X, paint: paintWith(ICE, 0.42), start: 'point', tip0: 0.12, end: 'point', tip1: 0.22, jit: 0.1, seed: 20 + li });
    l.front = 1.24 * l.k;
  });

  // --- a glaze of deep ice on the rock behind the pillars ------------------------------------
  const GLAZE = [[1, -0.3], [0.7, 0.35], [0, 0.5], [-0.7, 0.35], [-1, -0.3]];
  loft([4.6, 3.6, 2.6, 1.6, 0.6, 0.1].map((y, k) => ({ p: V(0.05 + 0.05 * hash(5, k, 1), y, 0), sa: 1.7 + 0.05 * k, sb: 0.2 + 0.03 * hash(5, k, 2) })),
    GLAZE, { side: X, paint: () => DEEP, jit: 0.05, seed: 6 });

  // --- the pillars hanging from the heads ---------------------------------------------------
  // lobe, offset across, radius, the height it reaches (0 reaches the apron)
  const HEX = [0, 1, 2, 3, 4, 5].map((i) => [Math.cos((i * Math.PI) / 3), Math.sin((i * Math.PI) / 3)]);
  const HEX2 = HEX.map(([a, b]) => [a * 0.866 - b * 0.5, a * 0.5 + b * 0.866]);
  [
    { l: 0, dx: -0.05, r: 0.21, to: 2.2 }, { l: 1, dx: -0.16, r: 0.3, to: 0 }, { l: 1, dx: 0.22, r: 0.17, to: 2.65 },
    { l: 2, dx: 0.02, r: 0.36, to: 0 }, { l: 3, dx: -0.1, r: 0.3, to: 0 }, { l: 3, dx: 0.27, r: 0.17, to: 1.7 },
    { l: 4, dx: 0.05, r: 0.26, to: 1.3 }, { l: 5, dx: -0.1, r: 0.32, to: 0 }, { l: 5, dx: 0.32, r: 0.17, to: 2.9 },
  ].forEach((c, ci) => {
    const l = LOBES[c.l], x0 = l.xb + c.dx;
    const top = l.head - 0.05, bottom = c.to || 0.25, K = Math.max(3, Math.round((top - bottom) / 0.55) + 1);
    const z0 = l.front - c.r - 0.28;
    const rings = [];
    for (let k = 0; k < K; k++) {
      const t = k / (K - 1), y = top + (bottom - top) * t;
      const flare = c.to ? 1 - 0.5 * t : 1 + 0.4 * Math.max(0, 1 - y / 0.9);
      const z = z0 - (c.to ? 0.1 : 0.2) * t * t + 0.04 * hash(ci, k, 7);
      rings.push({ p: V(x0 + 0.06 * hash(ci, k, 8), y, z), sa: c.r * flare * (1 + 0.1 * Math.sin(y * 2.3 + ci)), sb: c.r * flare });
    }
    loft(rings, ci % 2 ? HEX : HEX2, {
      side: X, paint: paintWith(ICE, 0.62), end: c.to ? 'point' : 'flat', tip1: 0.45 + c.r * 1.4, jit: 0.1, seed: 40 + ci,
    });
  });

  // --- the apron: lofted along the width, low and rounded, frosted where the pillars land ---
  // section about a ring centre 0.22 m up (scaled with the ring), so its base, flattened
  // onto the ground, is wound from a point inside
  const APRON = [[0.42, -0.3], [0.4, 0.45], [0.28, 1.05], [0.04, 1.5], [-0.19, 1.72], [-0.42, 1.7], [-0.52, -0.3]];
  loft(along([-2.3, -1.85, -1.38, -0.92, -0.46, 0, 0.46, 0.92, 1.38, 1.85, 2.3], (x, k) => {
    const e = endness(x, 2.35) ** 2;
    const sa = 1 - 0.6 * e + 0.08 * Math.sin(x * 2.7), sb = 1 - 0.5 * e + 0.06 * Math.sin(x * 3.3 + 1);
    return { p: V(x, 0.22 * sa, (0.15 + 0.04 * hash(13, k, 2)) * sb), sa, sb };
  }), APRON, { side: Y, paint: paintWith(ICE, 0.72, (c) => c.z < 0.82), start: 'point', end: 'point', tip0: 0.18, tip1: 0.18, jit: 0.07, seed: 7 });

  // --- icicles under the brow, between the lobes ------------------------------------------
  const PENT = [0, 1, 2, 3, 4].map((i) => [Math.cos((i * 2 * Math.PI) / 5), Math.sin((i * 2 * Math.PI) / 5)]);
  [[-1.18, 0.9, 0.11], [-0.62, 0.5, 0.08], [-0.06, 1.2, 0.13], [0.5, 0.65, 0.09], [1.08, 1.05, 0.12], [1.6, 0.45, 0.08]]
    .forEach(([x, len, r], ii) => {
      const z = 0.62 - 0.1 * endness(x, 1.9) ** 2;
      loft([{ p: V(x, 7.3, z), sa: r, sb: r }, { p: V(x, 7.02, z), sa: r * 0.9, sb: r * 0.9 }], PENT, {
        side: X, paint: paintWith(ICE, 0.7), end: 'point', tip1: len, jit: 0.08, seed: 60 + ii,
      });
    });

  for (const [m, arr] of buckets) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, m));
  }

  // --- place: base on y = 0, centred on x and z ------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (m4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mm.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
