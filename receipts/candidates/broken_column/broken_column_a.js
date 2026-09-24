// broken_column, candidate A (primitives): box tiers for the stepped base,
// cylinders ringed by box fillets for the fluted drums, the top drum and its
// fillets sheared by moving their top vertices onto one plane, a half cylinder
// for the fallen fragment. 3.4 m ruin, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SUN = mat(0xd4a373, 0.84);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.95);
  const BONE = mat(0xe6d3ae, 0.76);
  const BASALT = mat(0x3a3531, 0.82);

  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  // The shear: highest at the back left, falling 0.45 m toward the front right,
  // so the break faces the approach and the surviving band stands behind it.
  const TOP = 3.4;
  const shear = (x, z) => TOP - 0.45 * (0.5 + (x * 0.8 + z * 0.6));
  // Move every vertex above `from` (in world y, for a mesh at world ox, oy, oz)
  // down onto the shear plane, never below `floor`.
  const cut = (geo, ox, oy, oz, from, floor) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + oy;
      if (y > from) p.setY(i, Math.max(floor, Math.min(y, shear(p.getX(i) + ox, p.getZ(i) + oz))) - oy);
    }
    geo.computeVertexNormals();
    return geo;
  };

  // ------------------------------------------------------------------- base
  add(new THREE.BoxGeometry(1.4, 0.2, 1.4), SIENNA, 0, 0.1, 0);
  add(new THREE.BoxGeometry(1.24, 0.32, 1.24), SAND, 0, 0.36, 0);
  add(new THREE.BoxGeometry(1.1, 0.1, 1.1), SUN, 0, 0.57, 0);
  // an inlaid basalt disc in a carved ring on each face of the middle tier
  for (let k = 0; k < 4; k++) {
    const face = new THREE.Group();
    face.rotation.y = (k * Math.PI) / 2;
    g.add(face);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 18).rotateX(Math.PI / 2), BASALT, 0, 0.36, 0.62, face);
    add(new THREE.TorusGeometry(0.135, 0.022, 6, 24), SIENNA, 0, 0.36, 0.62, face);
  }

  // ------------------------------------------------------------------ drums
  // core cylinder, twelve box fillets standing proud so the gaps read as flutes,
  // a dark recessed joint above each drum; each drum turned a little off the last
  const R = 0.455, FL = 12;
  const drum = (y0, y1, turn, sheared) => {
    const h = y1 - y0, yc = (y0 + y1) / 2;
    const core = new THREE.CylinderGeometry(R, R, h, 24, 1, sheared);
    add(sheared ? cut(core, 0, yc, 0, y0 + 0.05, y0 + 0.1) : core, SAND, 0, yc, 0);
    for (let i = 0; i < FL; i++) {
      const a = turn + (i / FL) * Math.PI * 2;
      const x = Math.sin(a) * 0.465, z = Math.cos(a) * 0.465;
      const fil = new THREE.BoxGeometry(0.1, h - 0.04, 0.07).rotateY(a);
      add(sheared ? cut(fil, x, yc, z, y0 + 0.05, y0 + 0.1) : fil, SAND, x, yc, z);
    }
  };
  // fillets stop short of each joint, and a thin dark ring marks the bed between drums
  drum(0.62, 1.52, 0, false);
  add(new THREE.CylinderGeometry(0.46, 0.46, 0.022, 24), SIENNA, 0, 1.52, 0);
  drum(1.52, 2.42, 0.12, false);
  add(new THREE.CylinderGeometry(0.46, 0.46, 0.022, 24), SIENNA, 0, 2.42, 0);
  drum(2.42, TOP, -0.09, true);
  // the fresh break: a lighter disc lying exactly on the shear plane
  const face = new THREE.CircleGeometry(R + 0.005, 24).rotateX(-Math.PI / 2);
  const fp = face.attributes.position;
  for (let i = 0; i < fp.count; i++) fp.setY(i, shear(fp.getX(i), fp.getZ(i)) + 0.004);
  face.computeVertexNormals();
  add(face, SUN);
  // what survives of the bone capital band, on the high side of the break
  const BAND0 = 3.16;
  const band = new THREE.CylinderGeometry(0.54, 0.54, TOP - BAND0, 28, 1, true, Math.PI * 0.72, Math.PI * 1.1);
  add(cut(band, 0, (TOP + BAND0) / 2, 0, BAND0 + 0.01, BAND0), BONE, 0, (TOP + BAND0) / 2, 0);
  // ring angles map to cylinder angles as phi = theta + pi/2 facing up, and mirrored facing down
  for (const [y, flip] of [[TOP, false], [BAND0, true]]) {
    const t0 = flip ? Math.PI / 2 - Math.PI * 0.72 - Math.PI * 1.1 : Math.PI * 0.72 - Math.PI / 2;
    const rg = new THREE.RingGeometry(0.46, 0.54, 28, 1, t0, Math.PI * 1.1).rotateX(flip ? Math.PI / 2 : -Math.PI / 2);
    const rp = rg.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      rp.setY(i, flip ? BAND0 : Math.max(BAND0, Math.min(TOP, shear(rp.getX(i), rp.getZ(i)))));
    }
    rg.computeVertexNormals();
    add(rg, BONE);
  }

  // ------------------------------------------------------- fallen fragment
  // a slice of drum split through its axis, lying on the split face against the
  // first step: fluted arch on top, the dressed joint faces toward +X and -X
  const frag = new THREE.Group();
  frag.position.set(0.98, 0.02, 0.1);
  frag.rotation.set(0.04, 0.22, 0);
  g.add(frag);
  add(new THREE.CylinderGeometry(R, R, 0.48, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), SAND, 0, 0, 0, frag);
  add(new THREE.BoxGeometry(0.48, 0.02, 2 * R), SAND, 0, 0.01, 0, frag);
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * Math.PI;
    const fil = add(new THREE.BoxGeometry(0.44, 0.07, 0.1), SAND, 0, Math.sin(a) * 0.465, Math.cos(a) * 0.465, frag);
    fil.rotation.x = Math.PI / 2 - a;
  }

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
