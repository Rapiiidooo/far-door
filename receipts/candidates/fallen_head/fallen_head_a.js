// fallen_head, candidate A (primitives): the guardian's head rebuilt from crossed boxes
// with stepped corners, cylinders and tori for the disc, dodecahedra for the rubble on
// its breaks. The mask is two cracked halves tipped apart around a wedge of shadow. It
// lies on its right side, face to +Z, headdress to -X, resting on the floor, with
// flattened hemispheres of sand heaped against its underside.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name = 'stone') => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = name;
    return m;
  };
  const SUN = mat(0xd4a373, 0.84);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.95);
  const BONE = mat(0xe6d3ae, 0.76);
  const BASALT = mat(0x3a3531, 0.82);
  const DUNE = mat(0xd4a373, 0.98, 'ground');
  const FIG = SUN;

  const head = new THREE.Group();
  const mesh = (geo, m, x, y, z, parent = head) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, x, y, z, m, parent = head) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
  // Two crossed boxes give a block with stepped corners, the primitive stand-in for a chamfer.
  const sblock = (w, h, d, x, y, z, s, m, parent = head) => {
    box(w, h, d - 2 * s, x, y, z, m, parent);
    box(w - 2 * s, h - 0.004, d, x, y, z, m, parent);
  };
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rubble = (r, x, y, z, m) => {
    const o = mesh(new THREE.DodecahedronGeometry(r, 0), m, x, y, z);
    o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    o.scale.set(1, 0.6 + rnd() * 0.3, 0.8 + rnd() * 0.3);
    return o;
  };

  // ------------------------------------------------ upright, in the guardian's coordinates
  sblock(1.3, 1.0, 1.3, 0, 9.1, -1.1, 0.14, FIG);
  sblock(1.86, 1.77, 2.0, 0, 10.235, -1.05, 0.2, FIG);
  sblock(1.6, 0.3, 1.8, 0, 9.3, -1.05, 0.16, FIG);
  for (let i = -2; i <= 2; i++) box(0.18, 1.35, 0.2, i * 0.3, 10.22, -2.0, FIG);
  rubble(0.34, 0.15, 8.62, -1.2, FIG);
  rubble(0.26, -0.3, 8.64, -0.8, FIG);
  rubble(0.2, 0.35, 8.66, -0.7, FIG);

  // The mask in two halves split by the crack, each tipped a few degrees about the
  // crack's ends so the gap opens as a wedge; a front plate on each half leaves the
  // slit as a real channel with basalt at its floor.
  const CRACK = 10.25;
  const half = (upper) => {
    const h = new THREE.Group();
    const v0 = upper ? CRACK + 0.04 : 9.45, v1 = upper ? 10.95 : CRACK - 0.04;
    const m = (v0 + v1) / 2;
    box(1.72, v1 - v0, 0.2, 0, m - CRACK, 0, BONE, h);
    const s0 = upper ? CRACK + 0.04 : 9.72, s1 = upper ? 10.72 : CRACK - 0.04;
    const f0 = v0 + (upper ? 0 : 0.06), f1 = v1 - (upper ? 0.06 : 0);
    for (const sx of [-1, 1]) box(0.64, f1 - f0, 0.08, sx * 0.47, (f0 + f1) / 2 - CRACK, 0.14, BONE, h);
    const e0 = upper ? s1 : f0, e1 = upper ? f1 : s0;
    box(0.3, e1 - e0, 0.08, 0, (e0 + e1) / 2 - CRACK, 0.14, BONE, h);
    box(0.3, s1 - s0, 0.02, 0, (s0 + s1) / 2 - CRACK, 0.11, BASALT, h);
    h.position.set(0, CRACK, 0);
    h.rotation.z = upper ? 0.05 : -0.035;
    head.add(h);
    return h;
  };
  half(true);
  half(false).position.z -= 0.03;
  box(1.8, 0.16, 0.12, 0, CRACK, -0.04, SIENNA);

  // headdress: the first tier whole, the second snapped off with rubble on the break
  const tier = (w, d, y0, gy, y1) => {
    sblock(w, gy - y0, d, 0, (y0 + gy) / 2, -1.0, 0.1, SAND);
    box(w - 0.24, 0.13, d - 0.24, 0, gy + 0.065, -1.0, SAND);
    sblock(w, y1 - gy - 0.13, d, 0, (gy + 0.13 + y1) / 2, -1.0, 0.1, SAND);
  };
  tier(2.55, 2.4, 10.95, 11.42, 12.0);
  box(2.66, 0.1, 2.5, 0, 12.05, -1.0, SUN);
  tier(2.0, 1.88, 12.1, 12.5, 12.82);
  const ledge = box(2.0, 0.26, 0.9, 0.05, 12.9, -0.51, SAND);
  ledge.rotation.x = -0.12;
  for (const [r, x, y, z] of [[0.36, -0.4, 12.86, -1.45], [0.28, 0.5, 12.88, -1.25], [0.22, -0.55, 13.02, -0.55], [0.2, 0.2, 12.84, -1.7]]) rubble(r, x, y, z, SAND);

  // the disc on the second tier: a rimmed boss with a crescent
  const disc = new THREE.Group();
  const cyl = (r, d, z, m) => { const o = mesh(new THREE.CylinderGeometry(r, r, d, 28), m, 0, 0, z, disc); o.rotation.x = Math.PI / 2; return o; };
  cyl(0.44, 0.2, 0.1, BONE);
  cyl(0.3, 0.32, 0.16, BONE);
  const rim = mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 28), BONE, 0, 0, 0.2, disc);
  rim.rotation.z = 0.1;
  const moon = mesh(new THREE.TorusGeometry(0.17, 0.055, 6, 18, 4.1), SIENNA, 0, 0, 0.32, disc);
  moon.rotation.z = 1.1;
  moon.scale.z = 0.6;
  disc.position.set(0, 12.52, -0.07);
  head.add(disc);

  // ------------------------------------------------ lay it down on the floor
  const S = 0.95, ROLL = 0.1, TILT = -0.03;
  const pose = new THREE.Group();
  head.position.set(0, -10.8, 1.0);
  pose.add(head);
  pose.scale.setScalar(S);
  const q = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
  pose.quaternion.copy(q(new THREE.Vector3(0, 0, 1), TILT).multiply(q(new THREE.Vector3(1, 0, 0), -ROLL)).multiply(q(new THREE.Vector3(0, 0, 1), Math.PI / 2)));
  g.add(pose);
  g.updateMatrixWorld(true);
  let low = Infinity;
  const w = new THREE.Vector3();
  pose.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) low = Math.min(low, w.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).y);
  });
  pose.position.y = -low;

  // ------------------------------------------------ the drift: low spherical caps
  const cap = new THREE.SphereGeometry(1, 20, 5, 0, Math.PI * 2, 0, 1.0).translate(0, -Math.cos(1.0), 0);
  for (const [x, z, rx, rz, h] of [[0.1, -1.0, 2.2, 0.8, 0.62], [0.1, 0.92, 1.9, 0.5, 0.34], [1.8, -0.1, 0.55, 1.15, 0.7],
    [-1.8, -0.2, 0.5, 1.05, 0.5], [1.1, 0.95, 0.7, 0.42, 0.4], [-0.9, -1.2, 0.85, 0.42, 0.46]]) {
    const o = mesh(cap, DUNE, x, 0, z, g);
    o.scale.set(rx / Math.sin(1.0), h / (1 - Math.cos(1.0)), rz / Math.sin(1.0));
  }

  // --- the six lines -------------------------------------------------------
  const bx = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) bx.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = bx.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bx.min.y; o.position.z -= c.z; });
  return g;
}
