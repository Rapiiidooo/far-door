// path_lantern, arm C: a second reading, as square masonry.
// Every stone is a hand-built chamfered block. The two incised grooves are read as
// channels running the height of the shaft: each face shows two, cut 3 cm deep
// between corner posts and a centre strip, with a night-basalt core as their dark
// floor. Base and capital are stepped chamfered blocks. The bronze is square too:
// a seat plate with a cup for the crystal, a lid of three stepped tiers and a cap.
// The four ribs are flat straps swept by hand along curves on the diagonals, broad
// face outward, bowing out round the crystal. The crystal is a hand-built quartz
// point, a slightly irregular six-sided prism between two points, its own mesh.
// 0.6 x 2.4 x 0.6 m; the crystal's centre is 2.13 m up.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const BASALT = M(0x3a3531, 'stone', 0.84);
  const NIGHT = M(0x2a2830, 'stone', 0.92);
  const BRONZE = M(0x9a6a35, 'metal', 0.5, 0.6);
  // Dormant crystal with its own material, so the game can light it by raising
  // emissiveIntensity. Unnamed and just under opaque so the loader's procedural
  // surfaces leave it alone.
  const CRYSTAL = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 0,
    roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.94, flatShading: true,
  });

  // ---- merging: one mesh per material ---------------------------------------------
  // UVs are projected from each face's dominant axis over the merged mesh's box, so
  // the loader's surfaces keep one texel density across big and small parts.
  const boxUv = (pos, n) => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    const uv = new Float32Array(n * 2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      a.fromArray(pos, t * 3); b.fromArray(pos, t * 3 + 3); c.fromArray(pos, t * 3 + 6);
      const f = b.sub(a).cross(c.sub(a));
      const ax = Math.abs(f.x), ay = Math.abs(f.y), az = Math.abs(f.z);
      for (let k = t; k < t + 3; k++) {
        const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
        const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
        uv[k * 2] = u / su; uv[k * 2 + 1] = v / sv;
      }
    }
    return new THREE.BufferAttribute(uv, 2);
  };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', boxUv(pos, n));
    return out;
  };
  const PARTS = new Map();
  const put = (mat, geo) => { if (!PARTS.has(mat)) PARTS.set(mat, []); PARTS.get(mat).push(geo); return geo; };

  // ---- hand-built geometry ----------------------------------------------------------
  // Polygons from point lists: each face is sorted round its centroid and wound
  // away from the solid's centre (the origin of the local build), then fanned.
  const polyGeo = (faces) => {
    const P = [], N = [];
    const c = new THREE.Vector3(), n0 = new THREE.Vector3(), u = new THREE.Vector3(), w = new THREE.Vector3();
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3(), d = new THREE.Vector3();
    for (const f of faces) {
      const pts = f.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      c.set(0, 0, 0); for (const p of pts) c.add(p); c.multiplyScalar(1 / pts.length);
      n0.copy(c).normalize();
      u.subVectors(pts[0], c); u.addScaledVector(n0, -u.dot(n0)).normalize();
      w.crossVectors(n0, u);
      const ang = (p) => { d.subVectors(p, c); return Math.atan2(d.dot(w), d.dot(u)); };
      pts.sort((p, q) => ang(p) - ang(q));
      for (let i = 1; i < pts.length - 1; i++) {
        const tri = [pts[0], pts[i], pts[i + 1]];
        n.crossVectors(e1.subVectors(tri[1], tri[0]), e2.subVectors(tri[2], tri[0])).normalize();
        for (const p of tri) { P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    return geo;
  };
  // a chamfered block, w x h x d, chamfer ch (6 faces, 12 edge strips, 8 corners)
  const cbox = (w, h, d, ch) => {
    const H = [w / 2, h / 2, d / 2], S = [-1, 1];
    const p = (s, full) => s.map((k, i) => k * (i === full ? H[i] : H[i] - ch));
    const faces = [];
    for (let i = 0; i < 3; i++) for (const s of S) {
      const f = [];
      for (const a of S) for (const b of S) { const sg = []; sg[i] = s; sg[(i + 1) % 3] = a; sg[(i + 2) % 3] = b; f.push(p(sg, i)); }
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
    return polyGeo(faces);
  };
  // a block between two corners
  const blk = (mat, x0, y0, z0, x1, y1, z1, ch) =>
    put(mat, cbox(x1 - x0, y1 - y0, z1 - z0, ch).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  const sq = (mat, w, y0, y1, ch) => blk(mat, -w / 2, y0, -w / 2, w / 2, y1, w / 2, ch);

  // ---- base: three stepped tiers -------------------------------------------------------
  sq(BASALT, 0.6, 0, 0.12, 0.025);
  sq(BASALT, 0.46, 0.12, 0.22, 0.02);
  sq(BASALT, 0.32, 0.22, 0.3, 0.015);

  // ---- shaft: corner posts and centre strips round a dark core ------------------------
  // Along each face: post 6 cm, channel 3 cm, strip 4 cm, channel 3 cm, post 6 cm.
  const Y0 = 0.3, Y1 = 1.78, HW = 0.11, DEEP = 0.03;
  sq(NIGHT, 2 * (HW - DEEP), Y0, Y1, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    blk(BASALT, Math.min(sx * 0.05, sx * HW), Y0, Math.min(sz * 0.05, sz * HW), Math.max(sx * 0.05, sx * HW), Y1, Math.max(sz * 0.05, sz * HW), 0.008);
  }
  for (const s of [-1, 1]) {
    blk(BASALT, -0.02, Y0, Math.min(s * (HW - DEEP), s * HW), 0.02, Y1, Math.max(s * (HW - DEEP), s * HW), 0.006);
    blk(BASALT, Math.min(s * (HW - DEEP), s * HW), Y0, -0.02, Math.max(s * (HW - DEEP), s * HW), Y1, 0.02, 0.006);
  }

  // ---- capital, stepped out twice -----------------------------------------------------
  sq(BASALT, 0.3, 1.78, 1.84, 0.015);
  sq(BASALT, 0.36, 1.84, 1.92, 0.02);

  // ---- bronze seat plate and the crystal's cup -----------------------------------------
  sq(BRONZE, 0.27, 1.92, 1.95, 0.008);
  sq(BRONZE, 0.09, 1.95, 1.995, 0.01);

  // ---- four flat straps on the diagonals, swept by hand -------------------------------
  // At each sample: T along the curve, N out of it within the rib's upright plane, B
  // across it (horizontal). The strap is WIDE along B and THIN along N.
  const strapPts = [[0.13, 1.945], [0.15, 2.0], [0.183, 2.07], [0.19, 2.14], [0.172, 2.21], [0.13, 2.268], [0.085, 2.3]];
  const WIDE = 0.046, THIN = 0.016, SEGS = 16;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, ox = Math.sin(a), oz = Math.cos(a);
    const curve = new THREE.CatmullRomCurve3(strapPts.map(([s, y]) => new THREE.Vector3(ox * s, y, oz * s)), false, 'centripetal');
    const B = new THREE.Vector3(oz, 0, -ox);                  // horizontal, across the strap
    const rings = [];
    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS, c = curve.getPointAt(t), T = curve.getTangentAt(t);
      const Nn = new THREE.Vector3().crossVectors(T, B).normalize();
      const out = Nn.dot(new THREE.Vector3(ox, 0, oz)) < 0 ? -1 : 1;
      Nn.multiplyScalar(out);
      rings.push([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) =>
        c.clone().addScaledVector(B, (u * WIDE) / 2).addScaledVector(Nn, (v * THIN) / 2)));
    }
    const P = [];
    const quad = (p, q, r, s) => { P.push(p, q, r, p, r, s); };
    for (let i = 0; i < SEGS; i++) {
      const r0 = rings[i], r1 = rings[i + 1];
      for (let e = 0; e < 4; e++) {
        const e1 = (e + 1) % 4;
        quad(r0[e], r0[e1], r1[e1], r1[e]);
      }
    }
    // orient every quad away from the curve, whatever the winding came out as
    const pos = [], nor = [];
    const n = new THREE.Vector3(), mid = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
    for (let q = 0; q < P.length; q += 3) {
      const [p0, p1, p2] = [P[q], P[q + 1], P[q + 2]];
      n.crossVectors(t1.subVectors(p1, p0), t2.subVectors(p2, p0)).normalize();
      mid.copy(p0).add(p1).add(p2).multiplyScalar(1 / 3);
      const cpt = curve.getPointAt((Math.floor(q / 24) + 0.5) / SEGS);   // 4 quads, 24 corners a segment
      const flip = n.dot(mid.clone().sub(cpt)) < 0;
      const tri = flip ? [p0, p2, p1] : [p0, p1, p2];
      if (flip) n.negate();
      for (const p of tri) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    put(BRONZE, geo);
  }

  // ---- lid: three square stepped tiers and a cap ----------------------------------------
  sq(BRONZE, 0.3, 2.29, 2.325, 0.01);
  sq(BRONZE, 0.22, 2.325, 2.355, 0.008);
  sq(BRONZE, 0.13, 2.355, 2.38, 0.007);
  sq(BRONZE, 0.055, 2.38, 2.4, 0.006);

  // ---- the crystal: a quartz point, its own mesh, centred on its own origin -----------
  // six sides with slightly uneven radii, a long point up and a short point down
  const CY = 2.13;                                             // tips at 1.99 and 2.27
  const RADII = [0.066, 0.058, 0.07, 0.061, 0.068, 0.056];
  const ring = (y, sc) => RADII.map((r, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    return new THREE.Vector3(Math.sin(a) * r * sc, y, Math.cos(a) * r * sc);
  });
  const lo = ring(-0.055, 1), hi = ring(0.045, 0.97);
  const top = new THREE.Vector3(0.008, 0.14, -0.004), bot = new THREE.Vector3(-0.004, -0.14, 0.003);
  const cp = [];
  const tri = (a, b, c) => cp.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    tri(lo[i], lo[j], hi[j]); tri(lo[i], hi[j], hi[i]);        // prism
    tri(hi[i], hi[j], top);                                    // upper point
    tri(lo[j], lo[i], bot);                                    // lower point
  }
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  cgeo.computeVertexNormals();
  const crystal = new THREE.Mesh(merge([cgeo]), CRYSTAL);
  crystal.name = 'crystal';
  crystal.position.set(0, CY, 0);
  g.add(crystal);

  for (const [mat, geos] of PARTS) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const q = nd.isMesh && nd.geometry.attributes.position; if (!q) return;
    const add = (mat) => { for (let i = 0; i < q.count; i++) bb.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mat)); };
    if (nd.isInstancedMesh) { for (let c = 0; c < nd.count; c++) { nd.getMatrixAt(c, im); add(m.multiplyMatrices(nd.matrixWorld, im)); } return; }
    add(nd.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });

  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.parts = { crystal };
  g.userData.light = [r3(crystal.position.x), r3(crystal.position.y), r3(crystal.position.z)];
  return g;
}
