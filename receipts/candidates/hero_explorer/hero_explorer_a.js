/**
 * hero_explorer, candidate A: assembled from primitives.
 *
 * Spheres, tapered cylinders, boxes, tori and capsules, authored in world
 * metres at rest and re-expressed in the frame of the joint that owns them.
 * Every joint is a Group at its pivot with zero rotation at rest; at the end
 * each joint's parts are baked into one mesh per material, so the rig stays
 * cheap to draw and every mesh is unrotated for the loader's bounding box.
 *
 * Front +Z, up +Y, the character's left is +X. A positive rotation.x swings a
 * hanging limb backwards: knees bend with +x, elbows with -x, and the arms
 * reach overhead near -2.9.
 */
export default function (THREE) {
  const g = new THREE.Group();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V3(0, 1, 0);

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
  const joint = (name, parent, x, y, z) => {
    const j = new THREE.Group();
    j.name = name;
    const pp = parent ? P[parent] : [0, 0, 0];
    j.position.set(x - pp[0], y - pp[1], z - pp[2]);
    (parent ? J[parent] : g).add(j);
    J[name] = j;
    P[name] = [x, y, z];
    return j;
  };
  const s8 = Math.sin((8 * Math.PI) / 180), c8 = Math.cos((8 * Math.PI) / 180);
  const UPPER = 0.29, FORE = 0.245;
  joint('hips', null, 0, 0.95, 0);
  joint('spine', 'hips', 0, 1.05, 0);
  joint('head', 'spine', 0, 1.52, 0);
  joint('scarfTail', 'spine', 0.07, 1.49, -0.115);
  const SIDES = [['left', 1], ['right', -1]];
  for (const [side, s] of SIDES) {
    joint(side + 'UpperArm', 'spine', 0.21 * s, 1.45, 0);
    joint(side + 'LowerArm', side + 'UpperArm', 0.21 * s + UPPER * s8 * s, 1.45 - UPPER * c8, 0);
    joint(side + 'UpperLeg', 'hips', 0.1 * s, 0.92, 0);
    joint(side + 'LowerLeg', side + 'UpperLeg', 0.1 * s, 0.5, 0);
  }

  // ---- part helpers (world coordinates in, joint-local out) -------------------
  const put = (jn, geo, mat, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat);
    const p = P[jn];
    m.position.set(x - p[0], y - p[1], z - p[2]);
    if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
    if (o.q) m.quaternion.copy(o.q);
    if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
    J[jn].add(m);
    return m;
  };
  const along = (d, from = UP) => new THREE.Quaternion().setFromUnitVectors(from, d.clone().normalize());
  const basis = (dir, nrm) => {
    const y = dir.clone().normalize();
    const z = nrm.clone().addScaledVector(y, -nrm.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  const ball = (jn, r, mat, x, y, z, s, w = 14, h = 10) =>
    put(jn, new THREE.SphereGeometry(r, w, h), mat, x, y, z, s ? { s } : {});
  const box = (jn, w, h, d, mat, x, y, z, o) => put(jn, new THREE.BoxGeometry(w, h, d), mat, x, y, z, o);
  // tapered cylinder from a (radius ra) to b (radius rb)
  const rod = (jn, a, b, ra, rb, mat, n = 12) => {
    const A = V3(...a), B = V3(...b), d = B.clone().sub(A);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    return put(jn, new THREE.CylinderGeometry(rb, ra, d.length(), n), mat, mid.x, mid.y, mid.z, { q: along(d) });
  };
  // flat strip between two points, its face turned towards nrm
  const strip = (jn, a, b, w, t, mat, nrm) => {
    const d = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    return put(jn, new THREE.BoxGeometry(w, d.length() + t, t), mat, mid.x, mid.y, mid.z, { q: basis(d, nrm) });
  };

  // Outer surface of the jacket, so straps, pockets and the placket lie on it.
  const DOME = { y: 1.44, a: 0.213, b: 0.0852, c: 0.213 * 0.6 };
  const ring = (y) => {
    if (y >= 1.1) { const r = 0.168 + ((y - 1.1) / 0.34) * 0.045; return [r, r * 0.6]; }
    if (y >= 1.05) return [0.169, 0.169 * 0.64];
    if (y >= 0.995) return [0.179, 0.179 * 0.68];
    const r = 0.176 + ((1.0 - y) / 0.155) * 0.022;
    return [r, r * 0.68];
  };
  const onBody = (x, y, z, lift) => {
    let p, n;
    if (y > DOME.y) {
      const k = 1 / Math.hypot(x / DOME.a, (y - DOME.y) / DOME.b, z / DOME.c);
      p = V3(x * k, DOME.y + (y - DOME.y) * k, z * k);
      n = V3(p.x / DOME.a ** 2, (p.y - DOME.y) / DOME.b ** 2, p.z / DOME.c ** 2).normalize();
    } else {
      const [a, b] = ring(y);
      const k = 1 / Math.hypot(x / a, z / b);
      p = V3(x * k, y, z * k);
      n = V3(p.x / (a * a), 0, p.z / (b * b)).normalize();
    }
    return { p: p.addScaledVector(n, lift), n };
  };
  // a strap laid over the jacket through control points
  const hug = (jn, ctrl, w, t, mat, steps = 3) => {
    const pts = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      for (let k = 0; k < steps; k++) {
        const f = k / steps;
        pts.push(ctrl[i].map((c, j) => c + (ctrl[i + 1][j] - c) * f));
      }
    }
    pts.push(ctrl[ctrl.length - 1]);
    const S = pts.map(([x, y, z]) => onBody(x, y, z, t / 2 + 0.001));
    for (let i = 0; i < S.length - 1; i++) {
      strip(jn, S[i].p, S[i + 1].p, w, t, mat, S[i].n.clone().add(S[i + 1].n));
    }
  };
  // a flat patch (pocket, flap, button) on the jacket front (face 1) or back (-1)
  const patch = (jn, x, y, face, w, h, t, mat) => {
    const { p, n } = onBody(x, y, face * 0.3, t / 2 - 0.003);
    return put(jn, new THREE.BoxGeometry(w, h, t), mat, p.x, p.y, p.z, { q: basis(UP, n) });
  };

  // ---- hips: seat, belt, jacket skirt, satchel --------------------------------
  ball('hips', 0.16, canvas, 0, 0.905, -0.005, [1.0, 0.56, 0.74]);
  put('hips', new THREE.CylinderGeometry(0.179, 0.179, 0.055, 22), leather, 0, 1.0225, 0, { s: [1, 1, 0.68] });
  box('hips', 0.058, 0.046, 0.014, bronze, 0, 1.0225, 0.1257);
  box('hips', 0.03, 0.022, 0.018, leather, 0, 1.0225, 0.1262);
  put('hips', new THREE.CylinderGeometry(0.176, 0.198, 0.155, 22, 1, true), skirtCloth, 0, 0.9225, 0, { s: [1, 1, 0.68] });
  put('hips', new THREE.TorusGeometry(0.198, 0.009, 4, 28), indigo, 0, 0.846, 0, { r: [Math.PI / 2, 0, 0], s: [1, 0.68, 1] });
  hug('hips', [[0, 0.99, 1], [0, 0.852, 1]], 0.026, 0.008, indigo, 2);
  hug('hips', [[0, 0.99, -1], [0, 0.852, -1]], 0.02, 0.008, indigo, 2);
  // satchel on the right hip, set behind the hanging arm
  const SY = -0.873, SC = [-0.172, 0.862, -0.109];
  const sat = (lx, ly, lz) => [
    SC[0] + lx * Math.cos(SY) + lz * Math.sin(SY), SC[1] + ly, SC[2] - lx * Math.sin(SY) + lz * Math.cos(SY),
  ];
  box('hips', 0.07, 0.15, 0.18, leather, ...sat(0, 0, 0), { r: [0, SY, 0] });
  box('hips', 0.012, 0.1, 0.188, leather, ...sat(-0.039, 0.03, 0), { r: [0, SY, 0] });
  box('hips', 0.01, 0.032, 0.03, bronze, ...sat(-0.047, -0.005, 0), { r: [0, SY, 0] });
  for (const lz of [0.078, -0.078]) box('hips', 0.03, 0.05, 0.014, leather, ...sat(0, 0.095, lz), { r: [0, SY, 0] });

  // ---- spine: jacket body, pockets, straps, neck roll, rope coil --------------
  put('spine', new THREE.CylinderGeometry(0.168, 0.17, 0.13, 22), indigo, 0, 1.06, 0, { s: [1, 1, 0.64] });
  put('spine', new THREE.CylinderGeometry(0.213, 0.168, 0.34, 22), indigo, 0, 1.27, 0, { s: [1, 1, 0.6] });
  put('spine', new THREE.SphereGeometry(0.213, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2), indigo, 0, 1.44, 0, { s: [1, 0.4, 0.6] });
  hug('spine', [[0, 1.11, 1], [0, 1.43, 1]], 0.026, 0.008, indigo, 4);
  for (const y of [1.16, 1.25]) patch('spine', 0, y, 1, 0.018, 0.018, 0.022, bronze);
  for (const [, s] of SIDES) {
    patch('spine', 0.088 * s, 1.315, 1, 0.086, 0.094, 0.016, indigo);
    patch('spine', 0.088 * s, 1.372, 1, 0.096, 0.034, 0.026, indigo);
    patch('spine', 0.088 * s, 1.366, 1, 0.016, 0.016, 0.036, bronze);
  }
  // satchel strap: right hip, across the chest, over the left shoulder, down the back
  const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a.map((c, j) => c + ((b[j] - c) * i) / n));
  hug('spine', line([-0.19, 1.035, 0.2], [0.075, 1.5, 0.2], 6), 0.045, 0.012, leather, 1);
  hug('spine', line([0.075, 1.5, -0.2], [-0.15, 1.035, -0.2], 6), 0.045, 0.012, leather, 1);
  strip('spine', V3(-0.235, 0.94, -0.052), onBody(-0.19, 1.035, 0.2, 0.007).p, 0.04, 0.012, leather, V3(-1, 0, 0.3));
  strip('spine', V3(-0.105, 0.94, -0.165), onBody(-0.15, 1.035, -0.2, 0.007).p, 0.04, 0.012, leather, V3(-0.4, 0, -1));
  // scarf wound round the neck
  put('spine', new THREE.TorusGeometry(0.108, 0.048, 8, 22), vermilion, 0, 1.487, -0.004, { r: [Math.PI / 2, 0, 0], s: [1, 0.9, 1] });
  // coil of rope on the back, tied at the top
  for (const [r, dx, dy, z] of [[0.116, 0, 0, -0.124], [0.11, 0.006, -0.008, -0.142], [0.118, -0.004, -0.004, -0.158], [0.108, 0.004, -0.012, -0.172]]) {
    put('spine', new THREE.TorusGeometry(r, 0.0135, 6, 26), canvas, -0.07 + dx, 1.25 + dy, z);
  }
  box('spine', 0.03, 0.07, 0.085, leather, -0.07, 1.36, -0.148);
  box('spine', 0.07, 0.03, 0.085, leather, -0.184, 1.245, -0.148);

  // ---- scarf tail: hangs from the back of the neck behind the left shoulder ---
  ball('scarfTail', 0.037, vermilion, 0.07, 1.487, -0.124, [1.25, 0.9, 0.85]);
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
  ball('head', 0.13, skin, ...HC, null, 22, 16);
  const CAP_Y = 1.611;
  put('head', new THREE.SphereGeometry(0.139, 22, 7, 0, Math.PI * 2, 0, 1.17), canvas, 0, CAP_Y, 0);
  put('head', new THREE.SphereGeometry(0.139, 18, 4, 0.733 * Math.PI, 1.534 * Math.PI, 1.15, 0.62), canvas, 0, CAP_Y, 0);
  put('head', new THREE.CylinderGeometry(0.12, 0.12, 0.018, 18, 1, false, -Math.PI / 2, Math.PI), canvas, 0, 1.668, 0.07, {
    r: [0.22, 0, 0], s: [0.92, 1, 1],
  });
  for (const [, s] of SIDES) {
    const dy = 1.617 - HC[1];
    const z = HC[2] + Math.sqrt(0.13 ** 2 - 0.052 ** 2 - dy ** 2);
    const base = V3(0.052 * s, 1.617, z);
    const n = V3(0.052 * s, dy, z - HC[2]).normalize();
    const at = (d) => base.clone().addScaledVector(n, d);
    const cup = at(0.008), lens = at(0.0235), rim = at(0.023);
    put('head', new THREE.CylinderGeometry(0.032, 0.036, 0.03, 16), bronze, cup.x, cup.y, cup.z, { q: along(n) });
    put('head', new THREE.CylinderGeometry(0.026, 0.026, 0.006, 16), amber, lens.x, lens.y, lens.z, { q: along(n) });
    put('head', new THREE.TorusGeometry(0.029, 0.0062, 6, 18), bronze, rim.x, rim.y, rim.z, { q: along(n, V3(0, 0, 1)) });
  }
  box('head', 0.032, 0.012, 0.012, bronze, 0, 1.622, 0.129);
  put('head', new THREE.CylinderGeometry(0.1405, 0.1405, 0.022, 24, 1, true, 0.68, Math.PI * 2 - 1.36), leather, 0, 1.619, 0);
  put('head', new THREE.SphereGeometry(0.1375, 22, 9, 0, Math.PI * 2, 1.765, Math.PI - 1.765), vermilion, ...HC, { r: [0.063, 0, 0] });
  ball('head', 0.06, vermilion, 0, 1.556, 0.106, [1.0, 0.7, 0.5]);
  put('head', new THREE.TorusGeometry(0.122, 0.022, 6, 24), vermilion, 0, 1.545, 0.01, { r: [Math.PI / 2 + 0.12, 0, 0] });

  // ---- arms: sleeve rolled to the forearm, canvas shirt cuff, leather glove ---
  for (const [side, s] of SIDES) {
    const U = side + 'UpperArm', L = side + 'LowerArm';
    const d = V3(s8 * s, -c8, 0);
    const S = V3(...P[U]), E = V3(...P[L]), W = E.clone().addScaledVector(d, FORE);
    const on = (o, t) => o.clone().addScaledVector(d, t);
    const tilt = { r: [0, 0, (8 * Math.PI * s) / 180] };
    ball(U, 0.067, indigo, S.x, S.y, S.z);
    rod(U, on(S, 0).toArray(), on(S, UPPER).toArray(), 0.068, 0.058, indigo);
    ball(L, 0.058, indigo, E.x, E.y, E.z);
    rod(L, on(E, 0).toArray(), on(E, 0.085).toArray(), 0.058, 0.056, indigo);
    const roll = on(E, 0.09);
    put(L, new THREE.TorusGeometry(0.056, 0.022, 6, 16), indigo, roll.x, roll.y, roll.z, { q: along(d, V3(0, 0, 1)) });
    rod(L, on(E, 0.09).toArray(), on(E, 0.205).toArray(), 0.05, 0.045, canvas);
    rod(L, on(E, 0.19).toArray(), on(E, 0.25).toArray(), 0.049, 0.057, leather);
    const palm = on(W, 0.045), fingers = on(W, 0.125), tip = on(W, 0.162);
    box(L, 0.038, 0.088, 0.088, leather, palm.x, palm.y, palm.z, tilt);
    box(L, 0.032, 0.075, 0.082, leather, fingers.x, fingers.y, fingers.z, tilt);
    put(L, new THREE.CylinderGeometry(0.016, 0.016, 0.082, 8), leather, tip.x, tip.y, tip.z, { r: [Math.PI / 2, 0, 0] });
    const thumb = on(W, 0.05).add(V3(0, 0, 0.05));
    box(L, 0.026, 0.056, 0.03, leather, thumb.x, thumb.y, thumb.z, { r: [-0.35, 0, (8 * Math.PI * s) / 180] });
  }

  // ---- legs: canvas trousers tucked into mid-calf boots with thick soles -----
  for (const [side, s] of SIDES) {
    const U = side + 'UpperLeg', L = side + 'LowerLeg', x = 0.1 * s;
    ball(U, 0.086, canvas, x, 0.92, 0);
    rod(U, [x, 0.92, 0], [x, 0.5, 0], 0.088, 0.07, canvas, 14);
    ball(L, 0.07, canvas, x, 0.5, 0);
    rod(L, [x, 0.5, 0], [x, 0.34, 0], 0.068, 0.066, canvas, 14);
    put(L, new THREE.TorusGeometry(0.068, 0.02, 6, 16), canvas, x, 0.352, 0, { r: [Math.PI / 2, 0, 0] });
    put(L, new THREE.CylinderGeometry(0.081, 0.078, 0.05, 16), leather, x, 0.323, 0);
    rod(L, [x, 0.3, 0], [x, 0.1, 0], 0.07, 0.073, leather, 14);
    put(L, new THREE.CapsuleGeometry(0.058, 0.17, 4, 12), leather, x, 0.097, 0.042, { r: [Math.PI / 2, 0, 0], s: [1.08, 1, 0.84] });
    box(L, 0.136, 0.05, 0.305, leather, x, 0.025, 0.04);
    for (const y of [0.15, 0.2, 0.25]) ball(L, 0.009, bronze, x, y, 0.071, null, 6, 4);
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
  for (const k of ['leftLowerArm', 'rightLowerArm']) {
    J[k].traverse((n) => {
      const p = n.isMesh && n.geometry.attributes.position;
      if (!p) return;
      for (let i = 0; i < p.count; i++) top = Math.max(top, v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).y);
    });
  }
  J.leftUpperArm.rotation.x = 0;
  J.rightUpperArm.rotation.x = 0;
  g.updateMatrixWorld(true);

  g.userData.joints = {
    hips: J.hips, spine: J.spine, head: J.head,
    leftUpperArm: J.leftUpperArm, leftLowerArm: J.leftLowerArm,
    rightUpperArm: J.rightUpperArm, rightLowerArm: J.rightLowerArm,
    leftUpperLeg: J.leftUpperLeg, leftLowerLeg: J.leftLowerLeg,
    rightUpperLeg: J.rightUpperLeg, rightLowerLeg: J.rightLowerLeg,
    scarfTail: J.scarfTail,
  };
  g.userData.grip = { hands: Math.round(top * 1000) / 1000 };
  return g;
}
