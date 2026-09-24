/**
 * sun_disc, candidate A: primitives.
 *
 * A discus stacked from primitives: an eight-sided torus stretched tall makes
 * the bezelled hub round a squashed-sphere lens; flat rings on open cylinder
 * walls make the two tiers stepping down from it, the inner one inlaid in
 * basalt; twelve box tabs make the blade, their gaps the shallow notches; a
 * tilted box on each face over every tab makes the rays; three leather boxes
 * and two cylinder rivets make the grip strap.
 *
 * Lies flat, faces up and down, 0.45 m across and 0.06 m thick at the hub;
 * the strap hangs a few millimetres below it, so the base (y = 0) is the strap.
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
  const bronze = M(0x9a6a35, 'metal', 0.42, 0.7);
  const basalt = M(0x3a3531, 'stone', 0.7);
  const leather = M(0x4b2e1e, 'fabric', 0.68);
  // Unnamed and just under opaque so the surface pass leaves it alone; the game
  // flares or dims it through emissiveIntensity.
  const glow = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 1.1,
    roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  const put = (geo, mat, p, q = null, s = null) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(p);
    if (q) m.quaternion.copy(q);
    if (s) m.scale.set(...s);
    g.add(m);
    return m;
  };
  const yaw = (a) => new THREE.Quaternion().setFromAxisAngle(UP, -a);
  const roll = (t) => new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), t);
  // a flat ring facing up (s = 1) or down (s = -1)
  const face = (r0, r1, n, s) => new THREE.RingGeometry(r0, r1, n).rotateX(-s * Math.PI / 2);

  // ---- hub, tiers and lens ------------------------------------------------------
  put(new THREE.TorusGeometry(0.0715, 0.0135, 8, 32).rotateX(Math.PI / 2), bronze, V3(), null, [1, 2.2, 1]);
  for (const s of [1, -1]) {
    put(face(0.07, 0.138, 40, s), basalt, V3(0, 0.021 * s, 0));
    put(face(0.138, 0.182, 48, s), bronze, V3(0, 0.014 * s, 0));
  }
  put(new THREE.CylinderGeometry(0.138, 0.138, 0.042, 40, 1, true), bronze, V3());
  put(new THREE.CylinderGeometry(0.182, 0.182, 0.028, 48, 1, true), bronze, V3());
  const lens = put(new THREE.SphereGeometry(0.058, 20, 10), glow, V3(), null, [1, 0.43, 1]);
  lens.name = 'lens';

  // ---- blade: twelve tabs, the gaps between them are the notches --------------
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + Math.PI / 12;
    put(new THREE.BoxGeometry(0.045, 0.01, 2 * 0.221 * Math.tan((13 * Math.PI) / 180)), bronze, V3(0.1985 * Math.cos(a), 0, 0.1985 * Math.sin(a)), yaw(a));
  }
  // ---- rays: over every tab, a box on each face falling across the tiers ------
  const TILT = Math.atan2(0.01, 0.095);
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + Math.PI / 12;
    for (const s of [1, -1]) {
      const q = yaw(a).multiply(roll(-TILT * s));
      put(new THREE.BoxGeometry(0.096, 0.012, 0.011), bronze, V3(0.1345 * Math.cos(a), 0.018 * s, 0.1345 * Math.sin(a)), q);
    }
  }

  // ---- grip strap: three leather boxes sagging under the disc, two rivets -----
  {
    const Z = -0.1, T = 0.007, W = 0.04;
    put(new THREE.BoxGeometry(0.14, T, W), leather, V3(0, -0.0275, Z));
    for (const s of [1, -1]) {
      put(new THREE.BoxGeometry(0.054, T, W), leather, V3(s * 0.094, -0.0193, Z), roll(s * 0.293));
      put(new THREE.CylinderGeometry(0.008, 0.01, 0.006, 8), bronze, V3(s * 0.11, -0.0184, Z));
    }
  }

  // ---- merge per material, lens kept apart ------------------------------------
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
  const byMat = new Map();
  for (const c of [...g.children]) {
    c.updateMatrix();
    const geo = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(c.matrix);
    geo.deleteAttribute('uv');
    if (c === lens) {
      lens.geometry = boxUV(geo);
      lens.position.set(0, 0, 0); lens.quaternion.identity(); lens.scale.set(1, 1, 1);
      continue;
    }
    if (!byMat.has(c.material)) byMat.set(c.material, []);
    byMat.get(c.material).push(geo);
    g.remove(c);
  }
  for (const [mat, geos] of byMat) {
    let n = 0;
    for (const q of geos) n += q.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const q of geos) {
      pos.set(q.attributes.position.array, o * 3);
      nor.set(q.attributes.normal.array, o * 3);
      o += q.attributes.position.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.add(new THREE.Mesh(boxUV(geo), mat));
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

  g.userData.parts = { lens };
  return g;
}
