/**
 * warden, candidate A: primitives.
 *
 * Spheres, capsules, cylinders, boxes and tori at low segment counts. The pear
 * is two squashed spheres, the head a tapered cylinder under a hemisphere dome
 * with a thick flat mask slab strapped to its front, the slit framed by bronze
 * lips. The sash is a chain of boxes laid on the body by raycasting, the fist
 * three torus fingers round the stamp handle, and the stamp a stack of discs.
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
  // place a primitive in joint jn at world position p, optionally rotated and scaled
  const put = (jn, geo, mat, p, q = null, s = null) => {
    const m = new THREE.Mesh(geo, mat);
    const o = P[jn];
    m.position.set(p.x - o[0], p.y - o[1], p.z - o[2]);
    if (q) m.quaternion.copy(q);
    if (s) m.scale.set(...s);
    J[jn].add(m);
    return m;
  };
  const along = (d) => new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  const basis = (x, y, z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
  const cyl = (rt, rb, h, n = 16) => new THREE.CylinderGeometry(rt, rb, h, n);
  // a flat ring lying in the XZ plane
  const ring = (r, tube, n = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, 4, n, arc).rotateX(Math.PI / 2);

  // ---- body: two squashed spheres make the pear ------------------------------
  const belly = put('body', sphere(1, 16, 10), chalk, V3(0, 0.36, 0), null, [0.268, 0.17, 0.236]);
  const chest = put('body', sphere(1, 14, 9), chalk, V3(0, 0.49, 0), null, [0.2, 0.17, 0.176]);
  // sash: a chain of boxes between two tilted planes, laid on the spheres by raycasting
  g.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const cast = (from, dir) => {
    ray.set(from, dir);
    const h = ray.intersectObjects([belly, chest], false)[0];
    return h ? { p: h.point.clone(), n: h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize() } : null;
  };
  const SASH = { y0: 0.43, k: 0.45, w: 0.092, t: 0.012, n: 26 };
  const onPlane = (phi) => {
    const dir = V3(Math.sin(phi), 0, Math.cos(phi));
    let x = 0.24 * dir.x, h = null;
    for (let it = 0; it < 6; it++) {
      const got = cast(V3(0, SASH.y0 + SASH.k * x, 0).addScaledVector(dir, 1), dir.clone().negate());
      if (got) { h = got; x = got.p.x; }
    }
    return h;
  };
  // offset off the spheres' UV seam: a ray along a seam edge can slip between its two triangles
  const loop = Array.from({ length: SASH.n }, (_, i) => onPlane((2 * Math.PI * (i + 0.37)) / SASH.n));
  const planeN = V3(-SASH.k, 1, 0).normalize();
  for (let i = 0; i < SASH.n; i++) {
    const a = loop[i], b = loop[(i + 1) % SASH.n];
    const tan = b.p.clone().sub(a.p), len = tan.length();
    tan.normalize();
    const n = a.n.clone().add(b.n).normalize();
    const zAx = n.clone().addScaledVector(tan, -n.dot(tan)).normalize();
    const yAx = V3().crossVectors(zAx, tan).normalize();
    if (yAx.dot(planeN) < 0) yAx.negate();
    const xAx = V3().crossVectors(yAx, zAx);
    const mid = a.p.clone().add(b.p).multiplyScalar(0.5).addScaledVector(zAx, SASH.t / 2 - 0.002);
    put('body', new THREE.BoxGeometry(len + 0.012, SASH.w, SASH.t), ochre, mid, basis(xAx, yAx, zAx));
  }
  // round bronze badge of office on the sash, over the heart
  {
    const bx = 0.075, h = cast(V3(bx, SASH.y0 + SASH.k * bx, 1), V3(0, 0, -1));
    const q = along(h.n);
    put('body', cyl(0.044, 0.044, 0.012, 16), bronze, h.p.clone().addScaledVector(h.n, SASH.t + 0.004), q);
    put('body', cyl(0.02, 0.026, 0.012, 16), bronze, h.p.clone().addScaledVector(h.n, SASH.t + 0.014), q);
  }

  // ---- head: tapered cylinder, hemisphere dome, a flat mask slab in front ----
  const HZ = 0.88;
  put('head', cyl(0.2, 0.172, 0.03, 18), bronze, V3(0, 0.615, 0), null, [1, 1, HZ]);
  put('head', cyl(0.222, 0.222, 0.03, 18), bronze, V3(0, 0.645, 0), null, [1, 1, HZ]);
  put('head', cyl(0.214, 0.206, 0.26, 18), bronze, V3(0, 0.79, 0), null, [1, 1, HZ]);
  put('head', new THREE.SphereGeometry(0.214, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze, V3(0, 0.92, 0), null, [1, 1.075, HZ]);
  put('head', ring(0.207, 0.008, 20), bronze, V3(0, 0.965, 0), null, [1, 1, HZ * 1.01]);
  put('head', ring(0.201, 0.008, 20), bronze, V3(0, 0.993, 0), null, [1, 1, HZ * 1.02]);
  put('head', new THREE.BoxGeometry(0.31, 0.29, 0.1), bronze, V3(0, 0.81, 0.162));
  put('head', new THREE.BoxGeometry(0.27, 0.25, 0.012), bronze, V3(0, 0.81, 0.217));
  // the slit: a glowing bar between two bronze lips
  const eye = put('head', new THREE.BoxGeometry(0.036, 0.17, 0.012), glow, V3(0, 0.83, 0.222));
  eye.name = 'eye';
  eye.userData.keep = true;
  for (const [, s] of SIDES) put('head', new THREE.BoxGeometry(0.02, 0.2, 0.014), bronze, V3(s * 0.028, 0.83, 0.228));
  for (const y of [0.724, 0.936]) put('head', new THREE.BoxGeometry(0.076, 0.016, 0.014), bronze, V3(0, y, 0.228));
  // rounded medallions on the cheeks
  for (const [, s] of SIDES) {
    const x = 0.198, z = Math.sqrt(0.21 * 0.21 - x * x) * HZ;
    const n = V3(s * x, 0, z / (HZ * HZ)).normalize();
    put('head', cyl(0.044, 0.044, 0.016, 16), bronze, V3(s * x, 0.8, z).addScaledVector(n, 0.004), along(n));
    put('head', cyl(0.018, 0.024, 0.012, 12), bronze, V3(s * x, 0.8, z).addScaledVector(n, 0.016), along(n));
  }
  // disc and crescent on the back of the head
  {
    const zb = -0.21 * HZ - 0.004;
    put('head', new THREE.TorusGeometry(0.037, 0.011, 6, 12, Math.PI), bronze, V3(0, 0.79, zb), new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), Math.PI));
    put('head', cyl(0.02, 0.02, 0.014, 12), bronze, V3(0, 0.805, zb), along(V3(0, 0, -1)));
  }

  // ---- arms: capsules on ball shoulders, an elbow ring and a bronze cuff ------
  for (const [side, s] of SIDES) {
    const A = side + 'Arm', S = V3(...P[A]), d = V3(SS * s, -SC, 0), q = along(d);
    const at = (t) => S.clone().addScaledVector(d, t);
    put(A, sphere(0.08, 12, 8), chalk, S);
    put(A, new THREE.CapsuleGeometry(0.066, 0.1, 3, 10), chalk, at(0.11), q);
    put(A, new THREE.TorusGeometry(0.068, 0.013, 4, 12).rotateX(Math.PI / 2), chalk, at(0.13), q);
    put(A, new THREE.TorusGeometry(0.062, 0.014, 4, 12).rotateX(Math.PI / 2), bronze, at(0.19), q);
  }
  // left hand: a block palm and three capsule fingers curling towards the body
  {
    const S = V3(...P.leftArm), d = V3(SS, -SC, 0), nIn = V3(-SC, -SS, 0);
    const out = V3().crossVectors(V3(0, 0, 1), d);
    put('leftArm', new THREE.BoxGeometry(0.1, 0.07, 0.058), chalk, S.clone().addScaledVector(d, 0.232), basis(V3(0, 0, 1), d, out));
    const f = d.clone().multiplyScalar(Math.cos(0.4)).addScaledVector(nIn, Math.sin(0.4));
    for (const dz of [-0.033, 0, 0.033]) {
      const base = S.clone().addScaledVector(d, 0.262).add(V3(0, 0, dz));
      put('leftArm', new THREE.CapsuleGeometry(0.016, 0.04, 2, 6), chalk, base.addScaledVector(f, 0.03), along(f));
    }
  }
  // right hand: a ball of a fist with three torus fingers round the handle
  put('rightArm', sphere(0.056, 12, 8), chalk, G.clone().add(V3(0.012, 0.004, -0.006)), null, [1, 1.05, 0.9]);
  for (const dy of [-0.031, 0, 0.031]) {
    const t = new THREE.TorusGeometry(0.047, 0.016, 4, 8, Math.PI * 1.4).rotateX(Math.PI / 2);
    put('rightArm', t, chalk, G.clone().add(V3(0, dy, 0)), new THREE.Quaternion().setFromAxisAngle(UP, -Math.PI * 0.3));
  }

  // ---- legs: cylinders on ball hips, bronze knee rings, round flat feet -------
  for (const [side, s] of SIDES) {
    const L = side + 'Leg', x = 0.1 * s;
    put(L, sphere(0.07, 12, 8), chalk, V3(x, 0.3, 0));
    put(L, cyl(0.066, 0.06, 0.24, 12), chalk, V3(x, 0.165, 0));
    put(L, ring(0.064, 0.012, 16), bronze, V3(x, 0.142, 0));
    put(L, cyl(0.07, 0.07, 0.022, 12), chalk, V3(x, 0.057, 0));
    put(L, cyl(0.085, 0.1, 0.05, 20), chalk, V3(x, 0.025, 0.03), null, [1, 1, 1.18]);
  }

  // ---- stamp: a stack of discs, an ochre band, a timber handle and knob -------
  {
    const at = (dy) => G.clone().add(V3(0, dy, 0));
    put('stamp', cyl(0.166, 0.166, 0.009, 18), basalt, at(-0.2605));
    put('stamp', cyl(0.175, 0.175, 0.088, 18), basalt, at(-0.212));
    put('stamp', cyl(0.12, 0.128, 0.018, 24), basalt, at(-0.159));
    put('stamp', cyl(0.179, 0.179, 0.032, 18), ochre, at(-0.216));
    put('stamp', cyl(0.05, 0.05, 0.035, 14), bronze, at(-0.1355));
    put('stamp', cyl(0.034, 0.037, 0.21, 10), timber, at(-0.045));
    put('stamp', sphere(0.052, 12, 8), timber, at(0.098), null, [1, 0.85, 1]);
    // the face carries the disc motif, raised and inked in stamp ochre
    put('stamp', ring(0.115, 0.017, 18), ochre, at(-0.265), null, [1, 0.3, 1]);
    put('stamp', cyl(0.055, 0.055, 0.009, 18), ochre, at(-0.2685));
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
  const concat = (geos) => {
    let n = 0;
    for (const q of geos) n += q.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const q of geos) {
      pos.set(q.attributes.position.array, o * 3);
      nor.set(q.attributes.normal.array, o * 3);
      o += q.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return boxUV(out);
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
    for (const [mat, geos] of byMat) j.add(new THREE.Mesh(concat(geos), mat));
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
