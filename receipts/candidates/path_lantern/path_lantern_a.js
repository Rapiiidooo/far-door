// path_lantern, arm A: primitives.
// Boxes and four-sided cylinders (square frustums, flat shaded) build a three-tier
// chamfered basalt base, a 0.2 m shaft cut by two night-basalt groove bands near
// its head, and a capital stepped out twice. A round bronze collar and cup seat
// the crystal: a six-sided prism between two cones, 0.28 m tall, its own mesh.
// The cage is four torus arcs on the diagonals, each drawn through three points
// so it leaves the collar, bows out round the crystal's waist and tucks in under
// a lid of three stepped bronze discs and a knob.
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

  // ---- primitives -------------------------------------------------------------------
  const flat = (geo) => { const f = geo.toNonIndexed(); f.computeVertexNormals(); return f; };
  // a square block or frustum, full widths at the bottom and the top
  const sq = (mat, w0, w1, y0, y1) => {
    const geo = new THREE.CylinderGeometry(w1 / Math.SQRT2, w0 / Math.SQRT2, y1 - y0, 4, 1);
    put(mat, flat(geo.rotateY(Math.PI / 4)).translate(0, (y0 + y1) / 2, 0));
  };
  const box = (mat, w, y0, y1) => put(mat, new THREE.BoxGeometry(w, y1 - y0, w).translate(0, (y0 + y1) / 2, 0));
  const cyl = (mat, r0, r1, y0, y1, seg) => put(mat, new THREE.CylinderGeometry(r1, r0, y1 - y0, seg).translate(0, (y0 + y1) / 2, 0));

  // ---- base: three chamfered tiers ------------------------------------------------------
  box(BASALT, 0.6, 0, 0.1); sq(BASALT, 0.6, 0.56, 0.1, 0.12);
  box(BASALT, 0.46, 0.12, 0.2); sq(BASALT, 0.46, 0.42, 0.2, 0.22);
  box(BASALT, 0.3, 0.22, 0.28); sq(BASALT, 0.3, 0.26, 0.28, 0.3);

  // ---- shaft with two incised grooves near its head -------------------------------------
  const SW = 0.2, GW = 0.16;
  box(BASALT, SW, 0.3, 1.5);
  box(NIGHT, GW, 1.5, 1.545);
  box(BASALT, SW, 1.545, 1.6);
  box(NIGHT, GW, 1.6, 1.645);
  box(BASALT, SW, 1.645, 1.8);

  // ---- capital, stepped out twice, and the bronze seat ----------------------------------
  box(BASALT, 0.26, 1.8, 1.85);
  box(BASALT, 0.32, 1.85, 1.915); sq(BASALT, 0.32, 0.28, 1.915, 1.935);
  cyl(BRONZE, 0.13, 0.12, 1.935, 1.965, 16);
  cyl(BRONZE, 0.035, 0.05, 1.965, 1.995, 12);

  // ---- the cage: four torus arcs on the diagonals ----------------------------------------
  // each through three points [s, y]: s outward along its diagonal, y up
  const circle3 = ([ax, ay], [bx, by], [cx, cy]) => {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    return [ux, uy, Math.hypot(ax - ux, ay - uy)];
  };
  const P0 = [0.105, 1.95], P1 = [0.172, 2.13], P2 = [0.07, 2.31];
  const [ux, uy, RR] = circle3(P0, P1, P2);
  const TAU = Math.PI * 2, wrap = (x) => ((x % TAU) + TAU) % TAU;
  const t0 = Math.atan2(P0[1] - uy, P0[0] - ux), t2 = Math.atan2(P2[1] - uy, P2[0] - ux);
  const arc = wrap(t2 - t0);                                   // counter-clockwise, out and over
  for (let k = 0; k < 4; k++) {
    const rib = new THREE.TorusGeometry(RR, 0.017, 6, 14, arc);
    rib.rotateZ(t0).translate(ux, uy, 0).rotateY(Math.PI / 4 + (k * Math.PI) / 2);
    put(BRONZE, rib);
  }

  // ---- lid: three stepped discs and a knob -----------------------------------------------
  cyl(BRONZE, 0.13, 0.13, 2.29, 2.33, 16);
  cyl(BRONZE, 0.095, 0.095, 2.33, 2.36, 16);
  cyl(BRONZE, 0.055, 0.055, 2.36, 2.38, 12);
  put(BRONZE, new THREE.SphereGeometry(0.022, 10, 6).translate(0, 2.378, 0));

  // ---- the crystal: its own mesh, centred on its own origin so it can turn ----------------
  const CY = 2.13, CR = 0.065;                                  // tips at 1.99 and 2.27
  const low = new THREE.ConeGeometry(CR, 0.08, 6, 1, true).rotateX(Math.PI).translate(0, -0.1, 0);
  const mid = new THREE.CylinderGeometry(CR, CR, 0.1, 6, 1, true).translate(0, -0.01, 0);
  const high = new THREE.ConeGeometry(CR, 0.1, 6, 1, true).translate(0, 0.09, 0);
  const cgeo = merge([flat(low), flat(mid), flat(high)]);
  const crystal = new THREE.Mesh(cgeo, CRYSTAL);
  crystal.name = 'crystal';
  crystal.position.set(0, CY, 0);
  g.add(crystal);

  for (const [mat, geos] of PARTS) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });

  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.parts = { crystal };
  g.userData.light = [r3(crystal.position.x), r3(crystal.position.y), r3(crystal.position.z)];
  return g;
}
