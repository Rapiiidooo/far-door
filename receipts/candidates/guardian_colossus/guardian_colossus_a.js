// guardian_colossus, candidate A (primitives): boxes with stepped corners and
// vertex tapers for the throne and torso, eight-sided cylinders for the limbs,
// cylinders and tori for the medallions. 14 m seated guardian, front +Z.
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
  const FIG = SUN;

  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  // Axis-aligned box from bounds, in any order.
  const blk = (x0, x1, y0, y1, z0, z1, m, parent = g) =>
    add(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), m,
      (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, parent);
  // Box whose top face is resized: a truncated block with planar sides.
  const taperGeo = (w, h, d, wt, dt) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > 0) { p.setX(i, p.getX(i) * (wt / w)); p.setZ(i, p.getZ(i) * (dt / d)); }
    }
    geo.computeVertexNormals();
    return geo;
  };
  // Stepped-corner mass: two tapered boxes crossed, so every long edge is
  // notched by c. Returns both meshes so a caller can turn them together.
  const stepped = (w, h, d, wt, dt, c, m, x, y, z, parent = g) => [
    add(taperGeo(w, h, d - 2 * c, wt, dt - 2 * c), m, x, y, z, parent),
    add(taperGeo(w - 2 * c, h, d, wt - 2 * c, dt), m, x, y, z, parent),
  ];
  // Eight-sided prism with flats on the axes, flat-shaded so the chamfers stay crisp.
  const APO = Math.cos(Math.PI / 8);
  const octGeo = (w, h, d, wt = w, dt = d) => {
    const geo = new THREE.CylinderGeometry(1, 1, h, 8, 1, false, Math.PI / 8);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const top = p.getY(i) > 0;
      p.setX(i, (p.getX(i) * (top ? wt : w)) / (2 * APO));
      p.setZ(i, (p.getZ(i) * (top ? dt : d)) / (2 * APO));
    }
    const flat = geo.toNonIndexed();
    flat.computeVertexNormals();
    return flat;
  };
  const disc = (r, t, seg = 24) => new THREE.CylinderGeometry(r, r, t, seg).rotateX(Math.PI / 2); // faces +Z
  const ring = (r, tube, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, 6, 28, arc);        // faces +Z
  const X = (s, a, b) => (s > 0 ? [a, b] : [-b, -a]);

  // ---------------------------------------------------------------- plinth
  blk(-4.2, 4.2, 0, 0.5, -4.4, 5.2, SIENNA);
  blk(-3.75, 3.75, 0.5, 0.92, -3.95, 4.75, SAND);
  blk(-3.75, 3.75, 0.92, 1.0, -3.95, 4.75, SUN);
  for (let i = -2; i <= 2; i++) {
    add(disc(0.19, 0.04, 20), BASALT, i * 1.6, 0.25, 5.21);
    add(disc(0.19, 0.04, 20), BASALT, i * 1.6, 0.25, -4.41);
  }
  // the crack: a dark zigzag across the apron in front of the toes, running down both sides
  const crack = [[-3.75, 4.25], [-3.0, 4.05], [-2.3, 4.4], [-1.5, 4.15], [-0.6, 4.45], [0.3, 4.1],
    [1.15, 4.4], [2.0, 4.08], [2.8, 4.38], [3.75, 4.2]];
  for (let i = 0; i < crack.length - 1; i++) {
    const [x0, z0] = crack[i], [x1, z1] = crack[i + 1];
    const o = add(new THREE.BoxGeometry(Math.hypot(x1 - x0, z1 - z0) + 0.08, 0.03, 0.16), BASALT, (x0 + x1) / 2, 1.0, (z0 + z1) / 2);
    o.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  }
  for (const [x, z] of [crack[0], crack[crack.length - 1]]) {
    const s = Math.sign(x);
    blk(...X(s, 3.75, 3.78), 0.5, 1.0, z - 0.08, z + 0.08, BASALT);
    blk(...X(s, 3.75, 4.21), 0.49, 0.515, z - 0.1, z + 0.03, BASALT);
    blk(...X(s, 4.2, 4.23), 0.0, 0.5, z - 0.1, z + 0.03, BASALT);
  }

  // ----------------------------------------------------------------- throne
  blk(-3.3, 3.3, 1.0, 1.4, -3.6, 1.1, SIENNA);                // foot course
  blk(-2.8, 2.8, 1.4, 4.4, -3.4, 0.9, SAND);                  // seat core
  for (const s of [1, -1]) {
    // side frame round a deep recessed panel, a groove cut under the top rail
    blk(...X(s, 2.8, 3.1), 3.85, 4.07, -3.4, 0.9, SAND);
    blk(...X(s, 2.8, 3.1), 4.19, 4.4, -3.4, 0.9, SAND);
    blk(...X(s, 2.8, 3.1), 1.4, 1.95, -3.4, 0.9, SAND);
    blk(...X(s, 2.8, 3.1), 1.95, 3.85, -3.4, -2.75, SAND);
    blk(...X(s, 2.8, 3.1), 1.95, 3.85, 0.25, 0.9, SAND);
    blk(...X(s, 2.8, 2.83), 1.95, 3.85, -2.75, 0.25, SIENNA);
    blk(...X(s, 2.8, 2.86), 4.07, 4.19, -3.4, 0.9, SIENNA);
    // side medallion: disc, bone rim, crescent, flanked by twin circles
    const sd = new THREE.Group();
    sd.position.set(s * 2.83, 2.9, -1.25);
    sd.rotation.y = s * Math.PI / 2;
    g.add(sd);
    add(disc(0.72, 0.24), SAND, 0, 0, 0.12, sd);
    add(ring(0.72, 0.08), BONE, 0, 0, 0.24, sd);
    add(ring(0.38, 0.1, Math.PI * 1.15), SIENNA, 0, 0, 0.25, sd).rotation.z = Math.PI * 0.42;
    for (const dz of [-1.0, 1.0]) add(disc(0.24, 0.22, 16), BONE, dz, 0, 0.11, sd);
    // sunlit cap on the seat beside the thighs, fluted channels on the seat front beside the legs
    blk(...X(s, 1.8, 3.2), 4.4, 4.52, -2.2, 1.0, SUN);
    for (let i = 0; i < 3; i++) blk(...X(s, 2.0 + i * 0.36, 2.24 + i * 0.36), 1.5, 4.3, 0.9, 1.02, SAND);
    // grooved bands round the sides of the first backrest tier
    for (const y of [5.0, 5.45, 5.9]) blk(...X(s, 3.1, 3.2), y, y + 0.25, -3.4, -2.2, SAND);
  }
  // backrest in three receding tiers, each capped in sunlit stone
  blk(-3.1, 3.1, 4.4, 6.7, -3.4, -2.2, SAND);
  blk(-3.2, 3.2, 6.7, 6.84, -3.5, -2.1, SUN);
  blk(-2.4, 2.4, 6.84, 8.0, -3.2, -2.2, SAND);
  blk(-2.5, 2.5, 8.0, 8.12, -3.3, -2.1, SUN);
  blk(-1.6, 1.6, 8.12, 9.0, -3.0, -2.2, SAND);
  blk(-1.7, 1.7, 9.0, 9.1, -3.1, -2.1, SUN);
  // back of the seat: three raised courses with deep joints between them
  for (const [y0, y1] of [[1.4, 2.2], [2.36, 3.3], [3.46, 4.4]]) blk(-2.8, 2.8, y0, y1, -3.55, -3.4, SAND);
  blk(-2.8, 2.8, 1.4, 4.4, -3.43, -3.4, SIENNA);
  // back medallion on the first tier, flanked by vertical channels
  const back = new THREE.Group();
  back.position.set(0, 5.55, -3.4);
  back.rotation.y = Math.PI;
  g.add(back);
  add(disc(0.95, 0.26), SAND, 0, 0, 0.13, back);
  add(ring(0.95, 0.11), BONE, 0, 0, 0.26, back);
  add(ring(0.56, 0.13, Math.PI * 1.15), SIENNA, 0, 0, 0.27, back).rotation.z = Math.PI * 0.42;
  add(disc(0.2, 0.34, 16), BONE, 0, 0, 0.17, back);
  for (const s of [1, -1]) {
    for (let i = 0; i < 4; i++) {
      const x = s * (1.45 + i * 0.42);
      blk(x - 0.13, x + 0.13, 4.6, 6.5, -3.55, -3.4, SAND);
    }
    blk(...X(s, 1.25, 3.0), 4.6, 6.5, -3.42, -3.4, SIENNA);
  }
  // second tier: a grooved band and twin circles; third tier: a crescent
  blk(-2.4, 2.4, 7.0, 7.18, -3.24, -3.2, SIENNA);
  blk(-2.4, 2.4, 6.84, 7.0, -3.3, -3.2, SAND);
  blk(-2.4, 2.4, 7.18, 8.0, -3.3, -3.2, SAND);
  for (const s of [1, -1]) add(disc(0.26, 0.16, 16), BONE, s * 1.25, 7.6, -3.36);
  const cres = add(ring(0.34, 0.09, Math.PI * 1.15), SIENNA, 0, 8.55, -3.02);
  cres.rotation.set(0, Math.PI, Math.PI * 0.42);

  // ----------------------------------------------------------------- figure
  for (const s of [1, -1]) {
    const x = s * 0.88;
    // thigh, knee, shin, anklet
    for (const t of stepped(1.5, 4.35, 1.2, 1.5, 1.2, 0.15, FIG, 0, 0, 0)) {
      t.rotation.x = Math.PI / 2;
      t.position.set(x, 5.0, 0.275);
    }
    add(taperGeo(1.5, 0.35, 1.2, 1.2, 0.95), FIG, x, 5.0, 2.625).rotation.x = Math.PI / 2;
    add(octGeo(1.0, 2.65, 1.0, 1.3, 1.3), FIG, x, 3.225, 1.95);
    add(octGeo(1.12, 0.26, 1.12), BONE, x, 1.99, 1.95);
    // foot: heel block, stepped forefoot, four toes split by grooves
    const fx = s * 0.82;
    blk(fx - 0.62, fx + 0.62, 1.0, 1.9, 1.3, 2.5, FIG);
    blk(fx - 0.62, fx + 0.62, 1.0, 1.5, 2.5, 3.2, FIG);
    for (let i = 0; i < 4; i++) {
      const tx = fx + s * (-0.47 + i * 0.31);
      blk(tx - 0.13, tx + 0.13, 1.0, 1.44 - i * 0.03, 3.2, 3.85 - i * 0.07, FIG);
    }
  }
  // pelvis, waist, chest: stepped masses with a vertical front plane
  blk(-1.6, 1.6, 4.4, 5.4, -2.3, -0.25, FIG);
  stepped(3.1, 0.9, 2.2, 2.9, 2.2, 0.2, FIG, 0, 5.85, -1.2);
  stepped(2.9, 1.5, 2.2, 3.7, 2.2, 0.2, FIG, 0, 7.05, -1.2);
  stepped(3.7, 0.35, 2.2, 3.7, 2.2, 0.2, FIG, 0, 7.975, -1.2);
  // four vertical channels down the chest
  for (let i = 0; i < 5; i++) {
    const x = -0.96 + i * 0.48;
    blk(x - 0.14, x + 0.14, 5.95, 7.6, -0.15, 0.06, FIG);
  }
  // waist band with a disc
  stepped(3.32, 0.48, 2.46, 3.32, 2.46, 0.12, BONE, 0, 5.62, -1.19);
  add(disc(0.34, 0.14, 20), SAND, 0, 5.62, 0.1);
  add(ring(0.34, 0.05), SIENNA, 0, 5.62, 0.17);
  // stepped collar: three bone courses round the neck, the lowest dropping to a stepped bib
  stepped(4.0, 0.35, 3.0, 4.0, 3.0, 0.25, BONE, 0, 8.125, -1.2);
  stepped(3.28, 0.28, 2.7, 3.28, 2.7, 0.22, BONE, 0, 8.44, -1.2);
  stepped(2.55, 0.27, 2.4, 2.55, 2.4, 0.2, BONE, 0, 8.715, -1.2);
  blk(-1.05, 1.05, 7.72, 7.96, -0.2, 0.22, BONE);
  blk(-0.68, 0.68, 7.46, 7.72, -0.2, 0.22, BONE);
  // arms: deltoid, upper arm with a band, forearm flat on the thigh, open hand on the knee
  for (const s of [1, -1]) {
    add(octGeo(1.26, 1.35, 1.58, 1.0, 1.3), FIG, s * 2.0, 8.075, -1.2);
    add(octGeo(0.9, 2.25, 1.15, 1.0, 1.25), FIG, s * 2.0, 7.075, -1.25);
    add(octGeo(1.12, 0.28, 1.4), BONE, s * 2.0, 7.12, -1.25);
    const E = [s * 2.0, -1.3], W = [s * 1.2, 1.45];
    const L = Math.hypot(W[0] - E[0], W[1] - E[1]);
    const arm = new THREE.Group();
    arm.position.set(E[0], 0, E[1]);
    arm.rotation.y = Math.atan2(W[0] - E[0], W[1] - E[1]);
    g.add(arm);
    for (const f of stepped(0.94, L + 0.4, 0.72, 0.86, 0.66, 0.12, FIG, 0, 0, 0, arm)) {
      f.rotation.x = Math.PI / 2;
      f.position.set(0, 5.96, (L + 0.4) / 2 - 0.4);
    }
    // hand: palm, four fingers split by grooves, fingertips curling over the knee, thumb inside
    blk(-0.52, 0.52, 5.6, 5.96, L - 0.1, L + 0.95, FIG, arm);
    for (let i = 0; i < 4; i++) {
      const fx = -0.39 + i * 0.26;
      blk(fx - 0.115, fx + 0.115, 5.62, 5.9, L + 0.9, L + 1.45, FIG, arm);
      add(new THREE.BoxGeometry(0.23, 0.46, 0.22), FIG, fx, 5.52, L + 1.5, arm).rotation.x = 0.3;
    }
    const tx = -s * 0.6;
    blk(tx - 0.13, tx + 0.13, 5.55, 5.82, L + 0.05, L + 0.95, FIG, arm);
  }
  // neck, head and mask with its single slit
  add(octGeo(1.3, 1.0, 1.3), FIG, 0, 9.1, -1.1);
  stepped(1.84, 1.75, 1.95, 1.84, 1.95, 0.2, FIG, 0, 10.225, -1.025);
  blk(-0.86, 0.86, 9.45, 10.95, -0.1, 0.05, BONE);
  for (const s of [1, -1]) add(taperGeo(0.71, 0.15, 1.4, 0.61, 1.3), BONE, s * 0.485, 10.2, 0.125).rotation.x = Math.PI / 2;
  blk(-0.14, 0.14, 10.7, 10.9, 0.05, 0.2, BONE);
  blk(-0.14, 0.14, 9.5, 9.72, 0.05, 0.2, BONE);
  blk(-0.13, 0.13, 9.72, 10.7, 0.05, 0.07, BASALT);
  // headdress: three receding tiers, each with a groove band and a sunlit cap
  const tier = (hw, hd, y0, gy, y1) => {
    blk(-hw, hw, y0, gy, -1.0 - hd, -1.0 + hd, SAND);
    blk(-hw + 0.12, hw - 0.12, gy, gy + 0.13, -1.0 - hd + 0.12, -1.0 + hd - 0.12, SIENNA);
    blk(-hw, hw, gy + 0.13, y1, -1.0 - hd, -1.0 + hd, SAND);
  };
  tier(1.275, 1.2, 10.95, 11.42, 12.0);
  blk(-1.33, 1.33, 12.0, 12.1, -2.25, 0.25, SUN);
  tier(1.0, 0.94, 12.1, 12.5, 13.05);
  blk(-1.05, 1.05, 13.05, 13.13, -1.99, -0.01, SUN);
  tier(0.725, 0.68, 13.13, 13.42, 13.62);
  // the crown of the top tier, its right corner broken off in jagged steps
  blk(-0.725, 0.28, 13.62, 13.93, -1.68, -0.32, SAND);
  blk(0.28, 0.5, 13.62, 13.8, -1.68, -0.32, SAND);
  blk(0.5, 0.725, 13.62, 13.69, -1.68, -0.32, SAND);
  blk(-0.76, 0.28, 13.93, 14.0, -1.71, -0.29, SUN);
  // the disc at the front of the middle tier
  add(disc(0.5, 0.3), BONE, 0, 12.58, 0.09);
  add(ring(0.33, 0.06), SIENNA, 0, 12.58, 0.24);
  add(disc(0.14, 0.12, 16), BONE, 0, 12.58, 0.28);

  // -------------------------------------------------------------- weathering
  // the broken headdress corner lies on the plinth by the right foot
  const chunk = blk(-0.3, 0.3, -0.21, 0.21, -0.38, 0.38, SAND);
  chunk.position.set(3.1, 1.19, 3.45);
  chunk.rotation.set(0.12, 0.7, -0.1);
  const chip = blk(-0.18, 0.18, -0.11, 0.11, -0.18, 0.18, SUN);
  chip.position.set(-3.95, 0.6, 4.95);
  chip.rotation.set(0.05, -0.4, 0.15);

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
