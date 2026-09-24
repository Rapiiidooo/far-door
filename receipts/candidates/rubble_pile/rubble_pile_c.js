// rubble_pile, candidate C (a second reading, hand-built by cutting): every piece
// is a convex dressed solid cut by planes, each face keeping its own material.
// Chamfers are 45 degree cuts; the groove is two chamfered courses about a core
// whose faces in the groove alone are sienna; a break is two or three oblique cuts
// through all of them at once, faced in the other sandstone. The sunlit slab is
// propped steeply against the sandstone block's dressed end, its break in the air
// and its groove on the broad face; the drum lies end-on toward the front, snapped
// to a ridge; the chunks are chamfered blocks cut down by random planes, so each
// keeps a trace of worked stone. About 2.4 m across and 0.9 m tall.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SUN = mat(0xd4a373, 0.86);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.95);
  const BONE = mat(0xe6d3ae, 0.78);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 23;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // --- convex solids ---------------------------------------------------------------
  // A solid is a list of faces, each a convex polygon counter-clockwise seen from
  // outside, with a material.
  const boxSolid = (x0, x1, y0, y1, z0, z1, m) => {
    const f = (pts) => ({ pts: pts.map(([x, y, z]) => V(x, y, z)), m });
    return [
      f([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]),
      f([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]]),
      f([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]),
      f([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]),
      f([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]),
      f([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]),
    ];
  };
  // Rings of n corners at [radius, y] skinned into a convex solid with both caps.
  const ringSolid = (n, rings, m, bottom, top) => {
    const R = rings.map(([r, y]) => Array.from({ length: n }, (_, i) => {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      return V(Math.sin(a) * r, y, Math.cos(a) * r);
    }));
    const faces = [];
    for (let k = 0; k < R.length - 1; k++) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push({ pts: [R[k][i], R[k][j], R[k + 1][j], R[k + 1][i]], m });
      }
    }
    faces.push({ pts: [...R[0]].reverse(), m: bottom }, { pts: [...R[R.length - 1]], m: top });
    return faces;
  };
  // Keep the part of a solid where n . p <= d, and close it with a face of material m.
  const cut = (solid, n, d, m) => {
    const E = 1e-9, out = [], rim = [];
    for (const f of solid) {
      const k = f.pts.length, s = f.pts.map((p) => n.dot(p) - d), res = [];
      for (let i = 0; i < k; i++) {
        const j = (i + 1) % k, a = f.pts[i];
        if (s[i] <= E) res.push(a);
        if (Math.abs(s[i]) <= E) rim.push(a);
        if ((s[i] < -E && s[j] > E) || (s[i] > E && s[j] < -E)) {
          const p = a.clone().lerp(f.pts[j], s[i] / (s[i] - s[j]));
          res.push(p);
          rim.push(p);
        }
      }
      if (res.length >= 3) out.push({ pts: res, m: f.m });
    }
    const pts = [];
    for (const p of rim) if (!pts.some((q) => q.distanceToSquared(p) < 1e-14)) pts.push(p);
    if (pts.length >= 3) {
      const nn = n.clone().normalize();
      const u = V(0, 0, 0).crossVectors(nn, Math.abs(nn.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).normalize();
      const w = V(0, 0, 0).crossVectors(nn, u);
      const c = pts.reduce((a, p) => a.add(p), V(0, 0, 0)).multiplyScalar(1 / pts.length);
      const ang = (p) => { const q = V(0, 0, 0).subVectors(p, c); return Math.atan2(q.dot(w), q.dot(u)); };
      pts.sort((p, q) => ang(p) - ang(q));
      out.push({ pts, m });
    }
    return out;
  };
  const AX = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
  // Chamfer the edge where the box faces on axes a and b (signs sa, sb) meet.
  const edge = (solid, b, [a, sa], [bb, sb], c) => {
    const off = (ax, s) => (s > 0 ? b[ax][1] : -b[ax][0]);
    const n = AX[a].clone().multiplyScalar(sa).add(AX[bb].clone().multiplyScalar(sb));
    return cut(solid, n, off(a, sa) + off(bb, sb) - c, solid[0].m);
  };

  // Solids to meshes, one per material, flat shaded, with UVs projected on each
  // triangle's dominant axis for the load-time surfaces.
  const build = (solids, parent) => {
    const buckets = new Map();
    for (const s of solids) {
      for (const f of s) {
        if (!buckets.has(f.m)) buckets.set(f.m, []);
        const t = buckets.get(f.m);
        for (let i = 1; i < f.pts.length - 1; i++) t.push([f.pts[0], f.pts[i], f.pts[i + 1]]);
      }
    }
    for (const [m, tris] of buckets) {
      const pos = [], uv = [], n = V(0, 0, 0), e1 = V(0, 0, 0), e2 = V(0, 0, 0);
      for (const [a, b, c] of tris) {
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
        const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
        for (const p of [a, b, c]) {
          pos.push(p.x, p.y, p.z);
          if (ax >= ay && ax >= az) uv.push(p.z, p.y);
          else if (ay >= az) uv.push(p.x, p.z);
          else uv.push(p.x, p.y);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      parent.add(new THREE.Mesh(geo, m));
    }
    return parent;
  };

  // Lowest world-space point of an object, measured on its vertices.
  const _v = V(0, 0, 0);
  const lowest = (o) => {
    g.updateMatrixWorld(true);
    let min = Infinity;
    o.traverse((n) => {
      const p = n.isMesh && n.geometry.attributes.position;
      if (!p) return;
      for (let i = 0; i < p.count; i++) min = Math.min(min, _v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).y);
    });
    return min;
  };
  const settle = (o, sink = 0.01) => { o.position.y -= lowest(o) + sink; return o; };

  // --- dressed blocks --------------------------------------------------------------
  // x from 0 (dressed end) to L, y from 0 to H, z within +-D/2. Two courses about a
  // core: every outer long edge and every edge of the dressed end chamfered by c,
  // the groove's lips by a small chamfer, the core set back by gd with its groove
  // faces in sienna. Then every part is cut by the same break planes.
  const block = (body, broken, o) => {
    const { L, H, D, c, gy, gw, gd, breaks, spall } = o;
    const yl = gy - gw / 2, yu = gy + gw / 2, lip = 0.014;
    const course = (y0, y1, lower) => {
      const b = [[0, L + 0.3], [y0, y1], [-D / 2, D / 2]];
      let s = boxSolid(0, L + 0.3, y0, y1, -D / 2, D / 2, body);
      const outer = lower ? -1 : 1, inner = -outer;
      for (const sz of [-1, 1]) {
        s = edge(s, b, [1, outer], [2, sz], c);        // outer long edges
        s = edge(s, b, [1, inner], [2, sz], lip);      // the groove's lips
        s = edge(s, b, [0, -1], [2, sz], c);           // dressed end, upright edges
      }
      s = edge(s, b, [0, -1], [1, outer], c);          // dressed end, outer edge
      return s;
    };
    const core = boxSolid(0, L + 0.3, yl - 0.002, yu + 0.002, -D / 2 + gd, D / 2 - gd, body);
    core[4].m = SIENNA;
    core[5].m = SIENNA;
    let parts = [course(0, yl, true), core, course(yu, H, false)];
    for (const [n, p] of breaks) parts = parts.map((s) => cut(s, n, n.dot(p), broken));
    if (spall) parts[2] = cut(parts[2], spall[0], spall[0].dot(spall[1]), broken);
    return build(parts, new THREE.Group());
  };

  // the bed block, its break toward -x and its dressed end toward +x
  const B1 = {
    L: 1.28, H: 0.5, D: 0.64, c: 0.045, gy: 0.31, gw: 0.075, gd: 0.045,
    breaks: [
      [V(1, 0.3, -0.32), V(1.2, 0.25, 0)],        // the main break, leaning back and in
      [V(1, -0.42, 0.5), V(1.22, 0.2, 0.1)],      // a second face low and to the front
      [V(0.6, 0.9, 0.5), V(1.06, 0.5, 0.28)],     // the top front corner knocked away
    ],
    spall: [V(0.4, 1, -0.2), V(0.9, 0.49, -0.1)], // a shallow spall off the upper course
  };
  const b1 = block(SAND, SUN, B1);
  b1.position.set(0.2, 0, -0.12);
  b1.rotation.y = Math.PI + 0.06;
  g.add(b1);
  settle(b1, 0.015);

  // the propped slab: built like the block with its groove on a long face, then
  // rolled so that face is the slab's broad top, pitched steeply onto the bed
  // block's dressed end with its foot to the right and its break in the air
  const B2 = {
    L: 0.92, H: 0.5, D: 0.28, c: 0.04, gy: 0.25, gw: 0.07, gd: 0.04,
    breaks: [
      [V(1, 0.25, 0.2), V(0.86, 0.25, 0)],
      [V(1, -0.5, -0.1), V(0.9, 0.12, 0)],
    ],
    spall: [V(0.5, 0.2, 1), V(0.8, 0.4, 0.1)],
  };
  const slab = block(SUN, SAND, B2);
  slab.rotation.x = -Math.PI / 2;           // its grooved faces now look up and down
  slab.position.set(0, B2.D / 2, B2.H / 2);
  const pitch = new THREE.Group();
  pitch.add(slab);
  const lean = new THREE.Group();
  lean.add(pitch);
  g.add(lean);
  lean.position.set(0.52, 0, -0.14);
  lean.rotation.y = Math.PI - 0.16;         // its length runs to the left, onto the block
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(lean.matrixWorld).invert();
  let reach = Infinity;
  for (let s = -0.5; s <= 0.5; s += 0.01) {
    for (const x of [0.02, 0.06, 0.1]) {
      const p = b1.localToWorld(V(x, B1.H, s * (B1.D - 2 * B1.c))).applyMatrix4(inv);
      if (Math.abs(p.z) <= B2.H / 2 && p.x > 0) reach = Math.min(reach, p.x);
    }
  }
  const top1 = b1.localToWorld(V(0, B1.H, 0)).y;
  pitch.rotation.z = Math.atan2(top1 + 0.004, reach);
  settle(lean, 0.015);

  // --- the drum ----------------------------------------------------------------------
  // Sixteen sides about +y, a chamfered bed at y = 0, a bone band near it, snapped
  // at the top to a ridge by two cuts and a third that took a piece of one side.
  const R = 0.27, LD = 0.62, SEG = 16;
  let drumS = ringSolid(SEG, [[R - 0.035, 0], [R, 0.035], [R, LD]], SAND, SAND, SUN);
  for (const [n, p] of [
    [V(0.3, 1, 0.08), V(0, LD - 0.06, 0)],
    [V(-0.35, 1, -0.15), V(0, LD - 0.1, 0)],
    [V(0.2, 0.7, 1), V(0.05, LD - 0.12, 0.2)],
  ]) drumS = cut(drumS, n, n.dot(p), SUN);
  const band = ringSolid(SEG, [[R - 0.01, 0.075], [R + 0.024, 0.098], [R + 0.024, 0.172], [R - 0.01, 0.195]], BONE, BONE, BONE);
  const drumUp = build([drumS, band], new THREE.Group());
  drumUp.quaternion.setFromUnitVectors(V(0, 1, 0), V(0.3, 0, 0.95).normalize());   // the snap looks to the front
  const drum = new THREE.Group();
  drum.add(drumUp);
  drum.position.set(-0.52, R, 0.3);
  g.add(drum);
  settle(drum, 0.02);   // the band holds the shaft up; bed it in the grit

  // --- chunks and flakes ---------------------------------------------------------------
  // A small block with one chamfered arris, cut down by random planes: sx, sy, sz,
  // material, number of cuts, flake (cuts stay upright so it keeps its two faces).
  const fragment = (sx, sy, sz, m, k, flake) => {
    const b = [[-sx / 2, sx / 2], [-sy / 2, sy / 2], [-sz / 2, sz / 2]];
    let s = boxSolid(-sx / 2, sx / 2, -sy / 2, sy / 2, -sz / 2, sz / 2, m);
    s = edge(s, b, [1, 1], [2, 1], Math.min(0.035, sy * 0.4));
    for (let i = 0; i < k; i++) {
      // mostly upright cuts, so a chunk keeps a squared bed and top like the block it came from
      const a = rnd() * Math.PI * 2, tilt = flake ? 0.12 : 0.15 + rnd() * 0.55;
      const n = V(Math.cos(a) * Math.cos(tilt), Math.sin(tilt) * (rnd() < 0.5 ? -1 : 1), Math.sin(a) * Math.cos(tilt));
      const reach = (Math.abs(n.x) * sx + Math.abs(n.y) * sy + Math.abs(n.z) * sz) / 2;
      s = cut(s, n, reach * (0.55 + rnd() * 0.25), m);
    }
    return s;
  };
  // [sx, sy, sz, material, cuts, flake, x, z, rot x, y, z]
  const bits = [
    // spilled from the bed block's break, fanning out to the front and left
    [0.34, 0.24, 0.3, SAND, 3, false, -1.06, -0.24, 0.12, 0.4, 0.08],
    [0.38, 0.06, 0.32, SIENNA, 4, true, -1.02, 0.3, 0.06, 1.1, -0.08],
    [0.26, 0.2, 0.24, SIENNA, 3, false, -0.9, 0.66, -0.2, 0.8, 0.15],
    [0.34, 0.06, 0.28, SAND, 4, true, 0.02, 0.76, -0.05, 0.2, 0.06],
    [0.22, 0.17, 0.2, SAND, 2, false, 0.12, 0.44, 0.08, -0.5, 0.2],
    [0.3, 0.2, 0.26, SIENNA, 3, false, 0.3, 0.8, 0.1, 2.2, -0.08],
    // round the slab's foot and behind
    [0.28, 0.22, 0.26, SAND, 3, false, 0.9, 0.34, -0.15, 0.6, 0.12],
    [0.36, 0.055, 0.3, SIENNA, 4, true, 0.86, -0.5, 0.05, 2.6, 0.04],
    [0.24, 0.18, 0.22, SIENNA, 2, false, 0.08, -0.72, 0.2, 1.3, -0.15],
    [0.4, 0.06, 0.3, SAND, 4, true, -0.66, -0.74, -0.04, 0.5, 0.07],
    [0.2, 0.14, 0.18, SAND, 2, false, -0.76, 0.84, 0.25, 0.1, 0.3],
  ];
  for (const [sx, sy, sz, m, k, flake, x, z, rx, ry, rz] of bits) {
    const o = new THREE.Group();
    const piece = build([fragment(sx, sy, sz, m, k, flake)], new THREE.Group());
    piece.rotation.set(rx, ry, rz);
    o.add(piece);
    o.position.set(x, 0, z);
    g.add(o);
    settle(o, 0.01);
  }

  // --- the six lines -------------------------------------------------------------------
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put4 = (mat4) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put4(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put4(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
