// desert_agave, candidate B (profiles): every leaf is a four-segment lathe of the
// leaf's width profile, a diamond-section spindle that swells and tapers, flattened to
// the leaf's thickness, with the pale tip as a second lathe set at a bend so the leaf
// curls; eighteen on a golden-angle spiral. The mound, the tapering stalk and the seed
// pods are lathes too. 1.0 m tall overall.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true });
    m.name = name;
    return m;
  };
  const SAGE = mat(0x7a8766, 0.8, 'foliage');
  const TIP = mat(0xb5b18e, 0.85, 'foliage');
  const STRAW = mat(0xb49a6a, 0.9, 'timber');
  const POD = mat(0x8a6a48, 0.9, 'timber');
  const DUNE = mat(0xd4a373, 0.98, 'ground');

  let seed = 13;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const lathe = (pts, n) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);

  // Profiles are [radius, height] from the leaf base; the body swells to its full width
  // at a fifth of its length, the tip picks up where the body ends. rotation.x = a swings
  // +Y toward +Z, which lowers the tip toward the outside.
  const COUNT = 18, GOLD = 2.39996;
  for (let k = 0; k < COUNT; k++) {
    const f = k / (COUNT - 1);
    const L = 0.62 - 0.27 * f + jit(0.03), lift = (18 + 56 * f + jit(5)) * (Math.PI / 180);
    const curl = (26 - 14 * f + jit(5)) * (Math.PI / 180);
    const w = 0.1 - 0.03 * f, t = 0.062 - 0.016 * f;
    const lb = L * 0.74, lt = L * 0.26;
    const az = new THREE.Group();
    az.rotation.y = k * GOLD + 0.4;
    az.position.set(0, 0.05 + 0.11 * f, 0);
    g.add(az);
    const pivot = new THREE.Group();
    pivot.rotation.x = Math.PI / 2 - lift;
    az.add(pivot);
    const bodyHold = new THREE.Group();
    bodyHold.scale.set(w, 1, t);
    bodyHold.add(new THREE.Mesh(lathe([[0, 0], [0.7, 0.03], [1, 0.2 * L], [0.97, 0.36 * L], [0.84, 0.54 * L], [0.52, lb]], 4), SAGE));
    pivot.add(bodyHold);
    const tipJoint = new THREE.Group();
    tipJoint.position.y = lb;
    tipJoint.rotation.x = curl * 0.7;
    pivot.add(tipJoint);
    const tipHold = new THREE.Group();
    tipHold.scale.set(w, 1, t);
    tipHold.add(new THREE.Mesh(lathe([[0.52, 0], [0.34, lt * 0.45], [0.14, lt * 0.8], [0, lt]], 4), TIP));
    tipJoint.add(tipHold);
    // a little of the curl inside the body: tip the whole leaf down a touch more
    pivot.rotation.x += curl * 0.3;
  }

  // the stalk: one tapering lathe, leaning; short lathe branches and ellipsoid pods
  const stalk = new THREE.Mesh(lathe([[0.03, 0], [0.027, 0.3], [0.021, 0.6], [0.013, 0.86], [0, 0.87]], 6), STRAW);
  stalk.position.set(0, 0.08, 0);
  stalk.rotation.z = -0.045;
  g.add(stalk);
  stalk.updateMatrixWorld(true);
  const podGeo = lathe([[0, -0.035], [0.02, -0.025], [0.028, 0], [0.02, 0.028], [0, 0.04]], 6);
  const branchGeo = lathe([[0.01, 0], [0.007, 0.12], [0, 0.121]], 5);
  for (const [h, az, len, s] of [[0.72, 0.3, 1.0, 1], [0.79, 2.4, 0.85, 0.85], [0.83, 4.3, 0.7, 0.8]]) {
    const at = new THREE.Vector3(0, h, 0).applyMatrix4(stalk.matrixWorld);
    const br = new THREE.Group();
    br.position.copy(at);
    br.rotation.y = -az;
    g.add(br);
    const tilt = new THREE.Group();
    tilt.rotation.z = -0.95;
    br.add(tilt);
    const b = new THREE.Mesh(branchGeo, STRAW);
    b.scale.set(1, len, 1);
    tilt.add(b);
    for (const [dy, dx, sc] of [[0.121 * len + 0.018, 0, s], [0.121 * len - 0.012, 0.024, s * 0.8]]) {
      const p = new THREE.Mesh(podGeo, POD);
      p.position.set(dx, dy, 0);
      p.scale.setScalar(sc);
      tilt.add(p);
    }
  }
  const crown = new THREE.Mesh(podGeo, POD);
  crown.position.copy(new THREE.Vector3(0, 0.88, 0).applyMatrix4(stalk.matrixWorld));
  crown.scale.setScalar(1.15);
  g.add(crown);

  // the mound: a lathed dune profile, a concave toe rising to a soft crown
  const mound = new THREE.Mesh(lathe([[0.4, 0], [0.33, 0.012], [0.25, 0.035], [0.16, 0.062], [0.07, 0.083], [0, 0.09]], 24), DUNE);
  mound.scale.z = 0.92;
  g.add(mound);

  // --- the six lines -------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
