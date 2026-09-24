// fallen_head, candidate B (profiles): chamfered plan outlines extruded upward with a
// one-step bevel for every course of the head and headdress, side silhouettes extruded
// across the width for the sheared neck and the snapped second tier, the cracked mask
// as two extruded outlines with the slit notched into them, and lathes for the disc and
// the drift. Laid on its right side, face to +Z, headdress to -X, resting on the floor.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name = 'stone') => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = name;
    return m;
  };
  const SUN = mat(0xd4a373, 0.84);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.95);
  const BONE = mat(0xe6d3ae, 0.76);
  const BASALT = mat(0x3a3531, 0.82);
  const DUNE = mat(0xd4a373, 0.98, 'ground');
  const FIG = SUN;

  const head = new THREE.Group();
  const add = (geo, m, parent = head) => { const o = new THREE.Mesh(geo, m); parent.add(o); return o; };
  const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const crect = (a, b, c) => [[a, -(b - c)], [a, b - c], [a - c, b], [-(a - c), b], [-a, b - c], [-a, -(b - c)], [-(a - c), -b], [a - c, -b]];
  // A bevel grows the outline by its size and the depth by its thickness at both ends,
  // so every outline is drawn inset by the bevel and the depth shortened by twice it.
  const extrude = (pts, depth, bev) => new THREE.ExtrudeGeometry(shape(pts), {
    depth: depth - 2 * bev, bevelEnabled: bev > 0, bevelSize: bev, bevelThickness: bev, bevelSegments: 1, curveSegments: 8,
  }).translate(0, 0, bev);
  // A course of the head: a chamfered plan (half sizes a x b, corner cut c) from y0 to y1.
  const slab = (a, b, c, y0, y1, bev, m, x = 0, z = -1.0) =>
    add(extrude(crect(a - bev, b - bev, Math.max(0.01, c - bev * 0.6)), y1 - y0, bev).rotateX(-Math.PI / 2).translate(x, y0, z), m);
  // A side silhouette in (z, y), extruded across the head's width w and centred on x.
  const side = (pts, w, bev, m) => {
    const geo = extrude(pts.map(([z, y]) => [z, y]), w, bev).rotateY(-Math.PI / 2);
    geo.translate(w / 2, 0, 0);
    return add(geo, m);
  };

  // ------------------------------------------------ upright, in the guardian's coordinates
  // the neck, sheared on a ragged line
  side([[-1.69, 9.54], [-1.69, 8.78], [-1.52, 8.66], [-1.32, 8.73], [-1.06, 8.58], [-0.84, 8.67], [-0.62, 8.61], [-0.51, 8.75], [-0.51, 9.54]], 1.3, 0.06, FIG);
  slab(0.8, 0.88, 0.26, 9.35, 9.8, 0.06, FIG, 0, -1.05);
  slab(0.93, 1.0, 0.3, 9.72, 11.12, 0.08, FIG, 0, -1.05);
  // five ribs down the back of the head as one comb-shaped plan
  {
    // plan y runs to -z once stood up: the strip sits inside the back face, the teeth stand 7 cm proud
    const comb = [[-0.72, 0.07]];
    for (let i = -2; i <= 2; i++) comb.push([i * 0.3 - 0.09, 0.07], [i * 0.3 - 0.09, 0.14], [i * 0.3 + 0.09, 0.14], [i * 0.3 + 0.09, 0.07]);
    comb.push([0.72, 0.07], [0.72, -0.03], [-0.72, -0.03]);
    add(extrude(comb, 1.35, 0.015).rotateX(-Math.PI / 2).translate(0, 9.55, -1.98), FIG);
  }

  // the mask: two outlines split by the crack, the slit notched into both
  const A = 0.86, B = 0.75, CY = 10.2, CH = 0.24, SW = 0.12, SLIT0 = 9.72, SLIT1 = 10.72, GAP = 0.07;
  const crack = [[-A, 10.44], [-0.55, 10.3], [-0.34, 10.37], [0.36, 10.15], [0.62, 10.24], [A, 10.06]];
  const crackV = (u) => {
    for (let i = 0; i < crack.length - 1; i++) {
      const [u0, v0] = crack[i], [u1, v1] = crack[i + 1];
      if (u <= u1) return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0);
    }
    return crack[crack.length - 1][1];
  };
  const inner = crack.slice(1, -1);
  const maskPiece = (upper, d) => {
    const a = A - d, b = B - d, c = CH - d * 0.6, sw = SW + d, off = GAP / 2 + d;
    const cv = (u) => crackV(u) + (upper ? off : -off);
    const edge = [[-a, cv(-a)], ...inner.filter(([u]) => u < -sw).map(([u]) => [u, cv(u)])];
    const right = [...inner.filter(([u]) => u > sw).map(([u]) => [u, cv(u)]), [a, cv(a)]];
    if (upper) {
      return [[a, cv(a)], [a, CY + b - c], [a - c, CY + b], [-(a - c), CY + b], [-a, CY + b - c],
        ...edge, [-sw, cv(-sw)], [-sw, SLIT1 + d], [sw, SLIT1 + d], [sw, cv(sw)], ...right.slice(0, -1)];
    }
    return [[-a, cv(-a)], [-a, CY - b + c], [-(a - c), CY - b], [a - c, CY - b], [a, CY - b + c],
      ...right.slice().reverse(), [sw, cv(sw)], [sw, SLIT0 - d], [-sw, SLIT0 - d], [-sw, cv(-sw)], ...edge.slice(1).reverse()];
  };
  const BEV = 0.035;
  add(extrude(maskPiece(true, BEV), 0.3, BEV).translate(0, 0, -0.1), BONE);
  add(extrude(maskPiece(false, BEV), 0.3, BEV).translate(0.01, -0.015, -0.125), BONE);
  add(extrude([[-0.2, 9.62], [0.2, 9.62], [0.2, 10.8], [-0.2, 10.8]], 0.06, 0).translate(0, 0, -0.08), BASALT);
  {
    const w = GAP / 2 + 0.06;
    add(extrude([...crack.map(([u, v]) => [u, v - w]).reverse(), ...crack.map(([u, v]) => [u, v + w])].reverse(), 0.07, 0).translate(0, 0, -0.1), SIENNA);
  }

  // headdress: tier one in three courses round a groove, its sunlit cap, then tier two
  // with its groove and a broken crown sheared on a slant that climbs to the front
  slab(1.275, 1.2, 0.14, 10.95, 11.42, 0.05, SAND);
  slab(1.155, 1.08, 0.1, 11.4, 11.57, 0, SAND);
  slab(1.275, 1.2, 0.14, 11.55, 12.0, 0.05, SAND);
  slab(1.33, 1.25, 0.05, 12.0, 12.1, 0.03, SUN);
  slab(1.0, 0.94, 0.14, 12.1, 12.5, 0.05, SAND);
  slab(0.88, 0.82, 0.1, 12.48, 12.65, 0, SAND);
  side([[-1.89, 12.68], [-0.11, 12.68], [-0.11, 12.97], [-0.3, 12.93], [-0.48, 12.99], [-0.7, 12.85], [-0.95, 12.87], [-1.15, 12.75],
    [-1.4, 12.79], [-1.62, 12.65], [-1.89, 12.69]], 2.0, 0.05, SAND);

  // the disc: a stepped lathe with a crescent inlay
  const disc = new THREE.LatheGeometry([[0, 0], [0.44, 0], [0.44, 0.21], [0.4, 0.29], [0.32, 0.29], [0.3, 0.17], [0.12, 0.17], [0.1, 0.34], [0, 0.34]]
    .map(([r, t]) => new THREE.Vector2(r, t)), 28).rotateX(Math.PI / 2).translate(0, 12.52, -0.07);
  add(disc, BONE);
  {
    const r = 0.23, pts = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.3 + 1.4 * (i / 12)); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.62 - 1.24 * (i / 10)); pts.push([r * 0.34 + r * 0.74 * Math.cos(a), r * 0.74 * Math.sin(a)]); }
    add(extrude(pts, 0.1, 0).translate(0, 12.52, 0.08), SIENNA);
  }

  // ------------------------------------------------ lay it down on the floor
  const S = 0.95, ROLL = 0.1, TILT = -0.03;
  const pose = new THREE.Group();
  head.position.set(0, -10.8, 1.0);
  pose.add(head);
  pose.scale.setScalar(S);
  const q = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
  pose.quaternion.copy(q(new THREE.Vector3(0, 0, 1), TILT).multiply(q(new THREE.Vector3(1, 0, 0), -ROLL)).multiply(q(new THREE.Vector3(0, 0, 1), Math.PI / 2)));
  g.add(pose);
  g.updateMatrixWorld(true);
  let low = Infinity;
  const w = new THREE.Vector3();
  pose.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) low = Math.min(low, w.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).y);
  });
  pose.position.y = -low;

  // ------------------------------------------------ the drift: lathed dune profiles,
  // a concave toe rising to a rounded crest, stretched into ellipses
  const dune = new THREE.LatheGeometry([[1, 0], [0.86, 0.05], [0.72, 0.17], [0.58, 0.36], [0.44, 0.6], [0.3, 0.8], [0.15, 0.93], [0, 0.97]]
    .map(([r, t]) => new THREE.Vector2(r, t)), 28);
  for (const [x, z, rx, rz, h, ry] of [[0.1, -0.95, 2.2, 0.9, 0.66, 0], [0.1, 0.9, 1.9, 0.58, 0.38, 0], [1.75, -0.1, 0.55, 1.15, 0.72, 0.2],
    [-1.75, -0.25, 0.5, 1.05, 0.5, -0.2], [1.1, 0.95, 0.7, 0.45, 0.42, 0.4]]) {
    const o = add(dune, DUNE, g);
    o.position.set(x, 0, z);
    o.scale.set(rx, h, rz);
    o.rotation.y = ry;
  }

  // --- the six lines -------------------------------------------------------
  const bx = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) bx.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = bx.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bx.min.y; o.position.z -= c.z; });
  return g;
}
