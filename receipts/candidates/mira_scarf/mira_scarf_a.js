// mira_scarf, candidate A (primitives): a low frost-slate stone of fused strata, each an
// irregular six- or seven-sided frustum turned off the one below (an undercut foot, two
// layers and a chamfered top slab), with a lower ledge at the back right and a split flake at
// the front left; a long knitted scarf thrown over it from left to right. The scarf is a chain
// of knit courses, each a flattened six-sided cylinder laid across the width and overlapping
// the next, so the shallow ribs are the geometry itself. It rests on the highest point of the
// stone across its width (found by casting rays down onto the stone), hangs loose off both
// edges no steeper than about 68 degrees, flares onto the ground and trails in two tails that
// bend gently, the left one forward and the right one back. Two stamp-ochre courses make each
// stripe, two stripes near each end, and each end has a fringe of five thick tassels with
// knotted roots. Frost: thin crusts on the top faces, a skin on the upper part of a few chamfer
// facets and small flat flecks on the crests of the upper courses. About 1.6 m across, 0.57 m
// deep and 0.29 m tall, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, roughness, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const SLATE = mat(0x3d4654, 'stone', 0.9, { flatShading: true });
  const FROST = mat(0xe9f2f6, 'ground', 0.8, { flatShading: true, side: THREE.DoubleSide });
  const WOOL = mat(0xc2412d, 'fabric', 0.95, { flatShading: true, side: THREE.DoubleSide });
  const OCHRE = mat(0xd9a441, 'fabric', 0.95, { flatShading: true, side: THREE.DoubleSide });

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const add = (geo, m, parent = g) => { const o = new THREE.Mesh(geo, m); parent.add(o); return o; };
  // local x along a, local y along b (a and b perpendicular), local z along a x b
  const orient = (o, a, b) => o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, b, V(0, 0, 0).crossVectors(a, b)));

  // --- the stone -----------------------------------------------------------------------------
  // A stratum is a frustum from y0 to y1, radius factors r0 at its foot and r1 at its top,
  // with its corners turned by `turn`, squashed to sx by sz and shifted to (x, z).
  const stratum = (parent, s, m = SLATE) => {
    const o = add(new THREE.CylinderGeometry(s.r1, s.r0, s.y1 - s.y0, s.sides, 1, false, s.turn), m, parent);
    o.position.set(s.x || 0, (s.y0 + s.y1) / 2, s.z || 0);
    o.scale.set(s.sx, 1, s.sz);
    return o;
  };
  const TOP = 0.255;
  const STRATA = [
    { y0: 0, y1: 0.05, r0: 0.84, r1: 1.0, sides: 7, turn: 0.3, sx: 0.31, sz: 0.26 },
    { y0: 0.05, y1: 0.135, r0: 1.0, r1: 0.97, sides: 7, turn: 0.3, sx: 0.31, sz: 0.26 },
    { y0: 0.135, y1: 0.2, r0: 0.95, r1: 0.9, sides: 6, turn: 1.15, sx: 0.3, sz: 0.265, x: -0.012, z: 0.012 },
    { y0: 0.2, y1: TOP, r0: 0.86, r1: 0.62, sides: 7, turn: 2.05, sx: 0.29, sz: 0.25, x: 0.01, z: -0.008 },
  ];
  STRATA.forEach((s) => stratum(g, s));
  const part = (x, z, yaw) => {
    const o = new THREE.Group();
    o.position.set(x, 0, z);
    o.rotation.y = yaw;
    g.add(o);
    return o;
  };
  // a lower ledge fused into the back right, and a split flake leaning at the front left
  const ledge = part(0.14, -0.15, 0.4);
  stratum(ledge, { y0: 0, y1: 0.03, r0: 0.82, r1: 0.95, sides: 6, turn: 0.9, sx: 0.2, sz: 0.14 });
  stratum(ledge, { y0: 0.03, y1: 0.1, r0: 1.0, r1: 0.95, sides: 7, turn: 0.3, sx: 0.2, sz: 0.14 });
  stratum(ledge, { y0: 0.1, y1: 0.145, r0: 0.95, r1: 0.7, sides: 7, turn: 0.3, sx: 0.2, sz: 0.14 });
  const flake = part(-0.2, 0.17, 1.1);
  stratum(flake, { y0: 0, y1: 0.02, r0: 0.85, r1: 1.0, sides: 6, turn: 0, sx: 0.12, sz: 0.09 });
  stratum(flake, { y0: 0.02, y1: 0.085, r0: 1.0, r1: 0.68, sides: 6, turn: 0, sx: 0.12, sz: 0.09 });

  // frost: thin crusts on the top faces (the same polygon as the face, smaller and shifted, so
  // they stay inside it) and a skin over the upper part of three facets of the top chamfer
  const T = STRATA[3];
  const crust = (parent, s, r, dx, dz, turn = s.turn) => stratum(parent, {
    ...s, y0: s.y1 - 0.004, y1: s.y1 + 0.006, r0: r, r1: r * 0.93, turn, x: (s.x || 0) + dx, z: (s.z || 0) + dz,
  }, FROST);
  crust(g, T, 0.47, -0.012, 0.03);
  crust(g, T, 0.4, 0.02, -0.035, T.turn + 0.45);
  crust(ledge, { y1: 0.145, sides: 7, turn: 0.3, sx: 0.2, sz: 0.14 }, 0.58, 0, 0);
  const SECTOR = (Math.PI * 2) / T.sides;
  for (const [k, reach] of [[0, 0.7], [1, 0.45], [4, 0.6]]) {
    const h = (T.y1 - T.y0) * reach, rb = T.r1 + reach * (T.r0 - T.r1);
    const skin = add(new THREE.CylinderGeometry(T.r1 * 1.025, rb * 1.025, h, 1, 1, true, T.turn + k * SECTOR, SECTOR), FROST);
    skin.position.set(T.x, T.y1 - h / 2 + 0.002, T.z);
    skin.scale.set(T.sx, 1, T.sz);
  }

  // --- the drape ---------------------------------------------------------------------------------
  // The courses are rigid across the width, so the scarf rests on the highest point of the stone
  // (or its frost) across it: rays cast down at five points across the width give the support
  // along the centre line. Where the support falls away the scarf hangs no steeper than SLOPE,
  // and the centre line is that envelope pushed out along its normal by half the thickness.
  const WIDTH = 0.2, HT = 0.013; // HT: half the thickness at a course's crest
  const SLOPE = 2.5, DX = 0.01, X0 = 0.5;
  g.updateMatrixWorld(true);
  const support = [];
  g.traverse((o) => o.isMesh && support.push(o));
  const ray = new THREE.Raycaster();
  const DOWN = V(0, -1, 0);
  const heightAt = (x, z) => {
    ray.set(V(x, 1, z), DOWN);
    const hit = ray.intersectObjects(support, false)[0];
    return hit ? hit.point.y : 0;
  };
  const xs = [], S = [];
  for (let x = -X0; x <= X0 + 1e-9; x += DX) {
    xs.push(x);
    let h = 0;
    for (const z of [-0.1, -0.05, 0, 0.05, 0.1]) h = Math.max(h, heightAt(x, z));
    S.push(h);
  }
  const E = xs.map((x) => Math.max(0, ...S.map((s, j) => s - SLOPE * Math.abs(x - xs[j]))));
  let C = xs.map((x, i) => {
    const a = Math.max(0, i - 1), b = Math.min(xs.length - 1, i + 1);
    const tx = xs[b] - xs[a], ty = E[b] - E[a], l = Math.hypot(tx, ty);
    return E[i] > 0 ? [x - (ty / l) * (HT + 0.001), E[i] + (tx / l) * (HT + 0.001)] : [x, HT];
  });
  // offsetting a concave corner folds the line back on itself: keep it moving outward
  const mid = C.findIndex(([x]) => x >= 0);
  const outward = (list, dir) => {
    let last = -dir * 9;
    return list.filter(([x]) => (dir * x > dir * last ? ((last = x), true) : false));
  };
  C = [...outward(C.slice(0, mid).reverse(), -1).reverse(), ...outward(C.slice(mid), 1)];
  // the hem flares onto the ground: soften the low part upward, never downward
  for (let pass = 0; pass < 3; pass++) {
    C = C.map(([x, y], i) => {
      if (y > 0.08) return [x, y];
      const w = C.slice(Math.max(0, i - 3), i + 4);
      return [x, Math.max(y, w.reduce((s, q) => s + q[1], 0) / w.length)];
    });
  }
  C = C.map(([x, y]) => [x, Math.max(y, HT)]);
  const lifted = C.filter(([, y]) => y > HT + 0.0005);
  const xl = lifted[0][0] - 0.02, xr = lifted[lifted.length - 1][0] + 0.02;
  const drape = C.filter(([x], i) => x > xl && x < xr && i % 2 === 0).map(([x, y]) => V(x, y, 0));

  // a tail on the ground: from (x0, z0) heading along sx (+1 or -1 on X), bending towards sz
  // on Z through the angle ang with radius r, as k + 1 points of a circular arc
  const tail = (x0, z0, sx, sz, r, ang, k) => {
    const pts = [];
    for (let i = 0; i <= k; i++) {
      const f = (ang * i) / k;
      pts.push(V(x0 + sx * r * Math.sin(f), HT, z0 + sz * r * (1 - Math.cos(f))));
    }
    return pts;
  };
  const P = [
    ...tail(xl, 0, -1, 1, 0.36, 0.9, 5).reverse(), // left tail, bending forward
    ...drape,
    ...tail(xr, 0, 1, -1, 0.38, 0.82, 5), // right tail, bending back
  ];
  const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
  const L = curve.getLength();

  // --- the knit courses ------------------------------------------------------------------------
  // Each course is a six-sided cylinder across the width, flattened so its crest stands HT
  // above the centre line and its flanks reach 0.866 * CA along the scarf; at a spacing of
  // STEP the flanks overlap and the valleys between crests are about 4 mm deep.
  const STEP = 0.028, CA = 0.024;
  const n = Math.round(L / STEP), step = L / n;
  const course = new THREE.CylinderGeometry(1, 1, WIDTH, 6, 1);
  const stripe = new THREE.CylinderGeometry(1, 1, WIDTH + 0.003, 6, 1); // caps clear the red ones
  const frames = [];
  for (let i = 0; i < n; i++) {
    const u = ((i + 0.5) * step) / L;
    const p = curve.getPointAt(u);
    p.y = Math.max(p.y, HT); // no dip below the ground where the spline eases onto it
    const t = curve.getTangentAt(u);
    const w = V(0, 0, 0).crossVectors(t, UP).normalize();
    const nrm = V(0, 0, 0).crossVectors(w, t).normalize();
    frames.push({ p, t, w, n: nrm });
    // two ochre courses make a stripe; two stripes near each end
    const e = Math.min(i, n - 1 - i);
    const ochre = e === 2 || e === 3 || e === 6 || e === 7;
    const o = add(ochre ? stripe : course, ochre ? OCHRE : WOOL);
    o.position.copy(p);
    orient(o, t, w);
    o.scale.set(CA, 1, HT);
  }

  // --- the fringes -------------------------------------------------------------------------------
  const tassel = new THREE.CylinderGeometry(0.0135, 0.009, 1, 5, 1); // tip radius, root radius
  const knot = new THREE.SphereGeometry(1, 5, 2);
  for (const [f, sign] of [[frames[0], -1], [frames[n - 1], 1]]) {
    const out = f.t.clone().multiplyScalar(sign).setY(0).normalize();
    for (let k = 0; k < 5; k++) {
      const across = (k - 2) * 0.04 + (rnd() - 0.5) * 0.008;
      const root = f.p.clone().addScaledVector(out, 0.017).addScaledVector(f.w, across);
      root.y = HT;
      const dir = out.clone().applyAxisAngle(UP, sign * ((k - 2) * 0.11 + (rnd() - 0.5) * 0.12));
      const len = 0.055 + rnd() * 0.022;
      const tip = root.clone().addScaledVector(dir, len);
      tip.y = 0.0135; // the flared tip rests on the ground
      const axis = tip.clone().sub(root);
      const t = add(tassel, WOOL);
      t.position.copy(root).add(tip).multiplyScalar(0.5);
      t.quaternion.setFromUnitVectors(UP, axis.clone().normalize());
      t.scale.set(1, axis.length(), 1);
      const kn = add(knot, WOOL);
      kn.position.copy(root).addScaledVector(dir, 0.007);
      kn.quaternion.copy(t.quaternion);
      kn.scale.set(0.014, 0.012, 0.014);
    }
  }

  // --- frost on the upper courses: low six-sided flecks lying on the crests, thicker on top ---
  const fleck = new THREE.SphereGeometry(1, 6, 1, 0, Math.PI * 2, 0, Math.PI / 2);
  frames.forEach((f) => {
    if (f.p.y < 0.17 || f.n.y < 0.45) return;
    const dense = f.n.y > 0.9 ? 2 : 1;
    for (let j = 0; j < dense; j++) {
      if (rnd() < 0.5) continue;
      const len = 0.012 + rnd() * rnd() * 0.05;
      const off = (rnd() - 0.5) * (WIDTH - len - 0.012);
      const s = add(fleck, FROST);
      s.position.copy(f.p).addScaledVector(f.n, HT - 0.0015).addScaledVector(f.w, off);
      // lying on the crest: local y along the course's normal, long axis across the scarf
      s.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.w, f.n, V(0, 0, 0).crossVectors(f.w, f.n)));
      s.rotateY((rnd() - 0.5) * 0.5);
      s.scale.set(len / 2, 0.0035 + rnd() * 0.0015, 0.005 + rnd() * 0.003);
    }
  });

  // --- the six lines -------------------------------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const p = nd.isMesh && nd.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (nd.isInstancedMesh) { for (let c = 0; c < nd.count; c++) { nd.getMatrixAt(c, im); put(m4.multiplyMatrices(nd.matrixWorld, im)); } return; }
    put(nd.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
