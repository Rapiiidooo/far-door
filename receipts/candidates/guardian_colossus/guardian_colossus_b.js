// guardian_colossus, candidate B (profiles): every mass is a drawn profile.
// Side profiles extruded across the width give the throne, legs and L-shaped
// arms; front profiles give the torso, head and slit mask; plan profiles give
// the cracked plinth; four- and eight-segment lathes give the stepped
// headdress, collar and medallions. 14 m seated guardian, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SUN = mat(0xd4a373, 0.84);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.95);
  const BONE = mat(0xe6d3ae, 0.76);
  const BASALT = mat(0x3a3531, 0.82);
  const FIG = SUN;

  const add = (geo, m, x = 0, y = 0, z = 0, parent = g) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const shapeOf = (pts, holes = []) => {
    const s = new THREE.Shape();
    pts.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b)));
    s.closePath();
    for (const h of holes) {
      const p = new THREE.Path();
      h.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b)));
      p.closePath();
      s.holes.push(p);
    }
    return s;
  };
  // Extrude UVs come out in metres; bring them to 0..1 like the primitives so
  // the load-time surfaces keep one texel density across the asset.
  const normUV = (geo) => {
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    const L = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) || 1;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / L, uv.getY(i) / L);
    return geo;
  };
  // The bevel keeps the drawn outline on the end caps but pushes the side walls
  // out by bev, so notches are drawn 2*bev taller than they read and parts overlap.
  const extrude = (shape, span, bev) => new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, span - 2 * bev), steps: 1, curveSegments: 12,
    bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 1,
  });
  // Side profile drawn as (z, y), extruded across x from x0 to x1.
  const side = (pts, x0, x1, bev = 0.05, holes = []) => {
    const geo = extrude(shapeOf(pts, holes), x1 - x0, bev);
    geo.rotateY(-Math.PI / 2);
    geo.translate(x1 - bev, 0, 0);
    return normUV(geo);
  };
  // Front profile drawn as (x, y), extruded along z from z0 to z1.
  const front = (pts, z0, z1, bev = 0.05, holes = []) => {
    const geo = extrude(shapeOf(pts, holes), z1 - z0, bev);
    geo.translate(0, 0, z0 + bev);
    return normUV(geo);
  };
  // Plan profile drawn as (x, z), extruded up from y0 to y1.
  const plan = (pts, y0, y1, bev = 0.05) => {
    const geo = extrude(shapeOf(pts.map(([x, z]) => [x, -z])), y1 - y0, bev);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y0 + bev, 0);
    return normUV(geo);
  };
  // Lathe of (r, y) points, flat-shaded so few segments read as chamfered facets.
  const lathe = (pts, seg, phi = 0) => {
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phi).toNonIndexed();
    geo.computeVertexNormals();
    return geo;
  };
  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const cham = (x0, x1, y0, y1, c) => [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
  // Medallion: a disc with a raised rim, a sunk field and a boss, facing +Z.
  const medallion = (r, t) => lathe([[0, 0], [r, 0], [r, t * 0.62], [r * 0.9, t * 0.85], [r * 0.72, t * 0.85], [r * 0.68, t * 0.5],
    [r * 0.26, t * 0.5], [r * 0.22, t], [0, t]], 28).rotateX(Math.PI / 2);
  const rimRing = (r0, r1, t) => lathe([[r0, 0], [r1, 0], [r1, t], [r0, t], [r0, 0]], 28).rotateX(Math.PI / 2);
  const crescent = (r, t) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r, Math.PI * 0.3, Math.PI * 1.7, false);
    s.absarc(r * 0.34, 0, r * 0.74, Math.PI * 1.62, Math.PI * 0.38, true);
    return normUV(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 14 }));
  };
  const facing = (o, ry) => { o.rotation.y = ry; return o; };

  // ---------------------------------------------------------------- plinth
  add(plan(rect(-4.2, 4.2, -4.4, 5.2), 0, 0.5, 0.04), SIENNA);
  // the upper step is split by a real fissure in front of the toes; the front slab has settled
  const crack = [[-3.75, 4.25], [-3.0, 4.05], [-2.3, 4.4], [-1.5, 4.15], [-0.6, 4.45], [0.3, 4.1],
    [1.15, 4.4], [2.0, 4.08], [2.8, 4.38], [3.75, 4.2]];
  const gap = 0.11;
  add(plan([[-3.75, -3.95], [3.75, -3.95], ...crack.slice().reverse().map(([x, z]) => [x, z - gap])], 0.5, 1.0, 0.04), SAND);
  add(plan([...crack.map(([x, z]) => [x, z + gap]), [3.75, 4.75], [-3.75, 4.75]], 0.5, 0.955, 0.04), SAND);
  // basalt disc inlays along the lower risers, front and back
  for (let i = -2; i <= 2; i++) {
    for (const [z, ry] of [[5.23, 0], [-4.43, Math.PI]]) {
      facing(add(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 20).rotateX(Math.PI / 2), BASALT, i * 1.6, 0.25, z), ry);
    }
  }

  // ----------------------------------------------------------------- throne
  add(plan(rect(-3.3, 3.3, -3.6, 1.1), 1.0, 1.4, 0.04), SIENNA);
  // seat and first backrest tier share one side profile, with deep joints
  // notched into the front and the back
  const notchF = (y) => [[0.9, y], [0.76, y], [0.76, y + 0.26], [0.9, y + 0.26]];
  const notchB = (y) => [[-3.4, y + 0.26], [-3.26, y + 0.26], [-3.26, y], [-3.4, y]];
  const seat = [[0.9, 1.4], ...notchF(2.0), ...notchF(3.1), [0.9, 4.4], [-2.2, 4.4], [-2.2, 6.7], [-3.4, 6.7],
    ...notchB(5.82), ...notchB(3.3), ...notchB(2.2), [-3.4, 1.4]];
  add(side(seat, -2.8, 2.8, 0.05), SAND);
  for (const s of [1, -1]) {
    const [x0, x1] = s > 0 ? [2.8, 3.1] : [-3.1, -2.8];
    // side walls carry the same profile, pierced by a deep panel
    add(side(seat, x0, x1, 0.05, [rect(-2.75, 0.25, 1.95, 3.85)]), SAND);
    add(side(rect(-2.8, 0.3, 1.9, 3.9), s > 0 ? 2.76 : -2.83, s > 0 ? 2.83 : -2.76, 0), SIENNA);
    facing(add(medallion(0.72, 0.3), SAND, s * 2.83, 2.9, -1.25), s * Math.PI / 2);
    facing(add(rimRing(0.66, 0.78, 0.3), BONE, s * 2.83, 2.9, -1.25), s * Math.PI / 2);
    facing(add(crescent(0.36, 0.12), SIENNA, s * 2.97, 2.9, -1.25), s * Math.PI / 2);
    for (const dz of [-2.25, -0.25]) facing(add(medallion(0.24, 0.26), BONE, s * 2.83, 2.9, dz), s * Math.PI / 2);
    // sunlit cap on the seat beside the thighs
    add(side(rect(-2.2, 1.0, 4.4, 4.52), s > 0 ? 1.8 : -3.2, s > 0 ? 3.2 : -1.8, 0.03), SUN);
  }
  // receding backrest tiers, each with a sunlit cap
  add(side(rect(-3.5, -2.1, 6.7, 6.84), -3.2, 3.2, 0.03), SUN);
  add(side([[-2.2, 6.84], [-2.2, 8.0], [-3.2, 8.0], ...[[-3.2, 7.26], [-3.06, 7.26], [-3.06, 7.0], [-3.2, 7.0]], [-3.2, 6.84]], -2.4, 2.4, 0.05), SAND);
  add(side(rect(-3.3, -2.1, 8.0, 8.12), -2.5, 2.5, 0.03), SUN);
  add(side(rect(-3.0, -2.2, 8.12, 9.0), -1.6, 1.6, 0.05), SAND);
  add(side(rect(-3.1, -2.1, 9.0, 9.1), -1.7, 1.7, 0.03), SUN);
  // back medallion between the joints, twin circles and a crescent on the tiers above
  facing(add(medallion(1.05, 0.34), SAND, 0, 4.6, -3.4), Math.PI);
  facing(add(rimRing(0.96, 1.1, 0.36), BONE, 0, 4.6, -3.4), Math.PI);
  facing(add(crescent(0.5, 0.14), SIENNA, 0, 4.6, -3.56), Math.PI);
  for (const s of [1, -1]) {
    const ribs = [[1.35, -3.3], [3.0, -3.3], [3.0, -3.6]];
    for (let i = 3; i >= 0; i--) {
      const x = 1.6 + i * 0.42;
      ribs.push([x + 0.08, -3.6], [x + 0.08, -3.47], [x - 0.08, -3.47], [x - 0.08, -3.6]);
    }
    ribs.push([1.35, -3.6]);
    add(plan(ribs.map(([x, z]) => [s * x, z]), 3.6, 6.55, 0.02), SAND);
    facing(add(medallion(0.28, 0.2), BONE, s * 1.25, 7.62, -3.2), Math.PI);
  }
  facing(add(crescent(0.34, 0.12), SIENNA, 0, 8.55, -3.04), Math.PI);

  // ----------------------------------------------------------------- figure
  for (const s of [1, -1]) {
    const cx = s * 0.88;
    add(side([[-1.9, 4.4], [2.3, 4.4], [2.72, 4.66], [2.76, 5.3], [2.5, 5.6], [-1.9, 5.6]], cx - 0.75, cx + 0.75, 0.08), FIG);
    add(side([[1.36, 4.6], [2.6, 4.6], [2.38, 1.95], [1.5, 1.95], [1.22, 3.5]], cx - 0.62, cx + 0.62, 0.06), FIG);
    add(lathe([[0.5, 1.86], [0.7, 1.86], [0.72, 1.9], [0.72, 2.1], [0.7, 2.14], [0.5, 2.14], [0.5, 1.86]], 8, Math.PI / 8), BONE, cx, 0, 1.93);
    const fx = s * 0.82;
    add(side([[1.3, 1.0], [1.3, 1.85], [2.45, 2.02], [3.25, 1.56], [3.3, 1.0]], fx - 0.62, fx + 0.62, 0.05), FIG);
    for (let i = 0; i < 4; i++) {
      const tx = fx + s * (-0.47 + i * 0.31);
      const reach = 3.85 - i * 0.07;
      add(side([[3.2, 1.0], [3.2, 1.52 - i * 0.02], [reach - 0.12, 1.44 - i * 0.02], [reach, 1.3], [reach, 1.0]], tx - 0.13, tx + 0.13, 0.03), FIG);
    }
  }
  add(front(cham(-1.6, 1.6, 4.4, 5.4, 0.2), -2.3, -0.25, 0.08), FIG);
  add(front([[-1.55, 5.3], [1.55, 5.3], [1.45, 6.3], [1.85, 7.8], [1.85, 8.15], [-1.85, 8.15], [-1.85, 7.8], [-1.45, 6.3]], -2.3, -0.1, 0.1), FIG);
  // chest plate with four vertical channels cut into its face
  const plate = [[-1.15, -0.2], [1.15, -0.2], [1.15, 0.06]];
  for (let i = 3; i >= 0; i--) {
    const x = -0.72 + i * 0.48;
    plate.push([x + 0.1, 0.06], [x + 0.1, -0.07], [x - 0.1, -0.07], [x - 0.1, 0.06]);
  }
  plate.push([-1.15, 0.06]);
  add(plan(plate, 5.95, 7.6, 0.03), FIG);
  // waist band with a disc
  add(front(cham(-1.66, 1.66, 5.38, 5.86, 0.1), -2.42, 0.04, 0.04), BONE);
  add(medallion(0.34, 0.2), SAND, 0, 5.62, 0.02);
  // stepped collar: an octagonal lathe of three courses, and a stepped bib
  const collar = add(lathe([[0.01, 7.95], [2.12, 7.95], [2.16, 8.0], [2.16, 8.3], [1.78, 8.34], [1.75, 8.58], [1.4, 8.62], [1.38, 8.85], [0.01, 8.85]], 8, Math.PI / 8), BONE, 0, 0, -1.2);
  collar.scale.z = 0.8;
  add(front([[-1.05, 8.05], [-1.05, 7.72], [-0.68, 7.72], [-0.68, 7.46], [0.68, 7.46], [0.68, 7.72], [1.05, 7.72], [1.05, 8.05]], -0.2, 0.22, 0.04), BONE);
  // arms: deltoid dome, L-shaped arm profile yawed toward the knee, open hand
  for (const s of [1, -1]) {
    add(lathe([[0.01, 7.4], [0.64, 7.4], [0.68, 8.25], [0.52, 8.7], [0.01, 8.8]], 8, Math.PI / 8), FIG, s * 2.0, 0, -1.2).scale.z = 1.25;
    const E = [s * 2.0, -1.3], W = [s * 1.2, 1.45];
    const L = Math.hypot(W[0] - E[0], W[1] - E[1]);
    const arm = new THREE.Group();
    arm.position.set(E[0], 0, E[1]);
    arm.rotation.y = Math.atan2(W[0] - E[0], W[1] - E[1]);
    g.add(arm);
    add(side([[-0.62, 8.2], [0.55, 8.2], [0.55, 6.42], [L, 6.3], [L, 5.6], [-0.2, 5.6], [-0.62, 5.98]], -0.47, 0.47, 0.06), FIG, 0, 0, 0, arm);
    add(lathe([[0.5, 6.98], [0.6, 6.98], [0.62, 7.02], [0.62, 7.22], [0.6, 7.26], [0.5, 7.26], [0.5, 6.98]], 8, Math.PI / 8), BONE, 0, 0, -0.04, arm).scale.z = 1.28;
    add(side([[L - 0.12, 5.6], [L - 0.12, 5.96], [L + 0.95, 5.9], [L + 0.95, 5.6]], -0.52, 0.52, 0.04), FIG, 0, 0, 0, arm);
    for (let i = 0; i < 4; i++) {
      const fx = -0.39 + i * 0.26;
      add(side([[L + 0.9, 5.6], [L + 0.9, 5.9], [L + 1.38, 5.86], [L + 1.58, 5.7], [L + 1.62, 5.3], [L + 1.5, 5.24],
        [L + 1.44, 5.55], [L + 1.3, 5.6]], fx - 0.115, fx + 0.115, 0.02), FIG, 0, 0, 0, arm);
    }
    const tx = -s * 0.6;
    add(side([[L + 0.05, 5.52], [L + 0.05, 5.84], [L + 0.85, 5.78], [L + 0.98, 5.55]], tx - 0.13, tx + 0.13, 0.03), FIG, 0, 0, 0, arm);
  }
  // neck, head, the slit mask and carved channels down the back of the head
  add(lathe([[0.01, 8.6], [0.7, 8.6], [0.7, 9.6], [0.01, 9.6]], 8, Math.PI / 8), FIG, 0, 0, -1.1);
  add(front(cham(-0.92, 0.92, 9.35, 11.1, 0.22), -2.0, -0.05, 0.08), FIG);
  add(front(cham(-0.85, 0.85, 9.45, 10.95, 0.2), -0.1, 0.2, 0.05, [rect(-0.16, 0.16, 9.68, 10.76)]), BONE);
  add(front(rect(-0.22, 0.22, 9.62, 10.82), -0.08, -0.02, 0), BASALT);
  const nape = [[-0.72, -1.95], [0.72, -1.95], [0.72, -2.15]];
  for (let i = 2; i >= -2; i--) nape.push([i * 0.28 + 0.07, -2.15], [i * 0.28 + 0.07, -2.05], [i * 0.28 - 0.07, -2.05], [i * 0.28 - 0.07, -2.15]);
  nape.push([-0.72, -2.15]);
  add(plan(nape, 9.5, 10.9, 0.02), FIG);
  // headdress: square lathes stepped in three receding tiers, groove bands, sunlit caps
  const R2 = Math.SQRT2;
  const tierPts = (hw, gw, y0, gy, y1) => [[0.01, y0], [hw * R2, y0], [hw * R2, gy], [gw * R2, gy], [gw * R2, gy + 0.13],
    [hw * R2, gy + 0.13], [hw * R2, y1], [0.01, y1]];
  const capPts = (hw, y0, y1) => [[0.01, y0], [hw * R2, y0], [hw * R2, y1], [0.01, y1]];
  const tiers = [
    [tierPts(1.275, 1.15, 10.95, 11.42, 12.0), capPts(1.33, 12.0, 12.1)],
    [tierPts(1.0, 0.88, 12.1, 12.5, 13.05), capPts(1.05, 13.05, 13.13)],
    [tierPts(0.725, 0.62, 13.13, 13.42, 13.62), null],
  ];
  tiers.forEach(([body, cap]) => {
    for (const [pts, m] of [[body, SAND], [cap, SUN]]) {
      if (!pts) continue;
      const f = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 4, Math.PI / 4).toNonIndexed();
      f.computeVertexNormals();
      f.scale(1, 1, 0.94);
      add(f, m, 0, 0, -1.0);
    }
  });
  // crown of the top tier, its right corner broken off in a jagged line; the break is fresh stone
  const brk = [[0.725, 13.6], [0.725, 13.66], [0.6, 13.7], [0.66, 13.78], [0.44, 13.83], [0.5, 13.9], [0.26, 13.93], [0.3, 14.0]];
  add(front([[-0.725, 13.6], ...brk, [-0.725, 14.0]], -1.68, -0.32, 0.03), SAND);
  add(front([[-0.76, 13.93], [0.3, 13.93], [0.3, 14.0], [-0.76, 14.0]], -1.71, -0.29, 0.02), SUN);
  add(medallion(0.5, 0.36), BONE, 0, 12.58, -0.08);
  add(crescent(0.26, 0.1), SIENNA, 0, 12.58, 0.09);

  // -------------------------------------------------------------- weathering
  const chunk = add(plan([[-0.3, -0.35], [0.28, -0.4], [0.36, 0.1], [0.05, 0.42], [-0.34, 0.2]], 0, 0.42, 0.04), SAND, 3.1, 0.98, 3.45);
  chunk.rotation.set(0.12, 0.7, -0.1);
  const chip = add(plan([[-0.2, -0.15], [0.18, -0.18], [0.2, 0.12], [-0.12, 0.2]], 0, 0.22, 0.03), SUN, -3.95, 0.5, 4.95);
  chip.rotation.set(0.05, -0.4, 0.15);

  // --- the six lines -------------------------------------------------------
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
