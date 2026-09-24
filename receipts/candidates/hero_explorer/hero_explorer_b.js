/**
 * hero_explorer, candidate B: built from profiles.
 *
 * The jacket, skirt, limbs, cap and goggle cups are lathes; the boots, soles,
 * brim, hands, satchel and scarf tail are extruded outlines; the rope coil and
 * the scarf wraps are tubes swept along curves; straps are flat ribbons swept
 * over the jacket surface. Everything is authored in world metres at rest and
 * re-expressed in the frame of the joint that owns it. Every joint is a Group
 * at its pivot with zero rotation at rest; each joint's parts are baked into
 * one mesh per material at the end.
 *
 * Front +Z, up +Y, the character's left is +X. A positive rotation.x swings a
 * hanging limb backwards: knees bend with +x, elbows with -x, and the arms
 * reach overhead near -2.9.
 */
export default function (THREE) {
  const g = new THREE.Group();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
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

  // ---- helpers (world coordinates in, joint-local out) -------------------------
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
  // lathe from [radius, height] pairs, bottom to top
  const latheGeo = (prof, seg = 20, phi0 = 0, phiL = Math.PI * 2) =>
    new THREE.LatheGeometry(prof.map(([r, h]) => V2(r, h)), seg, phi0, phiL);
  // lathe laid along a limb: base at a, its +Y towards b
  const limb = (jn, a, b, prof, mat, seg = 12) => put(jn, latheGeo(prof, seg), mat, a.x, a.y, a.z, { q: along(b.clone().sub(a)) });
  // extruded outline, centred, bevel inside the drawn size
  const extrude = (shape, depth, bevel = 0, curve = 3) => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 1, curveSegments: curve,
    });
    geo.center();
    return geo;
  };
  const roundRect = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  // flat strap swept through points with given outward normals
  const ribbonGeo = (pts, nrms, w, t) => {
    const n = pts.length, pos = [], idx = [];
    const frames = pts.map((p, i) => {
      const T = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const N = nrms[i].clone().addScaledVector(T, -nrms[i].dot(T)).normalize();
      return { p, B: new THREE.Vector3().crossVectors(T, N).normalize(), N };
    });
    const corner = (f, a, b) => f.p.clone().addScaledVector(f.B, (a * w) / 2).addScaledVector(f.N, (b * t) / 2);
    const faces = [[[1, 1], [-1, 1]], [[-1, 1], [-1, -1]], [[-1, -1], [1, -1]], [[1, -1], [1, 1]]];
    for (const [c0, c1] of faces) {
      const base = pos.length / 3;
      for (const f of frames) for (const c of [c0, c1]) pos.push(...corner(f, c[0], c[1]).toArray());
      for (let i = 0; i < n - 1; i++) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    for (const [f, sgn] of [[frames[0], -1], [frames[n - 1], 1]]) {
      const base = pos.length / 3;
      for (const c of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) pos.push(...corner(f, c[0], c[1]).toArray());
      if (sgn > 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  const tubeGeo = (pts, r, segs, radial = 6, closed = false) =>
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), segs, r, radial, closed);

  // ---- the jacket body as one lathe, and its surface for straps and pockets ----
  const TORSO = [
    [0.99, 0.163], [1.06, 0.167], [1.15, 0.18], [1.25, 0.197], [1.33, 0.209], [1.4, 0.213],
    [1.44, 0.207], [1.475, 0.186], [1.5, 0.155], [1.515, 0.115], [1.525, 0.06], [1.528, 0],
  ];
  const SKIRT = [[0.852, 0.2], [0.9, 0.193], [0.96, 0.181], [1.0, 0.172]];
  const KT = 0.6, KS = 0.68;
  const profR = (tab, y) => {
    if (y <= tab[0][0]) return [tab[0][1], 0];
    for (let i = 0; i < tab.length - 1; i++) {
      const [y0, r0] = tab[i], [y1, r1] = tab[i + 1];
      if (y <= y1) return [r0 + ((r1 - r0) * (y - y0)) / (y1 - y0), (r1 - r0) / (y1 - y0)];
    }
    return [tab[tab.length - 1][1], 0];
  };
  const onBody = (x, y, z, lift) => {
    let [r, dr] = y >= 1.0 ? profR(TORSO, y) : profR(SKIRT, y);
    let k = y >= 1.0 ? KT : KS;
    if (y >= 0.995 && y <= 1.05) { r = 0.182; dr = 0; k = KS; }
    const f = 1 / Math.hypot(x / r, z / (k * r));
    const p = V3(x * f, y, z * f);
    const n = V3(p.x / (r * r), -dr / r, p.z / (k * k * r * r)).normalize();
    return { p: p.addScaledVector(n, lift), n };
  };
  const strap = (jn, ctrl, w, t, mat, per = 4) => {
    const pts = [], nrms = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      for (let k = 0; k < per; k++) {
        const f = k / per;
        const c = ctrl[i].map((v, j) => v + (ctrl[i + 1][j] - v) * f);
        const s = onBody(c[0], c[1], c[2], t / 2 + 0.001);
        pts.push(s.p); nrms.push(s.n);
      }
    }
    const e = ctrl[ctrl.length - 1], s = onBody(e[0], e[1], e[2], t / 2 + 0.001);
    pts.push(s.p); nrms.push(s.n);
    return put(jn, ribbonGeo(pts, nrms, w, t), mat, 0, 0, 0);
  };
  const onFace = (jn, geo, mat, x, y, face, lift) => {
    const { p, n } = onBody(x, y, face * 0.3, lift);
    return put(jn, geo, mat, p.x, p.y, p.z, { q: basis(UP, n) });
  };

  // ---- hips: seat, belt, split skirt, satchel ---------------------------------
  put('hips', new THREE.SphereGeometry(0.16, 12, 8), canvas, 0, 0.905, -0.005, { s: [1.0, 0.56, 0.74] });
  put('hips', latheGeo([[0.174, 0.994], [0.181, 1.0], [0.182, 1.022], [0.181, 1.045], [0.174, 1.051]], 24), leather, 0, 0, 0, { s: [1, 1, KS] });
  {
    const buckle = roundRect(0.062, 0.05, 0.01);
    buckle.holes.push(roundRect(0.036, 0.026, 0.005));
    put('hips', extrude(buckle, 0.01, 0, 2), bronze, 0, 1.0225, 0.182 * KS + 0.004);
    put('hips', new THREE.BoxGeometry(0.008, 0.03, 0.01), bronze, 0.004, 1.0225, 0.182 * KS + 0.006);
  }
  const skirtProf = [[0.19, 0.846], [0.201, 0.843], [0.206, 0.851], ...SKIRT.slice(1).map(([y, r]) => [r, y]), [0.172, 1.005]];
  put('hips', latheGeo(skirtProf, 22, 0.055, Math.PI * 2 - 0.11), skirtCloth, 0, 0, 0, { s: [1, 1, KS] });
  strap('hips', [[0, 0.99, -1], [0, 0.856, -1]], 0.018, 0.008, indigo, 3);
  // satchel on the right hip, behind the hanging arm
  {
    const SY = -0.873, SC = [-0.175, 0.862, -0.112];
    const at = (lx, ly, lz) => [SC[0] + lx * Math.cos(SY) + lz * Math.sin(SY), SC[1] + ly, SC[2] - lx * Math.sin(SY) + lz * Math.cos(SY)];
    const bag = new THREE.Shape();
    bag.moveTo(-0.09, 0.075); bag.lineTo(0.09, 0.075); bag.lineTo(0.09, -0.035);
    bag.quadraticCurveTo(0.09, -0.075, 0.05, -0.075); bag.lineTo(-0.05, -0.075);
    bag.quadraticCurveTo(-0.09, -0.075, -0.09, -0.035); bag.lineTo(-0.09, 0.075);
    const yawToX = new THREE.Euler(0, SY + Math.PI / 2, 0);
    const qBag = new THREE.Quaternion().setFromEuler(yawToX);
    put('hips', extrude(bag, 0.068, 0.01, 6), leather, ...at(0, 0, 0), { q: qBag });
    const flap = new THREE.Shape();
    flap.moveTo(-0.094, 0.08); flap.lineTo(0.094, 0.08); flap.lineTo(0.094, -0.005);
    flap.quadraticCurveTo(0.094, -0.035, 0.05, -0.035); flap.lineTo(-0.05, -0.035);
    flap.quadraticCurveTo(-0.094, -0.035, -0.094, -0.005); flap.lineTo(-0.094, 0.08);
    put('hips', extrude(flap, 0.012, 0.003, 6), leather, ...at(-0.039, 0.022, 0), { q: qBag });
    put('hips', new THREE.BoxGeometry(0.03, 0.034, 0.01), bronze, ...at(-0.047, -0.01, 0), { r: [0, SY + Math.PI / 2, 0] });
    for (const lz of [0.08, -0.08]) put('hips', new THREE.BoxGeometry(0.03, 0.05, 0.016), leather, ...at(0, 0.09, lz), { r: [0, SY, 0] });
  }

  // ---- spine: jacket, placket, pockets, satchel strap, scarf roll, rope coil ----
  put('spine', latheGeo(TORSO.map(([y, r]) => [r, y]), 20), indigo, 0, 0, 0, { s: [1, 1, KT] });
  strap('spine', [[0, 1.1, 1], [0, 1.44, 1]], 0.026, 0.008, indigo, 5);
  for (const y of [1.16, 1.25]) onFace('spine', latheGeo([[0.011, 0], [0.011, 0.004], [0.006, 0.008], [0, 0.009]], 10), bronze, 0, y, 1, 0.004).rotateX(Math.PI / 2);
  for (const [, s] of SIDES) {
    onFace('spine', extrude(roundRect(0.088, 0.094, 0.012), 0.014, 0.003), indigo, 0.09 * s, 1.315, 1, 0.004);
    const flap = new THREE.Shape();
    flap.moveTo(-0.049, 0.018); flap.lineTo(0.049, 0.018); flap.lineTo(0.049, -0.006);
    flap.lineTo(0, -0.024); flap.lineTo(-0.049, -0.006); flap.lineTo(-0.049, 0.018);
    onFace('spine', extrude(flap, 0.012, 0.003), indigo, 0.09 * s, 1.37, 1, 0.012);
    onFace('spine', new THREE.SphereGeometry(0.009, 8, 6), bronze, 0.09 * s, 1.352, 1, 0.02);
  }
  const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a.map((c, j) => c + ((b[j] - c) * i) / n));
  strap('spine', line([-0.19, 1.03, 0.2], [0.075, 1.5, 0.2], 6), 0.045, 0.012, leather, 2);
  strap('spine', line([0.075, 1.5, -0.2], [-0.15, 1.03, -0.2], 6), 0.045, 0.012, leather, 2);
  {
    const a = onBody(-0.19, 1.03, 0.2, 0.007), b = onBody(-0.15, 1.03, -0.2, 0.007);
    put('spine', ribbonGeo([V3(-0.236, 0.94, -0.05), a.p], [V3(-1, 0, 0.35), a.n], 0.04, 0.012), leather, 0, 0, 0);
    put('spine', ribbonGeo([V3(-0.106, 0.94, -0.168), b.p], [V3(-0.4, 0, -1), b.n], 0.04, 0.012), leather, 0, 0, 0);
  }
  // the scarf wound twice round the neck
  {
    const loop = (cy, r, amp, phase, k) => Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return V3(Math.sin(a) * r, cy + amp * Math.sin(2 * a + phase), Math.cos(a) * r * k);
    });
    put('spine', tubeGeo(loop(1.47, 0.118, 0.012, 0.6, 0.86), 0.042, 30, 6, true), vermilion, 0, 0, 0);
    put('spine', tubeGeo(loop(1.505, 0.108, 0.01, 2.4, 0.9), 0.036, 30, 6, true), vermilion, 0, 0, 0);
  }
  // coil of rope on the back: a helix of three turns with its end hanging free
  {
    const pts = [];
    const turns = 3.2, N = 64;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = Math.PI / 2 + t * turns * Math.PI * 2;
      const r = 0.094 + 0.03 * t + 0.004 * Math.sin(a * 1.7);
      pts.push(V3(-0.07 + Math.cos(a) * r, 1.25 + Math.sin(a) * r, -0.124 - t * 0.046));
    }
    const end = pts[pts.length - 1];
    pts.push(V3(end.x - 0.012, end.y - 0.05, end.z - 0.004), V3(end.x - 0.02, end.y - 0.1, end.z));
    put('spine', tubeGeo(pts, 0.0135, 96, 5), canvas, 0, 0, 0);
    put('spine', latheGeo([[0.026, -0.035], [0.03, -0.03], [0.03, 0.03], [0.026, 0.035]], 12), leather, -0.07, 1.36, -0.147, { r: [0, 0, Math.PI / 2], s: [1, 1, 1.6] });
    put('spine', latheGeo([[0.026, -0.035], [0.03, -0.03], [0.03, 0.03], [0.026, 0.035]], 12), leather, -0.18, 1.25, -0.147, { s: [1, 1, 1.6] });
  }

  // ---- scarf tail: an extruded strip bent to hang behind the left shoulder ----
  put('scarfTail', new THREE.SphereGeometry(0.037, 12, 8), vermilion, 0.07, 1.487, -0.126, { s: [1.3, 0.95, 0.85] });
  {
    const L = 0.34, tail = new THREE.Shape();
    tail.moveTo(-0.05, 0); tail.lineTo(0.05, 0); tail.lineTo(0.044, -L + 0.02);
    tail.lineTo(0.026, -L); tail.lineTo(0.012, -L + 0.028); tail.lineTo(0, -L + 0.004);
    tail.lineTo(-0.012, -L + 0.028); tail.lineTo(-0.026, -L); tail.lineTo(-0.044, -L + 0.02); tail.lineTo(-0.05, 0);
    const geo = new THREE.ExtrudeGeometry(tail, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 2 });
    geo.translate(0, 0, -0.008);
    // hang it: slide outwards and curl slightly off the back as it falls
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), f = -y / L;
      p.setXYZ(i, p.getX(i) - 0.075 * f - 0.02 * f * f, y * 0.97, p.getZ(i) + 0.012 * Math.sin(f * Math.PI));
    }
    geo.computeVertexNormals();
    // lay the strip's face towards the back-left
    put('scarfTail', geo, vermilion, 0.07, 1.488, -0.136, { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, Math.PI - 0.34, 0)) });
  }

  // ---- head: skull, tilted lathe cap, extruded brim, goggles, scarf mask ------
  const HC = V3(0, 1.608, 0.004);
  put('head', new THREE.SphereGeometry(0.128, 18, 12), skin, HC.x, HC.y, HC.z);
  const CAP_TILT = -0.26;
  const capProf = [[0.1395, -0.014], [0.1415, -0.004], [0.14, 0.02], [0.134, 0.045], [0.121, 0.07], [0.1, 0.092], [0.07, 0.107], [0.036, 0.115], [0, 0.117]];
  put('head', latheGeo(capProf, 20), canvas, 0, 1.6435, -0.004, { r: [CAP_TILT, 0, 0], s: [1, 0.87, 1] });
  {
    // brim: a crescent whose inner edge follows the cap rim
    const s = new THREE.Shape(), N = 14;
    for (let i = 0; i <= N; i++) {
      const a = -1.2 + (2.4 * i) / N;
      const p = V2(Math.sin(a) * 0.132, Math.cos(a) * 0.132 * 1.0 + 0.052 * Math.cos(a) ** 2);
      if (i === 0) s.moveTo(p.x, p.y); else s.lineTo(p.x, p.y);
    }
    for (let i = N; i >= 0; i--) {
      const a = -1.2 + (2.4 * i) / N;
      s.lineTo(Math.sin(a) * 0.126, Math.cos(a) * 0.126);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 4 });
    // lay it flat, hinge it down at the front of the rim, then follow the cap's tilt
    const R = (a) => new THREE.Matrix4().makeRotationX(a), T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
    const hinge = 0.1395, M = new THREE.Matrix4();
    M.multiply(T(0, 1.6435, -0.004)).multiply(R(CAP_TILT)).multiply(T(0, -0.014 * 0.87 - 0.003, 0))
      .multiply(T(0, 0, hinge)).multiply(R(0.5)).multiply(T(0, 0, -hinge)).multiply(R(Math.PI / 2));
    geo.applyMatrix4(M);
    put('head', geo, canvas, 0, 0, 0);
  }
  for (const [, s] of SIDES) {
    const y = 1.626, x = 0.051 * s, dy = y - HC.y;
    const z = HC.z + Math.sqrt(0.128 ** 2 - x * x - dy * dy);
    const n = V3(x, dy, z - HC.z).normalize();
    const base = V3(x, y, z).addScaledVector(n, -0.008);
    const cup = [[0.035, 0], [0.036, 0.016], [0.034, 0.03], [0.031, 0.034], [0.026, 0.031], [0.026, 0.026]];
    put('head', latheGeo(cup, 16), bronze, base.x, base.y, base.z, { q: along(n) });
    const lens = base.clone().addScaledVector(n, 0.027);
    put('head', latheGeo([[0.027, 0], [0.027, 0.003], [0.018, 0.005], [0, 0.006]], 16), amber, lens.x, lens.y, lens.z, { q: along(n) });
  }
  put('head', new THREE.BoxGeometry(0.03, 0.011, 0.012), bronze, 0, 1.63, 0.127);
  {
    // goggle strap: a ribbon round the back of the head
    const pts = [], nrms = [];
    for (let i = 0; i <= 24; i++) {
      const a = 0.66 + (i / 24) * (Math.PI * 2 - 1.32);
      const n = V3(Math.sin(a), 0.04, Math.cos(a));
      const da = Math.min(a, Math.PI * 2 - a), k = Math.min(1, Math.max(0, (da - 1.35) / 0.45));
      const r = 0.1315 + 0.0215 * k * k * (3 - 2 * k);
      pts.push(V3(Math.sin(a) * r, 1.622 - 0.006 * Math.cos(a), Math.cos(a) * r + 0.004));
      nrms.push(n);
    }
    put('head', ribbonGeo(pts, nrms, 0.024, 0.006), leather, 0, 0, 0);
  }
  // scarf pulled up over the nose and mouth
  const maskProf = [[0.108, 1.46], [0.124, 1.475], [0.134, 1.5], [0.139, 1.53], [0.139, 1.555], [0.134, 1.575], [0.127, 1.586], [0.121, 1.59]];
  put('head', latheGeo(maskProf.map(([r, y]) => [r, y - HC.y]), 20), vermilion, HC.x, HC.y, HC.z, { r: [0.07, 0, 0] });
  put('head', new THREE.SphereGeometry(0.058, 10, 8), vermilion, 0, 1.553, 0.104, { s: [1.0, 0.72, 0.52] });
  {
    const pts = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return V3(Math.sin(a) * 0.128, 1.515 + 0.018 * Math.cos(a) + 0.006 * Math.sin(3 * a), Math.cos(a) * 0.128 + 0.008);
    });
    put('head', tubeGeo(pts, 0.026, 28, 5, true), vermilion, 0, 0, 0);
  }

  // ---- arms: lathe sleeves rolled to the forearm, extruded gloved hands -----
  for (const [side, s] of SIDES) {
    const U = side + 'UpperArm', L = side + 'LowerArm';
    const d = V3(s8 * s, -c8, 0);
    const S = V3(...P[U]), E = V3(...P[L]);
    const on = (o, t) => o.clone().addScaledVector(d, t);
    put(U, new THREE.SphereGeometry(0.066, 12, 8), indigo, S.x, S.y, S.z);
    limb(U, E, S, [[0.056, -0.01], [0.059, 0.05], [0.064, 0.16], [0.067, 0.25], [0.062, 0.3], [0.03, 0.33], [0, 0.335]], indigo);
    put(L, new THREE.SphereGeometry(0.057, 10, 8), indigo, E.x, E.y, E.z);
    const W = on(E, FORE), F = on(E, 0.255);
    // forearm profiles run from the wrist (h = 0) back up to the elbow
    limb(L, F, E, [[0, 0.0], [0.042, 0.004], [0.043, 0.012], [0.055, 0.03], [0.057, 0.04], [0.047, 0.06], [0.045, 0.075]], leather);
    limb(L, F, E, [[0.043, 0.06], [0.046, 0.1], [0.049, 0.15], [0.05, 0.17]], canvas);
    limb(L, F, E, [[0.046, 0.155], [0.064, 0.158], [0.07, 0.172], [0.069, 0.19], [0.058, 0.2], [0.056, 0.23], [0.057, 0.255], [0.03, 0.265], [0, 0.268]], indigo);
    // mitten: palm, fingers and thumb in one outline, seen from the side
    const m = new THREE.Shape();
    m.moveTo(-0.042, 0.0); m.lineTo(0.03, 0.0); m.quadraticCurveTo(0.046, -0.01, 0.052, -0.035);
    m.quadraticCurveTo(0.058, -0.06, 0.046, -0.066); m.lineTo(0.036, -0.05);
    m.lineTo(0.042, -0.14); m.quadraticCurveTo(0.04, -0.172, 0.0, -0.174);
    m.quadraticCurveTo(-0.04, -0.172, -0.044, -0.14); m.lineTo(-0.042, 0.0);
    const hand = extrude(m, 0.036, 0.008, 4);
    hand.translate(0, -0.087, 0);
    put(L, hand, leather, W.x, W.y, W.z, { q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, 0, 1), d.clone().negate(), V3(0, 0, 1).cross(d.clone().negate()))) });
  }

  // ---- legs: lathe trousers and boot shafts, extruded boots and soles --------
  for (const [side, s] of SIDES) {
    const U = side + 'UpperLeg', L = side + 'LowerLeg', x = 0.1 * s;
    put(U, new THREE.SphereGeometry(0.084, 12, 8), canvas, x, 0.92, 0);
    put(U, latheGeo([[0.07, 0.5], [0.074, 0.55], [0.083, 0.7], [0.089, 0.83], [0.087, 0.9], [0.06, 0.945], [0, 0.95]], 12), canvas, x, 0, 0);
    put(L, new THREE.SphereGeometry(0.07, 10, 8), canvas, x, 0.5, 0);
    put(L, latheGeo([[0.062, 0.3], [0.07, 0.325], [0.079, 0.345], [0.078, 0.37], [0.069, 0.4], [0.07, 0.46], [0.071, 0.5]], 12), canvas, x, 0, 0);
    put(L, latheGeo([[0.066, 0.1], [0.07, 0.16], [0.072, 0.25], [0.075, 0.295], [0.083, 0.3], [0.085, 0.34], [0.08, 0.35], [0.072, 0.345]], 12), leather, x, 0, 0);
    // boot upper: the side outline, extruded across the foot
    const b = new THREE.Shape();
    b.moveTo(-0.098, 0.05); b.lineTo(0.16, 0.05); b.quadraticCurveTo(0.188, 0.055, 0.186, 0.085);
    b.quadraticCurveTo(0.18, 0.112, 0.13, 0.12); b.lineTo(0.06, 0.145); b.lineTo(0.05, 0.2);
    b.lineTo(-0.072, 0.2); b.quadraticCurveTo(-0.1, 0.16, -0.098, 0.05);
    const up = extrude(b, 0.122, 0.014, 5);
    put(L, up, leather, x, 0.125, 0.044, { r: [0, -Math.PI / 2, 0] });
    // thick sole: the footprint, extruded down to the ground
    const fp = new THREE.Shape();
    fp.moveTo(-0.05, -0.104); fp.lineTo(0.05, -0.104); fp.quadraticCurveTo(0.06, 0.05, 0.057, 0.13);
    fp.quadraticCurveTo(0.052, 0.195, 0.0, 0.198); fp.quadraticCurveTo(-0.052, 0.195, -0.057, 0.13);
    fp.quadraticCurveTo(-0.06, 0.05, -0.05, -0.104);
    put(L, extrude(fp, 0.05, 0.008, 5), leather, x, 0.025, 0.045, { r: [Math.PI / 2, 0, 0] });
    for (const yy of [0.15, 0.2, 0.25]) put(L, new THREE.SphereGeometry(0.009, 6, 4), bronze, x, yy, 0.071);
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
