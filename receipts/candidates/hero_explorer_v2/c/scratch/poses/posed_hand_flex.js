/**
 * hero_explorer, second pass, candidate C: faceted, cut like the world around him.
 *
 * Head, torso, legs and boots keep the first pass's cut-stone language:
 * chamfered 8- and 12-sided prisms built as flat-shaded BufferGeometry, with
 * straps and pockets raycast onto the facets. Arms, hands and the jacket skirt
 * are faceted lofts along anatomical paths: a deltoid cap over a sloped
 * shoulder, a tapered sleeve, an elbow cap that fills the bend, a rolled cuff,
 * a canvas shirt sleeve, a flared gauntlet, and a hand with a palm, a thumb and
 * four curled fingers. Everything is authored in world metres at rest and
 * re-expressed in the frame of the joint that owns it; each joint's parts are
 * baked into one mesh per material at the end.
 *
 * Front +Z, up +Y, the character's left is +X. A positive rotation.x swings a
 * hanging limb backwards: knees bend with +x, elbows with -x, and the arms
 * reach overhead near -2.9. Every joint rotation is zero at rest.
 */
export default function (THREE) {
  const g = new THREE.Group();
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const UP = V3(0, 1, 0);
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
    j.position.copy(p).sub(parent ? P[parent] : V3());
    (parent ? J[parent] : g).add(j);
    J[name] = j;
    P[name] = p.clone();
    return j;
  };
  const UPPER = 0.29, FORE = 0.25;
  const SIDES = [['left', 1], ['right', -1]];
  const ARM = {};
  joint('hips', null, V3(0, 0.95, 0));
  joint('spine', 'hips', V3(0, 1.05, 0));
  joint('head', 'spine', V3(0, 1.52, 0));
  joint('scarfTail', 'spine', V3(0.07, 1.49, -0.118));
  for (const [side, s] of SIDES) {
    // The upper arm hangs 8 degrees out and 5 forward; the forearm and hand are
    // modelled with a relaxed 12 degree bend at the elbow, joints still at zero.
    const S = V3(0.21 * s, 1.45, 0);
    const dU = V3(Math.tan(8 * DEG) * s, -1, Math.tan(5 * DEG)).normalize();
    const E = S.clone().addScaledVector(dU, UPPER);
    const dF = dU.clone().applyAxisAngle(V3(1, 0, 0), -12 * DEG);
    const W = E.clone().addScaledVector(dF, FORE);
    joint(side + 'UpperArm', 'spine', S);
    joint(side + 'LowerArm', side + 'UpperArm', E);
    joint(side + 'Hand', side + 'LowerArm', W);
    joint(side + 'UpperLeg', 'hips', V3(0.1 * s, 0.92, 0));
    joint(side + 'LowerLeg', side + 'UpperLeg', V3(0.1 * s, 0.5, 0));
    ARM[side] = { s, S, dU, E, dF, W };
  }

  // ---- helpers ------------------------------------------------------------------
  const put = (jn, geo, mat, x = 0, y = 0, z = 0, o = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z).sub(P[jn]);
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
    const x = V3().crossVectors(y, z);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  const flat = (geo) => {
    const out = geo.index ? geo.toNonIndexed() : geo;
    out.computeVertexNormals();
    return out;
  };
  // octagon: a w x d rectangle with its corners cut by c, counter-clockwise seen from above
  const oct = (w, d, c, ox = 0, oz = 0) => {
    const x = w / 2, z = d / 2;
    return [[x - c, z], [x, z - c], [x, -z + c], [x - c, -z], [-x + c, -z], [-x, -z + c], [-x, z - c], [-x + c, z]]
      .map(([a, b]) => [a + ox, b + oz]);
  };
  // n-gon with a flat face at the front, same winding as oct
  const ngon = (w, d, n = 12, ox = 0, oz = 0) => Array.from({ length: n }, (_, i) => {
    const a = Math.PI / n + (2 * Math.PI * i) / n;
    return [Math.sin(a) * (w / 2) + ox, Math.cos(a) * (d / 2) + oz];
  });
  const withUV = (pos) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const uv = [];
    for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] + pos[i + 2], pos[i + 1]);
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
  };
  // faceted solid through horizontal rings [y, points]; skip lists side faces to leave open
  const prism = (rings, o = {}) => {
    const pos = [];
    const n = rings[0][1].length;
    const at = (r, i) => { const [x, z] = r[1][i % n]; return [x, r[0], z]; };
    const tri = (a, b, c) => pos.push(...a, ...b, ...c);
    for (let k = 0; k < rings.length - 1; k++) {
      const A = rings[k], B = rings[k + 1];
      for (let i = 0; i < n; i++) {
        if (o.skip && o.skip.includes(i)) continue;
        tri(at(A, i), at(A, i + 1), at(B, i + 1));
        tri(at(A, i), at(B, i + 1), at(B, i));
      }
    }
    if (o.caps !== false) {
      for (const [r, top] of [[rings[0], false], [rings[rings.length - 1], true]]) {
        const c = [r[1].reduce((s, p) => s + p[0], 0) / n, r[0], r[1].reduce((s, p) => s + p[1], 0) / n];
        for (let i = 0; i < n; i++) top ? tri(c, at(r, i), at(r, i + 1)) : tri(c, at(r, i + 1), at(r, i));
      }
    }
    return withUV(pos);
  };
  // Faceted solid through rings of 3D points with equal counts. The winding is
  // read from each ring's own orientation, so rings may be mirrored or bent.
  const loft = (rings, o = {}) => {
    const n = rings[0].length, pos = [], last = rings.length - 1;
    const cen = rings.map((r) => r.reduce((a, p) => a.add(p), V3()).divideScalar(n));
    const area = rings.map((r, k) => {
      const a = V3();
      for (let i = 0; i < n; i++) a.add(V3().subVectors(r[i], cen[k]).cross(V3().subVectors(r[(i + 1) % n], cen[k])));
      return a;
    });
    const axis = cen[last].clone().sub(cen[0]);
    const tri = (a, b, c, flip) => (flip ? pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z)
      : pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z));
    const flips = [];
    let sign = 1;
    for (let k = 0; k < last; k++) {
      let t = cen[k + 1].clone().sub(cen[k]);
      if (t.lengthSq() < 1e-12) t = axis;
      const ar = area[k].lengthSq() > area[k + 1].lengthSq() ? area[k] : area[k + 1];
      if (ar.lengthSq() > 1e-14) sign = Math.sign(ar.dot(t)) || sign;
      flips[k] = sign < 0;
      const A = rings[k], B = rings[k + 1];
      for (let i = 0; i < n; i++) {
        if (o.skip && o.skip(k, i)) continue;
        const i1 = (i + 1) % n;
        tri(A[i], A[i1], B[i1], flips[k]);
        tri(A[i], B[i1], B[i], flips[k]);
      }
    }
    if (o.caps !== false) {
      for (let i = 0; i < n; i++) {
        tri(cen[0], rings[0][(i + 1) % n], rings[0][i], flips[0]);
        tri(cen[last], rings[last][i], rings[last][(i + 1) % n], flips[last - 1]);
      }
    }
    return withUV(pos);
  };
  // Rings along a path of nodes { p, poly }. Each section's y runs along B made
  // perpendicular to the path (the hinge side of a limb or a finger), its x along
  // D x T, negated by mirror so the same section serves both sides.
  const sweep = (nodes, B, mirror = 1, o = {}) => loft(nodes.map((nd, k) => {
    const prev = nodes[Math.max(0, k - 1)].p, next = nodes[Math.min(nodes.length - 1, k + 1)].p;
    const tin = nd.p.clone().sub(prev), tout = next.clone().sub(nd.p);
    const T = V3();
    if (tin.lengthSq() > 1e-12) T.add(tin.normalize());
    if (tout.lengthSq() > 1e-12) T.add(tout.normalize());
    T.normalize();
    const D = B.clone().addScaledVector(T, -B.dot(T)).normalize();
    const U = V3().crossVectors(D, T).multiplyScalar(mirror);
    return nd.poly.map(([x, y]) => nd.p.clone().addScaledVector(U, x).addScaledVector(D, y));
  }), o);
  const gem = (jn, r, mat, x, y, z, w = 8, h = 6) => put(jn, flat(new THREE.SphereGeometry(r, w, h)), mat, x, y, z);
  const box = (jn, w, h, d, mat, x, y, z, o) => put(jn, new THREE.BoxGeometry(w, h, d), mat, x, y, z, o);
  const strip = (jn, a, b, w, t, mat, nrm) => {
    const d = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    return put(jn, new THREE.BoxGeometry(w, d.length() + t * 0.5, t), mat, mid.x, mid.y, mid.z, { q: basis(d, nrm) });
  };
  // project a point onto a mesh's facets, from outside towards its vertical axis
  const ray = new THREE.Raycaster();
  const onto = (mesh, x, y, z, lift, axis = [0, 0]) => {
    g.updateMatrixWorld(true);
    const dir = V3(axis[0] - x, 0, axis[1] - z).normalize();
    ray.set(V3(x, y, z).addScaledVector(dir, -1), dir);
    const hit = ray.intersectObject(mesh, false)[0];
    if (!hit) return { p: V3(x, y, z), n: dir.clone().negate() };
    const n = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
    return { p: hit.point.clone().addScaledVector(n, lift), n };
  };
  const hug = (jn, mesh, ctrl, w, t, mat, steps = 3) => {
    const pts = [];
    for (let i = 0; i < ctrl.length - 1; i++) {
      for (let k = 0; k < steps; k++) pts.push(ctrl[i].map((c, j) => c + ((ctrl[i + 1][j] - c) * k) / steps));
    }
    pts.push(ctrl[ctrl.length - 1]);
    const S = pts.map(([x, y, z]) => onto(mesh, x, y, z, t / 2));
    for (let i = 0; i < S.length - 1; i++) strip(jn, S[i].p, S[i + 1].p, w, t, mat, S[i].n.clone().add(S[i + 1].n));
  };
  const patch = (jn, mesh, x, y, face, w, h, t, mat) => {
    const { p, n } = onto(mesh, x, y, face * 0.4, t / 2 - 0.002, [x, 0]);
    return put(jn, new THREE.BoxGeometry(w, h, t), mat, p.x, p.y, p.z, { q: basis(UP, n) });
  };

  // ---- hips: seat, belt, jacket skirt, satchel --------------------------------
  // the seat sits flush with the thighs, so the short jacket front shows trousers, not a shelf
  put('hips', prism([[0.845, oct(0.1, 0.1, 0.03)], [0.9, oct(0.29, 0.176, 0.065)], [0.995, oct(0.32, 0.2, 0.07)]]), canvas);
  put('hips', prism([[0.99, oct(0.356, 0.242, 0.078)], [1.05, oct(0.356, 0.242, 0.078)]]), leather);
  box('hips', 0.062, 0.05, 0.012, bronze, 0, 1.02, 0.125);
  box('hips', 0.034, 0.026, 0.014, leather, 0, 1.02, 0.126);
  {
    // The skirt is short in front, where a thigh swung forward sweeps, and long
    // and flared at the sides and back, with a vent at the back.
    const TOP = 1.004, LOW = 0.845;
    // stations around the hips: [x, z] on a unit chamfered box, hem height
    const ST = [
      [0.02, 1, 0.957], [0.62, 1, 0.955], [0.81, 0.69, 0.951], [1, 0.33, 0.93], [1, 0, 0.885],
      [1, -0.33, 0.856], [0.81, -0.69, 0.847], [0.62, -1, 0.845], [0.03, -1, 0.845],
    ];
    const cols = [...ST, ...ST.slice().reverse().map(([x, z, h]) => [-x, z, h])];
    const at = ([x, z, h], f, grow = 0) => {
      const y = TOP - f * (TOP - h);
      const k = (TOP - y) / (TOP - LOW);
      const hw = 0.173 + 0.044 * k + grow, hd = 0.113 + 0.047 * k + grow;
      return V3(x * hw, y, z * hd - 0.012 * k * (z < 0 ? 1 : 0.3));
    };
    const rows = [[0, 0], [0.45, 0], [0.86, 0], [0.9, 0.005], [1, 0.005]];
    const rings = rows.map(([f, grow]) => cols.map((c) => at(c, f, grow)));
    // the back vent opens in the lower half, between the two back-centre columns
    const vent = ST.length - 1;
    put('hips', loft(rings, { caps: false, skip: (k, i) => k >= 1 && i === vent }), skirtCloth);
  }
  // satchel on the right hip, behind the hanging arm
  {
    const SY = -0.873, SC = [-0.19, 0.865, -0.122];
    const at = (lx, ly, lz) => [SC[0] + lx * Math.cos(SY) + lz * Math.sin(SY), SC[1] + ly, SC[2] - lx * Math.sin(SY) + lz * Math.cos(SY)];
    const bag = prism([[-0.078, oct(0.064, 0.16, 0.02)], [-0.05, oct(0.072, 0.18, 0.022)], [0.075, oct(0.072, 0.18, 0.022)]]);
    put('hips', bag, leather, ...at(0, 0, 0), { r: [0, SY, 0] });
    box('hips', 0.012, 0.1, 0.186, leather, ...at(-0.04, 0.03, 0), { r: [0, SY, 0] });
    box('hips', 0.012, 0.036, 0.034, bronze, ...at(-0.048, -0.008, 0), { r: [0, SY, 0] });
    for (const lz of [0.074, -0.074]) box('hips', 0.03, 0.05, 0.016, leather, ...at(0, 0.09, lz), { r: [0, SY, 0] });
  }

  // ---- spine: faceted jacket with a sloped shoulder line, pockets, straps -----
  const torso = put('spine', prism([
    [0.995, oct(0.315, 0.205, 0.07)], [1.1, oct(0.33, 0.215, 0.072)], [1.26, oct(0.4, 0.245, 0.08)],
    [1.36, oct(0.43, 0.252, 0.085)], [1.415, oct(0.43, 0.245, 0.088)], [1.455, oct(0.39, 0.228, 0.085)],
    [1.49, oct(0.3, 0.202, 0.075)], [1.525, oct(0.18, 0.15, 0.05)],
  ]), indigo);
  hug('spine', torso, [[0, 1.1, 1], [0, 1.44, 1]], 0.028, 0.009, indigo, 4);
  for (const y of [1.16, 1.25]) patch('spine', torso, 0, y, 1, 0.02, 0.02, 0.024, bronze);
  for (const [, s] of SIDES) {
    patch('spine', torso, 0.092 * s, 1.31, 1, 0.09, 0.1, 0.016, indigo);
    patch('spine', torso, 0.092 * s, 1.372, 1, 0.1, 0.036, 0.028, indigo);
    patch('spine', torso, 0.092 * s, 1.366, 1, 0.018, 0.018, 0.038, bronze);
  }
  const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a.map((c, j) => c + ((b[j] - c) * i) / n));
  hug('spine', torso, line([-0.19, 1.04, 0.25], [0.08, 1.5, 0.25], 6), 0.046, 0.012, leather, 1);
  hug('spine', torso, line([0.08, 1.5, -0.25], [-0.15, 1.04, -0.25], 6), 0.046, 0.012, leather, 1);
  strip('hips', V3(-0.25, 0.94, -0.062), onto(torso, -0.19, 1.04, 0.25, 0.006).p, 0.042, 0.012, leather, V3(-1, 0, 0.3));
  strip('hips', V3(-0.118, 0.94, -0.18), onto(torso, -0.15, 1.04, -0.25, 0.006).p, 0.042, 0.012, leather, V3(-0.4, 0, -1));
  // scarf wound round the neck: a faceted cowl with a proud fold
  put('spine', prism([[1.42, ngon(0.3, 0.27, 12, 0, -0.004)], [1.455, ngon(0.345, 0.315, 12, 0, -0.004)],
    [1.505, ngon(0.34, 0.315, 12, 0, -0.004)], [1.54, ngon(0.272, 0.252, 12, 0, -0.004)]]), vermilion);
  put('spine', prism([[1.47, ngon(0.36, 0.33, 12, 0, -0.004)], [1.495, ngon(0.36, 0.33, 12, 0, -0.004)]], { caps: false }), vermilion);
  // coil of rope on the back, three faceted loops and two ties
  for (const [r, dx, dy, z] of [[0.118, 0, 0, -0.126], [0.1, 0.008, -0.012, -0.145], [0.112, -0.006, -0.002, -0.164]]) {
    put('spine', flat(new THREE.TorusGeometry(r, 0.016, 4, 12)), canvas, -0.07 + dx, 1.25 + dy, z, { r: [0, 0, Math.PI / 12] });
  }
  box('spine', 0.032, 0.07, 0.078, leather, -0.07, 1.36, -0.146);
  box('spine', 0.07, 0.032, 0.078, leather, -0.185, 1.247, -0.146);

  // ---- scarf tail: a flat strip folded once, notched at the end ---------------
  gem('scarfTail', 0.04, vermilion, 0.07, 1.487, -0.13);
  {
    const L = 0.34, tail = new THREE.Shape();
    tail.moveTo(-0.052, 0); tail.lineTo(0.052, 0); tail.lineTo(0.046, -L);
    tail.lineTo(0, -L + 0.034); tail.lineTo(-0.046, -L); tail.lineTo(-0.052, 0);
    const geo = new THREE.ExtrudeGeometry(tail, { depth: 0.02, bevelEnabled: false });
    geo.translate(0, 0, -0.01);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = -p.getY(i) / L, k = Math.max(0, f - 0.45);
      p.setXYZ(i, p.getX(i) - 0.06 * f - 0.12 * k, p.getY(i), p.getZ(i) + 0.05 * k);
    }
    put('scarfTail', flat(geo), vermilion, 0.07, 1.487, -0.142, { q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, Math.PI - 0.34, 0)) });
  }

  // ---- head: faceted skull, stepped cap and visor, goggles, scarf mask --------
  const HZ = 0.004;
  put('head', prism([
    [1.475, ngon(0.21, 0.21, 12, 0, HZ)], [1.52, ngon(0.258, 0.258, 12, 0, HZ)], [1.6, ngon(0.272, 0.272, 12, 0, HZ)],
    [1.67, ngon(0.266, 0.266, 12, 0, HZ)], [1.72, ngon(0.226, 0.226, 12, 0, HZ)], [1.735, ngon(0.17, 0.17, 12, 0, HZ)],
  ]), skin);
  put('head', prism([[1.652, ngon(0.298, 0.298)], [1.705, ngon(0.296, 0.296)], [1.736, ngon(0.252, 0.252)], [1.75, ngon(0.17, 0.17)]]), canvas);
  put('head', prism([[1.588, ngon(0.296, 0.296)], [1.656, ngon(0.298, 0.298)]], { caps: false, skip: [11] }), canvas);
  {
    const visor = new THREE.Shape();
    visor.moveTo(-0.104, 0); visor.lineTo(0.104, 0); visor.lineTo(0.084, 0.072); visor.lineTo(-0.084, 0.072); visor.lineTo(-0.104, 0);
    const geo = new THREE.ExtrudeGeometry(visor, { depth: 0.018, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    geo.rotateX(0.2);
    put('head', flat(geo), canvas, 0, 1.683, 0.134);
  }
  for (const [, s] of SIDES) {
    const n = V3(0.26 * s, 0, 1).normalize();
    const base = V3(0.052 * s, 1.622, 0.124);
    const q = along(n);
    const rim = prism([[0, oct(0.07, 0.07, 0.021)], [0.036, oct(0.074, 0.074, 0.022)], [0.036, oct(0.054, 0.054, 0.016)], [0.028, oct(0.054, 0.054, 0.016)]], { caps: false });
    put('head', rim, bronze, base.x, base.y, base.z, { q });
    const lens = base.clone().addScaledVector(n, 0.024);
    put('head', prism([[0, oct(0.056, 0.056, 0.017)], [0.006, oct(0.056, 0.056, 0.017)]]), amber, lens.x, lens.y, lens.z, { q });
  }
  box('head', 0.032, 0.014, 0.016, bronze, 0, 1.628, 0.15);
  put('head', prism([[1.61, ngon(0.309, 0.309)], [1.636, ngon(0.309, 0.309)]], { caps: false, skip: [11] }), leather);
  {
    const mask = prism([[1.462, ngon(0.245, 0.245, 12, 0, HZ)], [1.53, ngon(0.292, 0.292, 12, 0, HZ)], [1.578, ngon(0.288, 0.288, 12, 0, HZ)], [1.594, ngon(0.279, 0.279, 12, 0, HZ)]]);
    mask.translate(0, -1.53, 0);
    mask.rotateX(0.1);
    mask.translate(0, 1.53, 0);
    put('head', mask, vermilion);
    put('head', prism([[1.53, oct(0.05, 0.03, 0.012, 0, 0.151)], [1.575, oct(0.034, 0.02, 0.008, 0, 0.147)]]), vermilion);
  }

  // ---- arms: deltoid cap, tapered sleeve, elbow cap, rolled cuff, gauntlet ---
  const FWD = V3(0, 0, 1);
  const PALM = {};
  for (const [side, s] of SIDES) {
    const { S, dU, E, dF, W } = ARM[side];
    const U = side + 'UpperArm', L = side + 'LowerArm', H = side + 'Hand';
    const out = V3(s, 0, 0);
    // rows [t along the limb, width across, depth front to back, outward shift]
    const limb = (o, d, rows, n = 12) => rows.map(([t, w, dd, lat = 0]) => ({
      p: o.clone().addScaledVector(d, t).addScaledVector(out, lat), poly: ngon(w, dd, n),
    }));
    // The cap is round over the pivot so it turns in place; its top sits under
    // the sloped shoulder line, and the sleeve narrows from the deltoid to the elbow.
    put(U, sweep(limb(S, dU, [
      [-0.043, 0.036, 0.032, 0.002], [-0.037, 0.068, 0.06, 0.003], [-0.024, 0.098, 0.086, 0.004],
      [-0.004, 0.118, 0.1, 0.004], [0.026, 0.126, 0.106, 0.004], [0.07, 0.12, 0.104, 0.003],
      [0.122, 0.106, 0.098], [0.18, 0.099, 0.093], [0.238, 0.094, 0.087], [0.279, 0.092, 0.085], [0.306, 0.095, 0.088],
    ]), FWD, s), indigo);
    // Forearm: a cap round the elbow pivot fills the back of the bend, then the
    // jacket sleeve rolled into a thick cuff, the canvas shirt sleeve and the
    // glove's flared gauntlet. Near the wrist the section turns to lie front to back.
    put(L, sweep(limb(E, dF, [
      [-0.045, 0.026, 0.024], [-0.039, 0.058, 0.054], [-0.024, 0.082, 0.078], [0, 0.092, 0.087],
      [0.03, 0.093, 0.088], [0.07, 0.094, 0.09],
    ]), FWD, s), indigo);
    put(L, sweep(limb(E, dF, [
      [0.04, 0.096, 0.092], [0.047, 0.116, 0.11], [0.064, 0.12, 0.114], [0.069, 0.112, 0.107],
      [0.074, 0.12, 0.114], [0.09, 0.116, 0.11], [0.097, 0.1, 0.095],
    ]), FWD, s), indigo);
    put(L, sweep(limb(E, dF, [
      [0.085, 0.086, 0.082], [0.1, 0.087, 0.084], [0.15, 0.076, 0.078], [0.2, 0.064, 0.07], [0.215, 0.062, 0.068],
    ]), FWD, s), canvas);
    put(L, sweep(limb(E, dF, [
      [0.176, 0.082, 0.088], [0.18, 0.096, 0.1], [0.196, 0.09, 0.096], [0.222, 0.076, 0.084],
      [0.25, 0.066, 0.076], [0.264, 0.064, 0.074],
    ]), FWD, s), leather);

    // ---- hand: a, wrist to knuckles; b, out of the back of the hand; t, thumb side
    const a = dF.clone();
    const b = out.clone().addScaledVector(a, -out.dot(a)).normalize();
    const t = FWD.clone().addScaledVector(a, -FWD.dot(a)).addScaledVector(b, -FWD.dot(b)).normalize();
    const K = V3().crossVectors(b, a).normalize(); // turning about K folds a towards the palm
    a.applyAxisAngle(K, 6 * DEG);
    b.applyAxisAngle(K, 6 * DEG);
    const mir = Math.sign(V3().crossVectors(t, a).dot(b));
    const hp = (u, v, w) => W.clone().addScaledVector(a, u).addScaledVector(b, v).addScaledVector(t, w);
    // rows [u, v, w, thickness (back to palm), width (across)]
    const hand = (rows, c = 0.3) => rows.map(([u, v, w, th, wd]) => ({ p: hp(u, v, w), poly: oct(th, wd, Math.min(th, wd) * c) }));
    // palm: a chunky faceted block, fuller at the heel and the thumb pad
    put(H, sweep(hand([
      [-0.02, 0, 0, 0.03, 0.05], [0, 0, 0.001, 0.036, 0.061], [0.028, -0.002, 0.004, 0.041, 0.08],
      [0.062, 0, 0.002, 0.038, 0.09], [0.09, 0.002, 0, 0.033, 0.092], [0.102, 0.003, -0.001, 0.026, 0.084],
    ]), t, mir), leather);
    // thumb, angled forward and in towards the palm, resting beside the index
    put(H, sweep(hand([
      [0.006, -0.006, 0.014, 0.026, 0.026], [0.028, -0.014, 0.04, 0.031, 0.029], [0.054, -0.022, 0.058, 0.027, 0.026],
      [0.08, -0.032, 0.058, 0.024, 0.023], [0.098, -0.04, 0.05, 0.02, 0.019], [0.105, -0.043, 0.046, 0.012, 0.012],
    ], 0.32), b, 1), leather);
    // four fingers in a loose half fist: [across, length, curl at the three knuckles, fan, knuckle]
    for (const [w0, len, c1, c2, c3, fan, ku] of [
      [0.0322, 0.084, 22, 38, 18, 4, 0.09], [0.0107, 0.092, 28, 44, 20, 1, 0.094],
      [-0.0107, 0.087, 32, 48, 22, -2, 0.092], [-0.0322, 0.07, 36, 52, 24, -6, 0.086],
    ]) {
      const d = a.clone().addScaledVector(t, Math.tan(fan * DEG)).normalize();
      const Kf = V3().crossVectors(b, d).normalize();
      const mcp = hp(ku, 0.002, w0);
      const pts = [hp(ku - 0.022, 0.002, w0 * 0.92), mcp];
      let p = mcp;
      for (const [l, c] of [[0.45, c1], [0.3, c2], [0.18, c3], [0.07, 0]]) {
        d.applyAxisAngle(Kf, c * DEG);
        p = p.clone().addScaledVector(d, len * l);
        pts.push(p);
      }
      const secs = [[0.021, 0.02], [0.025, 0.0225], [0.024, 0.0215], [0.022, 0.02], [0.019, 0.017], [0.012, 0.011]];
      put(H, sweep(pts.map((q, i) => ({ p: q, poly: oct(secs[i][0], secs[i][1], Math.min(...secs[i]) * 0.3) })), t, mir), leather);
    }
    PALM[side] = { jn: H, local: hp(0.05, -0.021, 0.004).sub(W) };
  }

  // ---- legs: faceted trousers into chunky boots with stepped soles -----------
  for (const [side, s] of SIDES) {
    const U = side + 'UpperLeg', L = side + 'LowerLeg', x = 0.1 * s;
    gem(U, 0.086, canvas, x, 0.92, 0);
    put(U, prism([[0.5, oct(0.145, 0.145, 0.043)], [0.62, oct(0.172, 0.166, 0.05)], [0.82, oct(0.186, 0.18, 0.055)], [0.935, oct(0.168, 0.168, 0.05)]]), canvas, x, 0, 0);
    // knee cap: an octagonal dome round the pivot that fills the front of a bent knee
    put(L, prism([[0.497, oct(0.141, 0.141, 0.042)], [0.53, oct(0.128, 0.128, 0.038)], [0.553, oct(0.095, 0.095, 0.028)], [0.566, oct(0.05, 0.05, 0.015)]]), canvas, x, 0, 0);
    put(L, prism([[0.32, oct(0.135, 0.135, 0.04)], [0.335, oct(0.168, 0.162, 0.05)], [0.372, oct(0.168, 0.162, 0.05)], [0.4, oct(0.142, 0.142, 0.043)], [0.51, oct(0.14, 0.14, 0.042)]]), canvas, x, 0, 0);
    put(L, prism([[0.1, oct(0.148, 0.148, 0.044)], [0.29, oct(0.152, 0.152, 0.045)], [0.295, oct(0.176, 0.176, 0.052)], [0.345, oct(0.178, 0.178, 0.053)], [0.35, oct(0.158, 0.158, 0.047)]]), leather, x, 0, 0);
    const b = new THREE.Shape();
    b.moveTo(-0.1, 0.045); b.lineTo(0.16, 0.045); b.lineTo(0.2, 0.07); b.lineTo(0.2, 0.098);
    b.lineTo(0.158, 0.128); b.lineTo(0.074, 0.145); b.lineTo(0.06, 0.19); b.lineTo(-0.08, 0.19); b.lineTo(-0.1, 0.15); b.lineTo(-0.1, 0.045);
    const up = new THREE.ExtrudeGeometry(b, { depth: 0.142, bevelEnabled: false });
    up.translate(0, 0, -0.071);
    put(L, flat(up), leather, x, 0, 0, { r: [0, -Math.PI / 2, 0] });
    put(L, prism([[0, oct(0.146, 0.316, 0.04, 0, 0.05)], [0.02, oct(0.146, 0.316, 0.04, 0, 0.05)], [0.02, oct(0.162, 0.332, 0.044, 0, 0.05)], [0.05, oct(0.162, 0.332, 0.044, 0, 0.05)]]), leather, x, 0, 0);
    for (const yy of [0.15, 0.2, 0.25]) box(L, 0.016, 0.012, 0.01, bronze, x, yy, 0.079);
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
  const box3 = new THREE.Box3(), v = V3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
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
  const ctr = box3.getCenter(V3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= box3.min.y; o.position.z -= ctr.z; });
  g.updateMatrixWorld(true);

  // ---- palms: centre of each palm face in model space, at rest ----------------
  const round3 = (x) => Math.round(x * 1000) / 1000;
  const palm = (k) => J[PALM[k].jn].localToWorld(PALM[k].local.clone()).toArray().map(round3);
  g.userData.palms = { left: palm('left'), right: palm('right') };

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
    leftUpperArm: J.leftUpperArm, leftLowerArm: J.leftLowerArm, leftHand: J.leftHand,
    rightUpperArm: J.rightUpperArm, rightLowerArm: J.rightLowerArm, rightHand: J.rightHand,
    leftUpperLeg: J.leftUpperLeg, leftLowerLeg: J.leftLowerLeg,
    rightUpperLeg: J.rightUpperLeg, rightLowerLeg: J.rightLowerLeg,
    scarfTail: J.scarfTail,
  };
  g.userData.grip = { hands: round3(top) };

  // ---- scratch pose: hand_flex ----
  const PJ = g.userData.joints;
  PJ.leftHand.rotation.set(0.6, 0, 0.4);
  PJ.rightHand.rotation.set(0.6, 0, 0.4);

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
