// icicle_cluster, arm A: primitives.
// A crust of glacier-white ice 2.4 m long: seven eight-sided bars along X, their top-back
// corner squared so the top is flat and the back straight, roughened by squashed icosahedra
// (lumps along the front, a collar round each root, drips, a knob at each end). Twelve
// six-sided cones hang from it, the three longest a frustum over a cone for a fat root and a
// long slow tip. In each root a deep-ice cone turned half a facet breaks out through the
// middle of every face as dark ribs: the core. Two pairs are fused by a flattened web cone,
// and one icicle is doubled by a spur hanging from a bulge on its side.
// The lip is not part of the asset: the crust's top is the plane y = anchor[1] and its back
// the plane z = anchor[2]. Set the anchor on a ledge edge whose face drops away towards +Z.
export default function (THREE) {
  const g = new THREE.Group();
  g.userData.mounts = 'top';

  const mat = (hex, rough) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
  // Ice has no recipe in the contract's list, so these stay unnamed; the game gives ice its
  // gloss and translucency at load.
  const FROST = mat(0xe9f2f6, 0.85);
  const ICE = mat(0xa9d2e3, 0.35);
  const DEEP = mat(0x5b9bbd, 0.4);
  const bins = new Map([[FROST, []], [ICE, []], [DEEP, []]]);
  const put = (m, geo) => bins.get(m).push(geo.index ? geo.toNonIndexed() : geo);

  let seed = 24092026;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const ICO = 0.8507;   // an icosahedron's reach along each axis, per unit of radius

  // --- the crust: top on y = 0, back on z = ZB --------------------------------------------
  const ZB = -0.15, OCT = Math.cos(Math.PI / 8);
  const BARS = [
    // x from, x to, depth, thickness
    [-1.15, -0.8, 0.23, 0.115],
    [-0.86, -0.46, 0.26, 0.14],
    [-0.52, -0.1, 0.28, 0.15],
    [-0.16, 0.2, 0.25, 0.13],
    [0.14, 0.52, 0.28, 0.15],
    [0.46, 0.84, 0.26, 0.14],
    [0.78, 1.15, 0.22, 0.11],
  ];
  for (const [x0, x1, depth, thick] of BARS) {
    // eight sides with a face up: flat top, front, back and underside, chamfers between
    const geo = new THREE.CylinderGeometry(1, 1, x1 - x0, 8, 1, false, Math.PI / 8);
    geo.rotateZ(Math.PI / 2);
    geo.scale(1, thick / 2 / OCT, depth / 2 / OCT);
    geo.translate((x0 + x1) / 2, -thick / 2, ZB + depth / 2);
    // square the top-back corner, so the crust sits flush in the corner of the lip
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > -1e-6 && p.getZ(i) < ZB + depth / 2) p.setZ(i, ZB);
    put(FROST, geo);
  }
  // the crust's section at x: the deepest bar over it
  const crustAt = (x) => {
    let depth = 0, thick = 0.11;
    for (const [x0, x1, d, t] of BARS) if (x >= x0 && x <= x1 && d > depth) { depth = d; thick = t; }
    depth = depth || 0.24;
    return { thick, depth, zc: ZB + depth / 2, front: ZB + depth };
  };
  const lump = (x, y, z, r, sx, sy, sz) => {
    const geo = new THREE.IcosahedronGeometry(r, 0);
    geo.rotateY(rnd() * Math.PI);
    geo.rotateX((rnd() - 0.5) * 0.6);
    geo.scale(sx, sy, sz);
    geo.translate(x, y, z);
    put(FROST, geo);
  };
  // lumps along the front, low enough that none rises above the top
  for (const x of [-1.02, -0.83, -0.63, -0.47, -0.27, -0.12, 0.05, 0.17, 0.34, 0.5, 0.66, 0.82, 0.97]) {
    const { thick, front } = crustAt(x);
    const r = 0.055 + 0.03 * rnd();
    const sy = 0.85;
    lump(x, Math.min(-0.62 * thick, -ICO * r * sy - 0.012), front - 0.045 + 0.02 * rnd(), r, 1.5, sy, 0.65);
  }
  // a knob at each end
  for (const sx of [-1, 1]) lump(sx * 1.1, -0.064, ZB + 0.12, 0.1, 1.0, 0.64, 1.15);

  // --- the icicles ----------------------------------------------------------------------
  // Built pointing up from the root (y = 0 at the hidden top, tip at y = Lc), then turned
  // over as one, so every part keeps the same facet phase.
  const Y0 = -0.05;   // hidden tops, inside the crust
  const YC = -0.15;   // the crust's underside, where an icicle's length is measured from
  const HEX = Math.cos(Math.PI / 6);
  const hang = (parts, x, z) => {
    for (const [m, geo] of parts) {
      geo.rotateX(Math.PI);
      geo.translate(x, Y0, z);
      put(m, geo);
    }
  };
  const icicle = (x, z, L, r, spin, twoStage) => {
    const Lc = L + (Y0 - YC);
    const parts = [];
    let apo, rt;   // apo: the outer shell's apothem at depth d below the hidden top
    if (twoStage) {
      // a quick taper to a waist, then a long slow cone on the same facets
      const h1 = 0.36 * Lc, k = 0.5;
      rt = r / (1 - ((1 - k) * (Y0 - YC)) / h1);
      const fr = new THREE.CylinderGeometry(k * rt, rt, h1, 6, 1, true, spin);
      fr.translate(0, h1 / 2, 0);
      const lo = new THREE.ConeGeometry(k * rt, Lc - h1, 6, 1, true, spin);
      lo.translate(0, h1 + (Lc - h1) / 2, 0);
      parts.push([ICE, fr], [ICE, lo]);
      apo = (d) => HEX * rt * (1 - ((1 - k) * d) / h1);
    } else {
      rt = (r * Lc) / L;
      const c = new THREE.ConeGeometry(rt, Lc, 6, 1, true, spin);
      c.translate(0, Lc / 2, 0);
      parts.push([ICE, c]);
      apo = (d) => HEX * rt * (1 - d / Lc);
    }
    // the core's corners stand proud of the faces from the crust down to dEnd
    const rc = 1.08 * rt, dEnd = Y0 - YC + 0.3 * L;
    const Lk = dEnd / (1 - apo(dEnd) / rc);
    const core = new THREE.ConeGeometry(rc, Lk, 6, 1, true, spin + Math.PI / 6);
    core.translate(0, Lk / 2, 0);
    parts.push([DEEP, core]);
    hang(parts, x, z);
  };

  const ICICLES = [
    // x, length below the crust, radius at the crust, z nudge, two-stage
    [-1.04, 0.32, 0.058, 0.01],
    [-0.875, 0.66, 0.08, -0.012],
    [-0.705, 0.44, 0.066, 0.016],
    [-0.5, 0.98, 0.1, 0, true],
    [-0.285, 1.4, 0.125, 0.004, true],
    [-0.14, 0.86, 0.09, 0.016],
    [0.03, 0.52, 0.072, -0.004],
    [0.22, 0.74, 0.085, -0.014],
    [0.43, 1.12, 0.112, 0.01, true],
    [0.57, 0.6, 0.074, -0.016],
    [0.78, 0.38, 0.062, 0.008],
    [1.04, 0.3, 0.052, 0.012],
  ];
  const at = ICICLES.map(([x, L, r, dz, two]) => {
    const { thick, zc } = crustAt(x);
    const z = zc + dz;
    icicle(x, z, L, r, rnd() * (Math.PI / 3), two);
    // a frosted collar where it leaves the crust
    lump(x, -thick + 0.008, z, r * 1.2, 1.25, 0.62, 0.8);
    return { x, z, L };
  });
  // drips of refrozen melt between the roots
  for (const x of [-0.95, -0.4, 0.125, 0.32, 0.9]) {
    const { thick, zc } = crustAt(x);
    lump(x, -thick + 0.004, zc + (rnd() - 0.5) * 0.05, 0.045 + 0.02 * rnd(), 1.3, 0.8, 1);
  }

  // fused pairs: a flattened cone fills the fork between two neighbours
  for (const [i, j, frac] of [[4, 5, 0.45], [8, 9, 0.5]]) {
    const a = at[i], b = at[j];
    const Lw = Y0 - YC + frac * Math.min(a.L, b.L), rw = Math.abs(b.x - a.x) * 0.62;
    const web = new THREE.ConeGeometry(rw, Lw, 6, 1, true, Math.PI / 6);
    web.scale(1, 1, 0.5);
    web.translate(0, Lw / 2, 0);
    hang([[ICE, web]], (a.x + b.x) / 2, (a.z + b.z) / 2);
  }
  // the doubled one: a bulge on its side and a spur hanging from it
  {
    const a = at[3], side = -1, d = Y0 - YC + 0.3;
    const bulge = new THREE.IcosahedronGeometry(0.05, 0);
    bulge.scale(1, 1.4, 0.9);
    bulge.translate(side * 0.058, d, 0);
    const Ls = 0.36;
    const sp = new THREE.ConeGeometry(0.036, Ls, 6, 1, true, 0.3);
    sp.translate(side * 0.07, d + Ls / 2, 0);
    hang([[ICE, bulge], [ICE, sp]], a.x, a.z);
  }

  // --- merge per material, faceted, with UVs projected over each merged box ---------------
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  const E1 = new THREE.Vector3(), E2 = new THREE.Vector3();
  for (const [m, geos] of bins) {
    const P = [];
    for (const geo of geos) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2);
        if (E1.subVectors(B, A).cross(E2.subVectors(C, A)).lengthSq() < 1e-14) continue;
        P.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
      }
    }
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < P.length; i++) { lo[i % 3] = Math.min(lo[i % 3], P[i]); hi[i % 3] = Math.max(hi[i % 3], P[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    const UV = [];
    for (let t = 0; t < P.length; t += 9) {
      A.fromArray(P, t); B.fromArray(P, t + 3); C.fromArray(P, t + 6);
      E1.subVectors(B, A).cross(E2.subVectors(C, A));
      const fx = Math.abs(E1.x), fy = Math.abs(E1.y), fz = Math.abs(E1.z);
      for (const q of [A, B, C]) {
        const x = q.x - lo[0], y = q.y - lo[1], z = q.z - lo[2];
        const [u, v] = fy >= fx && fy >= fz ? [x, z] : fx >= fz ? [z, y] : [x, y];
        UV.push(u / su, v / sv);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, m));
  }

  // --- placement: lowest tip on y = 0, centred on x and z (measured on vertices) ----------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mm) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  // the middle of the crust's top edge on the rock side, after the shift: put this on the lip
  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.anchor = [r3(0 - c.x), r3(0 - box.min.y), r3(ZB - c.z)];
  return g;
}
