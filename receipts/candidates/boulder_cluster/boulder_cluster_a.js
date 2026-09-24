// boulder_cluster, candidate A (primitives): every boulder is a stack of strata, each
// layer three seven-sided cylinder frusta (a chamfer in, the body, a chamfer out) with
// its own turn, stretch and drift, so the chamfers of neighbouring layers meet in a
// groove. Flat shading keeps the facets. The big boulder stands, the middle one leans
// into it, the small one tips against both; dodecahedra for the loose stones.
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

  let seed = 17;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const SEG = 7, C = 0.09;

  // layers: [height, radius scale]; the crown gets a steeper chamfer and a tilted top
  const boulder = (rx, rz, layers, mats) => {
    const b = new THREE.Group();
    let y = 0;
    layers.forEach(([h, s], i) => {
      const layer = new THREE.Group();
      const top = i === layers.length - 1;
      const r = 1 * s, c = C / Math.max(rx, rz);
      const frustum = (r0, r1, hh, yy) => {
        const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, hh, SEG), mats[i]);
        o.position.y = yy + hh / 2;
        layer.add(o);
      };
      const ch = Math.min(C, h * 0.3), crown = top ? h * 0.35 : ch;
      frustum(r - (i === 0 ? c * 0.6 : c), r, ch, 0);
      frustum(r, r * 0.99, h - ch - crown, ch);
      frustum(r * 0.99, top ? r * 0.62 : r - c, crown, h - crown);
      layer.position.set(jit(0.05), y, jit(0.05));
      layer.rotation.set(top ? jit(0.12) : jit(0.015), rnd() * Math.PI, top ? jit(0.12) : jit(0.015));
      layer.scale.set(rx * (1 + jit(0.05)), 1, rz * (1 + jit(0.05)));
      b.add(layer);
      y += h;
    });
    return b;
  };
  // lift a tipped stone so its lowest corner touches the floor
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

  const big = boulder(1.12, 0.93, [[0.33, 0.9], [0.4, 1.0], [0.48, 0.94], [0.29, 1.0], [0.34, 0.93], [0.36, 0.85]], [SIENNA, SAND, SAND, SAND, SAND, SUN]);
  big.position.set(-0.55, 0, -0.25);
  big.rotation.y = 0.3;
  g.add(big);
  const mid = boulder(0.86, 0.69, [[0.31, 0.92], [0.34, 1.0], [0.25, 0.95], [0.34, 0.97], [0.31, 0.86]], [SIENNA, SAND, SAND, SAND, SUN]);
  mid.position.set(1.08, 0, 0.2);
  mid.rotation.set(0, -0.4, 0.2);
  g.add(mid);
  rest(mid);
  const small = boulder(0.56, 0.47, [[0.27, 0.93], [0.31, 1.0], [0.32, 0.9]], [SIENNA, SAND, SUN]);
  small.position.set(0.12, 0, 1.02);
  small.rotation.set(-0.26, 0.8, 0);
  g.add(small);
  rest(small);
  for (const [x, z, r] of [[-1.55, 0.55, 0.17], [1.75, -0.55, 0.14], [0.95, 1.2, 0.11], [-0.2, 1.25, 0.09]]) {
    const o = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rnd() > 0.5 ? SAND : SIENNA);
    o.position.set(x, r * 0.5, z);
    o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    o.scale.set(1.2, 0.75, 1);
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
