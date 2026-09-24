// expedition_rope, candidate A (primitives): the rope is a chain of cylinders and torus
// arcs. It lies on the lip from the ring to the edge, turns over the corner on a quarter
// torus, and hangs in an S of three arcs of alternating hand, ending in a monkey's fist: a
// ball wrapped by three tori with its frayed tail tucked out of the top. It is tied to the
// ring with two torus wraps. The ring is a torus hanging from the torus eye of a square
// tapered piton that leans back against the pull; a tapered four-sided timber wedge is
// driven in beside it. Frayed ends are a flared cone and a brush of thin cylinders.
// The lip is not part of the asset: its top is the plane y = anchor[1], its face the plane
// z = anchor[2], facing +Z; the rope lies on the corner between them.
export default function (THREE) {
  const g = new THREE.Group();
  g.userData.mounts = 'back';

  const mat = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const ROPE = mat(0xb49a6a, 'fabric', 0.95);
  const BRONZE = mat(0x9a6a35, 'metal', 0.45, 0.6);
  const TIMBER = mat(0x8a6a48, 'timber', 0.9);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0), X = V(1, 0, 0), Z = V(0, 0, 1);
  const PARTS = new Map();
  const put = (m, geo, matrix) => {
    if (matrix) geo.applyMatrix4(matrix);
    if (!PARTS.has(m)) PARTS.set(m, []);
    PARTS.get(m).push(geo.index ? geo.toNonIndexed() : geo);
  };
  // a matrix whose local X, Y, Z become the given world axes, placed at o
  const frame = (o, x, y, z) => new THREE.Matrix4().makeBasis(x, y, z).setPosition(o);
  const along = (a, b) => new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()), V(1, 1, 1));
  const cyl = (m, a, b, r0, r1 = r0, seg = 8, open = true) =>
    put(m, new THREE.CylinderGeometry(r1, r0, a.distanceTo(b), seg, 1, open), along(a, b));
  // a torus arc centred at c, starting at c + radius * u and turning towards w
  const arc = (m, c, radius, tube, u, w, angle, rseg = 8, tseg = 6) =>
    put(m, new THREE.TorusGeometry(radius, tube, rseg, tseg, angle), frame(c, u, w, u.clone().cross(w)));
  // a frayed end at tip, pointing along dir: a flared cone and a brush of fibres
  const fray = (tip, dir, r, n = 5, spin = 0) => {
    dir = dir.clone().normalize();
    put(ROPE, new THREE.ConeGeometry(r * 1.3, 0.026, 7, 1, false).rotateX(Math.PI), along(tip.clone().addScaledVector(dir, -0.018), tip.clone().addScaledVector(dir, 0.008)));
    const side = V(0, 0, 0).crossVectors(dir, Math.abs(dir.y) < 0.9 ? UP : X).normalize();
    for (let k = 0; k < n; k++) {
      const out = side.clone().applyAxisAngle(dir, spin + (k * 2 * Math.PI) / n);
      const a = tip.clone().addScaledVector(out, r * 0.7);
      const b = a.clone().addScaledVector(dir, 0.04 + 0.012 * (k % 3)).addScaledVector(out, 0.022 + 0.008 * (k % 2));
      cyl(ROPE, a, b, 0.0055, 0.004, 3, true);
    }
  };

  // --- the anchor: lip corner at x = 0, y = YT, z = 0 -----------------------------------
  const YT = 1.8, R = 0.03, RHO = R + 0.002;
  const K = V(0, YT, 0);
  const RR = 0.09, RT = 0.022, AW = RT + R * 0.85;       // ring radius, ring tube, wrap radius
  const F = V(0, YT + RHO + AW, -0.12);                   // far side of the ring, where it is tied
  const TH = (55 * Math.PI) / 180;
  const P = V(0, -Math.sin(TH), Math.cos(TH));            // the ring hangs towards the edge
  const C = F.clone().addScaledVector(P, -RR);            // ring centre
  const E = C.clone().addScaledVector(P, -RR);            // piton eye

  // ring and eye: the ring's plane holds X and the pull, so it faces up and out over the lip
  arc(BRONZE, C, RR, RT, P.clone().negate(), X, Math.PI * 2, 6, 22);
  const D = V(0, Math.cos(0.44), -Math.sin(0.44));        // the piton leans back against the pull
  arc(BRONZE, E, 0.037, 0.013, D, V(0, 0, 0).crossVectors(X, D), Math.PI * 2, 5, 10);
  // square shank tapering into the rock, a hammered collar where it enters
  const foot = E.clone().addScaledVector(D, -(E.y - YT) / D.y);
  const shankTop = E.clone().addScaledVector(D, -0.033);
  put(BRONZE, new THREE.CylinderGeometry(0.019, 0.019, shankTop.distanceTo(foot), 4, 1, true), along(foot, shankTop));
  put(BRONZE, new THREE.CylinderGeometry(0.019, 0.006, 0.07, 4, 1, false), along(foot.clone().addScaledVector(D, -0.07), foot));
  put(BRONZE, new THREE.CylinderGeometry(0.03, 0.036, 0.016, 6), frame(foot.clone().addScaledVector(D, 0.006), X, D, V(0, 0, 0).crossVectors(X, D)));

  // timber wedge driven in beside the piton, thick end up, a little proud and leaning out
  {
    const w = new THREE.CylinderGeometry(0.046, 0.012, 0.13, 4, 1).rotateY(Math.PI / 4);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, -0.35, 0.16));
    put(TIMBER, w, new THREE.Matrix4().compose(V(-0.15, YT + 0.012, -0.13), q, V(1, 1, 2.1)));
  }

  // --- the tie: two wraps round the ring's far side, the tail frayed ---------------------
  for (const s of [-1, 1]) arc(ROPE, F.clone().addScaledVector(X, s * 0.025), AW, R * 0.82, UP, Z, Math.PI * 2, 6, 12);
  const tailTip = F.clone().add(V(0.085, 0.06, -0.06));
  cyl(ROPE, F.clone().add(V(0.03, 0.015, -0.01)), tailTip, R * 0.8, R * 0.8, 7, true);
  fray(tailTip, tailTip.clone().sub(F.clone().add(V(0.03, 0.015, -0.01))), R * 0.8, 5, 0.3);

  // --- the rope: along the lip, the bend over the corner, then the S down the face -------
  cyl(ROPE, V(0, YT + RHO, F.z + 0.03), V(0, YT + RHO, 0), R);
  arc(ROPE, K, RHO, R, UP, Z, Math.PI / 2, 8, 5);
  // a walker in the plane z = RHO: heading psi, 0 straight down, positive towards +x
  let at = V(0, YT, RHO), psi = 0;
  const straight = (L) => {
    const b = at.clone().add(V(Math.sin(psi) * L, -Math.cos(psi) * L, 0));
    cyl(ROPE, at, b, R);
    at = b;
  };
  const bend = (Ra, turn) => {
    const s = Math.sign(turn), n = V(Math.cos(psi), Math.sin(psi), 0).multiplyScalar(s);
    const c = at.clone().addScaledVector(n, Ra);
    const u = at.clone().sub(c).normalize();
    const w = Z.clone().cross(u).multiplyScalar(s);
    arc(ROPE, c, Ra, R, u, w, Math.abs(turn), 8, 5);
    psi += turn;
    at = c.clone().addScaledVector(u.clone().applyAxisAngle(Z, turn), Ra);
  };
  const deg = Math.PI / 180;
  straight(0.2);
  bend(0.55, 14 * deg);
  straight(0.2);
  bend(0.55, -28 * deg);
  straight(0.24);
  bend(0.55, 14 * deg);
  straight(at.y - (YT - 1.6));

  // --- a monkey's fist: a ball in three wraps, the tail tucked out of the top ------------
  const KR = 0.058, KC = at.clone().add(V(0, -KR - 0.012, 0.012));
  const kq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0.5, 0.2));
  put(ROPE, new THREE.SphereGeometry(KR, 8, 6), new THREE.Matrix4().compose(KC, kq, V(1, 0.96, 1)));
  const ax = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)].map((a) => a.applyQuaternion(kq));
  for (let i = 0; i < 3; i++) arc(ROPE, KC, KR, 0.026, ax[(i + 1) % 3], ax[(i + 2) % 3], Math.PI * 2, 6, 14);
  cyl(ROPE, at.clone().add(V(0, 0.01, 0)), KC, R);
  const tuck = KC.clone().add(V(0.028, KR - 0.01, 0.022));
  const tuckTip = tuck.clone().add(V(0.045, 0.045, 0.03));
  cyl(ROPE, tuck, tuckTip, R * 0.75, R * 0.75, 7, true);
  fray(tuckTip, tuckTip.clone().sub(tuck), R * 0.75, 5, 1.1);

  // --- merge per material, UVs projected over each merged box --------------------------
  const merged = (geos) => {
    let n = 0;
    for (const x of geos) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const x of geos) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      o += x.attributes.position.count;
    }
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    const uv = new Float32Array(n * 2);
    for (let t = 0; t < n; t += 3) {
      const a = V(pos[t * 3], pos[t * 3 + 1], pos[t * 3 + 2]);
      const f = V(pos[t * 3 + 3], pos[t * 3 + 4], pos[t * 3 + 5]).sub(a).cross(V(pos[t * 3 + 6], pos[t * 3 + 7], pos[t * 3 + 8]).sub(a));
      const fx = Math.abs(f.x), fy = Math.abs(f.y), fz = Math.abs(f.z);
      for (let k = t; k < t + 3; k++) {
        const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
        const [u, v] = fy >= fx && fy >= fz ? [x, z] : fx >= fz ? [z, y] : [x, y];
        uv[k * 2] = u / su; uv[k * 2 + 1] = v / sv;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  };
  for (const [m, geos] of PARTS) g.add(new THREE.Mesh(merged(geos), m));

  // --- placement: lowest point on y = 0, centred on x and z (measured on vertices) -------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mm) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  // the lip corner under the rope, after the shift: hang the asset by putting this on a ledge edge
  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.anchor = [r3(K.x - c.x), r3(K.y - box.min.y), r3(K.z - c.z)];
  return g;
}
