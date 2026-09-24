// lumen_plant, arm A: primitives.
// The knotted root mound is a flattened torus knot of five lobes woven round a
// low dome. Each stalk is a chain of tapering cylinders with a swollen knuckle
// at every joint, bending outward and back up; the pods are plump spheres whose
// upper half is drawn in to a soft point, the buds small eggs at the knuckles.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  // Stalks and roots are night basalt in colour, but waxy and soft, not stone.
  const STALK = new THREE.MeshStandardMaterial({ color: 0x2a2830, roughness: 0.55, metalness: 0 });
  STALK.name = 'foliage';
  // Lumen lilac is emission only: the pod skin is as dark as the stalks and the
  // light comes from inside, so the game can pulse or dim it and the hue holds
  // at full glow. Unnamed and under 0.95 opacity, so the loader's procedural
  // surfaces leave the translucent skin alone.
  const glow = (intensity, roughness) => new THREE.MeshStandardMaterial({
    color: 0x2a2830, emissive: 0xd98cff, emissiveIntensity: intensity,
    roughness, metalness: 0, transparent: true, opacity: 0.88,
  });
  const POD = glow(2.4, 0.35), BUD = glow(1.6, 0.4);

  // ---- helpers --------------------------------------------------------------------
  const buckets = new Map();
  const add = (geo, m) => {
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(geo);
    return geo;
  };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  const UP = new THREE.Vector3(0, 1, 0);
  // stand a geometry built along +y on point p, pointing along dir
  const orient = (geo, p, dir) => geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())).translate(p.x, p.y, p.z);

  // ---- the root mound: a low dome with a five-lobed knot woven round it -------
  add(new THREE.SphereGeometry(0.25, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.78, 1), STALK);
  add(new THREE.TorusKnotGeometry(0.21, 0.042, 80, 6, 2, 5).rotateX(Math.PI / 2).scale(1, 0.75, 1).translate(0, 0.112, 0), STALK);

  // ---- five stalks, each a chain of cylinders with knuckles ---------------------
  // [azimuth deg, pod base height, reach out, sway sideways, pod height, pod radius]
  const STALKS = [
    [205, 1.05, 0.18, 0.06, 0.24, 0.098],
    [90, 0.87, 0.34, -0.07, 0.215, 0.09],
    [325, 0.7, 0.38, 0.08, 0.2, 0.083],
    [30, 0.53, 0.34, -0.06, 0.185, 0.076],
    [145, 0.39, 0.4, 0.07, 0.17, 0.07],
  ];
  const pods = [], buds = [];
  STALKS.forEach(([deg, H, reach, sway, hp, rp], si) => {
    const a = (deg * Math.PI) / 180, out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const P = (s, y, w = 0) => out.clone().multiplyScalar(s).addScaledVector(side, w).setY(y);
    const curve = new THREE.CatmullRomCurve3([
      P(0.03, 0.12), P(0.1 + reach * 0.1, 0.12 + H * 0.26, sway * 0.4), P(reach * 0.72, 0.1 + H * 0.6, sway),
      P(reach * 0.93, H * 0.9, sway * 0.6), P(reach, H, sway * 0.4),
    ]);
    const N = 4, r0 = 0.055, r1 = 0.03;
    const pts = [], rad = [];
    for (let i = 0; i <= N; i++) { pts.push(curve.getPointAt(i / N)); rad.push(r0 + (r1 - r0) * (i / N)); }
    for (let i = 0; i < N; i++) {
      const d = new THREE.Vector3().subVectors(pts[i + 1], pts[i]), len = d.length();
      const seg = new THREE.CylinderGeometry(rad[i + 1], rad[i], len, 8, 1, true).translate(0, len / 2, 0);
      add(orient(seg, pts[i], d), STALK);
      if (i > 0) add(new THREE.SphereGeometry(rad[i] * 1.22, 8, 6).translate(pts[i].x, pts[i].y, pts[i].z), STALK);
    }
    const tip = pts[N], dir = curve.getTangentAt(1);
    add(new THREE.SphereGeometry(r1 * 1.45, 8, 6).scale(1, 0.8, 1).translate(tip.x, tip.y, tip.z), STALK);   // calyx
    // the pod: a sphere resting on the calyx, its upper half drawn in to a soft point
    const body = new THREE.SphereGeometry(1, 12, 9).scale(rp, hp * 0.5, rp).translate(0, hp * 0.5, 0);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const u = Math.max(0, (bp.getY(i) - hp * 0.42) / (hp * 0.58)), k = 1 - 0.5 * Math.pow(u, 1.4);
      bp.setXYZ(i, bp.getX(i) * k, bp.getY(i), bp.getZ(i) * k);
    }
    body.computeVertexNormals();
    pods.push(orient(body, tip.clone().addScaledVector(dir, 0.01), dir));
    // buds: small eggs on the knuckles, leaning out to alternate sides
    for (let i = 1; i < N; i++) {
      if ((i + si) % 3 === 0) continue;
      const t = i / N, tan = curve.getTangentAt(t);
      const s0 = new THREE.Vector3().crossVectors(tan, UP).normalize().applyAxisAngle(tan, (i % 2 ? 1 : -1) * 1.3 + si);
      const d = tan.clone().multiplyScalar(0.5).addScaledVector(s0, 0.87).normalize();
      const egg = new THREE.SphereGeometry(0.026, 8, 6).scale(1, 1.35, 1).translate(0, 0.03, 0);
      buds.push(orient(egg, pts[i].clone().addScaledVector(s0, rad[i] * 0.9), d));
    }
  });

  // ---- meshes: stalks and roots merged; pods and buds their own meshes -----------
  for (const [m, geos] of buckets) g.add(new THREE.Mesh(merge(geos), m));
  const podMesh = new THREE.Mesh(merge(pods), POD);
  podMesh.name = 'pods';
  const budMesh = new THREE.Mesh(merge(buds), BUD);
  budMesh.name = 'buds';
  g.add(podMesh, budMesh);

  // ---- place: base on y = 0, centred on x and z ----------------------------------
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });

  g.userData.parts = { pods: podMesh, buds: budMesh };
  return g;
}
