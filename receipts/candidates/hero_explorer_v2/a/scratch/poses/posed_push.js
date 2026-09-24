/**
 * hero_explorer, second pass, candidate A: assembled from primitives.
 *
 * Spheres, tapered cylinders, tori, boxes, hand-built capsules and one
 * four-sided frustum, authored in world metres at rest and re-expressed in the
 * frame of the joint that owns them. The arms follow the second-pass brief: a
 * sloping shoulder yoke on the torso over a deltoid cap on the sleeve, a
 * tapered sleeve flattened front to back, a sleeve elbow that closes over the
 * forearm, a rolled cuff, a tapering shirt sleeve, a flared gauntlet, and
 * hands with a palm, a thumb and four two-segment fingers in a loose half fist.
 *
 * Front +Z, up +Y, the character's left is +X. A positive rotation.x swings a
 * hanging limb backwards: knees bend with +x, elbows with -x, and the arms
 * reach overhead near -2.9. Every joint is a Group at its pivot with zero
 * rotation at rest; at the end each joint's parts are baked into one mesh per
 * material, so the rig stays cheap to draw.
 */
export default function (THREE) {
  const g = new THREE.Group();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V3(0, 1, 0);
  const FWD = V3(0, 0, 1);
  const DEG = Math.PI / 180;

  // ---- palette (far-door/docs/style-lock.md) --------------------------------
  const M = (color, name, roughness, metalness = 0, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    m.name = name;
    return m;
  };
  const indigo = M(0x2d3656, 'fabric', 0.86);
  const skirtCloth = M(0x2d3656, 'fabric', 0.86, 0, { side: THREE.DoubleSide });
  const vermilion = M(0xc2412d, 'fabric', 0.8);
  const canvas = M(0xcdbf9f, 'fabric', 0.9);
  const leather = M(0x4b2e1e, 'fabric', 0.68);
  const bronze = M(0x9a6a35, 'metal', 0.42, 0.7);
  // Skin and lenses carry recipe names only so the surface pass keeps them
  // smooth: by colour alone skin classifies as timber and amber as roof tile.
  const skin = M(0x9c6b4e, 'plaster', 0.7);
  const amber = M(0x5a3410, 'metal', 0.2, 0.3);

  // ---- skeleton: pivots in world metres at rest ------------------------------
  const J = {}, P = {};
  const joint = (name, parent, p) => {
    const j = new THREE.Group();
    j.name = name;
    j.position.copy(p).sub(parent ? P[parent] : V3(0, 0, 0));
    (parent ? J[parent] : g).add(j);
    J[name] = j;
    P[name] = p.clone();
    return j;
  };
  const SIDES = [['left', 1], ['right', -1]];
  // Upper arms hang 8 degrees out and 5 forward; the forearm is modelled 12 more
  // forward (a relaxed elbow) and 6.5 out, which keeps the curled fingers off the
  // thigh when a wrist flexes inward. Every joint still rests at zero.
  const UPPER = 0.3, FORE = 0.255;
  const ARM = {};
  joint('hips', null, V3(0, 0.95, 0));
  joint('spine', 'hips', V3(0, 1.05, 0));
  joint('head', 'spine', V3(0, 1.52, 0));
  joint('scarfTail', 'spine', V3(0.07, 1.49, -0.115));
  for (const [side, s] of SIDES) {
    const S = V3(0.21 * s, 1.45, 0);
    const du = V3(s * Math.tan(8 * DEG), -1, Math.tan(5 * DEG)).normalize();
    const E = S.clone().addScaledVector(du, UPPER);
    const df = V3(s * Math.tan(6.5 * DEG), -1, Math.tan(17 * DEG)).normalize();
    const W = E.clone().addScaledVector(df, FORE);
    ARM[side] = { s, S, E, W, du, df };
    joint(side + 'UpperArm', 'spine', S);
    joint(side + 'LowerArm', side + 'UpperArm', E);
    joint(side + 'Hand', side + 'LowerArm', W);
    joint(side + 'UpperLeg', 'hips', V3(0.1 * s, 0.92, 0));
    joint(side + 'LowerLeg', side + 'UpperLeg', V3(0.1 * s, 0.5, 0));
  }

  // ---- part helpers (world coordinates in, joint-local out) -------------------
  const put = (jn, geo, mat, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat);
    const p = P[jn];
    m.position.set(x - p.x, y - p.y, z - p.z);
    if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
    if (o.q) m.quaternion.copy(o.q);
    if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
    J[jn].add(m);
    return m;
  };
  const putV = (jn, geo, mat, v, o) => put(jn, geo, mat, v.x, v.y, v.z, o);
  const along = (d, from = UP) => new THREE.Quaternion().setFromUnitVectors(from, d.clone().normalize());
  // local Y along dir, local Z towards nrm
  const basis = (dir, nrm) => {
    const y = dir.clone().normalize();
    const z = nrm.clone().addScaledVector(y, -nrm.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  // local Z along axis, local X towards xh (for rings, whose hole runs along Z)
  const basisZ = (axis, xh) => {
    const z = axis.clone().normalize();
    const x = xh.clone().addScaledVector(z, -xh.dot(z)).normalize();
    const y = new THREE.Vector3().crossVectors(z, x);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  const ball = (jn, r, mat, x, y, z, s, w = 12, h = 8) =>
    put(jn, new THREE.SphereGeometry(r, w, h), mat, x, y, z, s ? { s } : {});
  const box = (jn, w, h, d, mat, x, y, z, o) => put(jn, new THREE.BoxGeometry(w, h, d), mat, x, y, z, o);
  // tapered cylinder from a (radius ra) to b (radius rb)
  const rod = (jn, a, b, ra, rb, mat, n = 12) => {
    const A = V3(...a), B = V3(...b), d = B.clone().sub(A);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    return put(jn, new THREE.CylinderGeometry(rb, ra, d.length(), n), mat, mid.x, mid.y, mid.z, { q: along(d) });
  };
  // the same between vectors, its cross-section scaled across (sx) and towards (sz) nrm
  const tube = (jn, mat, a, b, ra, rb, o = {}) => {
    const d = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const geo = new THREE.CylinderGeometry(rb, ra, d.length(), o.n || 12, 1, !!o.open);
    return putV(jn, geo, mat, mid, { q: basis(d, o.nrm || FWD), s: [o.sx || 1, 1, o.sz || 1] });
  };
  // an ellipsoid with radii r = [x, y, z] in the frame q
  const blob = (jn, mat, c, r, q, w = 12, h = 8) =>
    putV(jn, new THREE.SphereGeometry(1, w, h), mat, c, { q: q || new THREE.Quaternion(), s: r });
  // A capsule whose cap centres sit on a and b: an open cylinder and two half
  // spheres, built by hand so it counts the same in every three.js release.
  const pill = (jn, mat, a, b, r, n = 7, rows = 2, s) => {
    const d = b.clone().sub(a);
    const q = along(d);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    putV(jn, new THREE.CylinderGeometry(r, r, d.length(), n, 1, true), mat, mid, { q, s });
    putV(jn, new THREE.SphereGeometry(r, n, rows, Math.PI / 2, Math.PI * 2, 0, Math.PI / 2), mat, b, { q, s });
    putV(jn, new THREE.SphereGeometry(r, n, rows, Math.PI / 2, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat, a, { q, s });
  };
  // flat strip between two points, its face turned towards nrm
  const strip = (jn, a, b, w, t, mat, nrm) => {
    const d = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    return put(jn, new THREE.BoxGeometry(w, d.length() + t, t), mat, mid.x, mid.y, mid.z, { q: basis(d, nrm) });
  };
  const smooth = (e0, e1, x) => {
    const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return k * k * (3 - 2 * k);
  };

  // ---- spine: jacket body and the sloping shoulder yoke -----------------------
  const torso = [
    put('spine', new THREE.CylinderGeometry(0.168, 0.17, 0.13, 20), indigo, 0, 1.06, 0, { s: [1, 1, 0.64] }),
    put('spine', new THREE.CylinderGeometry(0.205, 0.168, 0.29, 20), indigo, 0, 1.255, 0, { s: [1, 1, 0.62] }),
    put('spine', new THREE.SphereGeometry(1, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2), indigo, 0, 1.4, 0, { s: [0.205, 0.105, 0.127] }),
  ];
  // The shoulder line slopes from the collar and runs out over the top of the
  // deltoid cap, meeting it where their slopes agree, so no seam shows at rest.
  for (const [, s] of SIDES) {
    const n = V3(s * Math.sin(18 * DEG), Math.cos(18 * DEG), 0);
    torso.push(blob('spine', indigo, V3(0.125 * s, 1.466, -0.004), [0.13, 0.042, 0.066], basis(n, FWD), 20, 10));
  }
  // project a point onto the outermost jacket surface, from outside towards an axis
  const ray = new THREE.Raycaster();
  const onto = (x, y, z, lift, axis = [0, 0]) => {
    g.updateMatrixWorld(true);
    const dir = V3(axis[0] - x, 0, axis[1] - z).normalize();
    ray.set(V3(x, y, z).addScaledVector(dir, -1), dir);
    const hit = ray.intersectObjects(torso, false)[0];
    if (!hit) return { p: V3(x, y, z), n: dir.clone().negate() };
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    return { p: hit.point.clone().addScaledVector(n, lift), n };
  };
  // a strap laid over the jacket through control points
  const hug = (jn, ctrl, w, t, mat, steps = 3) => {
    const pts = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      for (let k = 0; k < steps; k++) pts.push(ctrl[i].map((c, j) => c + ((ctrl[i + 1][j] - c) * k) / steps));
    }
    pts.push(ctrl[ctrl.length - 1]);
    const S = pts.map(([x, y, z]) => onto(x, y, z, t / 2 + 0.001));
    for (let i = 0; i < S.length - 1; i++) strip(jn, S[i].p, S[i + 1].p, w, t, mat, S[i].n.clone().add(S[i + 1].n));
  };
  // a flat patch (pocket, flap, button) on the jacket front (face 1) or back (-1)
  const patch = (jn, x, y, face, w, h, t, mat) => {
    const { p, n } = onto(x, y, face * 0.4, t / 2 - 0.003, [x, 0]);
    return put(jn, new THREE.BoxGeometry(w, h, t), mat, p.x, p.y, p.z, { q: basis(UP, n) });
  };
  hug('spine', [[0, 1.11, 1], [0, 1.47, 1]], 0.026, 0.008, indigo, 4);
  for (const y of [1.16, 1.25]) patch('spine', 0, y, 1, 0.018, 0.018, 0.022, bronze);
  for (const [, s] of SIDES) {
    patch('spine', 0.088 * s, 1.315, 1, 0.086, 0.094, 0.016, indigo);
    patch('spine', 0.088 * s, 1.372, 1, 0.096, 0.034, 0.026, indigo);
    patch('spine', 0.088 * s, 1.366, 1, 0.016, 0.016, 0.036, bronze);
  }
  // scarf wound round the neck
  put('spine', new THREE.TorusGeometry(0.108, 0.048, 8, 20), vermilion, 0, 1.487, -0.004, { r: [Math.PI / 2, 0, 0], s: [1, 0.9, 1] });
  // coil of rope on the back, tied at the top
  for (const [r, dx, dy, z] of [[0.116, 0, 0, -0.124], [0.11, 0.006, -0.008, -0.142], [0.118, -0.004, -0.004, -0.158], [0.108, 0.004, -0.012, -0.172]]) {
    put('spine', new THREE.TorusGeometry(r, 0.0135, 5, 18), canvas, -0.07 + dx, 1.25 + dy, z);
  }
  box('spine', 0.03, 0.07, 0.085, leather, -0.07, 1.36, -0.148);
  box('spine', 0.07, 0.03, 0.085, leather, -0.184, 1.245, -0.148);

  // ---- hips: trouser front and seat, belt, split jacket skirt, satchel --------
  put('hips', new THREE.CylinderGeometry(0.172, 0.05, 0.14, 16), canvas, 0, 0.93, 0.004, { s: [1, 1, 0.62] });
  ball('hips', 0.155, canvas, 0, 0.905, -0.03, [1.0, 0.6, 0.66], 14, 9);
  // fly placket down the trouser front, so the open jacket frames trousers
  strip('hips', V3(0, 0.995, 0.107), V3(0, 0.9, 0.061), 0.026, 0.012, canvas, V3(0, 0.7, 1));
  put('hips', new THREE.CylinderGeometry(0.179, 0.179, 0.055, 20), leather, 0, 1.0225, 0, { s: [1, 1, 0.68] });
  box('hips', 0.058, 0.046, 0.014, bronze, 0, 1.0225, 0.1257);
  box('hips', 0.03, 0.022, 0.018, leather, 0, 1.0225, 0.1262);
  // Two flared panels, cut away over the thighs in front and vented behind, so
  // a thigh swung forward 60 degrees or back 35 degrees passes clear of the cloth.
  const hemAt = (deg) => 0.846 + 0.13 * (1 - smooth(56, 80, deg)) + 0.03 * smooth(105, 170, deg);
  for (const [, s] of SIDES) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 20, 5, true, 0, Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const c = Math.atan2(p.getX(i), p.getZ(i)) / (Math.PI / 2);
      const f = 0.5 - p.getY(i);
      const deg = 30 + c * (149 - 9 * f);
      const rx = 0.18 + 0.03 * smooth(0, 0.5, f);
      const rz = 0.123 + smooth(0, 0.6, f) * (0.022 + 0.05 * smooth(85, 160, deg));
      p.setXYZ(i, s * rx * Math.sin(deg * DEG), 1.0 - f * (1.0 - hemAt(deg)), rz * Math.cos(deg * DEG));
    }
    geo.computeVertexNormals();
    put('hips', geo, skirtCloth, 0, 0, 0);
  }
  // Satchel high on the back of the right hip: behind a thigh swung back 35
  // degrees, inside the arm's swing, and shallow enough to keep the rig centred.
  const SY = -Math.PI + 10 * DEG, SC = [-0.115, 0.948, -0.172];
  const sat = (lx, ly, lz) => [
    SC[0] + lx * Math.cos(SY) + lz * Math.sin(SY), SC[1] + ly, SC[2] - lx * Math.sin(SY) + lz * Math.cos(SY),
  ];
  box('hips', 0.17, 0.125, 0.045, leather, ...sat(0, 0, 0), { r: [0, SY, 0] });
  box('hips', 0.176, 0.085, 0.01, leather, ...sat(0, 0.022, 0.027), { r: [0, SY, 0] });
  box('hips', 0.03, 0.03, 0.008, bronze, ...sat(0, -0.012, 0.034), { r: [0, SY, 0] });
  for (const lx of [0.072, -0.072]) box('hips', 0.014, 0.04, 0.026, leather, ...sat(lx, 0.078, 0), { r: [0, SY, 0] });
  // its strap: right hip, across the chest, over the left shoulder, down the back
  const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a.map((c, j) => c + ((b[j] - c) * i) / n));
  hug('spine', line([-0.2, 1.04, 0.08], [0.07, 1.5, 0.2], 6), 0.045, 0.012, leather, 1);
  hug('spine', line([0.07, 1.5, -0.2], [-0.13, 1.04, -0.2], 6), 0.045, 0.012, leather, 1);
  strip('spine', V3(...sat(0.072, 0.07, 0)), onto(-0.2, 1.04, 0.08, 0.007).p, 0.04, 0.012, leather, V3(-1, 0, -0.3));
  strip('spine', V3(...sat(-0.072, 0.07, 0)), onto(-0.13, 1.04, -0.2, 0.007).p, 0.04, 0.012, leather, V3(-0.3, 0, -1));

  // ---- scarf tail: hangs from the back of the neck behind the left shoulder ---
  ball('scarfTail', 0.037, vermilion, 0.07, 1.487, -0.124, [1.25, 0.9, 0.85], 10, 7);
  {
    const nrm = V3(0.34, 0, -0.94);
    const t0 = V3(0.07, 1.485, -0.132), t1 = V3(0.103, 1.33, -0.142), t2 = V3(0.138, 1.175, -0.14);
    strip('scarfTail', t0, t1, 0.1, 0.022, vermilion, nrm);
    strip('scarfTail', t1, t2, 0.09, 0.02, vermilion, nrm);
    const dir = t2.clone().sub(t1).normalize();
    const across = new THREE.Vector3().crossVectors(dir, nrm).normalize();
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      const a = t2.clone().addScaledVector(across, k * 0.021);
      strip('scarfTail', a, a.clone().addScaledVector(dir, 0.05 - Math.abs(k) * 0.008), 0.016, 0.014, vermilion, nrm);
    }
  }

  // ---- head: skull, cap, goggles, scarf over nose and mouth -------------------
  const HC = [0, 1.61, 0.004];
  ball('head', 0.13, skin, ...HC, null, 18, 12);
  const CAP_Y = 1.611;
  put('head', new THREE.SphereGeometry(0.139, 20, 7, 0, Math.PI * 2, 0, 1.17), canvas, 0, CAP_Y, 0);
  put('head', new THREE.SphereGeometry(0.139, 16, 4, 0.733 * Math.PI, 1.534 * Math.PI, 1.15, 0.62), canvas, 0, CAP_Y, 0);
  put('head', new THREE.CylinderGeometry(0.12, 0.12, 0.018, 16, 1, false, -Math.PI / 2, Math.PI), canvas, 0, 1.668, 0.07, {
    r: [0.22, 0, 0], s: [0.92, 1, 1],
  });
  for (const [, s] of SIDES) {
    const dy = 1.617 - HC[1];
    const z = HC[2] + Math.sqrt(0.13 ** 2 - 0.052 ** 2 - dy ** 2);
    const base = V3(0.052 * s, 1.617, z);
    const n = V3(0.052 * s, dy, z - HC[2]).normalize();
    const at = (d) => base.clone().addScaledVector(n, d);
    const cup = at(0.008), lens = at(0.0235), rim = at(0.023);
    put('head', new THREE.CylinderGeometry(0.032, 0.036, 0.03, 14), bronze, cup.x, cup.y, cup.z, { q: along(n) });
    put('head', new THREE.CylinderGeometry(0.026, 0.026, 0.006, 14), amber, lens.x, lens.y, lens.z, { q: along(n) });
    put('head', new THREE.TorusGeometry(0.029, 0.0062, 5, 14), bronze, rim.x, rim.y, rim.z, { q: along(n, V3(0, 0, 1)) });
  }
  box('head', 0.032, 0.012, 0.012, bronze, 0, 1.622, 0.129);
  put('head', new THREE.CylinderGeometry(0.1405, 0.1405, 0.022, 22, 1, true, 0.68, Math.PI * 2 - 1.36), leather, 0, 1.619, 0);
  put('head', new THREE.SphereGeometry(0.1375, 20, 9, 0, Math.PI * 2, 1.765, Math.PI - 1.765), vermilion, ...HC, { r: [0.063, 0, 0] });
  ball('head', 0.06, vermilion, 0, 1.556, 0.106, [1.0, 0.7, 0.5], 12, 8);
  put('head', new THREE.TorusGeometry(0.122, 0.022, 6, 22), vermilion, 0, 1.545, 0.01, { r: [Math.PI / 2 + 0.12, 0, 0] });

  // ---- arms: deltoid cap, tapered sleeve, rolled cuff, shirt sleeve, gauntlet --
  const PALM = {};
  for (const [side, s] of SIDES) {
    const { S, E, W, du, df } = ARM[side];
    const U = side + 'UpperArm', L = side + 'LowerArm', H = side + 'Hand';
    const qU = basis(du, FWD), qF = basis(df, FWD);
    // The deltoid is the rounded top of the sleeve, tucked under the yoke at
    // rest, so a raised arm shows a rounded shoulder rather than a ball.
    const cap = S.clone().addScaledVector(du, 0.075).add(V3(0.004 * s, 0, 0));
    blob(U, indigo, cap, [0.062, 0.088, 0.06], qU, 20, 12);
    tube(U, indigo, cap, E, 0.055, 0.045, { sz: 0.92, n: 20 });
    // The sleeve's elbow closes round the pivot and the forearm's own sleeve
    // starts inside it, so a bend shows cloth rather than a gap or a ball.
    blob(U, indigo, E, [0.045, 0.045, 0.0405], qU, 16, 9);
    blob(L, indigo, E, [0.0435, 0.0435, 0.0405], qF, 14, 9);
    const cuff = E.clone().addScaledVector(df, 0.068);
    tube(L, indigo, E, cuff, 0.0445, 0.046, { sz: 0.92, n: 18 });
    putV(L, new THREE.TorusGeometry(0.047, 0.019, 7, 16), indigo, cuff, { q: basisZ(df, V3(1, 0, 0)) });
    tube(L, canvas, E.clone().addScaledVector(df, 0.075), W, 0.0425, 0.0325, { sx: 0.92, n: 16 });
    // leather gauntlet flaring towards the elbow, with a rolled edge
    const g0 = W.clone().addScaledVector(df, -0.062), g1 = W.clone().addScaledVector(df, 0.012);
    tube(L, leather, g0, g1, 0.05, 0.036, { sx: 0.9, n: 18 });
    putV(L, new THREE.TorusGeometry(0.047, 0.0055, 4, 16), leather, g0, { q: basisZ(df, V3(1, 0, 0)), s: [0.9, 1, 1] });

    // ---- hand: palm towards the thigh (turned 15 degrees back), thumb forward.
    // Hand coordinates: u along the hand, v towards the palm side, w towards the thumb.
    const a = df.clone();
    const n0 = V3(-s * Math.cos(15 * DEG), 0, -Math.sin(15 * DEG));
    const nv = n0.clone().addScaledVector(a, -n0.dot(a)).normalize();
    const tw = new THREE.Vector3().crossVectors(nv, a).multiplyScalar(s).normalize();
    const hp = (u, v, w) => W.clone().addScaledVector(a, u).addScaledVector(nv, v).addScaledVector(tw, w);
    const qH = basis(a, nv);
    blob(H, leather, hp(0.006, 0, 0), [0.031, 0.028, 0.024], basis(a, tw), 10, 6);
    // palm: a four-sided frustum, wider at the knuckles than at the wrist
    {
      const geo = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 * 0.8, 1, 4, 1, false, Math.PI / 4);
      putV(H, geo, leather, hp(0.055, 0, 0), { q: qH, s: [0.084, 0.09, 0.03] });
    }
    // the back of the hand domes a little over the palm
    blob(H, leather, hp(0.058, -0.009, -0.002), [0.036, 0.042, 0.012], qH, 10, 6);
    // knuckle row and the ball of the thumb
    pill(H, leather, hp(0.094, -0.002, 0.03), hp(0.094, -0.002, -0.028), 0.0165, 8);
    blob(H, leather, hp(0.04, 0.009, 0.024), [0.02, 0.03, 0.017], qH, 8, 6);
    // thumb: two segments, angled forward and in towards the fingers
    const T0 = hp(0.036, 0.006, 0.03);
    const T1 = T0.clone().addScaledVector(a.clone().multiplyScalar(0.7).addScaledVector(nv, 0.3).addScaledVector(tw, 0.65).normalize(), 0.04);
    const T2 = T1.clone().addScaledVector(a.clone().multiplyScalar(0.85).addScaledVector(nv, 0.45).addScaledVector(tw, 0.1).normalize(), 0.033);
    pill(H, leather, T0, T1, 0.0128);
    pill(H, leather, T1, T2, 0.0118);
    // fingers: two segments each, curling more from index to little finger
    const FINGERS = [
      // across, knuckle, first bend, total bend, lengths, radius, spread
      [0.03, 0.094, 22, 62, 0.042, 0.04, 0.0105, 4],
      [0.0105, 0.098, 27, 70, 0.046, 0.043, 0.011, 1],
      [-0.0095, 0.096, 32, 78, 0.043, 0.04, 0.0105, -2],
      [-0.0285, 0.089, 37, 86, 0.034, 0.032, 0.0095, -6],
    ];
    for (const [w, u0, b1, b2, l1, l2, r, sp] of FINGERS) {
      const dir = (bend) => a.clone().multiplyScalar(Math.cos(bend * DEG)).addScaledVector(nv, Math.sin(bend * DEG))
        .addScaledVector(tw, Math.tan(sp * DEG) * Math.cos(bend * DEG)).normalize();
      const B0 = hp(u0, 0.001, w);
      const B1 = B0.clone().addScaledVector(dir(b1), l1);
      const B2 = B1.clone().addScaledVector(dir(b2), l2);
      pill(H, leather, B0, B1, r);
      pill(H, leather, B1, B2, r * 0.95);
    }
    PALM[side] = hp(0.055, 0, 0).sub(P[H]);
  }

  // ---- legs: canvas trousers tucked into mid-calf boots with thick soles -----
  for (const [side, s] of SIDES) {
    const U = side + 'UpperLeg', L = side + 'LowerLeg', x = 0.1 * s;
    ball(U, 0.086, canvas, x, 0.92, 0);
    rod(U, [x, 0.92, 0], [x, 0.5, 0], 0.088, 0.07, canvas, 14);
    ball(L, 0.07, canvas, x, 0.5, 0);
    rod(L, [x, 0.5, 0], [x, 0.34, 0], 0.068, 0.066, canvas, 14);
    put(L, new THREE.TorusGeometry(0.068, 0.02, 5, 16), canvas, x, 0.352, 0, { r: [Math.PI / 2, 0, 0] });
    put(L, new THREE.CylinderGeometry(0.081, 0.078, 0.05, 16), leather, x, 0.323, 0);
    rod(L, [x, 0.3, 0], [x, 0.1, 0], 0.07, 0.073, leather, 14);
    pill(L, leather, V3(x, 0.097, -0.043), V3(x, 0.097, 0.127), 0.058, 12, 3, [1.08, 1, 0.84]);
    box(L, 0.136, 0.05, 0.305, leather, x, 0.025, 0.04);
    for (const y of [0.15, 0.2, 0.25]) box(L, 0.016, 0.012, 0.01, bronze, x, y, 0.074);
  }

  // ---- bake each joint's parts into one mesh per material ---------------------
  const mergeGeos = (geos) => {
    let nv = 0, ni = 0;
    for (const q of geos) {
      nv += q.attributes.position.count;
      ni += q.index ? q.index.count : q.attributes.position.count;
    }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const idx = new Uint32Array(ni);
    let ov = 0, oi = 0;
    for (const q of geos) {
      const n = q.attributes.position.count;
      pos.set(q.attributes.position.array, ov * 3);
      nor.set(q.attributes.normal.array, ov * 3);
      if (q.attributes.uv) uv.set(q.attributes.uv.array, ov * 2);
      if (q.index) for (let i = 0; i < q.index.count; i++) idx[oi++] = q.index.array[i] + ov;
      else for (let i = 0; i < n; i++) idx[oi++] = ov + i;
      ov += n;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  };
  for (const j of Object.values(J)) {
    const byMat = new Map();
    for (const c of [...j.children]) {
      if (!c.isMesh) continue;
      c.updateMatrix();
      const geo = c.geometry.clone().applyMatrix4(c.matrix);
      if (!byMat.has(c.material)) byMat.set(c.material, []);
      byMat.get(c.material).push(geo);
      j.remove(c);
      c.geometry.dispose();
    }
    for (const [mat, geos] of byMat) j.add(new THREE.Mesh(mergeGeos(geos), mat));
  }

  // ---- placement: base at y = 0, centred on x and z, measured on vertices -----
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) {
      for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m4.multiplyMatrices(n.matrixWorld, im)); }
      return;
    }
    add(n.matrixWorld);
  });
  const ctr = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= box3.min.y; o.position.z -= ctr.z; });

  // ---- grip: soles to fingertips with both upper arms overhead (x = -2.9) -----
  const HANG = -2.9;
  J.leftUpperArm.rotation.x = HANG;
  J.rightUpperArm.rotation.x = HANG;
  g.updateMatrixWorld(true);
  let top = -Infinity;
  for (const k of ['leftHand', 'rightHand']) {
    J[k].traverse((n) => {
      const p = n.isMesh && n.geometry.attributes.position;
      if (!p) return;
      for (let i = 0; i < p.count; i++) top = Math.max(top, v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).y);
    });
  }
  J.leftUpperArm.rotation.x = 0;
  J.rightUpperArm.rotation.x = 0;
  g.updateMatrixWorld(true);

  // ---- palms: centre of each palm in model space at rest ----------------------
  const mm = (x) => Math.round(x * 1000) / 1000;
  const palm = (side) => J[side + 'Hand'].localToWorld(PALM[side].clone()).toArray().map(mm);

  g.userData.joints = {
    hips: J.hips, spine: J.spine, head: J.head,
    leftUpperArm: J.leftUpperArm, leftLowerArm: J.leftLowerArm, leftHand: J.leftHand,
    rightUpperArm: J.rightUpperArm, rightLowerArm: J.rightLowerArm, rightHand: J.rightHand,
    leftUpperLeg: J.leftUpperLeg, leftLowerLeg: J.leftLowerLeg,
    rightUpperLeg: J.rightUpperLeg, rightLowerLeg: J.rightLowerLeg,
    scarfTail: J.scarfTail,
  };
  g.userData.grip = { hands: mm(top) };
  g.userData.palms = { left: palm('left'), right: palm('right') };

  // ---- scratch pose: push ----
  g.userData.joints.leftUpperArm.rotation.set(-1.4, 0, 0);
  g.userData.joints.rightUpperArm.rotation.set(-1.4, 0, 0);
  g.userData.joints.leftLowerArm.rotation.set(-0.5, 0, 0);
  g.userData.joints.rightLowerArm.rotation.set(-0.5, 0, 0);

  // re-ground after posing so the verifier measures the pose, not the rest frame
  {
    const b = new THREE.Box3(), w = new THREE.Vector3();
    g.updateMatrixWorld(true);
    g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
      for (let i = 0; i < p.count; i++) b.expandByPoint(w.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld)); });
    const c = b.getCenter(new THREE.Vector3());
    g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= b.min.y; o.position.z -= c.z; });
  }
  return g;
}
