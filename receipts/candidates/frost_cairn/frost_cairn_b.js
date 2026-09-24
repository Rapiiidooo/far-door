// frost_cairn, candidate B (profiles): five frost-slate slabs, each an irregular split
// outline extruded upward with chamfered edges and a slightly wedged top, every stone
// seated on the tilted top of the one below and drifted off the axis. The stake is a
// six-sided lathe with a battered head, driven in at the right front and leaning back; the
// vermilion strip is a lathed band wound round its top with a lathed knot on its front right
// and two tails swept along hanging curves, the long one ending in a torn, notched end. A
// pillowy extruded crust of snow lies on the top stone and a lathed heap round the stake's
// foot. About 1.1 m of stone, the stake's head at 1.28 m, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, roughness, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const SLATE = mat(0x3d4654, 'stone', 0.9);
  const SNOW = mat(0xe9f2f6, 'ground', 0.8);
  const TIMBER = mat(0x8a6a48, 'timber', 0.9, { flatShading: true });
  const CLOTH = mat(0xc2412d, 'fabric', 0.92, { side: THREE.DoubleSide });

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const UP = V(0, 1, 0);
  let seed = 29;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const add = (geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };

  // Averaged normals over coincident corners, for the soft parts (snow).
  const smooth = (geo) => {
    const p = geo.attributes.position, acc = new Map(), key = [];
    const a = V(0, 0, 0), b = V(0, 0, 0), c = V(0, 0, 0);
    for (let i = 0; i < p.count; i++) key.push(`${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`);
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      const n = V(0, 0, 0).crossVectors(b.clone().sub(a), c.clone().sub(a));
      for (let k = i; k < i + 3; k++) acc.set(key[k], (acc.get(key[k]) || V(0, 0, 0)).add(n));
    }
    const nor = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) { const n = acc.get(key[i]).clone().normalize(); nor.setXYZ(i, n.x, n.y, n.z); }
    nor.needsUpdate = true;
    return geo;
  };

  // --- the slabs ---------------------------------------------------------------------------------
  // A split outline: n corners round an oval, jittered in angle and in reach.
  const outline = (rx, rz, n, rough) => {
    const turn = rnd() * Math.PI * 2, pts = [];
    for (let k = 0; k < n; k++) {
      const a = turn + ((k + jit(0.32)) / n) * Math.PI * 2, r = 1 + jit(rough);
      pts.push(V2(Math.cos(a) * rx * r, Math.sin(a) * rz * r));
    }
    return pts;
  };
  // The outline extruded upward from y = 0 to t with chamfered edges that stay inside it
  // (bevelOffset pulls the bevel in, so the slab is the size it was drawn), then wedged so
  // the top leans by (a, b) per metre while the bottom stays flat. The warp is linear across
  // each cap, so the caps stay planar.
  const slab = (pts, t, bev, a = 0, b = 0, segs = 1) => {
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
      depth: t - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev,
      bevelOffset: -bev, bevelSegments: segs, curveSegments: 1,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, bev, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (1 + (a * p.getX(i) + b * p.getZ(i)) / t));
    geo.computeVertexNormals();
    return geo;
  };

  // rx, rz half-widths; t thickness; n corners; a, b wedge of the top; ox, oz drift from the
  // stone below (in its frame); yaw.
  const STONES = [
    { rx: 0.42, rz: 0.34, t: 0.26, n: 9, a: 0.06, b: -0.04, ox: 0, oz: 0, yaw: 0 },
    { rx: 0.35, rz: 0.29, t: 0.24, n: 8, a: -0.08, b: 0.05, ox: -0.04, oz: 0.035, yaw: 1.2 },
    { rx: 0.3, rz: 0.25, t: 0.23, n: 9, a: 0.07, b: 0.06, ox: 0.045, oz: -0.03, yaw: 2.1 },
    { rx: 0.25, rz: 0.2, t: 0.2, n: 8, a: -0.06, b: -0.07, ox: -0.045, oz: 0.02, yaw: 0.6 },
    { rx: 0.2, rz: 0.165, t: 0.17, n: 7, a: 0.05, b: 0.04, ox: 0.02, oz: 0.035, yaw: 2.7 },
  ];
  const SEAT = 0.012;
  const frame = new THREE.Matrix4();
  let top = null;
  STONES.forEach((s, i) => {
    const pts = outline(s.rx, s.rz, s.n, 0.16);
    const geo = slab(pts, s.t, Math.min(0.035, s.t * 0.15), s.a, s.b);
    const m = frame.clone().multiply(new THREE.Matrix4().makeRotationY(s.yaw));
    geo.applyMatrix4(m);
    add(geo, SLATE);
    // the next stone rests on this one's tilted top, at its drift from the centre
    const ox = STONES[i + 1] ? STONES[i + 1].ox : 0, oz = STONES[i + 1] ? STONES[i + 1].oz : 0;
    const q = new THREE.Quaternion().setFromUnitVectors(UP, V(-s.a, 1, -s.b).normalize());
    const rest = new THREE.Matrix4().compose(V(ox, s.t + s.a * ox + s.b * oz, oz), q, V(1, 1, 1));
    // ox, oz and the wedge live in the stone's own (turned) frame
    const next = m.clone().multiply(rest);
    if (i === STONES.length - 1) top = { m: m.clone().multiply(new THREE.Matrix4().compose(V(0, s.t, 0), q, V(1, 1, 1))), pts, s };
    frame.copy(next).multiply(new THREE.Matrix4().makeTranslation(0, -SEAT, 0));
  });

  // --- snow crust on the top stone: an inset outline, pillowed, with softened normals ----------
  {
    const { m, pts } = top;
    let cx = 0, cz = 0;
    for (const p of pts) { cx += p.x / pts.length; cz += p.y / pts.length; }
    const inner = pts.map((p, k) => {
      const f = 0.84 - (k % 3 === 1 ? 0.07 : 0);
      return V2(cx + (p.x - cx) * f, cz + (p.y - cz) * f);
    });
    const geo = slab(inner, 0.046, 0.018, 0, 0, 2);
    geo.translate(0, -0.006, 0);
    geo.applyMatrix4(m);
    add(smooth(geo), SNOW);
  }

  // --- the stake ------------------------------------------------------------------------------
  const LEAN = (11 * Math.PI) / 180, AZ = (-55 * Math.PI) / 180, R0 = 0.036;
  const dir = V(Math.sin(LEAN) * Math.cos(AZ), Math.cos(LEAN), Math.sin(LEAN) * Math.sin(AZ));
  const foot = V(0.46, R0 * Math.sin(LEAN), 0.15);
  const qs = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  const onStake = (geo, s) => { geo.translate(0, s, 0); geo.applyQuaternion(qs); geo.translate(foot.x, foot.y, foot.z); return geo; };
  const along = (s) => foot.clone().addScaledVector(dir, s);
  // radius up the shaft, then the head that splayed where it was driven
  const STAKE = [[0, 0], [R0, 0], [0.034, 0.5], [0.031, 1.2], [0.036, 1.235], [0.034, 1.268], [0.024, 1.29], [0, 1.295]];
  const stakeGeo = new THREE.LatheGeometry(STAKE.map(([r, y]) => V2(r, y)), 6, 0.3);
  add(onStake(stakeGeo, 0), TIMBER);
  // a heap of snow round the foot, which also hides the cut end
  {
    const heap = new THREE.LatheGeometry([V2(0.115, 0), V2(0.09, 0.016), V2(0.06, 0.03), V2(0.035, 0.038), V2(0.02, 0.04)], 9);
    heap.translate(foot.x, 0, foot.z);
    add(heap, SNOW);
  }

  // --- the cloth ------------------------------------------------------------------------------
  const WRAP = 1.18;
  const band = new THREE.LatheGeometry([[0.028, -0.044], [0.044, -0.038], [0.049, -0.012], [0.048, 0.018], [0.045, 0.038], [0.029, 0.047]].map(([r, y]) => V2(r, y)), 10);
  add(onStake(band, WRAP), CLOTH);
  // the knot sits on the underside of the lean, toward the front right
  const out = V(0.75, 0, 0.66);
  out.addScaledVector(dir, -out.dot(dir)).normalize();
  const K = along(WRAP).addScaledVector(out, 0.05);
  {
    const knot = new THREE.LatheGeometry([[0, -0.03], [0.021, -0.025], [0.031, -0.006], [0.028, 0.014], [0.015, 0.028], [0, 0.031]].map(([r, y]) => V2(r, y)), 7);
    knot.scale(1, 0.8, 0.85);
    knot.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, out));
    knot.translate(K.x, K.y, K.z);
    add(knot, CLOTH);
  }
  // A tail: a thin band swept along a hanging curve. The rectangle is turned by phi in the
  // sweep's frame, so the strip hangs at an angle and shows a face from every side. The sweep
  // starts its frame from the axis the first tangent leans on least, so each curve's first
  // step leans more in z than in x, which keeps the frame's normal on -X and phi meaningful.
  const TH = 0.007;
  const tail = (pts, w, phi, steps) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const c = Math.cos(phi), s = Math.sin(phi);
    const rect = [[-TH / 2, -w / 2], [TH / 2, -w / 2], [TH / 2, w / 2], [-TH / 2, w / 2]].map(([x, y]) => V2(x * c - y * s, x * s + y * c));
    add(new THREE.ExtrudeGeometry(new THREE.Shape(rect), { steps, bevelEnabled: false, extrudePath: curve }), CLOTH);
    const fr = curve.computeFrenetFrames(steps, false);
    const T = fr.tangents[steps], N = fr.normals[steps], B = fr.binormals[steps];
    // the width direction at the end, matching the rectangle's turn
    return { end: curve.getPoint(1), T, across: B.clone().multiplyScalar(c).addScaledVector(N, -s) };
  };
  const W = 0.1;
  const P = [[0.002, -0.012, 0.012], [0.006, -0.13, 0.024], [0.028, -0.27, 0.012], [0.034, -0.38, 0.03], [0.05, -0.47, 0.048]].map(([x, y, z]) => K.clone().add(V(x, y, z)));
  const long = tail(P, W, 0.96, 14);
  // the torn end: a flat piece with a notched edge, carried on at the tail's last frame
  {
    const notch = [[-0.5, 0.02], [0.5, 0.02], [0.5, -0.5], [0.34, -0.3], [0.2, -0.62], [0.02, -0.34], [-0.14, -0.72], [-0.3, -0.4], [-0.5, -0.56]].map(([x, y]) => V2(x * W, y * 0.1));
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(notch), { depth: TH, bevelEnabled: false });
    geo.translate(0, 0, -TH / 2);
    const down = long.T.clone(), across = long.across.clone().normalize();
    const face = V(0, 0, 0).crossVectors(across, down.clone().negate());
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(across, down.clone().negate(), face));
    geo.translate(long.end.x, long.end.y, long.end.z);
    add(geo, CLOTH);
  }
  const Q = [[0.008, -0.006, 0.016], [0.03, -0.08, 0.05], [0.05, -0.17, 0.06]].map(([x, y, z]) => K.clone().add(V(x, y, z)));
  tail(Q, 0.08, 1.2, 6);

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
