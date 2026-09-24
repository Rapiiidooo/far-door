// sun_mirror, candidate A: primitives only. Stacked cylinder courses for the drum,
// the inside of a shallow sphere cap for the concave face, a torus rim, box ribs
// and a squared box U fork. 1.9 m tall, mirror face towards +Z.
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
  // Seen from +Z we look at the inside of the cap, so both sides are drawn.
  const MIRROR = mat(0xe0b56a, 'metal', { roughness: 0.18, metalness: 1, side: THREE.DoubleSide });

  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const cyl = (rTop, rBot, h, seg = 40) => new THREE.CylinderGeometry(rTop, rBot, h, seg);
  const alongX = (m) => { m.rotation.z = Math.PI / 2; return m; };
  const alongZ = (m) => { m.rotation.x = Math.PI / 2; return m; };
  // one horizontal course of the drum, radius r0 at y0 and r1 at y1
  const course = (r0, r1, y0, y1, m) => add(g, cyl(r1, r0, y1 - y0), m, 0, (y0 + y1) / 2, 0);

  // --- turntable drum, 1.2 m across and 0.55 m tall ---------------------------
  course(0.575, 0.6, 0, 0.025, SIENNA);      // bottom chamfer
  course(0.6, 0.6, 0.025, 0.075, SIENNA);    // weathered base course
  course(0.6, 0.585, 0.075, 0.09, SIENNA);   // step in to the body
  course(0.585, 0.585, 0.09, 0.22, SAND);
  course(0.54, 0.54, 0.22, 0.27, SIENNA);    // groove
  course(0.585, 0.585, 0.27, 0.33, SAND);    // ridge between the grooves
  course(0.54, 0.54, 0.33, 0.38, SIENNA);    // groove
  course(0.585, 0.585, 0.38, 0.5, SAND);
  course(0.585, 0.55, 0.5, 0.55, SAND_LIT);  // chamfered top course and top face

  // bronze turntable hub the fork stands on
  add(g, cyl(0.19, 0.22, 0.05, 32), BRONZE, 0, 0.575, 0);

  // --- two short push handles, straight out of the drum's sides (+X and -X) --
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(0.07, 0.15, 0.2), BRONZE, s * 0.6, 0.44, 0);   // mounting boss
    alongX(add(g, cyl(0.034, 0.034, 0.28, 12), BRONZE, s * 0.74, 0.44, 0));     // bar, x 0.60..0.88
    add(g, new THREE.SphereGeometry(0.058, 16, 10), BRONZE, s * 0.86, 0.44, 0);  // knob
  }

  // --- U-shaped fork -----------------------------------------------------------
  const PIV = 1.3; // pivot height, the centre of the disc
  add(g, new THREE.BoxGeometry(1.5, 0.08, 0.12), BRONZE, 0, 0.64, 0);           // crossbar, y 0.60..0.68
  for (const s of [-1, 1]) {
    add(g, new THREE.BoxGeometry(0.1, 0.62, 0.12), BRONZE, s * 0.7, 0.99, 0);    // arm, y 0.68..1.30
    add(g, new THREE.BoxGeometry(0.15, 0.12, 0.16), BRONZE, s * 0.69, 0.66, 0);  // stepped knee
    alongX(add(g, cyl(0.085, 0.085, 0.12, 20), BRONZE, s * 0.7, PIV, 0));        // pivot eye
    alongX(add(g, cyl(0.036, 0.036, 0.26, 12), BRONZE, s * 0.68, PIV, 0));       // pin, x 0.55..0.81
    alongX(add(g, cyl(0.055, 0.055, 0.03, 16), BRONZE, s * 0.79, PIV, 0));       // pin cap
  }

  // --- the disc, 1.2 m across and 0.08 m thick, centred on the pivot ----------
  // Its own group, pivoted on the disc centre, so a game can tilt it about X
  // (rotation.x > 0 tips the face down).
  const disc = new THREE.Group();
  disc.name = 'mirror_disc';
  disc.position.set(0, PIV, 0);
  g.add(disc);
  alongZ(add(disc, cyl(0.58, 0.58, 0.06, 48), BRONZE, 0, 0, -0.01));          // back plate, z -0.04..0.02
  add(disc, new THREE.TorusGeometry(0.565, 0.035, 10, 48), BRONZE, 0, 0, 0.01); // rolled rim, r to 0.60
  for (const s of [-1, 1]) alongX(add(disc, cyl(0.06, 0.06, 0.06, 16), BRONZE, s * 0.62, 0, 0)); // trunnions

  // Polished face: the inside of a sphere cap, 1.5 cm deep over 0.55 m, its edge
  // tucked under the rim. rotation.x = -PI/2 turns the cap's +Y pole to face -Z.
  const RF = 0.55, SAG = 0.015, RS = (RF * RF + SAG * SAG) / (2 * SAG);
  const face = add(disc, new THREE.SphereGeometry(RS, 48, 5, 0, Math.PI * 2, 0, Math.asin(RF / RS)),
    MIRROR, 0, 0, 0.022 + RS);
  face.rotation.x = -Math.PI / 2;

  // Ribbed back: eight radial ribs of triangular section (three-sided cylinders,
  // turned so the ridge points back), a ring rib and a stepped central boss with
  // sloped sides. Walls parallel to the view leak through the face under the
  // verifier's software MSAA, so nothing behind the face is cut square.
  const ribGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.42, 3).rotateY(Math.PI);
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * Math.PI * 2;
    const rib = add(disc, ribGeo, BRONZE, Math.sin(a) * 0.33, Math.cos(a) * 0.33, -0.051);
    rib.rotation.z = -a;
  }
  add(disc, new THREE.TorusGeometry(0.36, 0.024, 8, 40), BRONZE, 0, 0, -0.045);
  alongZ(add(disc, cyl(0.15, 0.12, 0.034, 28), BRONZE, 0, 0, -0.056));
  alongZ(add(disc, cyl(0.095, 0.065, 0.036, 24), BRONZE, 0, 0, -0.09));

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

  // Measured after the shift: the disc centre, on the turntable axis and the pivot line.
  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.mirror = { center: [r3(-c.x), r3(PIV - box.min.y), r3(-c.z)], radius: 0.6 };
  return g;
}
