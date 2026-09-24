// brazier, candidate C: a second reading. The bowl's underside steps in two tiers
// under a rolled rim (one lathe with crisp risers); each leg is a flat cast strap
// drawn as a side silhouette, with a tab under the bowl and a flared paw, and
// extruded sideways; stepped disc feet, a banded ring brace, a pendant boss where
// the tabs meet, and a heaped pile of angular coals. 1.1 m tall, 0.8 m across.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });
  const COAL = mat(0x3a3531, 'stone', { roughness: 0.95 });
  const EMBER = mat(0x8a5433, 'stone', { roughness: 0.95 });

  const add = (geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  // Lathe from [r, y, sharp] rows (outward along a bottom, up a side, inward along
  // a top). Sharp rows are doubled for a crisp corner; the zero-area strips that
  // leaves, and those at the axis, are dropped.
  const lathe = (rows, seg) => {
    const pts = [];
    for (const [r, y, sharp] of rows) {
      pts.push(new THREE.Vector2(r, y));
      if (sharp) pts.push(new THREE.Vector2(r, y));
    }
    const geo = new THREE.LatheGeometry(pts, seg);
    const p = geo.attributes.position, idx = geo.index.array, keep = [];
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
    for (let i = 0; i < idx.length; i += 3) {
      va.fromBufferAttribute(p, idx[i]); vb.fromBufferAttribute(p, idx[i + 1]); vc.fromBufferAttribute(p, idx[i + 2]);
      if (vb.sub(va).cross(vc.sub(va)).lengthSq() > 1e-14) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    geo.setIndex(keep);
    return geo;
  };

  // --- bowl: two-step underside, rolled rim, inner dish -------------------------
  const bead = [];
  for (const deg of [-120, -90, -45, 0, 45, 90, 135, 180]) {
    const a = (deg * Math.PI) / 180;
    bead.push([0.358 + 0.042 * Math.cos(a), 1.058 + 0.042 * Math.sin(a)]);   // outer edge 0.8 m across
  }
  add(lathe([
    [0, 0.866], [0.1, 0.866, 1], [0.1, 0.88, 1], [0.19, 0.893, 1], [0.19, 0.907, 1], [0.26, 0.928],
    [0.305, 0.958], [0.33, 0.995],
    ...bead,
    [0.31, 1.035], [0.285, 1.0], [0.245, 0.966], [0.19, 0.938], [0.12, 0.918], [0.05, 0.909], [0, 0.907],
  ], 40), BRONZE);
  // pendant boss where the three leg tabs meet
  add(lathe([[0, 0.79], [0.028, 0.795], [0.045, 0.812, 1], [0.045, 0.83, 1], [0.07, 0.845], [0.07, 0.868]], 20), BRONZE);

  // --- legs: side silhouettes extruded 5 cm wide ------------------------------------
  // Centre line in (r, y); the strap is 4.4 cm thick in the silhouette. The bevel
  // grows the outline by b, so it is drawn b inside.
  const b = 0.008, h = 0.022 - b, W = 0.05;
  const spine = new THREE.SplineCurve([[0.13, 0.852], [0.17, 0.66], [0.23, 0.4], [0.29, 0.16], [0.325, 0.06]]
    .map(([r, y]) => new THREE.Vector2(r, y))).getPoints(12);
  const outer = [], inner = [];
  spine.forEach((p, i) => {
    const q = spine[Math.min(i + 1, spine.length - 1)], o = spine[Math.max(i - 1, 0)];
    const t = new THREE.Vector2().subVectors(q, o).normalize();
    const n = new THREE.Vector2(-t.y, t.x);   // points outward, away from the axis
    outer.push(p.clone().addScaledVector(n, h));
    inner.push(p.clone().addScaledVector(n, -h));
  });
  const leg = new THREE.Shape();
  leg.moveTo(0.26 + b, 0.03 + b);             // paw: a flat pad resting on the foot at y 0.03
  leg.lineTo(0.39 - b, 0.03 + b);
  leg.lineTo(0.39 - b, 0.052);
  for (let i = outer.length - 1; i >= 0; i--) leg.lineTo(outer[i].x, outer[i].y);
  leg.lineTo(0.18 - b, 0.885 - b);            // tab up into the bowl's underside, back to the boss
  leg.lineTo(0.05 + b, 0.885 - b);
  leg.lineTo(0.05 + b, 0.838 + b);
  for (let i = 0; i < inner.length; i++) leg.lineTo(inner[i].x, inner[i].y);
  leg.lineTo(0.26 + b, 0.052);
  const legGeo = new THREE.ExtrudeGeometry(leg, { depth: W - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1 });
  legGeo.translate(0, 0, -(W - 2 * b) / 2);
  const foot = lathe([[0, 0], [0.064, 0, 1], [0.064, 0.016, 1], [0.048, 0.016, 1], [0.048, 0.03, 1], [0, 0.03]], 22);
  const FR = 0.335;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    // rotation.y = a - PI/2 turns the silhouette's +x (radial) to (sin a, 0, cos a)
    const l = add(legGeo, BRONZE);
    l.rotation.y = a - Math.PI / 2;
    add(foot, BRONZE, FR * Math.sin(a), 0, FR * Math.cos(a));
  }
  // ring brace: a banded hoop through the straps at 0.4 m
  const rb = 0.23;
  add(lathe([[rb - 0.012, 0.378], [rb + 0.014, 0.378, 1], [rb + 0.014, 0.422, 1], [rb - 0.012, 0.422, 1], [rb - 0.012, 0.378]], 40), BRONZE);

  // --- coals: a heaped pile of angular lumps on a low base -----------------------
  add(lathe([[0.25, 0.962], [0.18, 0.966], [0.1, 0.972], [0, 0.975]], 24), COAL);
  const pile = [
    [0, 0, 0.05, 0.99], [0.09, 0.4, 0.048, 0.982], [0.09, 2.5, 0.046, 0.982], [0.09, 4.5, 0.05, 0.98],
    [0.17, 1.2, 0.045, 0.972], [0.17, 2.2, 0.04, 0.972], [0.17, 3.3, 0.045, 0.97], [0.17, 4.3, 0.04, 0.972],
    [0.17, 5.4, 0.044, 0.97], [0.17, 0.15, 0.04, 0.972], [0.05, 3.4, 0.04, 0.99],
  ];
  pile.forEach(([r, a, s, y], i) => {
    const geo = i % 2 ? new THREE.OctahedronGeometry(s, 0) : new THREE.DodecahedronGeometry(s, 0);
    const l = add(geo, i % 4 === 2 ? EMBER : COAL, r * Math.sin(a), y, r * Math.cos(a));
    l.rotation.set(a * 1.1 + i, a * 0.6, a * 1.9);
  });
  const flameY = 0.99 + 0.05 + 0.02;   // 2 cm above the top lump

  // --- placement: base on y = 0, centred on x and z ----------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const ctr = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= box.min.y; o.position.z -= ctr.z; });

  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.flame = [r3(-ctr.x), r3(flameY - box.min.y), r3(-ctr.z)];
  return g;
}
