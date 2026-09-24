// field_radio, candidate A: assembled from primitives (boxes, cylinders, tori and
// icosahedra, no profiles). An upright field set: a weathered timber case of four boards
// on two runners, bronze plates on every corner, and a dark recessed front panel with a
// round speaker grille of bronze slats, two parchment dials with vermilion needles and a
// row of three bronze knobs. A leather strap handle stands on top and a telescopic bronze
// antenna rises to the left from a ball joint. The back cover is swung up on two hinges
// and held by bronze stays, so it stands behind the case over the open compartment
// (battery, coil and three valves on a bronze chassis), a worn vermilion band painted
// across its outside and a wiring chart pasted inside. A cable runs from the jack in two
// loose loops on the ground to a headset lying flat beside it.
// Front faces +Z. The case is 0.5 m wide; the whole piece 0.97 x 1.05 x 0.61 m.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  // Values stay distinct per material: the loader merges by value, not by name.
  const TIMBER = mat(0x8a6a48, 'timber', { roughness: 0.88 });
  const PANEL = mat(0x4b2e1e, 'timber', { roughness: 0.95 });
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.45, metalness: 0.6 });
  const LEATHER = mat(0x4b2e1e, 'fabric', { roughness: 0.72 });
  const PARCH = mat(0xe6d3ae, 'fabric', { roughness: 0.85 });
  const ROPE = mat(0xb49a6a, 'fabric', { roughness: 0.92 });
  const RED = mat(0xc2412d, 'metal', { roughness: 0.5, metalness: 0.15 });

  const add = (geo, m, parent = g) => { const me = new THREE.Mesh(geo, m); parent.add(me); return me; };
  const box = (w, h, d, m, x, y, z, parent = g) => {
    const me = add(new THREE.BoxGeometry(w, h, d), m, parent);
    me.position.set(x, y, z);
    return me;
  };
  const UP = V(0, 1, 0);
  // a cylinder from a to b, radius ra at a and rb at b
  const rod = (a, b, ra, m, seg = 6, rb = ra, parent = g) => {
    const me = add(new THREE.CylinderGeometry(rb, ra, a.distanceTo(b), seg), m, parent);
    me.position.copy(a).add(b).multiplyScalar(0.5);
    me.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    return me;
  };
  // a round part standing out of the front panel along +Z from z0
  const boss = (r, h, seg, m, x, y, z0, rTop = r) => rod(V(x, y, z0), V(x, y, z0 + h), r, m, seg, rTop);

  // --- the case: four boards on two runners, the front panel recessed ---------------------------
  const W = 0.5, H = 0.34, D = 0.28, T = 0.018, RUN = 0.022;
  const yB = RUN, yT = RUN + H, yM = (yB + yT) / 2, ZB = -D / 2;
  box(W, T, D, TIMBER, 0, yT - T / 2, 0);
  box(W, T, D, TIMBER, 0, yB + T / 2, 0);
  for (const s of [-1, 1]) {
    box(T, H - 2 * T, D, TIMBER, s * (W / 2 - T / 2), yM, 0);
    box(0.05, RUN, D + 0.012, TIMBER, s * 0.19, RUN / 2, 0);
  }
  const PF = D / 2 - 0.012;                                   // face of the front panel
  box(W - 2 * T, H - 2 * T, 0.012, PANEL, 0, yM, PF - 0.006);
  box(W - 2 * T, H - 2 * T, 0.01, PANEL, 0, yM, -0.02);        // bulkhead behind the compartment

  // bronze corner plates: one per face meeting at the corner, the front ones cut to the frame
  const P = 0.056, PT = 0.004;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const ye = sy > 0 ? yT : yB;
    box(PT, P + PT, P + PT, BRONZE, sx * (W / 2 + PT / 2), ye - sy * (P - PT) / 2, sz * (D / 2 - (P - PT) / 2));
    if (sy > 0) box(P, PT, P + PT, BRONZE, sx * (W / 2 - P / 2), yT + PT / 2, sz * (D / 2 - (P - PT) / 2));
    if (sz > 0) {
      box(P, T + PT, PT, BRONZE, sx * (W / 2 - P / 2), ye - sy * (T + PT) / 2, D / 2 + PT / 2);
      box(T + PT, P - T - PT, PT, BRONZE, sx * (W / 2 - (T + PT) / 2), ye - sy * (T + PT + P) / 2, D / 2 + PT / 2);
    }
  }

  // side cleats, each with a keeper and a D-ring for a shoulder strap
  for (const s of [-1, 1]) {
    box(0.012, 0.03, 0.19, TIMBER, s * (W / 2 + 0.006), yM - 0.03, 0);
    box(0.008, 0.024, 0.034, BRONZE, s * (W / 2 + 0.016), yM - 0.03, 0);
    const ring = add(new THREE.TorusGeometry(0.019, 0.0035, 3, 8), BRONZE);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(s * (W / 2 + 0.019), yM - 0.052, 0);
  }

  // --- the front panel ---------------------------------------------------------------------------
  // speaker grille: seven bronze slats behind a bronze ring, the dark panel showing between them
  const GX = -0.112, GY = yM + 0.004, GR = 0.086;
  add(new THREE.TorusGeometry(GR, 0.0085, 3, 16), BRONZE).position.set(GX, GY, PF + 0.006);
  for (let i = -3; i <= 3; i++) {
    const y = i * 0.0225, half = Math.sqrt((GR - 0.004) ** 2 - y * y);
    box(2 * half, 0.013, 0.005, BRONZE, GX, GY + y, PF + 0.0025);
  }
  // two dials: bronze bezel, parchment face, an inked scale arc, a vermilion needle, a hub
  for (const [x, y, ang] of [[0.05, 0.252, 0.7], [0.163, 0.252, -0.45]]) {
    add(new THREE.TorusGeometry(0.046, 0.0075, 3, 14), BRONZE).position.set(x, y, PF + 0.006);
    boss(0.043, 0.005, 14, PARCH, x, y, PF);
    const scale = add(new THREE.TorusGeometry(0.031, 0.002, 3, 8, 1.3 * Math.PI), LEATHER);
    scale.position.set(x, y, PF + 0.005);
    scale.rotation.z = -0.15 * Math.PI;
    const needle = new THREE.Group();
    needle.position.set(x, y, PF + 0.0068);
    needle.rotation.z = ang;
    g.add(needle);
    box(0.004, 0.034, 0.003, RED, 0, 0.013, 0, needle);
  }
  // a row of three knobs under the dials: skirt, tapering body, a pointer line on the cap
  const KY = 0.132;
  for (const x of [0.045, 0.107, 0.169]) {
    boss(0.025, 0.004, 8, BRONZE, x, KY, PF);
    boss(0.019, 0.024, 8, BRONZE, x, KY, PF + 0.004, 0.016);
    box(0.004, 0.013, 0.003, PARCH, x, KY + 0.006, PF + 0.0295);
  }
  // the headset jack with its plug
  const JX = 0.19, JY = 0.07;
  boss(0.013, 0.004, 8, BRONZE, JX, JY, PF);
  boss(0.0085, 0.03, 6, BRONZE, JX, JY, PF + 0.004);
  boss(0.0105, 0.022, 6, LEATHER, JX, JY, PF + 0.02);

  // --- the handle: a leather strap arched between two bronze loops -------------------------------
  const strap = add(new THREE.TorusGeometry(0.075, 0.007, 4, 10, Math.PI), LEATHER);
  strap.scale.set(1, 0.62, 2.1);
  strap.position.set(0, yT + 0.016, 0);
  for (const s of [-1, 1]) {
    box(0.05, 0.004, 0.046, BRONZE, s * 0.075, yT + 0.002, 0);
    box(0.022, 0.026, 0.036, BRONZE, s * 0.075, yT + 0.015, 0);
  }

  // --- the back cover: hinged at the top back edge, swung up past upright and held by stays --------
  const LL = H - 0.004, LT = 0.026;
  const lid = new THREE.Group();
  lid.position.set(0, yT, ZB);
  lid.rotation.x = THREE.MathUtils.degToRad(160);
  g.add(lid);
  box(W, LL, LT, TIMBER, 0, -LL / 2, -LT / 2, lid);
  // outside (local -z, facing forward once open): two cleats and a Z brace, a hasp, caps on the
  // free corners
  for (const y of [-0.075, -LL + 0.075]) box(W - 0.13, 0.03, 0.014, TIMBER, 0, y, -LT - 0.007, lid);
  box(0.36, 0.03, 0.012, TIMBER, 0, -LL / 2, -LT - 0.006, lid).rotation.z = -Math.atan2(LL - 0.18, 0.32);
  // the expedition's vermilion band, painted across the cover and worn through in one place
  box(0.29, 0.046, 0.002, RED, -0.095, -LL + 0.13, -LT - 0.001, lid);
  box(0.13, 0.046, 0.002, RED, 0.175, -LL + 0.13, -LT - 0.001, lid);
  box(0.034, 0.05, 0.005, BRONZE, 0, -LL + 0.03, -LT - 0.0025, lid);
  box(0.014, 0.014, 0.012, BRONZE, 0, -LL + 0.012, -LT - 0.006, lid);
  for (const s of [-1, 1]) box(0.05, 0.05, LT + 0.008, BRONZE, s * (W / 2 - 0.021), -LL + 0.021, -LT / 2, lid);
  // inside (local +z, facing back once open): a pasted wiring chart in leather-brown ink
  box(0.34, 0.23, 0.003, PARCH, 0, -LL / 2 - 0.01, 0.0015, lid);
  for (const [x, y, w, h] of [[0, -0.1, 0.28, 0.004], [-0.03, -0.17, 0.2, 0.004], [0.01, -0.24, 0.26, 0.004],
    [-0.1, -0.135, 0.004, 0.07], [0.06, -0.205, 0.004, 0.07], [0.12, -0.135, 0.004, 0.07], [-0.07, -0.265, 0.004, 0.05]]) {
    box(w, h, 0.002, LEATHER, x, y, 0.004, lid);
  }
  for (const s of [-1, 1]) {
    const hinge = add(new THREE.CylinderGeometry(0.0085, 0.0085, 0.08, 6), BRONZE);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(s * 0.14, yT + 0.003, ZB - 0.003);
  }
  lid.updateMatrix();
  for (const s of [-1, 1]) {
    const a = V(s * (W / 2 + 0.011), yT - 0.07, ZB + 0.065);
    const b = V(s * (W / 2 + 0.006), -0.17, -LT / 2).applyMatrix4(lid.matrix);
    rod(a, b, 0.0045, BRONZE, 4);
    for (const p of [a, b]) {
      const stud = add(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 4), BRONZE);
      stud.rotation.z = Math.PI / 2;
      stud.position.copy(p);
    }
  }

  // --- the open compartment: battery and coil under a bronze chassis carrying three valves --------
  box(W - 2 * T, 0.008, 0.112, BRONZE, 0, 0.205, -0.081);
  box(0.2, 0.13, 0.095, LEATHER, -0.115, yB + T + 0.065, -0.075);
  box(0.203, 0.03, 0.098, RED, -0.115, yB + T + 0.08, -0.075);
  for (const x of [-0.17, -0.06]) rod(V(x, 0.17, -0.1), V(x, 0.19, -0.1), 0.008, BRONZE, 5);
  const coil = add(new THREE.CylinderGeometry(0.036, 0.036, 0.13, 10), ROPE);
  coil.rotation.z = Math.PI / 2;
  coil.position.set(0.12, 0.12, -0.08);
  for (const x of [0.05, 0.19]) {
    const f = add(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 8), BRONZE);
    f.rotation.z = Math.PI / 2;
    f.position.set(x, 0.12, -0.08);
  }
  for (const x of [-0.16, -0.085, -0.01]) {
    rod(V(x, 0.209, -0.085), V(x, 0.225, -0.085), 0.02, BRONZE, 6);
    rod(V(x, 0.225, -0.085), V(x, 0.29, -0.085), 0.016, PARCH, 6, 0.012);
  }
  box(0.07, 0.065, 0.07, BRONZE, 0.13, 0.209 + 0.0325, -0.085);

  // --- the antenna: base, ball joint, three telescoped sections with collars, a ball tip ----------
  const A0 = V(-0.17, yT, -0.06);
  rod(A0, A0.clone().add(V(0, 0.01, 0)), 0.026, BRONZE, 6, 0.022);
  const K = A0.clone().add(V(0, 0.024, 0));
  add(new THREE.IcosahedronGeometry(0.017, 0), BRONZE).position.copy(K);
  const dir = V(-0.36, 1, -0.14).normalize();
  const at = (t) => K.clone().addScaledVector(dir, t);
  rod(at(0), at(0.03), 0.0125, BRONZE, 5);
  rod(at(0.02), at(0.27), 0.0095, BRONZE, 5);
  rod(at(0.255), at(0.285), 0.0125, BRONZE, 5);
  rod(at(0.27), at(0.5), 0.007, BRONZE, 5);
  rod(at(0.485), at(0.51), 0.0095, BRONZE, 5);
  rod(at(0.5), at(0.7), 0.005, BRONZE, 5);
  add(new THREE.IcosahedronGeometry(0.011, 0), BRONZE).position.copy(at(0.705));

  // --- the headset, lying on its side: a bronze band, one earpiece pad down, one pad up ----------
  const hs = new THREE.Group();
  hs.position.set(0.44, 0, 0.13);
  hs.rotation.y = -0.6;
  g.add(hs);
  const HR = 0.075;
  const band = add(new THREE.TorusGeometry(HR, 0.006, 4, 12, 1.1 * Math.PI), BRONZE, hs);
  band.rotation.set(-Math.PI / 2, 0, -0.05 * Math.PI);
  band.scale.z = 1.8;            // a flat spring band standing on its edge
  band.position.y = 0.02;
  for (const s of [-1, 1]) {
    const ex = s * (HR + 0.029), ez = 0.014;
    if (s < 0) {
      rod(V(ex, 0, ez), V(ex, 0.01, ez), 0.031, LEATHER, 10, 0.031, hs);
      rod(V(ex, 0.01, ez), V(ex, 0.03, ez), 0.034, BRONZE, 10, 0.028, hs);
      rod(V(ex, 0.03, ez), V(ex, 0.036, ez), 0.011, BRONZE, 6, 0.011, hs);
    } else {
      rod(V(ex, 0, ez), V(ex, 0.02, ez), 0.028, BRONZE, 10, 0.034, hs);
      rod(V(ex, 0.02, ez), V(ex, 0.03, ez), 0.031, LEATHER, 10, 0.031, hs);
      rod(V(ex, 0.03, ez), V(ex, 0.032, ez), 0.013, BRONZE, 8, 0.013, hs);
    }
  }

  // --- the cable: out of the plug, down to the ground, two loose loops, across to the earpiece ---
  const CR = 0.0055;
  const coilC = V(0.27, 0, 0.3);
  const loopA = add(new THREE.TorusGeometry(0.046, CR, 4, 12), LEATHER);
  loopA.rotation.x = -Math.PI / 2;
  loopA.position.set(coilC.x, CR, coilC.z);
  const loopB = add(new THREE.TorusGeometry(0.041, CR, 4, 12), LEATHER);
  loopB.rotation.set(-Math.PI / 2 + 0.12, 0.1, 0);
  loopB.position.set(coilC.x + 0.012, 3 * CR, coilC.z - 0.006);
  hs.updateMatrix();
  const ear = V(-(HR + 0.029), 0.02, 0.014).applyMatrix4(hs.matrix);
  const run = [
    [V(JX, JY, PF + 0.042), V(JX + 0.006, 0.05, PF + 0.062), V(JX + 0.018, 0.02, PF + 0.084),
      V(coilC.x - 0.0325, CR, coilC.z - 0.0325)],
    [V(coilC.x + 0.041, 2.5 * CR, coilC.z - 0.03), V(coilC.x + 0.055, CR, coilC.z - 0.09), ear],
  ];
  for (const pts of run) for (let i = 0; i < pts.length - 1; i++) rod(pts[i], pts[i + 1], CR, LEATHER, 5);

  // --- placement: base on y = 0, centred on x and z ------------------------------------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const ctr = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bb.min.y; o.position.z -= ctr.z; });
  return g;
}
