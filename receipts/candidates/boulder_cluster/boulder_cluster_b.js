// boulder_cluster, candidate B (profiles): each stratum is an irregular six-facet plan
// outline extruded upward with a one-step bevel, so every slab is chamfered top and
// bottom and stacked slabs meet in a V-groove; outlines drift and swell from slab to
// slab like differential erosion, and the crown slab is tipped. The big boulder
// stands, the middle one leans into it, the small one tips against both.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true });
    m.name = 'stone';
    return m;
  };
  const SUN = mat(0xd4a373, 0.86);
  const SAND = mat(0xb57f4f, 0.92);
  const SIENNA = mat(0x8a5433, 0.95);

  let seed = 29;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const BEV = 0.08;

  // slabs: [height, scale, bevel]; a bevel grows the outline by its size and the depth by
  // twice its thickness, so each outline is drawn inset and each depth shortened to match
  const boulder = (rx, rz, slabs, mats) => {
    const b = new THREE.Group();
    const plan = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + jit(0.3), r = 1 + jit(0.18);
      return [Math.cos(a) * rx * r, Math.sin(a) * rz * r];
    });
    let y = 0;
    slabs.forEach(([h, s, bev = BEV], i) => {
      const dx = jit(0.06), dz = jit(0.06);
      const pts = plan.map(([x, z]) => {
        const len = Math.hypot(x, z), k = Math.max(0.1, (s * (1 + jit(0.06)) * len - bev) / len);
        return new THREE.Vector2(x * k + dx, z * k + dz);
      });
      const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
        depth: Math.max(0.02, h - 2 * bev), bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 1,
      });
      // shape plane (x, y) to plan (x, -z), extrusion up; the bevel starts one thickness below
      geo.rotateX(-Math.PI / 2).translate(0, y + bev, 0);
      const o = new THREE.Mesh(geo, mats[i]);
      if (i === slabs.length - 1) {
        o.position.y = y;
        o.geometry.translate(0, -y, 0);
        o.rotation.set(jit(0.14), 0, jit(0.14));
      }
      b.add(o);
      y += h;
    });
    return b;
  };
  const rest = (o) => {
    o.updateMatrixWorld(true);
    let low = Infinity;
    const v = new THREE.Vector3();
    o.traverse((m) => {
      if (!m.isMesh) return;
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) low = Math.min(low, v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).y);
    });
    o.position.y -= low;
  };

  const big = boulder(1.12, 0.93, [[0.34, 0.9, 0.06], [0.4, 1.0], [0.5, 0.93], [0.3, 1.0], [0.3, 0.93], [0.36, 0.84, 0.13]], [SIENNA, SAND, SAND, SAND, SAND, SUN]);
  big.position.set(-0.55, 0, -0.25);
  big.rotation.y = 0.3;
  g.add(big);
  const mid = boulder(0.86, 0.69, [[0.3, 0.92, 0.06], [0.36, 1.0], [0.26, 0.94], [0.32, 0.98], [0.31, 0.86, 0.12]], [SIENNA, SAND, SAND, SAND, SUN]);
  mid.position.set(1.08, 0, 0.2);
  mid.rotation.set(0, -0.4, 0.2);
  g.add(mid);
  rest(mid);
  const small = boulder(0.56, 0.47, [[0.27, 0.93, 0.05], [0.31, 1.0], [0.32, 0.88, 0.1]], [SIENNA, SAND, SUN]);
  small.position.set(0.12, 0, 1.02);
  small.rotation.set(-0.26, 0.8, 0);
  g.add(small);
  rest(small);
  for (const [x, z, r] of [[-1.55, 0.55, 0.17], [1.75, -0.55, 0.14], [0.95, 1.2, 0.11], [-0.2, 1.25, 0.09]]) {
    const o = boulder(r * 1.2, r, [[r * 1.1, 1, 0.03]], [rnd() > 0.5 ? SAND : SIENNA]);
    o.position.set(x, 0, z);
    o.rotation.y = rnd() * 6;
    g.add(o);
  }

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
