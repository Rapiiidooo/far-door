// expedition_tent, candidate A: primitives. The canvas is one open three-sided
// CylinderGeometry laid along the ridge and the back gable a thin closed one;
// poles, ropes, pegs, bedroll and stool are low-sided cylinders, boxes and tori,
// flat shaded so the camp is cut in the same faceted language as the hero.
// 2.6 m long (z, guy pegs included), 1.8 m wide, 1.6 m to the crossed pole tips.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  // Every fabric is double sided: the surface pass shares materials by colour,
  // so a single-sided twin would silently lose the inside of the canvas.
  // The canvas is the palette's rope khaki: explorer canvas turns blue-white in the
  // rig's shade, the reason game/main.js deepens the hero's canvas too. Ropes share it.
  const CANVAS = mat(0xb49a6a, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const GRIME = mat(0x8a6a48, 'fabric', { roughness: 0.97, side: THREE.DoubleSide });
  const BLANKET = mat(0x8a5433, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const LEATHER = mat(0x4b2e1e, 'fabric', { roughness: 0.7, side: THREE.DoubleSide });
  const TIMBER = mat(0x8a6a48, 'timber', { roughness: 0.9 });
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });

  const flat = (geo) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    o.computeVertexNormals();
    return o;
  };
  const add = (geo, m, p, q, parent = g) => {
    const me = new THREE.Mesh(geo, m);
    if (p) me.position.copy(p);
    if (q) me.quaternion.copy(q);
    parent.add(me);
    return me;
  };
  const rod = (a, b, r, m, seg = 6, rTop = r, parent = g) => {
    const d = b.clone().sub(a);
    const geo = flat(new THREE.CylinderGeometry(rTop, r, d.length(), seg));
    return add(geo, m, a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), parent);
  };
  const box = (w, h, d, m, p, parent = g) => add(new THREE.BoxGeometry(w, h, d), m, p, null, parent);
  const ring = (center, axis, r, tube, m, seg = 10) =>
    add(flat(new THREE.TorusGeometry(r, tube, 4, seg)), m, center, new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), axis.clone().normalize()));

  // --- canvas: an open triangular prism, apex resting on the ridge pole ------------
  const HW = 0.8, HA = 1.54, HL = 0.98;
  const prism = (len, open) => {
    const geo = new THREE.CylinderGeometry(1, 1, len, 3, 1, open);
    geo.rotateX(-Math.PI / 2);                       // apex up, axis along z
    geo.scale(HW / Math.sin(Math.PI / 3), HA / 1.5, 1);
    geo.translate(0, HA / 3, 0);                     // base on y = 0
    return flat(geo);
  };
  add(prism(2 * HL, true), CANVAS);
  add(prism(0.02, false), CANVAS, V(0, 0, -HL + 0.01));
  box(1.36, 0.012, 1.84, LEATHER, V(0, 0.012, -0.02));  // ground sheet inside

  // two darker patches, one on each slope, sewn on slightly askew
  const SLOPE = Math.atan2(HA, HW);
  const onSlope = (s, t, z, w, h, m, twist, lift = 0.007) => {
    const n = V(s * HA, HW, 0).normalize();
    const p = V(s * HW * (1 - t), HA * t, z).addScaledVector(n, lift);
    const me = box(w, 0.012, h, m, p);
    me.quaternion.setFromEuler(new THREE.Euler(0, 0, -s * SLOPE)).multiply(new THREE.Quaternion().setFromAxisAngle(UP, twist));
    return me;
  };
  onSlope(1, 0.5, -0.42, 0.42, 0.48, BLANKET, 0.12);
  onSlope(-1, 0.36, 0.32, 0.34, 0.4, BLANKET, -0.18);
  onSlope(-1, 0.68, -0.5, 0.2, 0.22, BLANKET, 0.3);     // a small darn higher up
  // panel seams from hem to ridge, a soiled sod cloth along the hem, a ridge band
  const EL = Math.hypot(HW, HA);
  for (const s of [-1, 1]) {
    for (const z of [-0.33, 0.33]) onSlope(s, 0.5, z, EL, 0.035, GRIME, 0, 0.004);
    onSlope(s, 0.065 / EL, 0, 0.13, 2 * HL, GRIME, 0, 0.005);
    onSlope(s, 1 - 0.05 / EL, 0, 0.1, 2 * HL, GRIME, 0, 0.005);
    onSlope(s, 0.56, 0, 0.035, 2 * HL, GRIME, 0, 0.004);       // the canvas is two widths
    for (const z of [-0.78, 0, 0.78]) onSlope(s, 0.14 / EL, z, 0.16, 0.1, GRIME, 0, 0.009);   // loop tabs
  }

  // --- frame: an A of two poles lashed where they cross, at each end ----------------
  const XF = 0.74, YC = 1.42, RP = 0.036, ZA = HL + 0.07;
  const YR = YC + RP / Math.sin(Math.atan2(XF, YC));   // ridge pole seated in the crotch
  rod(V(0, YR, -ZA - 0.07), V(0, YR, ZA + 0.07), RP, TIMBER, 7);
  for (const e of [-1, 1]) {
    for (const s of [-1, 1]) {
      const d = V(-s * XF, YC, 0).normalize();
      const z = e * ZA + s * RP;                        // the two poles pass each other
      const lift = RP * Math.abs(d.x);                  // lowest rim of the foot at y = 0
      const foot = V(s * XF, 0, z).addScaledVector(d, lift / d.y);
      const tip = V(0, YC, z).addScaledVector(d, 0.17);
      rod(foot, tip, RP, TIMBER, 6, RP * 0.85);
    }
    rod(V(0, YC, e * ZA - 0.07), V(0, YC, e * ZA + 0.07), 0.052, CANVAS, 7);   // lashing
  }

  // --- front flaps: rolled back to the gable edges and tied ----------------------------
  for (const s of [-1, 1]) {
    const inward = V(-s * HA / EL, -HW / EL, 0);
    const at = (y, r) => V(s * HW * (1 - y / HA), y, HL + 0.035).addScaledVector(inward, r);
    const top = at(1.3, 0.035), bot = at(0.1, 0.075);
    rod(bot, top, 0.075, CANVAS, 7, 0.035);
    for (const y of [0.42, 0.95]) {
      const r = 0.075 + (0.035 - 0.075) * ((y - 0.1) / 1.2);
      ring(at(y, r), top.clone().sub(bot), r + 0.004, 0.014, LEATHER);
    }
  }

  // --- guy ropes out to timber pegs --------------------------------------------------
  const peg = (x, z, lean) => {
    const out = V(x, 0, z).setY(0).normalize();
    const dir = V(out.x * Math.sin(lean), Math.cos(lean), out.z * Math.sin(lean));
    const base = V(x, 0.02 * Math.sin(lean) + 0.001, z);
    const top = base.clone().addScaledVector(dir, 0.16);
    rod(base, top, 0.02, TIMBER, 4);
    rod(top.clone().addScaledVector(dir, -0.035), top.clone().addScaledVector(dir, 0.012), 0.03, TIMBER, 4);
    return top.clone().addScaledVector(dir, -0.05);
  };
  const guy = (from, px, pz) => rod(from, peg(px, pz, 0.3), 0.011, CANVAS, 4);
  for (const e of [-1, 1]) for (const s of [-1, 1]) guy(V(s * 0.03, YC + 0.06, e * ZA), s * 0.86, e * 1.26);
  // hem loops pegged along both sides
  for (const s of [-1, 1]) {
    for (const z of [-0.78, 0, 0.78]) {
      const top = peg(s * (HW + 0.07), z, 0.25);
      rod(V(s * (HW - 0.01), 0.03, z), top, 0.01, CANVAS, 4);
    }
  }

  // --- bedroll across the floor, strapped ----------------------------------------------
  const BY = 0.024 + 0.115, BZ = -0.36;
  rod(V(-0.4, BY, BZ), V(0.4, BY, BZ), 0.115, BLANKET, 10);
  rod(V(-0.415, BY, BZ), V(0.415, BY, BZ), 0.07, CANVAS, 8);      // the paler inner turns
  for (const x of [-0.22, 0.22]) ring(V(x, BY, BZ), V(1, 0, 0), 0.119, 0.016, LEATHER);

  // --- folded camp stool leaning on the right slope, beside the door --------------------
  const stool = new THREE.Group();
  // folded, the two leg pairs still cross in a narrow X about the pivot bolts
  const FA = 0.11;
  for (const [x, a] of [[-0.165, FA], [0.165, FA], [-0.125, -FA], [0.125, -FA]]) {
    box(0.034, 0.54, 0.026, TIMBER, V(x, 0.275, 0), stool).rotation.x = a;
  }
  const rz = 0.27 * Math.sin(FA);
  rod(V(-0.18, 0.52, rz), V(0.18, 0.52, rz), 0.02, TIMBER, 6, 0.02, stool);
  rod(V(-0.14, 0.52, -rz), V(0.14, 0.52, -rz), 0.02, TIMBER, 6, 0.02, stool);
  box(0.25, 0.16, 0.012, LEATHER, V(0, 0.45, 0), stool);          // the sling, hanging slack
  for (const x of [-0.145, 0.145]) {
    rod(V(x, 0.275, -0.035), V(x, 0.275, 0.035), 0.013, BRONZE, 6, 0.013, stool);
  }
  const TH = 0.58;                                                // lean from vertical
  const X1 = V(0, 0, 1), Y1 = V(-Math.sin(TH), Math.cos(TH), 0);
  stool.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X1, Y1, X1.clone().cross(Y1)));
  stool.position.set(0.9, 0.035 * Math.sin(TH), 0.62);
  g.add(stool);

  // --- placement: base on y = 0, centred on x and z ----------------------------------
  const b3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) b3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = b3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= b3.min.y; o.position.z -= c.z; });
  return g;
}
