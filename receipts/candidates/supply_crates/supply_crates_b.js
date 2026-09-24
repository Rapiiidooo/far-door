// supply_crates, candidate B: profiles. Each crate wall is one board profile, with
// V joints between the boards, extruded along the wall; battens are chamfered sections
// extruded along their length; the barrel is a single lathe profile running up the
// staves, over the chime and down to a sunk head, with lathe bands; rope handles are
// tubes sagging between extruded cleats; straw is extruded fringe; the map is a lathe
// with a spiral end. 1.8 m wide, 1.2 m deep, 1.3 m tall.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  // Values stay distinct per material: the loader merges by value, not by name.
  const TIMBER = mat(0x8a6a48, 'timber', { roughness: 0.9 });
  const DARK = mat(0x4b2e1e, 'timber', { roughness: 0.95, side: THREE.DoubleSide });
  const ROPE = mat(0xb49a6a, 'fabric', { roughness: 0.92 });
  const STRAW = mat(0xb49a6a, 'foliage', { roughness: 0.98, side: THREE.DoubleSide });
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });
  const PAPER = mat(0xe6d3ae, 'fabric', { roughness: 0.85 });
  const LEATHER = mat(0x4b2e1e, 'fabric', { roughness: 0.7 });

  const flat = (geo) => { const o = geo.index ? geo.toNonIndexed() : geo; o.computeVertexNormals(); return o; };
  const add = (parent, geo, m, at) => {
    const me = new THREE.Mesh(flat(geo), m);
    if (at) me.position.copy(at);
    parent.add(me);
    return me;
  };
  const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => V2(x, y)));
  const extrude = (pts, depth) => new THREE.ExtrudeGeometry(Array.isArray(pts) ? shape(pts) : pts, { depth, bevelEnabled: false, curveSegments: 4 });
  const lathe = (rows, seg) => new THREE.LatheGeometry(rows.map(([r, y]) => V2(r, y)), seg);
  const orient = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // Sweep a profile drawn in (a, b): a maps to A, b to B, and it is extruded along A x B,
  // centred on `at` unless `from` is set. A x B keeps the basis a rotation, never a mirror.
  const sweep = (parent, pts, len, A, B, at, m, from = false) => {
    const geo = extrude(pts, len);
    if (!from) geo.translate(0, 0, -len / 2);
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(A, B, A.clone().cross(B)));
    return add(parent, geo, m, at);
  };

  // --- profiles ---------------------------------------------------------------------------------
  const T = 0.022, VJ = 0.011;            // board thickness, V joint depth
  // n boards over `h`, drawn across (outward, along): the outer face at a = 0
  const boards = (h, n) => {
    const pts = [[0, 0]], ph = h / n;
    for (let i = 1; i < n; i++) pts.push([0, i * ph - VJ], [-VJ, i * ph], [0, i * ph + VJ]);
    return [...pts, [0, h], [-T, h], [-T, 0]];
  };
  // a batten section drawn across (width, outward), outer edges chamfered
  const batten = (w, t, c = 0.012) => [[-w / 2, 0], [w / 2, 0], [w / 2, t - c], [w / 2 - c, t], [-w / 2 + c, t], [-w / 2, t - c]];
  const cleat = [[-0.12, 0], [0.12, 0], [0.12, 0.03], [0.1, 0.05], [-0.1, 0.05], [-0.12, 0.03]];

  // --- a crate: walls, battens, nails, rope handles, a lid ----------------------------------------
  const BW = 0.07, BT = 0.026;
  const nail = (parent, at, out) => {
    const me = add(parent, lathe([[0, 0], [0.011, 0], [0.01, 0.004], [0, 0.007]], 6), BRONZE, at);
    me.quaternion.copy(orient(Y, out));
  };
  const crate = (w, h, d, { lid = true, fill = 1 } = {}) => {
    const c = new THREE.Group();
    const n = Math.max(2, Math.round(h / 0.2)), fh = lid ? h : h * fill;
    add(c, new THREE.BoxGeometry(w - 2 * T, fh - 0.01, d - 2 * T), DARK, V(0, fh / 2, 0));
    for (const s of [-1, 1]) {
      const zOut = V(0, 0, s), xOut = V(s, 0, 0);
      sweep(c, boards(h, n), w, zOut, Y, V(0, 0, s * d / 2), TIMBER);
      sweep(c, boards(h, n), d - 2 * T, xOut, Y, V(s * w / 2, 0, 0), TIMBER);
      for (const k of [-1, 1]) {
        sweep(c, batten(BW, BT), h, X, zOut, V(k * (w / 2 - BW / 2), h / 2, s * d / 2), TIMBER);
        for (const y of [0.04, h - 0.04]) nail(c, V(k * (w / 2 - BW / 2), y, s * (d / 2 + BT)), zOut);
      }
      for (const y of [BW / 2, h - BW / 2]) sweep(c, batten(BW, BT), d + 2 * BT, Y, xOut, V(s * w / 2, y, 0), TIMBER);
      // a rope handle hanging from a cleat on each end
      const hy = h * 0.66, x0 = s * w / 2;
      sweep(c, cleat, 0.03, V(0, 0, -s), Y, V(x0, hy - 0.025, 0), TIMBER, true);
      const xr = x0 + s * 0.034;
      const loop = new THREE.CatmullRomCurve3([V(xr, hy, -0.085), V(xr + s * 0.012, hy - 0.07, -0.07), V(xr + s * 0.02, hy - 0.105, 0),
        V(xr + s * 0.012, hy - 0.07, 0.07), V(xr, hy, 0.085)]);
      add(c, new THREE.TubeGeometry(loop, 10, 0.017, 5, false), ROPE);
      for (const z of [-0.085, 0.085]) add(c, new THREE.SphereGeometry(0.026, 5, 3), ROPE, V(xr, hy + 0.004, z));
    }
    if (lid) {
      sweep(c, boards(d, 4), w, Y, Z, V(0, h + T, -d / 2), TIMBER);
      for (const k of [-1, 1]) sweep(c, batten(BW, BT), d, X, Y, V(k * (w / 2 - 0.12), h + T, 0), TIMBER);
    }
    return c;
  };

  // --- the stack -----------------------------------------------------------------------------------
  const b1 = crate(0.8, 0.62, 0.58);
  b1.position.set(-0.46, 0, -0.3);
  g.add(b1);
  const b2 = crate(0.72, 0.56, 0.52);
  b2.position.set(-0.43, 0.62 + T, -0.3);
  b2.rotation.y = 0.14;
  g.add(b2);

  // --- the open crate, filled with straw, a map standing in it, the lid against its front ---------
  const b3 = crate(0.74, 0.5, 0.56, { lid: false, fill: 0.8 });
  b3.position.set(0.45, 0, -0.26);
  b3.rotation.y = -0.08;
  g.add(b3);
  add(b3, lathe([[0, 0.5], [0.12, 0.49], [0.22, 0.46], [0.3, 0.42], [0.34, 0.39], [0.34, 0.38]], 9), STRAW).scale.set(1, 1, 0.78);
  // fringe: combs of straw stalks, crossing at different turns so they read from every side
  const fringe = (len, hmax) => {
    const pts = [[-len / 2, 0]];
    const k = Math.round(len / 0.045);
    for (let i = 0; i < k; i++) {
      const x0 = -len / 2 + (i * len) / k, x1 = x0 + len / k, hh = hmax * (0.45 + 0.55 * rnd());
      pts.push([x0 + (x1 - x0) * 0.35, hh], [x0 + (x1 - x0) * 0.6, hh * 0.35]);
    }
    pts.push([len / 2, 0]);
    return pts;
  };
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI + rnd() * 0.3, geo = extrude(fringe(0.5 - rnd() * 0.12, 0.14), 0.008);
    geo.translate(0, 0, -0.004);
    const me = add(b3, geo, STRAW, V((rnd() - 0.5) * 0.14, 0.4, (rnd() - 0.5) * 0.1));
    me.rotation.set((rnd() - 0.5) * 0.4, a, (rnd() - 0.5) * 0.3);
  }
  // the rolled map, leaning up out of the straw, with a spiral end and two ties
  const mapA = V(-0.07, 0.28, -0.05), mapB = V(0.12, 0.86, 0.05), ML = mapA.distanceTo(mapB);
  const q = orient(Y, mapB.clone().sub(mapA));
  add(b3, lathe([[0, 0], [0.042, 0], [0.042, ML], [0, ML]], 10), PAPER, mapA).quaternion.copy(q);
  for (const f of [0.6, 0.84]) {
    add(b3, lathe([[0.041, -0.012], [0.047, -0.012], [0.047, 0.012], [0.041, 0.012]], 10), LEATHER, mapA.clone().lerp(mapB, f)).quaternion.copy(q);
  }
  const spiral = [];
  {
    const o = [], i = [], TT = 2.3 * Math.PI * 2, b = 0.028 / TT;
    for (let k = 0; k <= 26; k++) {
      const th = (k / 26) * TT, r = 0.008 + b * th;
      o.push([(r + 0.0035) * Math.cos(th), (r + 0.0035) * Math.sin(th)]);
      i.push([(r - 0.0035) * Math.cos(th), (r - 0.0035) * Math.sin(th)]);
    }
    spiral.push(...o, ...i.reverse());
  }
  const sp = add(b3, extrude(spiral, 0.004), LEATHER, mapB);
  sp.quaternion.copy(orient(Z, mapB.clone().sub(mapA)));
  // the lid, boards and battens, leaning with its battens outward
  const lid = new THREE.Group();
  sweep(lid, boards(0.56, 4), 0.74, Z, Y, V(0, 0, 0), TIMBER);
  for (const k of [-1, 1]) sweep(lid, batten(BW, BT), 0.56, X, Z, V(k * 0.25, 0.28, 0), TIMBER);
  lid.position.set(0, 0.012, 0.28 + 0.24);
  lid.rotation.x = -0.4;
  b3.add(lid);
  // straw fallen out in front of the lid
  for (let i = 0; i < 3; i++) {
    const geo = extrude(fringe(0.22, 0.05), 0.008);
    const me = add(b3, geo, STRAW, V(-0.2 + i * 0.16, 0.004, 0.62 + rnd() * 0.08));
    me.rotation.set(-Math.PI / 2 + 0.25, (rnd() - 0.5) * 1.2, 0);
  }

  // --- the barrel: one profile up the staves, over the chime, down to the head --------------------
  const BH = 0.56, BR = 0.172, BB = 0.045;
  const rAt = (y) => BR + BB * (1 - (2 * y / BH - 1) ** 2);
  const prof = [[0, 0]];
  for (let k = 0; k <= 8; k++) prof.push([rAt((k / 8) * BH), (k / 8) * BH]);
  prof.push([BR - 0.02, BH], [BR - 0.02, BH - 0.03], [0, BH - 0.03]);
  const barrel = new THREE.Group();
  barrel.position.set(-0.52, 0, 0.36);
  g.add(barrel);
  add(barrel, lathe(prof, 14), TIMBER);
  for (const y of [0.05, 0.17, BH - 0.17, BH - 0.05]) {
    const r = rAt(y) + 0.003;
    add(barrel, lathe([[r - 0.006, y - 0.022], [r + 0.006, y - 0.022], [r + 0.008, y], [r + 0.006, y + 0.022], [r - 0.006, y + 0.022]], 14), BRONZE);
  }

  // --- placement: base on y = 0, centred on x and z ----------------------------------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const p = nd.isMesh && nd.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (nd.isInstancedMesh) { for (let c = 0; c < nd.count; c++) { nd.getMatrixAt(c, im); put(m4.multiplyMatrices(nd.matrixWorld, im)); } return; }
    put(nd.matrixWorld);
  });
  const ctr = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bb.min.y; o.position.z -= ctr.z; });
  return g;
}
