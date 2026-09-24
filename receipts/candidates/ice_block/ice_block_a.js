// ice_block, candidate A: primitives. A deep-ice core box; twelve glacier white bevel bars
// (boxes turned 45 degrees about their length) meeting at eight octahedron corners; each
// face crazed into fourteen staggered plates of clear ice, square frusta each leaning a
// few centimetres, their seams reading as cracks. On every wall one plate has spalled off: the
// ice there is cut back to a lower, tilted plate of deep ice, where the trapped bubbles show.
// A frost crust of three heptagonal slabs; flattened spheres for the bubbles.
export default function (THREE) {
  const g = new THREE.Group();
  const V3 = THREE.Vector3;
  const UP = new V3(0, 1, 0);

  // Seeded, so every load builds the same block.
  let seed = 2311;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;

  const mat = (color, roughness) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const ICE = mat(0xa9d2e3, 0.4); // clear ice faces
  const DEEP = mat(0x5b9bbd, 0.35); // the core, where the ice is cut back
  const RIME = mat(0xe9f2f6, 0.65); // bevels and bubbles
  const FROST = mat(0xe9f2f6, 0.9); // the crust on top

  const E = 0.95, D = 0.085, C = E - D; // half size, bevel inset (0.12 m across), bar axis offset
  const YC = 0.95, CORE = 0.86; // centre height, half size of the core
  const add = (geo, m, x, y, z) => {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z);
    g.add(me);
    return me;
  };

  // --- core and bevel frame ---------------------------------------------------------------
  add(new THREE.BoxGeometry(2 * CORE, YC + CORE, 2 * CORE), DEEP, 0, (YC + CORE) / 2, 0);

  // A bar of square section D * sqrt(2) turned 45 degrees is a diamond whose outer face is
  // the 45 degree bevel, D in from each face; the octahedron closes a corner the same way.
  const L = 2 * C, B = D * Math.SQRT2;
  const barX = new THREE.BoxGeometry(L, B, B).rotateX(Math.PI / 4);
  const barY = new THREE.BoxGeometry(B, L, B).rotateY(Math.PI / 4);
  const barZ = new THREE.BoxGeometry(B, B, L).rotateZ(Math.PI / 4);
  for (const s of [-1, 1]) {
    for (const r of [-1, 1]) {
      add(barX, RIME, 0, YC + s * C, r * C);
      add(barZ, RIME, r * C, YC + s * C, 0);
      add(barY, RIME, s * C, YC, r * C);
    }
  }
  const tip = new THREE.OctahedronGeometry(D);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) add(tip, RIME, sx * C, YC + sy * C, sz * C);

  // --- the faces: crazed plates of clear ice ------------------------------------------------
  const TH = 0.12, M = 0.025, OV = 0.03; // plate thickness, draw-in of the outer face, overlap
  const frustum = (au, av) => {
    const geo = new THREE.BoxGeometry(2, TH, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const outer = p.getY(i) > 0;
      p.setX(i, Math.sign(p.getX(i)) * (outer ? au : au + M));
      p.setZ(i, Math.sign(p.getZ(i)) * (outer ? av : av + M));
    }
    geo.computeVertexNormals();
    return geo;
  };

  const FACES = [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2;
    const n = new V3(Math.sin(a), 0, Math.cos(a)); // +Z, +X, -Z, -X
    return { n, t: new V3().crossVectors(UP, n), b: UP.clone() };
  });
  FACES.push({ n: UP.clone(), t: new V3(1, 0, 0), b: new V3(0, 0, -1) });
  const MID = new V3(0, YC, 0);
  const onFace = (f, u, v, w) => MID.clone().addScaledVector(f.t, u).addScaledVector(f.b, v).addScaledVector(f.n, w);

  // A plate over [u0, u1] x [v0, v1] of a face (u to the right, v up, seen from outside). Its
  // outer face falls from `hi` to `lo` towards the middle of the face, swung by `swing`
  // radians, so it meets the bevel bars flush and each face dips a few centimetres.
  const plate = (f, [u0, u1, v0, v1], hi, lo, swing, m = ICE) => {
    const au = (u1 - u0) / 2, av = (v1 - v0) / 2, uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
    const a = Math.atan2(-vc, -uc) + swing;
    const gu = Math.cos(a), gv = Math.sin(a);
    const s = (hi - lo) / (2 * (au * Math.abs(gu) + av * Math.abs(gv)));
    const nn = f.n.clone().addScaledVector(f.t, s * gu).addScaledVector(f.b, s * gv).normalize();
    const tt = f.t.clone().addScaledVector(nn, -f.t.dot(nn)).normalize();
    const me = new THREE.Mesh(frustum(au, av), m);
    me.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tt, nn, new V3().crossVectors(tt, nn)));
    me.position.copy(onFace(f, uc, vc, (hi + lo) / 2)).addScaledVector(nn, -TH / 2);
    g.add(me);
  };

  // Four columns of three or four plates each, the row breaks staggered so no seam runs
  // straight across a face. Plates on the rim fall away from it, so they meet the bevel bars
  // flush; inner plates lean any way, so neighbours meet at an angle like cleaved facets.
  // Plate `spall` (counted up each column, left to right) has flaked off: in its place a
  // steeply sloping deep-ice plate 2 to 8 cm down, like the fracture a flake leaves.
  // Returns that plate's middle, for a bubble.
  const craze = (f, k, spall = -1, top = false) => {
    const cols = [-C, -0.42 + jit(0.08), jit(0.1), 0.42 + jit(0.08), C];
    const rowsets = [
      [-C, -0.4 + jit(0.1), 0.1 + jit(0.12), 0.5 + jit(0.1), C],
      [-C, -0.2 + jit(0.12), 0.32 + jit(0.12), C],
      [-C, -0.5 + jit(0.08), -0.05 + jit(0.12), 0.4 + jit(0.1), C],
      [-C, -0.1 + jit(0.15), 0.45 + jit(0.1), C],
    ];
    let idx = 0, hole = null;
    for (let ci = 0; ci < 4; ci++) {
      const rows = rowsets[(ci + k) % 4];
      for (let ri = 0; ri < rows.length - 1; ri++, idx++) {
        const rim = ci === 0 || ci === 3 || ri === 0 || ri === rows.length - 2;
        const r = [cols[ci] - (ci ? OV : 0), cols[ci + 1] + (ci < 3 ? OV : 0),
          rows[ri] - (ri ? OV : 0), rows[ri + 1] + (ri < rows.length - 2 ? OV : 0)];
        if (idx === spall) {
          // Set in from its neighbours, so where they do not cover it the core shows instead.
          const q = [r[0] + 0.04, r[1] - 0.04, r[2] + 0.04, r[3] - 0.04];
          plate(f, q, 0.925, 0.87, jit(2), DEEP);
          hole = [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2];
          continue;
        }
        const hi = (top ? 0.945 : 0.95) - rnd() * 0.005;
        plate(f, r, hi, hi - 0.045 - rnd() * 0.015, rim ? jit(0.6) : rnd() * 2 * Math.PI);
      }
    }
    return hole;
  };
  const [F, R, K, Lf, T] = FACES;
  const holes = [[F, craze(F, 0, 6)], [R, craze(R, 1, 1)], [K, craze(K, 2, 9)], [Lf, craze(Lf, 3, 12)]];
  craze(T, 1, -1, true); // the top sits lower, under the crust

  // --- the frost crust: three overlapping heptagonal slabs, rising to 1.9 m ------------------
  for (const [r, x, z, top, turn] of [[0.55, 0.05, -0.08, 1.9, 0.2], [0.4, -0.28, 0.18, 1.893, 1.1], [0.32, 0.26, -0.3, 1.888, 2.3]]) {
    add(new THREE.CylinderGeometry(r, r + 0.02, 0.06, 7), FROST, x, top - 0.03, z).rotation.y = turn;
  }

  // --- trapped bubbles, one on each spalled plate, off its middle --------------------------
  // A ray from outside finds the surface, so each bubble sits a few millimetres proud of it.
  g.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const bubbleGeo = new THREE.SphereGeometry(1, 10, 5);
  const solids = g.children.slice();
  const bubbles = [[0, 0.07, -0.06, 0.06], [1, -0.05, 0.08, 0.055], [2, -0.06, -0.05, 0.065], [3, 0.05, 0.07, 0.05]];
  for (const [hi, du, dv, r] of bubbles) {
    const [f, [u, v]] = holes[hi];
    ray.set(onFace(f, u + du, v + dv, 2), f.n.clone().negate());
    const hit = ray.intersectObjects(solids, false)[0];
    if (!hit) continue;
    const b = new THREE.Mesh(bubbleGeo, RIME);
    b.scale.set(r, r * 0.2, r);
    b.quaternion.setFromUnitVectors(UP, f.n);
    b.position.copy(hit.point).addScaledVector(f.n, 0.007 - 0.2 * r);
    g.add(b);
  }

  // --- placement: base on y = 0, centred on x and z ---------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((o) => {
    const p = o.isMesh && o.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (o.isInstancedMesh) { for (let c = 0; c < o.count; c++) { o.getMatrixAt(c, im); put(m4.multiplyMatrices(o.matrixWorld, im)); } return; }
    put(o.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
