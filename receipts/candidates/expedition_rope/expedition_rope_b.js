// expedition_rope, candidate B (sweeps and profiles): the rope is one TubeGeometry along
// one centreline, from the frayed working end through a round turn on the ring, along the
// lip, over the edge, down the face in a gentle S and through a tight overhand knot. The
// curve is sampled at its control points, dense in the turn and the knot and sparse down
// the S. Frayed ends are a lathed flare with a brush of lathed fibres. Ring, eye and piton
// are lathes; the timber wedge is a bevelled extrusion.
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
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const UP = V(0, 1, 0), X = V(1, 0, 0);
  const PARTS = new Map();
  const put = (m, geo, matrix) => {
    if (matrix) geo.applyMatrix4(matrix);
    if (!PARTS.has(m)) PARTS.set(m, []);
    PARTS.get(m).push(geo.index ? geo.toNonIndexed() : geo);
  };
  // local Y onto dir, placed at o
  const aim = (o, dir) => new THREE.Matrix4().compose(o, new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()), V(1, 1, 1));
  const lathe = (m, prof, seg, o, dir) => {
    const geo = new THREE.LatheGeometry(prof.map(([r, y]) => V2(r, y)), seg);
    geo.computeVertexNormals();
    put(m, geo, aim(o, dir));
  };
  // a lathed ring: a circle of radius tube at distance radius from the axis, revolved
  const ring = (m, radius, tube, seg, o, axis, n = 6) => {
    const prof = [];
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; prof.push([radius + tube * Math.cos(a), tube * Math.sin(a)]); }
    lathe(m, prof, seg, o, axis);
  };

  // --- the anchor: lip corner at x = 0, y = YT, z = 0 -----------------------------------
  const YT = 1.8, R = 0.03, RHO = R + 0.002;
  const K = V(0, YT, 0);
  const S = V(0, 0, 1), W = V(0, 1, 0);                 // the standing part lies along the lip
  const RR = 0.09, RT = 0.022, A = RT + R;              // ring radius, ring tube, turn radius
  const F = V(0, YT + RHO + A, -0.12);                  // ring's far side, where it is tied
  const TH = (55 * Math.PI) / 180;
  const P = V(0, -Math.sin(TH), Math.cos(TH));          // the ring is pulled this way
  const C = F.clone().addScaledVector(P, -RR);
  const E = F.clone().addScaledVector(P, -2 * RR);      // piton eye
  const N = X.clone().cross(P);                         // ring axis

  ring(BRONZE, RR, RT, 20, C, N);
  ring(BRONZE, 0.037, 0.013, 10, E, X);
  // the piton: a round shank leaning back against the pull, a hammered collar, a point in the rock
  const D = V(0, Math.cos(0.44), -Math.sin(0.44));
  const foot = E.clone().addScaledVector(D, -(E.y - YT) / D.y);
  const L = foot.distanceTo(E) - 0.032;
  lathe(BRONZE, [[0, -0.08], [0.011, -0.05], [0.016, -0.005], [0.03, 0], [0.032, 0.008], [0.018, 0.016], [0.016, L - 0.01], [0.021, L - 0.004], [0.017, L]], 6, foot, D);

  // timber wedge driven in beside the piton, thick end up
  {
    const s = new THREE.Shape([V2(-0.06, 0.07), V2(0.062, 0.066), V2(0.018, -0.045), V2(-0.014, -0.045)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 1, curveSegments: 1 });
    geo.translate(0, 0, -0.02).rotateY(Math.PI / 2);
    geo.computeVertexNormals();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, -0.35, 0.14));
    put(TIMBER, geo, new THREE.Matrix4().compose(V(-0.15, YT, -0.13), q, V(1, 1, 1)));
  }

  // --- the centreline -----------------------------------------------------------------------
  const pts = [];
  // round turn: 1.25 turns about the ring's far side, drifting along the ring's tube (X)
  const TURN = 2.5 * Math.PI, NT = 26;
  const helix = (k) => {
    const phi = -Math.PI / 2 - TURN + (TURN * k) / NT;
    return F.clone().addScaledVector(X, 0.045 - (0.07 * k) / NT).addScaledVector(S, A * Math.cos(phi)).addScaledVector(W, A * Math.sin(phi));
  };
  const h0 = helix(0);
  pts.push(h0.clone().add(V(0.05, 0.035, -0.02)), h0.clone().add(V(0.028, 0.03, -0.005)));
  for (let k = 0; k <= NT; k++) pts.push(helix(k));
  // along the lip to the corner, round it, then down the face
  const T = K.clone().addScaledVector(W, RHO);
  pts.push(pts[pts.length - 1].clone().lerp(T, 0.35), pts[pts.length - 1].clone().lerp(T, 0.7), T);
  for (const b of [0.3, 0.6, 0.85]) {
    const a = (Math.PI / 2) * b;
    pts.push(K.clone().add(V(0, RHO * Math.cos(a), RHO * Math.sin(a))));
  }
  const DROP = 1.43, NH = 22;
  const sm = (t) => t * t * (3 - 2 * t);
  const hang = (s) => V(
    0.085 * Math.sin(2 * Math.PI * 0.93 * s) * sm(Math.min(1, s / 0.16)),
    YT - DROP * s,
    RHO + 0.05 * Math.pow(s, 1.6),
  );
  for (let k = 1; k <= NH; k++) pts.push(hang(k / NH));
  // an overhand knot, hand placed in knot space (x right, y up, z out of the face)
  const Q = hang(1).add(V(0.02, -0.13, 0.02));
  const KN = [[-0.02, 0.09, 0], [-0.025, 0.045, 0.004], [-0.012, 0.0, 0.034], [0.03, -0.03, 0.034], [0.058, 0.004, -0.004], [0.036, 0.042, -0.036],
    [-0.02, 0.05, -0.032], [-0.056, 0.018, 0.0], [-0.042, -0.018, 0.04], [0.002, -0.024, 0.052], [0.036, -0.006, 0.02], [0.022, -0.042, -0.022],
    [0.004, -0.082, -0.004], [0.0, -0.118, 0.006]].map(([x, y, z]) => Q.clone().add(V(x, y, z)));
  const kc = new THREE.CatmullRomCurve3(KN, false, 'centripetal');
  const kl = kc.getLength();
  pts.push(...kc.getSpacedPoints(Math.round(kl / 0.014)).slice(0, -1), KN[KN.length - 1]);

  // --- the tube, sampled at the control points ---------------------------------------------
  const cr = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const path = new THREE.Curve();
  path.getPoint = (t, out = new THREE.Vector3()) => cr.getPoint(t, out);
  path.getPointAt = path.getPoint;
  path.getTangentAt = (t, out) => path.getTangent(t, out);
  const SEG = pts.length - 1, RAD = 6;
  const tube = new THREE.TubeGeometry(path, SEG, R, RAD, false);
  put(ROPE, tube);

  // --- the ends: the rope flares where it unlays, and a brush of fibres stands out of it ------
  const end = (t, sign, spin) => {
    const at = path.getPointAt(t), dir = path.getTangentAt(t).multiplyScalar(sign);
    lathe(ROPE, [[R * 0.98, -0.004], [R * 1.22, 0.012], [R * 1.3, 0.022], [R * 0.8, 0.028], [0, 0.026]], RAD, at, dir);
    const side = dir.clone().cross(Math.abs(dir.y) < 0.9 ? UP : X).normalize();
    for (let k = 0; k < 5; k++) {
      const out = side.clone().applyAxisAngle(dir, spin + (k * 2 * Math.PI) / 5);
      const sd = dir.clone().addScaledVector(out, 0.5 + 0.2 * (k % 2)).normalize();
      lathe(ROPE, [[0.0055, 0], [0.004, 0.04 + 0.012 * (k % 3)]], 3, at.clone().addScaledVector(dir, 0.012).addScaledVector(out, R * 0.75), sd);
    }
  };
  end(0, -1, 0.3);
  end(1, 1, 1.1);

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
