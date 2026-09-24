// frost_cairn, candidate A (primitives): five frost-slate slabs, each a stack of three
// low-sided frustums (undercut foot, body, chamfered top) squashed into an uneven oval,
// turned and tipped a little, two of them with a lower lobe that breaks the outline into a
// ledge, piled with a small drift off the axis. A hexagonal timber stake stands beside them
// and leans out to the right and back; a vermilion strip is wound round its top and knotted
// on the outer side, a long tail with a torn end and a short one hanging plumb. A thin crust
// of snow with a soft dome lies on the top stone, and a little snow is heaped at the stake's
// foot. About 1.1 m of stone, the stake's head at 1.3 m, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, roughness, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const SLATE = mat(0x3d4654, 'stone', 0.9, { flatShading: true });
  const SNOW = mat(0xe9f2f6, 'ground', 0.8);
  const TIMBER = mat(0x8a6a48, 'timber', 0.9, { flatShading: true });
  const CLOTH = mat(0xc2412d, 'fabric', 0.92, { side: THREE.DoubleSide });

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const add = (parent, geo, m) => { const o = new THREE.Mesh(geo, m); parent.add(o); return o; };

  // A prism of unit radius from y0 to y1, rb and rt the bottom and top radius factors.
  const frustum = (parent, n, rb, rt, y0, y1, m, cx = 0, cz = 0, phase = 0) => {
    const o = add(parent, new THREE.CylinderGeometry(rt, rb, y1 - y0, n, 1, false, phase), m);
    o.position.set(cx, (y0 + y1) / 2, cz);
    return o;
  };

  // --- the stones, bottom to top ------------------------------------------------------------
  // rx, rz half-widths; t thickness; x, z drift off the axis; yaw; n sides; tx, tz tilt;
  // lobe: a second, lower slab [angle, distance, radius, height] in the stone's unit frame,
  // shifted so it pushes out on one side as a ledge, its faces parallel to the stone's.
  const STONES = [
    { rx: 0.42, rz: 0.34, t: 0.28, x: 0, z: 0, yaw: 0.3, n: 7, tx: 0, tz: 0, lobe: [2.6, 0.17, 0.9, 0.66] },
    { rx: 0.35, rz: 0.3, t: 0.25, x: -0.035, z: 0.03, yaw: 1.45, n: 6, tx: 0.03, tz: -0.025 },
    { rx: 0.3, rz: 0.25, t: 0.23, x: 0.03, z: -0.02, yaw: 2.25, n: 7, tx: -0.035, tz: 0.02, lobe: [-0.6, 0.17, 0.9, 0.68] },
    { rx: 0.245, rz: 0.21, t: 0.21, x: -0.04, z: 0.025, yaw: 0.85, n: 6, tx: 0.02, tz: 0.035 },
    { rx: 0.2, rz: 0.17, t: 0.18, x: -0.012, z: 0.05, yaw: 2.6, n: 5, tx: -0.03, tz: -0.02 },
  ];
  const SEAT = 0.02; // each stone settles this far into the one below
  let y = 0;
  let topFrame = null;
  STONES.forEach((s, i) => {
    const holder = new THREE.Group();
    holder.position.set(s.x, y, s.z);
    holder.rotation.set(s.tx, 0, s.tz);
    const f = new THREE.Group();
    f.rotation.y = s.yaw;
    f.scale.set(s.rx, 1, s.rz);
    holder.add(f);
    const c0 = 0.2 * s.t, c1 = 0.25 * s.t;
    frustum(f, s.n, 0.8, 1.0, 0, c0, SLATE);
    frustum(f, s.n, 1.0, 0.95, c0, s.t - c1, SLATE);
    frustum(f, s.n, 0.95, 0.68, s.t - c1, s.t, SLATE);
    if (s.lobe) {
      const [a, d, r, h] = s.lobe, cx = Math.cos(a) * d, cz = Math.sin(a) * d, top = h * s.t;
      frustum(f, s.n, 0.8 * r, r, 0.01, c0, SLATE, cx, cz);
      frustum(f, s.n, r, 0.96 * r, c0, top - 0.7 * c1, SLATE, cx, cz);
      frustum(f, s.n, 0.96 * r, 0.72 * r, top - 0.7 * c1, top, SLATE, cx, cz);
    }
    g.add(holder);
    if (i === STONES.length - 1) topFrame = { f, s };
    y += s.t - SEAT;
  });

  // --- snow crust on the top stone: a thin slab inside its top face and a soft dome ------------
  {
    const { f, s } = topFrame;
    frustum(f, s.n, 0.7, 0.62, s.t - 0.004, s.t + 0.022, SNOW);
    const dome = add(f, new THREE.SphereGeometry(1, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2), SNOW);
    dome.position.y = s.t + 0.021;
    dome.scale.set(0.54, 0.03, 0.54);
  }

  // --- the stake: beside the base stone, leaning out to +X and back ------------------------------
  const LEAN = (9.5 * Math.PI) / 180, AZ = (-28 * Math.PI) / 180, R0 = 0.037, L = 1.3;
  const dir = V(Math.sin(LEAN) * Math.cos(AZ), Math.cos(LEAN), Math.sin(LEAN) * Math.sin(AZ));
  const foot = V(0.46, R0 * Math.sin(LEAN), -0.1);
  const along = (s) => foot.clone().addScaledVector(dir, s);
  const stake = new THREE.Group();
  stake.position.copy(foot);
  stake.quaternion.setFromUnitVectors(UP, dir);
  const HEAD = 0.035;
  const shaft = add(stake, new THREE.CylinderGeometry(0.032, R0, L - HEAD, 6), TIMBER);
  shaft.position.y = (L - HEAD) / 2;
  // battered head, splayed a little where it was driven
  const head = add(stake, new THREE.CylinderGeometry(0.026, 0.034, HEAD, 6), TIMBER);
  head.position.y = L - HEAD / 2;
  shaft.rotation.y = head.rotation.y = 0.4;
  g.add(stake);
  // snow heaped round the foot, which also hides the cut end
  const heap = add(g, new THREE.SphereGeometry(1, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2), SNOW);
  heap.position.set(foot.x, 0, foot.z);
  heap.scale.set(0.1, 0.034, 0.09);

  // --- the cloth: a band wound round the top, a knot on the outer side, two tails -------------
  const WRAP = 1.19;
  const band = add(stake, new THREE.CylinderGeometry(0.044, 0.046, 0.07, 8), CLOTH);
  band.position.y = WRAP;
  const turn = add(stake, new THREE.TorusGeometry(0.041, 0.011, 4, 10), CLOTH);
  turn.position.y = WRAP + 0.045;
  turn.rotation.set(Math.PI / 2 + 0.3, 0.2, 0);
  // outward from the stake axis toward the lean, where the knot sits
  const out = V(Math.cos(AZ), 0, Math.sin(AZ));
  out.addScaledVector(dir, -out.dot(dir)).normalize();
  const K = along(WRAP).addScaledVector(out, 0.05);
  const knot = add(g, new THREE.SphereGeometry(0.03, 7, 5), CLOTH);
  knot.position.copy(K);
  knot.scale.set(1, 0.8, 0.9);

  // one straight piece of strip from a to b, w wide, its width turned tw about the vertical
  const strip = (a, b, w, tw, th = 0.007) => {
    const yv = b.clone().sub(a), len = yv.length();
    yv.normalize();
    const xv = V(Math.cos(tw), 0, Math.sin(tw));
    xv.addScaledVector(yv, -xv.dot(yv)).normalize();
    const zv = V(0, 0, 0).crossVectors(xv, yv);
    const o = add(g, new THREE.BoxGeometry(w, len + 0.012, th), CLOTH);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xv, yv, zv));
    return { xv };
  };
  // the long tail hangs plumb from the knot, turning a little as it falls
  const W = 0.1;
  const P = [K.clone().add(V(0.004, -0.012, 0.008))];
  for (const d of [[0.012, -0.17, 0.016], [0.022, -0.16, -0.006], [0.03, -0.14, 0.018]]) {
    P.push(P[P.length - 1].clone().add(V(...d)));
  }
  const TW = [0.05, -0.15, -0.35];
  let last;
  for (let i = 0; i < 3; i++) last = strip(P[i], P[i + 1], W, TW[i]);
  // the torn end: two narrow ribbons of unequal length
  for (const [side, len, dx, dz] of [[-1, 0.06, -0.006, 0.008], [1, 0.04, 0.008, 0.004]]) {
    const a = P[3].clone().addScaledVector(last.xv, side * W * 0.26);
    strip(a, a.clone().add(V(dx, -len, dz)), W * 0.46, TW[2] + side * 0.08);
  }
  // the short tail, cocked out from the knot
  const Q0 = K.clone().add(V(0.012, -0.01, 0.018));
  const Q1 = Q0.clone().add(V(0.03, -0.09, 0.032));
  const Q2 = Q1.clone().add(V(0.012, -0.075, 0.012));
  strip(Q0, Q1, 0.075, 1.4);
  strip(Q1, Q2, 0.07, 1.75);

  // --- the six lines -------------------------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
