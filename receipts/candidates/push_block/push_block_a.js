// push_block, candidate A: primitives only. The chamfered block is a union of
// boxes, four-sided cylinders (a diamond section whose faces are the 45 degree
// chamfers) and octahedra at the corners; the recess is a core with frame boxes;
// the crescent is a dark disc half covered by an offset stone disc. 1.9 m cube.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const SAND = mat(0xb57f4f, 'stone');
  const SAND_LIT = mat(0xd4a373, 'stone', { roughness: 0.86 });
  const SIENNA = mat(0x8a5433, 'stone', { roughness: 0.95 });

  const A = 0.95, C = 0.07, T = 1.9;   // half size, chamfer, top
  const D = 0.05, G = 0.035, W = 0.5;  // recess depth, groove depth, recess half-width
  const DISH = 0.03;

  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const box = (x0, x1, y0, y1, z0, z1, m) =>
    add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  // CylinderGeometry with four sides puts its corners on the axes: a diamond
  // section whose outer faces are exactly the chamfers.
  const diamond = (r, len, m, axis, x, y, z) => {
    const d = add(new THREE.CylinderGeometry(r, r, len, 4), m, x, y, z);
    if (axis === 'x') d.rotation.z = Math.PI / 2;
    if (axis === 'z') d.rotation.x = Math.PI / 2;
    return d;
  };
  const corners = (fn) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) fn(sx, sz); };
  // a slab with chamfered vertical edges, half size a, chamfer k
  const slab = (a, k, y0, y1, m) => {
    box(-a, a, y0, y1, -(a - k), a - k, m);
    box(-(a - k), a - k, y0, y1, -a, a, m);
    corners((sx, sz) => diamond(k, y1 - y0, m, 'y', sx * (a - k), (y0 + y1) / 2, sz * (a - k)));
  };
  // horizontal chamfers round one level (edges along x and z) and the corner octahedra
  const ring = (y, m) => {
    for (const s of [-1, 1]) {
      diamond(C, 2 * (A - C), m, 'x', 0, y, s * (A - C));
      diamond(C, 2 * (A - C), m, 'z', s * (A - C), y, 0);
    }
    corners((sx, sz) => add(new THREE.OctahedronGeometry(C), m, sx * (A - C), y, sz * (A - C)));
  };
  // a box on one of the four faces: u across the face, d measured out from the centre
  const faceBox = (f, u0, u1, y0, y1, d0, d1, m) => {
    if (f === 0) return box(u0, u1, y0, y1, d0, d1, m);        // +Z
    if (f === 1) return box(d0, d1, y0, y1, -u1, -u0, m);      // +X
    if (f === 2) return box(-u1, -u0, y0, y1, -d1, -d0, m);    // -Z
    return box(-d1, -d0, y0, y1, u0, u1, m);                   // -X
  };

  // --- base course, burnt sienna, chamfered underneath -------------------------
  box(-A, A, C, 0.25, -(A - C), A - C, SIENNA);
  box(-(A - C), A - C, C, 0.25, -A, A, SIENNA);
  box(-(A - C), A - C, 0, 0.25, -(A - C), A - C, SIENNA);
  corners((sx, sz) => diamond(C, 0.25 - C, SIENNA, 'y', sx * (A - C), (C + 0.25) / 2, sz * (A - C)));
  ring(C, SIENNA);

  // --- body with a 5 cm recessed square in each face -------------------------
  box(-(A - D), A - D, 0.25, 1.55, -(A - C), A - C, SAND);   // core, faces set back by D
  box(-(A - C), A - C, 0.25, 1.55, -(A - D), A - D, SAND);
  corners((sx, sz) => diamond(C, 1.3, SAND, 'y', sx * (A - C), 0.9, sz * (A - C)));
  for (let f = 0; f < 4; f++) {
    faceBox(f, -(A - C), -W, 0.25, 1.55, A - D, A, SAND);    // frame round the recess
    faceBox(f, W, A - C, 0.25, 1.55, A - D, A, SAND);
    faceBox(f, -W, W, 0.25, 0.4, A - D, A, SAND);
    faceBox(f, -W, W, 1.4, 1.55, A - D, A, SAND);
  }

  // --- disc and crescent, dark, on each recess floor --------------------------
  // The crescent is a dark 0.30 m disc with a stone 0.27 m disc raised 0.12 m over
  // it; the dark disc rides in its cradle. Layers step out 3 mm at a time.
  const motif = (R, t, m, y, d) => {
    const c = add(new THREE.CylinderGeometry(R, R, t, 40), m, 0, y, 0);
    c.rotation.x = Math.PI / 2;
    c.position.z = A - D + d - t / 2;
    return c;
  };
  for (let f = 0; f < 4; f++) {
    const face = new THREE.Group();
    face.rotation.y = (f * Math.PI) / 2;
    g.add(face);
    face.add(motif(0.3, 0.006, SIENNA, 0.925, 0.003));
    face.add(motif(0.27, 0.009, SAND, 1.045, 0.006));
    face.add(motif(0.13, 0.012, SIENNA, 1.045, 0.009));
  }

  // --- two grooves round the top, and the course between them -----------------
  const kg = C - (2 - Math.SQRT2) * G;   // chamfer of the set-back groove floor
  slab(A - G, kg, 1.55, 1.6, SIENNA);
  slab(A, C, 1.6, 1.68, SAND);
  slab(A - G, kg, 1.68, 1.73, SIENNA);

  // --- top course with chamfered edges and a worn, slightly dished top --------
  box(-A, A, 1.73, T - C, -(A - C), A - C, SAND);
  box(-(A - C), A - C, 1.73, T - C, -A, A, SAND);
  box(-(A - C), A - C, 1.73, T - DISH - 0.01, -(A - C), A - C, SAND);
  corners((sx, sz) => diamond(C, T - C - 1.73, SAND, 'y', sx * (A - C), (1.73 + T - C) / 2, sz * (A - C)));
  ring(T - C, SAND_LIT);
  const topGeo = new THREE.PlaneGeometry(2 * (A - C), 2 * (A - C), 10, 10);
  topGeo.rotateX(-Math.PI / 2);
  const tp = topGeo.attributes.position, e = A - C;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i) / e, z = tp.getZ(i) / e;
    tp.setY(i, -DISH * (1 - x * x) * (1 - z * z));
  }
  topGeo.computeVertexNormals();
  add(topGeo, SAND_LIT, 0, T, 0);

  // --- placement: base on y = 0, centred on x and z ----------------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const ctr = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bb.min.y; o.position.z -= ctr.z; });
  return g;
}
