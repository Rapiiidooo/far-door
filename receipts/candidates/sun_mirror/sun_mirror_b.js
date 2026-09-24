// sun_mirror, candidate B: profiles. The drum, the disc body with its concentric
// back ribs, the concave face, the hub and the turned handles are LatheGeometry;
// the U fork is one ExtrudeGeometry keyhole outline. 1.9 m tall, face towards +Z.
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
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });
  const MIRROR = mat(0xe0b56a, 'metal', { roughness: 0.18, metalness: 1 });

  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  // Lathe from [r, y, sharp] rows. A sharp row is doubled so the lathe does not
  // average normals across the corner, which keeps stepped profiles crisp; the
  // zero-area strips that leaves (and the ones at the axis) are dropped.
  // Rows run outward along a bottom, upward along a side, inward along a top.
  const lathe = (rows, seg) => {
    const pts = [];
    for (const [r, y, sharp] of rows) {
      pts.push(new THREE.Vector2(r, y));
      if (sharp) pts.push(new THREE.Vector2(r, y));
    }
    const geo = new THREE.LatheGeometry(pts, seg);
    const p = geo.attributes.position, idx = geo.index.array, keep = [];
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
    for (let i = 0; i < idx.length; i += 3) {
      va.fromBufferAttribute(p, idx[i]); vb.fromBufferAttribute(p, idx[i + 1]); vc.fromBufferAttribute(p, idx[i + 2]);
      if (vb.sub(va).cross(vc.sub(va)).lengthSq() > 1e-14) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    geo.setIndex(keep);
    return geo;
  };

  // --- turntable drum, 1.2 m across and 0.55 m tall ---------------------------
  const DS = 40;
  const groove = (y0, y1) => [[0.585, y0], [0.54, y0 + 0.008, 1], [0.54, y1 - 0.008, 1], [0.585, y1]];
  add(g, lathe([[0, 0], [0.575, 0, 1], [0.6, 0.025, 1], [0.6, 0.075, 1], [0.585, 0.09]], DS), SIENNA);
  add(g, lathe([[0.585, 0.09], [0.585, 0.22]], DS), SAND);
  add(g, lathe(groove(0.22, 0.27), DS), SIENNA);
  add(g, lathe([[0.585, 0.27], [0.585, 0.33]], DS), SAND);
  add(g, lathe(groove(0.33, 0.38), DS), SIENNA);
  add(g, lathe([[0.585, 0.38], [0.585, 0.5]], DS), SAND);
  add(g, lathe([[0.585, 0.5], [0.55, 0.55, 1], [0, 0.55]], DS), SAND_LIT);
  // bronze hub, stepped
  add(g, lathe([[0.23, 0.55], [0.23, 0.568, 1], [0.2, 0.6, 1], [0, 0.6]], 32), BRONZE);

  // --- turned push handles, along +X and -X -----------------------------------
  const grip = lathe([[0.07, 0], [0.07, 0.035, 1], [0.05, 0.05, 1], [0.034, 0.062], [0.031, 0.21],
    [0.037, 0.228], [0.053, 0.252], [0.059, 0.276], [0.053, 0.3], [0.036, 0.318], [0, 0.325]], 12);
  for (const s of [-1, 1]) {
    const h = add(g, grip, BRONZE, s * 0.565, 0.44, 0);
    h.rotation.z = -s * Math.PI / 2; // lathe axis +Y turned to point along s*X
  }

  // --- U fork: one keyhole outline, extruded 0.12 deep --------------------------
  // The bevel grows the outline by b on every side and the depth by b at each
  // end, so the outline is drawn b inside the intended size.
  const PIV = 1.3, PX = 0.7, b = 0.012;
  const L = 0.75 - b, I = 0.65 + b, Y0 = 0.6 + b, Y1 = 0.68 - b, E = 0.08 - b, RO = 0.07, RI = 0.045;
  const dy = Math.sqrt(E * E - (L - PX) * (L - PX)); // where the arm edges meet the eye circle
  const aOut = Math.atan2(-dy, L - PX), aIn = Math.atan2(-dy, I - PX);
  const u = new THREE.Shape();
  u.moveTo(-L + RO, Y0);
  u.lineTo(L - RO, Y0);
  u.absarc(L - RO, Y0 + RO, RO, -Math.PI / 2, 0, false);
  u.lineTo(L, PIV - dy);
  u.absarc(PX, PIV, E, aOut, aIn + Math.PI * 2, false);           // right eye, over the top
  u.lineTo(I, Y1 + RI);
  u.absarc(I - RI, Y1 + RI, RI, 0, -Math.PI / 2, true);
  u.lineTo(-I + RI, Y1);
  u.absarc(-I + RI, Y1 + RI, RI, -Math.PI / 2, -Math.PI, true);
  u.lineTo(-I, PIV - dy);
  u.absarc(-PX, PIV, E, Math.PI - aIn, Math.PI - aOut + Math.PI * 2, false); // left eye
  u.lineTo(-L, Y0 + RO);
  u.absarc(-L + RO, Y0 + RO, RO, Math.PI, Math.PI * 1.5, false);
  const D = 0.12;
  const fork = new THREE.ExtrudeGeometry(u, {
    depth: D - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 8,
  });
  add(g, fork, BRONZE, 0, 0, -(D - 2 * b) / 2);
  // a foot block under the crossbar, sitting on the hub
  add(g, new THREE.BoxGeometry(0.3, 0.03, 0.14), BRONZE, 0, 0.6, 0);
  for (const s of [-1, 1]) {
    const pin = add(g, new THREE.CylinderGeometry(0.036, 0.036, 0.26, 12), BRONZE, s * 0.68, PIV, 0);
    pin.rotation.z = Math.PI / 2;
    const cap = add(g, lathe([[0.062, 0], [0.062, 0.018, 1], [0.04, 0.034, 1], [0, 0.036]], 16), BRONZE, s * 0.785, PIV, 0);
    cap.rotation.z = -s * Math.PI / 2;
  }

  // --- the disc, 1.2 m across and 0.08 m thick, centred on the pivot ----------
  // Its own group, pivoted on the disc centre, so a game can tilt it about X
  // (rotation.x > 0 tips the face down).
  const disc = new THREE.Group();
  disc.name = 'mirror_disc';
  disc.position.set(0, PIV, 0);
  g.add(disc);
  // Lathes are built around Y; rotation.x = +PI/2 sends local +Y to +Z (the front).
  const onAxis = new THREE.Group();
  onAxis.rotation.x = Math.PI / 2;
  disc.add(onAxis);
  // Body: stepped boss, back plate with two concentric ribs, rolled rim, front lip.
  add(onAxis, lathe([
    [0, -0.105], [0.07, -0.105, 1], [0.082, -0.093], [0.082, -0.078, 1], [0.128, -0.078, 1],
    [0.14, -0.066], [0.14, -0.04, 1],
    [0.25, -0.04, 1], [0.262, -0.074, 1], [0.298, -0.074, 1], [0.31, -0.04, 1],
    [0.42, -0.04, 1], [0.432, -0.072, 1], [0.466, -0.072, 1], [0.478, -0.04, 1],
    [0.57, -0.04], [0.588, -0.034], [0.598, -0.02], [0.6, 0], [0.598, 0.02], [0.588, 0.036],
    [0.572, 0.045], [0.555, 0.047], [0.543, 0.041], [0.537, 0.028],
  ], 40), BRONZE);
  // Polished face, 1.5 cm concave, running inward so its normals face +Z.
  const face = [];
  for (let k = 0; k <= 8; k++) {
    const r = 0.545 * (1 - k / 8);
    face.push([r, 0.022 + 0.015 * (r / 0.545) ** 2]);
  }
  add(onAxis, lathe(face, 40), MIRROR);
  // trunnion lugs on the rim, where the pins enter
  for (const s of [-1, 1]) {
    const t = add(disc, new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16), BRONZE, s * 0.61, 0, 0);
    t.rotation.z = Math.PI / 2;
  }

  // --- placement: base on y = 0, centred on x and z ----------------------------
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

  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.mirror = { center: [r3(-c.x), r3(PIV - box.min.y), r3(-c.z)], radius: 0.6 };
  return g;
}
