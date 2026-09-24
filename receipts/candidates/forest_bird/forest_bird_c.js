// forest_bird, arm C: a second reading, feather by feather, hand-built.
// A plump gliding bird 0.7 m across the wings, cut in facets. The body and
// head are one flat-shaded loft of egg-shaped rings along a spine that rises
// into the head, deeper below than above so the breast is a keel; its front
// facets below the wing line are stamp ochre. The beak is a small loft bent
// down into a hook, the eyes are basalt gems. Every feather is its own folded
// sheet, raised along the quill so light breaks across it: per wing a covert
// sheet over the arm, a row of six greater coverts and six secondaries under
// its rear edge, and five primaries fanned into fingers whose tips lift
// slightly, as a glider's do. The tail is six feathers fanned, the outer pair
// longest, so its tip is a deep fork.
//
// Front +Z, up +Y, the bird's left is +X. Each wing is a Group at its shoulder,
// inside the body, with zero rotation at rest and the wing spread level; its
// geometry starts at the pivot so nothing swings out of the far side of the
// body. rotation.z = +a raises the left wing, rotation.z = -a the right one.
// Parts are baked into one mesh per material per joint.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---- palette (far-door/docs/style-lock.md) --------------------------------
  // Every material is double-sided: the feathers are single sheets seen from
  // both sides, and the game's surface pass shares one clone per colour and
  // roughness whatever the side.
  const M = (color, roughness, name) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, side: THREE.DoubleSide });
    m.name = name;
    return m;
  };
  const FERN = M(0x7da04a, 0.8, 'fabric'); // body, head, coverts
  const MOSS = M(0x4f7a3a, 0.84, 'fabric'); // flight feathers, tail
  const OCHRE = M(0xd9a441, 0.78, 'fabric'); // breast
  const BASALT = M(0x3a3531, 0.45, 'stone'); // beak, eyes

  // ---- joints ------------------------------------------------------------------
  // The shoulder sits inside the body so the root of the wing stays buried at
  // every flap angle and the joint never opens a gap.
  const SHOULDER = V(0.03, 0.024, 0.02);
  const body = g;
  const leftWing = new THREE.Group();
  leftWing.name = 'leftWing';
  leftWing.position.copy(SHOULDER);
  const rightWing = new THREE.Group();
  rightWing.name = 'rightWing';
  rightWing.position.set(-SHOULDER.x, SHOULDER.y, SHOULDER.z);
  g.add(leftWing, rightWing);

  // ---- triangle soup per joint and material, flat-shaded at the end --------------
  const soups = new Map();
  const tri = (joint, mat, a, b, c, ua = [0, 0], ub = [1, 0], uc = [0, 1]) => {
    if (!soups.has(joint)) soups.set(joint, new Map());
    const byMat = soups.get(joint);
    if (!byMat.has(mat)) byMat.set(mat, { p: [], uv: [] });
    const s = byMat.get(mat);
    s.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    s.uv.push(...ua, ...ub, ...uc);
  };
  // A triangle turned to face away from `inside`, so a closed mass lights from outside.
  const triOut = (joint, mat, a, b, c, inside, ua, ub, uc) => {
    const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    const out = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(inside);
    if (n.dot(out) < 0) tri(joint, mat, a, c, b, ua, uc, ub);
    else tri(joint, mat, a, b, c, ua, ub, uc);
  };

  // A loft of rings along a path, closed by a pole at each end. Each ring:
  // centre c, half-width rx, and half-heights up and down (an egg section), in
  // a frame whose side is +X. `pick(k, i)` chooses the material of facet i
  // between rings k and k + 1; the pole caps pass k = -1 and the last ring.
  const loft = (joint, rings, N, head, tail, pick) => {
    const pts = rings.map((r, k) => {
      const prev = rings[Math.max(0, k - 1)].c, next = rings[Math.min(rings.length - 1, k + 1)].c;
      const t = next.clone().sub(prev).normalize();
      const side = V(1, 0, 0);
      const up = new THREE.Vector3().crossVectors(t, side).normalize();
      return Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2;
        const cy = Math.cos(a);
        return r.c.clone().addScaledVector(side, r.rx * Math.sin(a)).addScaledVector(up, (cy >= 0 ? r.up : r.down) * cy);
      });
    });
    for (let k = 0; k < rings.length - 1; k++) {
      const inside = rings[k].c.clone().add(rings[k + 1].c).multiplyScalar(0.5);
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        const mat = pick(k, i);
        const u0 = i / N, u1 = (i + 1) / N, v0 = k / rings.length, v1 = (k + 1) / rings.length;
        triOut(joint, mat, pts[k][i], pts[k][j], pts[k + 1][j], inside, [u0, v0], [u1, v0], [u1, v1]);
        triOut(joint, mat, pts[k][i], pts[k + 1][j], pts[k + 1][i], inside, [u0, v0], [u1, v1], [u0, v1]);
      }
    }
    for (const [pole, ring, k] of [[tail, pts[0], 0], [head, pts[pts.length - 1], rings.length - 1]]) {
      for (let i = 0; i < N; i++) triOut(joint, pick(k === 0 ? -1 : k, i), pole, ring[i], ring[(i + 1) % N], rings[k].c, [0.5, 0.5], [0, 1], [1, 1]);
    }
  };

  // One feather: a sheet from base to tip, w wide, folded up along its quill.
  // `up` is the side it lifts towards; stations shape a narrow root, a full
  // vane and a rounded tip.
  const feather = (joint, mat, base, tip, w, up = V(0, 1, 0), fold = 0.18) => {
    const d = tip.clone().sub(base);
    const L = d.length();
    d.normalize();
    const side = new THREE.Vector3().crossVectors(d, up).normalize();
    const lift = new THREE.Vector3().crossVectors(side, d).normalize();
    const st = [[0, 0.4], [0.3, 0.95], [0.66, 1], [0.88, 0.72]];
    const rows = st.map(([t, k]) => {
      const c = base.clone().addScaledVector(d, t * L);
      const h = (w / 2) * k;
      return [c.clone().addScaledVector(side, -h), c.clone().addScaledVector(lift, w * fold * k), c.clone().addScaledVector(side, h), t];
    });
    for (let s = 0; s < rows.length - 1; s++) {
      const [l0, c0, r0, t0] = rows[s], [l1, c1, r1, t1] = rows[s + 1];
      tri(joint, mat, l0, c0, c1, [0, t0], [0.5, t0], [0.5, t1]);
      tri(joint, mat, l0, c1, l1, [0, t0], [0.5, t1], [0, t1]);
      tri(joint, mat, c0, r0, r1, [0.5, t0], [1, t0], [1, t1]);
      tri(joint, mat, c0, r1, c1, [0.5, t0], [1, t1], [0.5, t1]);
    }
    const [l, c, r, t] = rows[rows.length - 1];
    tri(joint, mat, l, c, tip, [0, t], [0.5, t], [0.5, 1]);
    tri(joint, mat, c, r, tip, [0.5, t], [1, t], [0.5, 1]);
  };

  // ---- body and head: one faceted loft ------------------------------------------------
  // [z, centre y, half-width, half-height above, half-height below]
  const RINGS = [
    [-0.126, 0.007, 0.022, 0.014, 0.016],
    [-0.097, 0.005, 0.043, 0.03, 0.036],
    [-0.057, 0.001, 0.059, 0.045, 0.057],
    [-0.014, 0, 0.067, 0.05, 0.066],
    [0.028, 0, 0.066, 0.05, 0.068],
    [0.066, 0.007, 0.057, 0.046, 0.061],
    [0.096, 0.021, 0.045, 0.04, 0.046],
    [0.12, 0.035, 0.047, 0.046, 0.042],
    [0.148, 0.041, 0.048, 0.046, 0.04],
    [0.171, 0.039, 0.037, 0.036, 0.03],
    [0.186, 0.035, 0.02, 0.02, 0.017],
  ].map(([z, y, rx, up, down]) => ({ c: V(0, y, z), rx, up, down }));
  const N = 12;
  // The breast: facets below the wing line from mid-belly to the throat,
  // widest across the chest. Facet i spans angles i..i+1 of N from the top.
  loft(body, RINGS, N, V(0, 0.034, 0.193), V(0, 0.008, -0.139), (k, i) => {
    const fromBottom = Math.abs(i + 0.5 - N / 2); // 0.5 at the keel, 5.5 at the ridge
    const reach = k >= 3 && k <= 5 ? 3 : k === 2 || k === 6 || k === 7 ? 2 : 0;
    return fromBottom < reach ? OCHRE : FERN;
  });

  // ---- beak: a small loft bent down into a hook ---------------------------------------
  loft(body, [
    [0.17, 0.031, 0.016, 0.015, 0.013],
    [0.188, 0.029, 0.014, 0.013, 0.011],
    [0.202, 0.024, 0.01, 0.009, 0.008],
    [0.211, 0.015, 0.006, 0.005, 0.005],
  ].map(([z, y, rx, up, down]) => ({ c: V(0, y, z), rx, up, down })), 5, V(0, 0.002, 0.213), V(0, 0.031, 0.162), () => BASALT);

  // ---- eyes: basalt gems ----------------------------------------------------------------
  for (const s of [1, -1]) {
    const c = V(0.042 * s, 0.056, 0.152), r = 0.0095;
    const ax = [V(r, 0, 0), V(-r, 0, 0), V(0, r, 0), V(0, -r, 0), V(0, 0, r), V(0, 0, -r)].map((p) => c.clone().add(p));
    for (const [a, b] of [[2, 4], [4, 3], [3, 5], [5, 2]]) for (const x of [0, 1]) triOut(body, BASALT, ax[x], ax[a], ax[b], c);
  }

  // ---- tail: six feathers fanned from the rump, the outer pair longest --------------------
  const RUMP = V(0, 0.01, -0.1);
  for (const s of [1, -1]) {
    for (const [deg, len, w, y] of [[5, 0.15, 0.04, 0.004], [12, 0.19, 0.038, 0.002], [19, 0.235, 0.036, 0]]) {
      const a = (deg * Math.PI) / 180;
      const base = RUMP.clone().add(V(0.008 * s, y, 0));
      feather(body, MOSS, base, base.clone().add(V(Math.sin(a) * len * s, -0.01, -Math.cos(a) * len)), w, V(0, 1, 0), 0.12);
    }
  }
  // Upper tail coverts: a short fern-green feather over the root of the fan.
  feather(body, FERN, V(0, 0.022, -0.085), V(0, 0.012, -0.175), 0.05, V(0, 1, 0), 0.15);

  // ---- left wing, in the shoulder's frame: x outward, z forward --------------------
  // The tips reach x = 0.32 from a shoulder 0.03 off the centre line: 0.7 m across.
  // Covert sheet over the arm and hand: a folded strip along the wing bone, its
  // rear edge in points like the tips of the covert rows.
  const LE = [[0, 0.062], [0.06, 0.07], [0.12, 0.072], [0.17, 0.064], [0.215, 0.05], [0.25, 0.034]];
  const TE = [[0, -0.05], [0.06, -0.044], [0.12, -0.04], [0.17, -0.03], [0.215, -0.012], [0.25, 0.006]];
  const RIDGE = 0.012;
  for (let k = 0; k < LE.length - 1; k++) {
    const le0 = V(LE[k][0], 0.002, LE[k][1]), le1 = V(LE[k + 1][0], 0.002, LE[k + 1][1]);
    const bone0 = V(LE[k][0], RIDGE * (1 - k / 6), (LE[k][1] + TE[k][1]) / 2 + 0.018);
    const bone1 = V(LE[k + 1][0], RIDGE * (1 - (k + 1) / 6), (LE[k + 1][1] + TE[k + 1][1]) / 2 + 0.018);
    const te0 = V(TE[k][0], 0.003, TE[k][1]), te1 = V(TE[k + 1][0], 0.003, TE[k + 1][1]);
    const mid = V((TE[k][0] + TE[k + 1][0]) / 2, 0.003, (TE[k][1] + TE[k + 1][1]) / 2 - 0.014);
    const [u0, u1] = [k / 5, (k + 1) / 5];
    tri(leftWing, FERN, le0, le1, bone1, [u0, 1], [u1, 1], [u1, 0.6]);
    tri(leftWing, FERN, le0, bone1, bone0, [u0, 1], [u1, 0.6], [u0, 0.6]);
    tri(leftWing, FERN, bone0, bone1, mid, [u0, 0.6], [u1, 0.6], [(u0 + u1) / 2, 0]);
    tri(leftWing, FERN, bone0, mid, te0, [u0, 0.6], [(u0 + u1) / 2, 0], [u0, 0.1]);
    tri(leftWing, FERN, bone1, te1, mid, [u1, 0.6], [u1, 0.1], [(u0 + u1) / 2, 0]);
  }
  tri(leftWing, FERN, V(0.25, 0.002, 0.034), V(0.285, 0.004, 0.02), V(0.25, 0.003, 0.006), [0, 1], [1, 0.5], [0, 0]);
  // A row of greater coverts under the sheet's rear edge, then six secondaries
  // under those, each layer a few millimetres lower so their folds never cross.
  for (let k = 0; k < 6; k++) {
    const x = 0.03 + k * 0.036;
    feather(leftWing, FERN, V(x, -0.003, -0.001 * k), V(x + 0.008, -0.004, -0.068 + k * 0.006), 0.04, V(0, 1, 0), 0.1);
  }
  for (let k = 0; k < 6; k++) {
    const x = 0.012 + k * 0.036;
    feather(leftWing, MOSS, V(x, -0.01, -0.005 - k * 0.002), V(x + 0.012, -0.012, -0.098 + k * 0.006), 0.044, V(0, 1, 0), 0.12);
  }
  // Five primaries fanned from the hand, straight out to swept back, their tips lifting.
  for (const [bx, bz, deg, len] of [[0.2, 0.03, 0, 0.122], [0.198, 0.012, -10, 0.124], [0.194, -0.004, -20, 0.12], [0.188, -0.018, -30, 0.112], [0.18, -0.03, -40, 0.1]]) {
    const a = (deg * Math.PI) / 180;
    const base = V(bx, -0.007, bz);
    feather(leftWing, MOSS, base, base.clone().add(V(Math.cos(a) * len, 0.014, Math.sin(a) * len)), 0.034);
  }

  // ---- right wing: the left one reflected, winding restored ------------------------------
  const lw = soups.get(leftWing);
  for (const [mat, s] of lw) {
    for (let t = 0; t < s.p.length; t += 9) {
      const P = (o) => V(-s.p[t + o], s.p[t + o + 1], s.p[t + o + 2]);
      const U = (o) => [s.uv[(t / 9) * 6 + o], s.uv[(t / 9) * 6 + o + 1]];
      tri(rightWing, mat, P(0), P(6), P(3), U(0), U(4), U(2));
    }
  }

  // ---- bake: one flat-shaded mesh per material per joint --------------------------------
  for (const [joint, byMat] of soups) {
    for (const [mat, s] of byMat) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(s.p, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
      geo.computeVertexNormals();
      joint.add(new THREE.Mesh(geo, mat));
    }
  }

  // ---- placement: base at y = 0, centred on x and z, measured on vertices -----------
  // The shift moves the root's children, wing Groups included, so the pivots
  // travel with the body and stay at the shoulders.
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  g.updateMatrixWorld(true);

  g.userData.parts = { leftWing, rightWing };
  return g;
}
