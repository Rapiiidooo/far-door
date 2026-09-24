// brazier, candidate B: profiles. The bowl is one closed LatheGeometry with the
// rolled rim curled into its profile (a solid cast wall); the legs are tubes swept
// along curves that flare outward at the foot; hub, feet, the band ring brace and
// the coal mound are lathes too. 1.1 m tall, 0.8 m across the rim.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });
  const COAL = mat(0x3a3531, 'stone', { roughness: 0.95 });
  const EMBER = mat(0x8a5433, 'stone', { roughness: 0.95 });

  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  // Rows run outward along a bottom, up a side, inward along a top.
  const lathe = (rows, seg) => new THREE.LatheGeometry(rows.map(([r, y]) => new THREE.Vector2(r, y)), seg);

  // --- bowl with its rolled rim, one profile ----------------------------------
  const bead = [];
  for (const deg of [-125, -90, -45, 0, 45, 90, 135, 180]) {
    const a = (deg * Math.PI) / 180;
    bead.push([0.36 + 0.04 * Math.cos(a), 1.06 + 0.04 * Math.sin(a)]);   // rim bead, 0.8 m across
  }
  add(lathe([
    [0, 0.878], [0.09, 0.882], [0.17, 0.895], [0.24, 0.918], [0.29, 0.945], [0.32, 0.975], [0.335, 1.005],
    ...bead,
    [0.31, 1.035], [0.285, 1.0], [0.245, 0.965], [0.19, 0.935], [0.12, 0.914], [0.05, 0.905], [0, 0.903],
  ], 36), BRONZE);
  // hub under the bowl
  add(lathe([[0, 0.82], [0.07, 0.82], [0.1, 0.84], [0.1, 0.865], [0.085, 0.886]], 24), BRONZE);

  // --- legs: tubes along curves that bow in and flare out to the feet ----------
  // Tubes are open, so both ends are buried: in the hub at the top, in the foot below.
  const LEG = [[0.06, 0.88], [0.14, 0.62], [0.22, 0.34], [0.3, 0.12], [0.335, 0.015]];
  const legCurve = (a) => new THREE.CatmullRomCurve3(
    LEG.map(([r, y]) => new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a))));
  const foot = lathe([[0, 0], [0.062, 0], [0.062, 0.018], [0.05, 0.03], [0.03, 0.036], [0, 0.036]], 16);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    add(new THREE.TubeGeometry(legCurve(a), 16, 0.029, 8, false), BRONZE);
    add(foot, BRONZE, 0.335 * Math.sin(a), 0, 0.335 * Math.cos(a));
  }
  // ring brace: a flat band threaded through the legs at 0.4 m
  const probe = legCurve(0).getPoints(200);
  const at = probe.reduce((best, p) => (Math.abs(p.y - 0.4) < Math.abs(best.y - 0.4) ? p : best));
  const rb = Math.hypot(at.x, at.z);
  add(lathe([[rb - 0.012, 0.38], [rb + 0.012, 0.38], [rb + 0.014, 0.4], [rb + 0.012, 0.42], [rb - 0.012, 0.42],
    [rb - 0.014, 0.4], [rb - 0.012, 0.38]], 32), BRONZE);

  // --- coals: a low lathe mound resting on the bowl, with lumps ------------------
  const peak = 0.985;   // coal tops stay about 5 cm under the rim
  add(lathe([[0.26, 0.965], [0.22, 0.967], [0.16, 0.972], [0.09, 0.98], [0, peak]], 28), COAL);
  const lumps = [[0, 0, 0.055], [0.1, 0.5, 0.05], [0.11, 2.6, 0.05], [0.1, 4.6, 0.045], [0.18, 1.4, 0.045],
    [0.18, 3.5, 0.04], [0.17, 5.6, 0.045], [0.05, 1.9, 0.04]];
  const moundY = (r) => peak - 0.02 * (r / 0.26) ** 1.5 - 0.002;
  lumps.forEach(([r, a, s], i) => {
    const l = add(new THREE.IcosahedronGeometry(s, 0), i % 3 === 1 ? EMBER : COAL,
      r * Math.sin(a), moundY(r) + s * 0.2, r * Math.cos(a));
    l.rotation.set(a * 0.9, a * 1.7, a * 1.1);
  });
  const flameY = moundY(0) + 0.055 * 1.2 + 0.02;   // 2 cm above the centre lump

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
