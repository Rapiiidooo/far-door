// brazier, candidate A: primitives only. A flattened half sphere for the bowl, a
// torus for the rolled rim, three straight rods splayed 17 degrees on quaternions
// from explicit end points, disc feet, a torus ring brace, and a sphere-cap mound
// of dodecahedron coals. 1.1 m tall, 0.8 m across the rim.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });
  const BRONZE_2S = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide });
  const COAL = mat(0x3a3531, 'stone', { roughness: 0.95 });
  const EMBER = mat(0x8a5433, 'stone', { roughness: 0.95 });

  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const Y = new THREE.Vector3(0, 1, 0);
  // a cylinder from point a to point b
  const rod = (a, b, r, seg, m) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const mesh = add(new THREE.CylinderGeometry(r, r, d.length(), seg), m);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(Y, d.normalize());
    return mesh;
  };

  const RIM_Y = 1.06;
  // --- bowl: the lower half of a sphere, flattened to 0.18 m deep ------------
  const bowl = add(new THREE.SphereGeometry(0.355, 36, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), BRONZE_2S, 0, RIM_Y, 0);
  bowl.scale.set(1, 0.18 / 0.355, 1);
  // thick rolled rim, 0.8 m across
  const rim = add(new THREE.TorusGeometry(0.36, 0.04, 12, 44), BRONZE, 0, RIM_Y, 0);
  rim.rotation.x = Math.PI / 2;
  // hub under the bowl where the legs meet
  add(new THREE.CylinderGeometry(0.1, 0.075, 0.07, 24), BRONZE, 0, 0.855, 0);

  // --- three splayed legs, disc feet and a ring brace ----------------------------
  const TOP = [0.085, 0.86], FOOT = [0.335, 0.045];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    const top = new THREE.Vector3(TOP[0] * s, TOP[1], TOP[0] * c);
    const bot = new THREE.Vector3(FOOT[0] * s, FOOT[1], FOOT[0] * c);
    rod(top, bot, 0.027, 10, BRONZE);
    add(new THREE.CylinderGeometry(0.056, 0.062, 0.03, 22), BRONZE, FOOT[0] * s, 0.015, FOOT[0] * c);   // disc foot
    add(new THREE.SphereGeometry(0.036, 12, 8), BRONZE, FOOT[0] * s, 0.045, FOOT[0] * c);              // ankle
  }
  const yb = 0.4, rb = TOP[0] + (FOOT[0] - TOP[0]) * (TOP[1] - yb) / (TOP[1] - FOOT[1]);
  const brace = add(new THREE.TorusGeometry(rb, 0.02, 8, 36), BRONZE, 0, yb, 0);
  brace.rotation.x = Math.PI / 2;

  // --- coals: a low sphere-cap mound seated on the bowl, lumps on top -------------
  // The cap's edge sits where the bowl's inside is at r = 0.26.
  const bowlY = (r) => RIM_Y - 0.18 * Math.sqrt(Math.max(0, 1 - (r / 0.355) ** 2));
  const edgeR = 0.26, edgeY = bowlY(edgeR), peak = 0.995;
  const capR = (edgeR * edgeR + (peak - edgeY) ** 2) / (2 * (peak - edgeY));
  add(new THREE.SphereGeometry(capR, 28, 5, 0, Math.PI * 2, 0, Math.asin(edgeR / capR)), COAL, 0, peak - capR, 0);
  // lumps, placed on the cap by a fixed pattern (no randomness, same every load)
  const capY = (r) => peak - capR + Math.sqrt(capR * capR - r * r);
  // Lumps stay inside r = 0.18 so none pokes through the thin bowl from below.
  const lumps = [[0, 0, 0.06], [0.1, 0.3, 0.05], [0.11, 2.3, 0.055], [0.1, 4.4, 0.05], [0.18, 1.1, 0.045],
    [0.18, 3.2, 0.05], [0.17, 5.3, 0.045], [0.18, 0.1, 0.04], [0.06, 1.7, 0.045], [0.07, 3.6, 0.04]];
  lumps.forEach(([r, a, s], i) => {
    const l = add(new THREE.DodecahedronGeometry(s, 0), i % 4 === 1 ? EMBER : COAL,
      r * Math.sin(a), capY(r) - s * 0.25, r * Math.cos(a));
    l.rotation.set(a * 1.3, a * 2.1, a * 0.7);
  });
  const flameY = peak + 0.06 * 0.75 + 0.02;   // top of the centre lump, plus 2 cm

  // --- placement: base on y = 0, centred on x and z ----------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const ctr = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= box.min.y; o.position.z -= ctr.z; });

  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.flame = [r3(-ctr.x), r3(flameY - box.min.y), r3(-ctr.z)];
  return g;
}
