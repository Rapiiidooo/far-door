// icicle_cluster, arm C: a second reading, hand-built triangle lists.
// Icicles grow where the melt drips, so here they hang in fused clumps rather than an even
// comb: four clumps of two or three and three singles, thirteen in all. Each group hangs from
// a faceted heart of deep ice under the crust, the old thick ice where its roots have fused;
// that heart is the deep-ice core, showing between and above the roots. The icicles are
// irregular five-sided spikes, each ridge at its own radius, twisted a little and bent to an
// off-centre tip. The crust is eight overlapping slabs of glacier-white ice, bevelled along
// the front and underneath, sharing one flat top and a straight back; their fronts step.
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
  const tris = new Map([[FROST, []], [ICE, []], [DEEP, []]]);

  let seed = 42092026;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const ZB = -0.15;   // the crust's back, flush with the rock face; its top is y = 0
  const YC = -0.14;   // the crust's underside at the roots, where lengths are measured from

  // --- triangles, wound to face away from a point inside the solid ------------------------
  const E1 = V(0, 0, 0), E2 = V(0, 0, 0), M = V(0, 0, 0);
  const face = (m, a, b, c, ref) => {
    E1.subVectors(b, a).cross(E2.subVectors(c, a));
    if (E1.lengthSq() < 1e-14) return;
    M.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(ref);
    const [p, q] = E1.dot(M) >= 0 ? [b, c] : [c, b];
    tris.get(m).push(a.x, a.y, a.z, p.x, p.y, p.z, q.x, q.y, q.z);
  };
  const centre = (R) => R.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / R.length);
  // a stack of rings with the same vertex count; caps close the first and last ring
  const stack = (m, rings, { capTop = true, capBottom = true } = {}) => {
    const C = rings.map(centre);
    for (let i = 0; i < rings.length - 1; i++) {
      const R0 = rings[i], R1 = rings[i + 1], n = R0.length;
      const ref = C[i].clone().add(C[i + 1]).multiplyScalar(0.5);
      for (let k = 0; k < n; k++) {
        const a = R0[k], b = R0[(k + 1) % n], c = R1[(k + 1) % n], d = R1[k];
        face(m, a, b, c, ref);
        face(m, a, c, d, ref);
      }
    }
    const cap = (R, inward) => {
      const c0 = centre(R);
      for (let k = 0; k < R.length; k++) face(m, c0, R[k], R[(k + 1) % R.length], inward);
    };
    const whole = centre(C);
    if (capTop) cap(rings[0], whole);
    if (capBottom) cap(rings[rings.length - 1], whole);
  };

  // --- the crust: eight plates ------------------------------------------------------------
  // Overlapping slabs whose shared ends hide inside each other, so the crust reads as one
  // piece with a stepped front. The deepest plates lie over the clumps, where the most melt
  // has frozen. Only the front, the underside and the two outer ends are bevelled.
  const PLATES = [
    // x from, x to, front at left, front at right, thickness
    [-1.2, -0.86, 0.1, 0.12, 0.115],
    [-0.94, -0.54, 0.14, 0.15, 0.145],
    [-0.62, -0.32, 0.11, 0.1, 0.12],
    [-0.4, 0.02, 0.15, 0.145, 0.15],
    [-0.06, 0.2, 0.11, 0.115, 0.12],
    [0.12, 0.54, 0.14, 0.15, 0.14],
    [0.46, 0.8, 0.115, 0.125, 0.12],
    [0.72, 1.2, 0.14, 0.12, 0.13],
  ];
  PLATES.forEach(([x0, x1, zl, zr, T], i) => {
    const xm = (x0 + x1) / 2 + (rnd() - 0.5) * 0.08, zm = Math.max(zl, zr) + 0.012;
    const endL = i === 0 ? 1 : 0, endR = i === PLATES.length - 1 ? 1 : 0;
    // outline from the back-left corner: back, right side, the front in two runs, left side
    const ring = (y, front, back, side, jit = 0) => [
      [x0 + endL * side, ZB + back], [x1 - endR * side, ZB + back],
      [x1 - endR * side, zr - front], [xm, zm - front], [x0 + endL * side, zl - front],
    ].map(([x, z]) => V(x, y + (jit ? (rnd() - 0.5) * jit : 0), z));
    // every other top sits 3 mm lower, so overlapping tops never fight for the same depth
    stack(FROST, [
      ring(i % 2 ? -0.003 : 0, 0.035, 0, 0.03),
      ring(-0.04, 0, 0, 0),
      ring(-0.7 * T, 0.012, 0, 0.01),
      ring(-T, 0.05, 0.035, 0.05, 0.03),
    ]);
  });

  // --- the icicles: irregular five-sided spikes -----------------------------------------
  // rings at fractions t of the length below YC, radius as a fraction of the root radius
  const TS = [[-0.1, 0.9], [0, 1], [0.14, 0.8], [0.34, 0.58], [0.58, 0.36], [0.8, 0.18], [1, 0]];
  const spike = (x, z, L, r, top = YC + 0.08) => {
    const n = 5, phase = rnd() * 6.283, tw = (rnd() - 0.5) * 0.7;
    const jr = Array.from({ length: n }, () => 0.86 + 0.28 * rnd());
    const ja = Array.from({ length: n }, () => (rnd() - 0.5) * 0.3);
    const bx = (rnd() - 0.5) * 0.06 * L, bz = (rnd() - 0.5) * 0.03 * L;
    const rings = TS.map(([t, f]) => {
      const y = t < 0 ? top : YC - t * L;
      const tt = Math.max(0, t), ox = bx * tt * tt, oz = bz * tt * tt;
      if (f === 0) return Array.from({ length: n }, () => V(x + ox, y, z + oz));
      return Array.from({ length: n }, (_, k) => {
        const a = phase + (k / n) * 6.283 + ja[k] + tw * tt, rr = r * f * jr[k];
        return V(x + ox + Math.sin(a) * rr, y, z + oz + Math.cos(a) * rr);
      });
    });
    stack(ICE, rings, { capBottom: false });
  };
  // a heart of deep ice: an irregular seven-sided gem hanging from the crust
  const heart = (x, z, wx, wz, d) => {
    const n = 7, phase = rnd() * 6.283;
    const jr = Array.from({ length: n }, () => 0.85 + 0.3 * rnd());
    const ring = (y, s, dx = 0) => Array.from({ length: n }, (_, k) => {
      const a = phase + (k / n) * 6.283;
      return V(x + dx + Math.sin(a) * wx * s * jr[k], y, z + Math.cos(a) * wz * s * jr[k]);
    });
    const tip = (rnd() - 0.5) * 0.3 * wx;
    stack(DEEP, [ring(YC + 0.06, 0.75), ring(YC - 0.02, 1), ring(YC - 0.5 * d, 0.72, tip * 0.5), ring(YC - d, 0.18, tip)]);
  };

  const ZI = -0.02;   // the icicles' line, about the middle of the crust's depth
  const CLUMPS = [
    // heart: x, half-width, half-depth, drop; then its icicles: x, length, root radius, z nudge
    { x: -1.05, w: 0.07, dz: 0.065, d: 0.07, ic: [[-1.05, 0.36, 0.056, 0.01]] },
    { x: -0.745, w: 0.2, dz: 0.1, d: 0.17, ic: [[-0.86, 0.62, 0.072, 0.012], [-0.745, 0.96, 0.096, -0.012], [-0.635, 0.4, 0.06, 0.014]] },
    { x: -0.46, w: 0.08, dz: 0.075, d: 0.08, ic: [[-0.46, 0.52, 0.066, -0.006]] },
    { x: -0.18, w: 0.19, dz: 0.11, d: 0.24, ic: [[-0.25, 1.4, 0.118, 0.004], [-0.105, 0.8, 0.088, -0.01]] },
    { x: 0.32, w: 0.21, dz: 0.1, d: 0.18, ic: [[0.2, 0.66, 0.076, -0.012], [0.32, 1.1, 0.102, 0.008], [0.44, 0.46, 0.062, -0.01]] },
    { x: 0.64, w: 0.085, dz: 0.078, d: 0.09, ic: [[0.64, 0.6, 0.07, 0.01]] },
    { x: 0.915, w: 0.13, dz: 0.085, d: 0.11, ic: [[0.86, 0.44, 0.06, -0.008], [0.97, 0.3, 0.05, 0.012]] },
  ];
  for (const { x, w, dz, d, ic } of CLUMPS) {
    heart(x, ZI, w, dz, d);
    for (const [ix, L, r, nz] of ic) spike(ix, ZI + nz, L, r);
  }

  // --- merge per material, faceted, with UVs projected over each merged box ---------------
  const A = V(0, 0, 0), B = V(0, 0, 0), Cv = V(0, 0, 0);
  for (const [m, P] of tris) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < P.length; i++) { lo[i % 3] = Math.min(lo[i % 3], P[i]); hi[i % 3] = Math.max(hi[i % 3], P[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    const UV = [];
    for (let t = 0; t < P.length; t += 9) {
      A.fromArray(P, t); B.fromArray(P, t + 3); Cv.fromArray(P, t + 6);
      E1.subVectors(B, A).cross(E2.subVectors(Cv, A));
      const fx = Math.abs(E1.x), fy = Math.abs(E1.y), fz = Math.abs(E1.z);
      for (const q of [A, B, Cv]) {
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
  const box = new THREE.Box3(), v = V(0, 0, 0), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mm) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = box.getCenter(V(0, 0, 0));
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  // the middle of the crust's top edge on the rock side, after the shift: put this on the lip
  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.anchor = [r3(0 - c.x), r3(0 - box.min.y), r3(ZB - c.z)];
  return g;
}
