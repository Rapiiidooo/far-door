// glyph_stela, arm C: coursed masonry with a sunken field (a second reading).
// Every stone is a hand-built chamfered block, so the carved bands are the deep
// chamfered joints between courses. The front is framed by two jambs and a lintel
// round a sunken field 3 cm deep that holds both the lens and, at its foot, the
// glyph panel sunk 8 cm below the face, so lens and glyph read as one unit. Above
// the field the joints run all the way round.
// 1.3 x 2.4 x 0.68 m. Lens centre 1.3 m up, level with the sun mirror's disc.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials ------------------------------------------------------------
  const stone = (color, roughness = 0.9) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const sand = stone(0xb57f4f);
  const sunlit = stone(0xd4a373, 0.86);
  const sienna = stone(0x8a5433, 0.94);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x9a6a35, roughness: 0.45, metalness: 0.7 });
  bronze.name = 'metal';
  // Dormant crystal, its own material so the game can light it (raise
  // emissiveIntensity). Unnamed and just under opaque so the loader's procedural
  // surfaces leave it alone.
  const crystal = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 0,
    roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  // ---- static parts are merged per material at the end ----------------------
  const buckets = new Map();
  const add = (geo, mat) => {
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(geo);
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
      if (x.attributes.uv) uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };

  // ---- chamfered block ------------------------------------------------------
  // 6 faces, 12 edge strips and 8 corner triangles. The side bounds xl/xr may be
  // functions of height so a block follows the slab's taper. Each face is sorted
  // round its centroid and wound away from the block's centre; flat shaded.
  const block = (xl, xr, y0, y1, zb, zf, ch) => {
    const X = (f, y) => (typeof f === 'function' ? f(y) : f);
    // a corner point: signs per axis, and which axis sits at the full extent
    const pt = (s, full) => {
      const y = s[1] < 0 ? y0 + (full === 1 ? 0 : ch) : y1 - (full === 1 ? 0 : ch);
      const x = s[0] < 0 ? X(xl, y) + (full === 0 ? 0 : ch) : X(xr, y) - (full === 0 ? 0 : ch);
      const z = s[2] < 0 ? zb + (full === 2 ? 0 : ch) : zf - (full === 2 ? 0 : ch);
      return new THREE.Vector3(x, y, z);
    };
    const S = [-1, 1], faces = [];
    for (let i = 0; i < 3; i++) for (const s of S) {
      const f = [];
      for (const a of S) for (const b of S) { const sg = []; sg[i] = s; sg[(i + 1) % 3] = a; sg[(i + 2) % 3] = b; f.push(pt(sg, i)); }
      faces.push(f);
    }
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3, k = (i + 2) % 3;
      for (const si of S) for (const sj of S) {
        const f = [];
        for (const sk of S) { const sg = []; sg[i] = si; sg[j] = sj; sg[k] = sk; f.push(pt(sg, i), pt(sg, j)); }
        faces.push(f);
      }
    }
    for (const sx of S) for (const sy of S) for (const sz of S) faces.push([0, 1, 2].map((i) => pt([sx, sy, sz], i)));
    const mid = new THREE.Vector3((X(xl, (y0 + y1) / 2) + X(xr, (y0 + y1) / 2)) / 2, (y0 + y1) / 2, (zb + zf) / 2);
    const P = [], N = [], U = [];
    const c = new THREE.Vector3(), n0 = new THREE.Vector3(), u = new THREE.Vector3(), w = new THREE.Vector3();
    const d = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
    for (const pts of faces) {
      c.set(0, 0, 0); for (const p of pts) c.add(p); c.multiplyScalar(1 / pts.length);
      n0.subVectors(c, mid).normalize();
      u.subVectors(pts[0], c); u.addScaledVector(n0, -u.dot(n0)).normalize();
      w.crossVectors(n0, u);
      const ang = (p) => { d.subVectors(p, c); return Math.atan2(d.dot(w), d.dot(u)); };
      pts.sort((p, q) => ang(p) - ang(q));
      for (let t = 1; t < pts.length - 1; t++) {
        const tri = [pts[0], pts[t], pts[t + 1]];
        n.crossVectors(e1.subVectors(tri[1], tri[0]), e2.subVectors(tri[2], tri[0]));
        if (n.lengthSq() < 1e-14) continue;
        n.normalize();
        const ax = Math.abs(n.x) > Math.abs(n.y) ? (Math.abs(n.x) > Math.abs(n.z) ? 0 : 2) : (Math.abs(n.y) > Math.abs(n.z) ? 1 : 2);
        for (const p of tri) {
          P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z);
          U.push(ax === 0 ? p.z : p.x, ax === 1 ? p.z : p.y);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    return geo;
  };

  // ---- base: two 0.25 m tiers, stepped mostly in width ----------------------
  add(block(-0.65, 0.65, 0, 0.25, -0.34, 0.34, 0.03), sienna);
  add(block(-0.575, 0.575, 0.25, 0.5, -0.32, 0.32, 0.025), sand);

  // ---- shaft ------------------------------------------------------------------
  const Y0 = 0.5, YT = 2.04, ZF = 0.3, ZB = -0.3, CH = 0.035;
  const hw = (y) => 0.5 - (0.05 * (y - Y0)) / (YT - Y0);
  const L = (y) => -hw(y), R = (y) => hw(y);
  const FW = 0.32, FY1 = 1.62, FZ = ZF - 0.03;                   // sunken field: half width, top, floor
  const PW = 0.48, PY0 = Y0, PY1 = Y0 + PW, PZ = ZF - 0.08;     // panel at the field's foot
  const LY = 1.3, LR = 0.225;                                    // lens centre height, radius
  // courses behind the front frame; their chamfered joints are the carved bands
  for (const [a, b] of [[Y0, 0.68], [0.68, 1.16], [1.16, 1.66]]) add(block(L, R, a, b, ZB, PZ, CH), sand);
  // above the field the courses are full depth, so their joints run all round
  add(block(L, R, 1.66, 1.84, ZB, ZF, CH), sand);
  add(block(L, R, 1.84, YT, ZB, ZF, CH), sand);
  // front frame: jambs, lintel, and the field floor round the panel
  add(block(L, -FW, Y0, 1.66, PZ - 0.03, ZF, 0.02), sunlit);
  add(block(FW, R, Y0, 1.66, PZ - 0.03, ZF, 0.02), sunlit);
  add(block(-FW, FW, FY1, 1.66, PZ - 0.03, ZF, 0.012), sunlit);
  add(block(-FW, -PW / 2, Y0, PY1, PZ - 0.03, FZ, 0.008), sand);
  add(block(PW / 2, FW, Y0, PY1, PZ - 0.03, FZ, 0.008), sand);
  add(block(-FW, FW, PY1, FY1, PZ - 0.03, FZ, 0.008), sand);
  add(block(-PW / 2, PW / 2, PY0, PY1, PZ - 0.03, PZ + 0.006, 0.004), sienna);   // panel floor

  // ---- crown: two receding chamfered steps and a chamfered cap ----------------
  add(block(-0.43, 0.43, YT, 2.16, -0.27, 0.27, 0.03), sunlit);
  add(block(-0.34, 0.34, 2.16, 2.28, -0.22, 0.22, 0.03), sunlit);
  add(block(-0.25, 0.25, 2.28, 2.4, -0.16, 0.16, 0.05), sunlit);

  // ---- lens in a faceted bronze collar, facing +Z --------------------------------
  const collar = new THREE.TorusGeometry(0.25, 0.028, 6, 40);
  collar.translate(0, LY, FZ + 0.012);
  const facets = collar.toNonIndexed();                          // six flat facets round the tube
  facets.computeVertexNormals();
  add(facets, bronze);
  const seat = new THREE.CylinderGeometry(0.278, 0.278, 0.012, 40);
  seat.rotateX(Math.PI / 2);
  seat.translate(0, LY, FZ + 0.006);
  add(seat, bronze);
  const disc = new THREE.CylinderGeometry(LR, LR, 0.03, 40);
  disc.rotateX(Math.PI / 2);
  disc.translate(0, 0, -0.01);
  const DR = 0.9, cap = Math.asin(LR / DR);
  const dome = new THREE.SphereGeometry(DR, 40, 4, 0, Math.PI * 2, 0, cap);
  dome.rotateX(Math.PI / 2);                                     // cap axis +Y -> +Z
  dome.translate(0, 0, 0.005 - DR * Math.cos(cap));
  const lens = new THREE.Mesh(merge([disc, dome]), crystal);
  lens.name = 'lens';
  lens.position.set(0, LY, FZ);
  g.add(lens);
  const LZ = FZ + 0.005 + DR - DR * Math.cos(cap);              // apex of the dome

  for (const [mat, geos] of buckets) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const p = nd.isMesh && nd.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (nd.isInstancedMesh) { for (let k = 0; k < nd.count; k++) { nd.getMatrixAt(k, im); put(m.multiplyMatrices(nd.matrixWorld, im)); } return; }
    put(nd.matrixWorld);
  });
  const ctr = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= box.min.y; o.position.z -= ctr.z; });

  const r3 = (x, y, z) => [+(x - ctr.x).toFixed(3), +(y - box.min.y).toFixed(3), +(z - ctr.z).toFixed(3)];
  g.userData.parts = { lens };
  g.userData.lens = { center: r3(0, LY, LZ), radius: LR };               // front apex of the lens
  g.userData.panel = { center: r3(0, (PY0 + PY1) / 2, PZ + 0.006), size: PW }; // recess floor, faces +Z
  return g;
}
