/**
 * warden, candidate B: turned and extruded profiles.
 *
 * The pear, legs, feet, arms and the whole stamp are LatheGeometry profiles:
 * smooth sweeps for the round masses, one lathe per segment wherever a step
 * must stay crisp. The head is a turned dome whose front is pressed flat, and
 * the mask plate, slit, hands and crescent are extruded outlines, bevelled
 * back onto their drawn size. The right fist is a lathe collar with three
 * finger ridges round the stamp handle; the sash is a ribbon computed on the
 * pear's own profile.
 *
 * Front +Z, up +Y, the Warden's left is +X. Every joint is a Group at its
 * pivot with zero rotation at rest; each joint's parts are baked into one mesh
 * per material. A positive rotation.x swings a hanging limb backwards and tips
 * the body forwards; rightArm.x near -2.6 raises the stamp overhead.
 */
export default function (THREE) {
  const g = new THREE.Group();
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const UP = V3(0, 1, 0);

  // ---- palette (far-door/docs/style-lock.md) ---------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const chalk = M(0xc9c2d8, 'stone', 0.86);
  const ochre = M(0xd9a441, 'fabric', 0.8);
  const bronze = M(0x9a6a35, 'metal', 0.45, 0.7);
  const timber = M(0x8a6a48, 'timber', 0.85);
  const basalt = M(0x3a3531, 'stone', 0.8);
  // The eye is unnamed and just under opaque so the surface pass leaves it
  // alone; the game dims or flares it through emissiveIntensity.
  const glow = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 1.2,
    roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.94,
  });

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
  };
  // Arms hang 35 degrees out from the pear so the stamp clears the feet at
  // rest and the mask when raised overhead.
  const SPLAY = (35 * Math.PI) / 180, SS = Math.sin(SPLAY), SC = Math.cos(SPLAY);
  const SHX = 0.26, SHY = 0.525, REACH = 0.245;
  const SIDES = [['left', 1], ['right', -1]];
  joint('body', null, 0, 0.3, 0);
  joint('head', 'body', 0, 0.62, 0);
  for (const [side, s] of SIDES) {
    joint(side + 'Arm', 'body', SHX * s, SHY, 0);
    joint(side + 'Leg', null, 0.1 * s, 0.3, 0);
  }
  const G = V3(-(SHX + REACH * SS), SHY - REACH * SC, 0);
  joint('stamp', 'rightArm', G.x, G.y, G.z);

  // ---- helpers ------------------------------------------------------------------
  const put = (jn, geo, mat, x = 0, y = 0, z = 0, q = null) => {
    const m = new THREE.Mesh(geo, mat);
    const p = P[jn];
    m.position.set(x - p[0], y - p[1], z - p[2]);
    if (q) m.quaternion.copy(q);
    J[jn].add(m);
    return m;
  };
  const along = (d) => new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  const basis = (x, y, z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  const concat = (geos) => {
    const flat = geos.map((q) => (q.index ? q.toNonIndexed() : q));
    let n = 0;
    for (const q of flat) n += q.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const q of flat) {
      pos.set(q.attributes.position.array, o * 3);
      nor.set(q.attributes.normal.array, o * 3);
      o += q.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return out;
  };
  // A profile of [r, y] traced from the bottom of the axis to the top, turned
  // round Y. LatheGeometry leaves its last normal unnormalised, so fix them all.
  const turn = (pts, segs = 24, zs = 1) => {
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
    const nr = geo.attributes.normal, v = V3();
    for (let k = 0; k < nr.count; k++) { v.fromBufferAttribute(nr, k).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    if (zs !== 1) geo.scale(1, 1, zs);
    return geo;
  };
  // one lathe per segment, so every step of a stepped profile keeps its edge
  const steps = (pts, segs = 24, zs = 1) => concat(pts.slice(1).map((p, i) => turn([pts[i], p], segs, zs)));
  const shape = (pts, holes = []) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    return s;
  };
  // extruded with a chamfer that stays inside the drawn outline (bevelOffset)
  const slab = (s, depth, bev = 0.005) => {
    const geo = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 1, curveSegments: 6 });
    geo.translate(0, 0, bev);
    return geo;
  };
  const rAt = (prof, y) => {
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      if (y >= y0 && y <= y1 && y1 > y0) return [r0 + ((r1 - r0) * (y - y0)) / (y1 - y0), (r1 - r0) / (y1 - y0)];
    }
    return [prof[prof.length - 1][0], 0];
  };

  // ---- body: a turned chalk pear with an incised base course ------------------
  const BZ = 0.88;
  const PEAR = [[0, 0.195], [0.05, 0.197], [0.12, 0.203], [0.18, 0.215], [0.222, 0.235], [0.252, 0.262], [0.266, 0.3],
    [0.268, 0.345], [0.26, 0.395], [0.242, 0.45], [0.218, 0.505], [0.192, 0.555], [0.165, 0.6], [0.13, 0.635], [0.08, 0.655], [0, 0.662]];
  const lowerPear = PEAR.filter(([, y]) => y < 0.236);
  const upperPear = PEAR.filter(([, y]) => y > 0.246);
  const [r236] = rAt(PEAR, 0.236), [r246] = rAt(PEAR, 0.246);
  const bodyGeo = concat([
    turn([...lowerPear, [r236, 0.236]], 20, BZ),
    steps([[r236, 0.236], [r236 - 0.01, 0.236], [r246 - 0.01, 0.246], [r246, 0.246]], 20, BZ),
    turn([[r246, 0.246], ...upperPear], 20, BZ),
  ]);
  put('body', bodyGeo, chalk);

  // sash: a ribbon between two tilted planes, laid on the pear's own profile
  const SASH = { y0: 0.43, k: 0.45, hw: 0.046, t: 0.013, n: 44 };
  const surf = (phi, y0) => {
    let y = y0;
    for (let it = 0; it < 8; it++) y = y0 + SASH.k * rAt(PEAR, y)[0] * Math.sin(phi);
    const [r, dr] = rAt(PEAR, y);
    const p = V3(r * Math.sin(phi), y, BZ * r * Math.cos(phi));
    const n = V3(Math.sin(phi), -dr, Math.cos(phi) / BZ).normalize();
    return { p, n };
  };
  {
    const pos = [], nor = [];
    const tri = (a, b, c, na, nb, nc) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); nor.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z); };
    const up = [], lo = [];
    for (let i = 0; i <= SASH.n; i++) {
      const phi = (2 * Math.PI * i) / SASH.n;
      up.push(surf(phi, SASH.y0 + SASH.hw));
      lo.push(surf(phi, SASH.y0 - SASH.hw));
    }
    const off = (h, d) => h.p.clone().addScaledVector(h.n, d);
    const nUp = V3(-SASH.k, 1, 0).normalize(), nLo = nUp.clone().negate();
    for (let i = 0; i < SASH.n; i++) {
      const [a, b, c, d] = [off(lo[i], SASH.t), off(lo[i + 1], SASH.t), off(up[i + 1], SASH.t), off(up[i], SASH.t)];
      tri(a, b, c, lo[i].n, lo[i + 1].n, up[i + 1].n);
      tri(a, c, d, lo[i].n, up[i + 1].n, up[i].n);
      const [e, f] = [off(up[i], -0.004), off(up[i + 1], -0.004)];
      tri(e, d, c, nUp, nUp, nUp); tri(e, c, f, nUp, nUp, nUp);
      const [h, k] = [off(lo[i], -0.004), off(lo[i + 1], -0.004)];
      tri(h, k, b, nLo, nLo, nLo); tri(h, b, a, nLo, nLo, nLo);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    put('body', geo, ochre);
  }
  // round bronze badge of office on the sash, over the heart
  {
    const phi = Math.asin(0.075 / 0.24);
    const { p, n } = surf(phi, SASH.y0);
    const base = p.clone().addScaledVector(n, SASH.t - 0.002);
    put('body', steps([[0, 0], [0.044, 0], [0.044, 0.01], [0.03, 0.014], [0.022, 0.021], [0, 0.024]], 12), bronze, base.x, base.y, base.z, along(n));
  }

  // ---- head: a turned bronze dome pressed flat in front -----------------------
  const HZ = 0.85, FACE = 0.13;
  const domeR = (y) => 0.217 * Math.cos(Math.asin(Math.min(1, (y - 0.9) / 0.25)));
  const dome = [];
  for (let i = 1; i <= 9; i++) {
    const y = 0.9 + 0.25 * Math.sin((i / 9) * (Math.PI / 2) * 0.97);
    if (y > 1.01) dome.push([domeR(y), y]);
  }
  // two incised grooves run round the dome (the pressed face swallows them in front)
  const cut = (a, b) => [[domeR(a), a], [domeR(a) - 0.008, a], [domeR(b) - 0.008, b], [domeR(b), b]];
  const headProfile = [[0, 0.6], [0.17, 0.6], [0.2, 0.615], [0.212, 0.64], [0.223, 0.64], [0.223, 0.668], [0.215, 0.668],
    [0.217, 0.9], [domeR(0.94), 0.94], ...cut(0.962, 0.972), ...cut(0.988, 0.998), ...dome, [0, 1.15]];
  const headGeo = steps(headProfile, 20, HZ);
  {
    const p = headGeo.attributes.position, n = headGeo.attributes.normal;
    for (let k = 0; k < p.count; k++) if (p.getZ(k) > FACE) { p.setZ(k, FACE); n.setXYZ(k, 0, 0, 1); }
  }
  put('head', headGeo, bronze);
  const SLIT = [[0, 0.748], [0.02, 0.766], [0.02, 0.9], [0, 0.918], [-0.02, 0.9], [-0.02, 0.766]];
  put('head', slab(shape([[-0.112, 0.678], [0.112, 0.678], [0.128, 0.694], [0.128, 0.9], [0.094, 0.956], [-0.094, 0.956],
    [-0.128, 0.9], [-0.128, 0.694]], [SLIT]), 0.022), bronze, 0, 0, FACE - 0.002);
  const eye = put('head', slab(shape(SLIT.map(([x, y]) => [x * 0.85, 0.833 + (y - 0.833) * 0.97])), 0.024, 0), glow, 0, 0, FACE - 0.014);
  eye.name = 'eye';
  eye.userData.keep = true;
  // rounded medallions on the cheeks
  for (const [, s] of SIDES) {
    const x = 0.2, z = Math.sqrt(0.217 * 0.217 - x * x) * HZ;
    const n = V3(x, 0, z / (HZ * HZ)).normalize();
    n.x *= s;
    put('head', steps([[0, 0], [0.042, 0], [0.042, 0.011], [0.022, 0.014], [0.016, 0.02], [0, 0.022]], 12), bronze, s * x, 0.8, z, along(n));
  }
  // disc and crescent on the back of the head
  {
    const cres = new THREE.Shape();
    cres.moveTo(0.04496, 0.021875);
    cres.absarc(0, 0, 0.05, Math.atan2(0.021875, 0.04496), Math.PI - Math.atan2(0.021875, 0.04496), true);
    cres.absarc(0, 0.02, 0.045, Math.atan2(0.001875, -0.04496), Math.atan2(0.001875, 0.04496), false);
    const zb = -0.217 * HZ + 0.006;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);
    put('head', slab(cres, 0.014, 0.004), bronze, 0, 0.775, zb, q);
    put('head', slab(shape(Array.from({ length: 12 }, (_, i) => [0.02 * Math.cos((i * Math.PI) / 6), 0.02 * Math.sin((i * Math.PI) / 6)])), 0.014, 0.004), bronze, 0, 0.817, zb, q);
  }

  // ---- arms: turned chalk limbs with an elbow ring and a bronze cuff ----------
  for (const [side, s] of SIDES) {
    const A = side + 'Arm', S = V3(...P[A]), d = V3(SS * s, -SC, 0);
    put(A, steps([[0, -0.08], [0.04, -0.072], [0.068, -0.05], [0.08, -0.02], [0.078, 0.012], [0.07, 0.04], [0.068, 0.118],
      [0.076, 0.118], [0.076, 0.144], [0.066, 0.144], [0.06, 0.206], [0, 0.206]], 12), chalk, S.x, S.y, S.z, along(d));
    put(A, steps([[0.064, 0.172], [0.07, 0.176], [0.07, 0.2], [0.063, 0.205]], 12), bronze, S.x, S.y, S.z, along(d));
  }
  // left hand: a flat three-fingered outline, bevelled thick, palm to the body
  {
    const S = V3(...P.leftArm), d = V3(SS, -SC, 0);
    const hand = new THREE.Shape();
    hand.moveTo(-0.05, 0);
    hand.lineTo(0.05, 0);
    hand.lineTo(0.052, 0.058);
    for (const cx of [0.034, 0, -0.034]) {
      hand.lineTo(cx + 0.015, 0.06);
      hand.lineTo(cx + 0.015, cx === 0 ? 0.108 : 0.1);
      hand.absarc(cx, cx === 0 ? 0.108 : 0.1, 0.015, 0, Math.PI, false);
      hand.lineTo(cx - 0.015, 0.06);
    }
    hand.lineTo(-0.052, 0.058);
    hand.lineTo(-0.05, 0);
    const geo = slab(hand, 0.048, 0.012);
    geo.translate(0, 0, -0.024);
    // curl: fingers bend towards the palm
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      if (y > 0.05) p.setZ(k, p.getZ(k) - (y - 0.05) * 0.45);
    }
    geo.computeVertexNormals();
    const W = S.clone().addScaledVector(d, 0.196);
    // shape x along world Z, shape y down the arm, extrusion outwards (right-handed)
    const zAx = V3(0, 0, 1), side = V3().crossVectors(zAx, d);
    put('leftArm', geo, chalk, W.x, W.y, W.z, basis(zAx, d, side));
  }
  // right hand: a collar with three finger ridges wrapped round the handle
  put('rightArm', steps([[0.034, G.y - 0.056], [0.05, G.y - 0.057], [0.062, G.y - 0.046], [0.064, G.y - 0.034], [0.057, G.y - 0.021],
    [0.064, G.y - 0.008], [0.066, G.y + 0.004], [0.059, G.y + 0.017], [0.065, G.y + 0.03], [0.062, G.y + 0.044], [0.05, G.y + 0.054], [0.034, G.y + 0.056]], 12), chalk, G.x, 0, G.z);

  // ---- legs: turned stubby columns, bronze knee rings, round flat feet ---------
  for (const [side, s] of SIDES) {
    const L = side + 'Leg', x = 0.1 * s;
    put(L, steps([[0, 0.045], [0.069, 0.045], [0.069, 0.068], [0.06, 0.068], [0.062, 0.24], [0.071, 0.285], [0.07, 0.315], [0.052, 0.352], [0, 0.366]], 12), chalk, x, 0, 0);
    put(L, steps([[0.062, 0.126], [0.072, 0.13], [0.072, 0.154], [0.062, 0.158]], 12), bronze, x, 0, 0);
    put(L, steps([[0, 0], [0.1, 0], [0.1, 0.028], [0.092, 0.042], [0.074, 0.052], [0, 0.056]], 16, 1.18), chalk, x, 0, 0.03);
  }

  // ---- stamp: one turned basalt head, ochre band, bronze ferrule, timber handle
  {
    const y = G.y;
    const at = (geo, mat) => put('stamp', geo, mat, G.x, 0, G.z);
    at(steps([[0, y - 0.265], [0.166, y - 0.265], [0.175, y - 0.256], [0.175, y - 0.176], [0.166, y - 0.168], [0.128, y - 0.168],
      [0.12, y - 0.15], [0, y - 0.15]], 22), basalt);
    at(steps([[0.174, y - 0.235], [0.179, y - 0.23], [0.179, y - 0.202], [0.174, y - 0.197]], 22), ochre);
    at(steps([[0.036, y - 0.154], [0.05, y - 0.154], [0.05, y - 0.118], [0.036, y - 0.118]], 12), bronze);
    at(steps([[0, y - 0.15], [0.037, y - 0.15], [0.035, y - 0.1], [0.034, y + 0.05], [0.04, y + 0.066], [0.052, y + 0.076], [0.055, y + 0.098],
      [0.049, y + 0.118], [0.032, y + 0.131], [0, y + 0.135]], 10), timber);
    // the face carries the disc motif, raised and inked in stamp ochre
    at(steps([[0.098, y - 0.264], [0.098, y - 0.273], [0.132, y - 0.273], [0.132, y - 0.264]], 22), ochre);
    at(steps([[0, y - 0.273], [0.055, y - 0.273], [0.055, y - 0.264]], 16), ochre);
  }

  // ---- bake each joint's parts into one mesh per material ---------------------
  const boxUV = (geo) => {
    geo.computeBoundingBox();
    const bb = geo.boundingBox, sz = bb.getSize(V3());
    const H = Math.max(sz.x, sz.z, 1e-6), VY = Math.max(sz.y, 1e-6);
    const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let t = 0; t < p.count; t += 3) {
      let ax = 0, ay = 0, az = 0;
      for (let k = 0; k < 3; k++) { ax += Math.abs(n.getX(t + k)); ay += Math.abs(n.getY(t + k)); az += Math.abs(n.getZ(t + k)); }
      for (let k = t; k < t + 3; k++) {
        const x = p.getX(k) - bb.min.x, y = p.getY(k) - bb.min.y, z = p.getZ(k) - bb.min.z;
        const [u, v] = ay >= ax && ay >= az ? [x / H, z / VY] : ax >= az ? [z / H, y / VY] : [x / H, y / VY];
        uv[k * 2] = u; uv[k * 2 + 1] = v;
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  };
  for (const j of Object.values(J)) {
    const byMat = new Map();
    for (const c of [...j.children]) {
      if (!c.isMesh) continue;
      c.updateMatrix();
      const geo = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(c.matrix);
      if (geo.attributes.uv) geo.deleteAttribute('uv');
      if (c.userData.keep) {
        c.geometry = boxUV(geo);
        c.position.set(0, 0, 0); c.quaternion.identity(); c.scale.set(1, 1, 1);
        continue;
      }
      if (!byMat.has(c.material)) byMat.set(c.material, []);
      byMat.get(c.material).push(geo);
      j.remove(c);
    }
    for (const [mat, geos] of byMat) j.add(new THREE.Mesh(boxUV(concat(geos)), mat));
  }

  // ---- placement: base at y = 0, centred on x and z, measured on vertices -----
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) {
      for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m4.multiplyMatrices(n.matrixWorld, im)); }
      return;
    }
    add(n.matrixWorld);
  });
  const ctr = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= box.min.y; o.position.z -= ctr.z; });
  g.updateMatrixWorld(true);

  g.userData.joints = {
    body: J.body, head: J.head, leftArm: J.leftArm, rightArm: J.rightArm,
    leftLeg: J.leftLeg, rightLeg: J.rightLeg, stamp: J.stamp,
  };
  g.userData.parts = { eye };
  return g;
}
