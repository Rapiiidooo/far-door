// reef_fish, arm A: lathe profile.
// A tropical reef fish about 1m long, nose to +z: a smooth, deep, laterally compressed body
// swept from a profile (LatheGeometry), a forked tail fin with a dark trailing edge, a tall
// swept dorsal fin and a matching anal fin as flat swept shapes, small angled pectoral fins at
// the sides, eyes with a slate ring and a dark pupil, a small dark mouth, and three dark bands
// wrapping the body in a separate material. Pale body so the game can tint each fish of a
// shoal gold, silver, blue or coral; the game's vertex shader beats the tail (z below the
// middle, strongest near z=-0.55) and swims the fish nose-first along +z.
//
// The game recolours ANY material whose HSL lightness is above 0.5 (see atlantis.js
// `swimmers()`), not just "the palest" one, so every non-body material here (bands, eye ring,
// pupil, fin edge) is kept at or below 0.5 lightness on purpose, or a white/gold/blue tint
// would silently swallow it and the bands would vanish into the body colour.
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
  const glow = new THREE.Group();
  g.add(glow);
  g.userData.parts = { glow };

  const fish = new THREE.Group();
  g.add(fish);

  const SCALES = mat(0xd6e2e8, 0.38, 'scales', { metalness: 0.15, side: THREE.DoubleSide }); // L=0.88, tinted
  const INK = mat(0x1a2030, 0.55, 'bands', { side: THREE.DoubleSide }); // L=0.15, stays put
  const RING = mat(0x5c6b74, 0.4, 'eyeRing'); // L=0.41, stays put
  const PUPIL = mat(0x0a0d10, 0.25, 'pupil', { metalness: 0.1 }); // near-black, stays put

  const put = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, parent = fish) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    if (rx || ry || rz) o.rotation.set(rx, ry, rz);
    parent.add(o);
    return o;
  };

  // --- body: a profile revolved around its own axis, laid along z, then flattened side to
  // side for the compressed, deep-bodied look of a reef fish. Tapers to a point at both the
  // nose and the peduncle so the lathe closes cleanly with no open ends. ---
  const profile = [
    [0.0, -0.34], [0.05, -0.28], [0.1, -0.18], [0.15, -0.06], [0.185, 0.06],
    [0.195, 0.14], [0.175, 0.24], [0.13, 0.32], [0.075, 0.39], [0.03, 0.44], [0.0, 0.47],
  ].map(([r, z]) => new THREE.Vector2(r, z));
  const bodyGeo = new THREE.LatheGeometry(profile, 9);
  bodyGeo.rotateX(Math.PI / 2);
  bodyGeo.scale(0.43, 1.28, 1);
  bodyGeo.computeVertexNormals();
  put(bodyGeo, SCALES, 0, 0, 0);

  // --- fins: flat swept shapes in the fish's own mid-plane, drawn as (z, y) curves then
  // stood upright by turning the shape's own plane through 90 degrees. ---
  const shape2 = (pts) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 2) s.lineTo(p[0], p[1]);
      else if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else s.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    }
    s.closePath();
    return s;
  };
  const path2 = (pts) => {
    const s = new THREE.Path();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 2) s.lineTo(p[0], p[1]);
      else if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else s.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    }
    s.closePath();
    return s;
  };
  const finMesh = (pts, m, x = 0, ry = 0) => {
    const geo = new THREE.ShapeGeometry(shape2(pts), 4);
    geo.rotateY(Math.PI / 2);
    return put(geo, m, x, 0, 0, 0, ry, 0);
  };

  // dorsal fin: tall, raked back, along the top of the body
  finMesh(
    [
      [0.2, 0.19],
      [0.1, 0.34, 0.02, 0.42],
      [-0.08, 0.4, -0.16, 0.32, -0.22, 0.22],
      [-0.02, 0.2, 0.2, 0.19],
    ],
    SCALES,
  );
  // anal fin: shorter, under the belly, set back toward the tail
  finMesh(
    [
      [0.05, -0.18],
      [-0.02, -0.3, -0.09, -0.33],
      [-0.16, -0.3, -0.2, -0.2],
      [-0.1, -0.19, 0.05, -0.18],
    ],
    SCALES,
  );
  // pectoral fins: small, angled back, at the sides just behind the head
  for (const s of [-1, 1]) {
    const geo = new THREE.ShapeGeometry(
      shape2([
        [0.26, 0.03],
        [0.14, -0.02, 0.05, -0.1],
        [0.16, -0.14, 0.26, -0.14],
        [0.28, -0.06, 0.26, 0.03],
      ]),
      3,
    );
    geo.rotateY(Math.PI / 2);
    put(geo, SCALES, s * 0.085, 0.0, 0, 0, s * 0.5, 0);
  }
  // tail fin: forked, pale centre with a dark trailing edge cut as a ring (a hole the exact
  // shape of the pale fin), so the two layers never overlap and never z-fight.
  const talePale = [
    [-0.31, 0.035],
    [-0.46, 0.15, -0.6, 0.21],
    [-0.51, 0.1, -0.43, 0.0],
    [-0.51, -0.1, -0.6, -0.21],
    [-0.46, -0.15, -0.31, -0.035],
  ];
  const tailDark = [
    [-0.31, 0.035],
    [-0.49, 0.17, -0.66, 0.235],
    [-0.55, 0.11, -0.46, 0.0],
    [-0.55, -0.11, -0.66, -0.235],
    [-0.49, -0.17, -0.31, -0.035],
  ];
  finMesh(talePale, SCALES);
  {
    const dark = shape2(tailDark);
    dark.holes.push(path2(talePale));
    const geo = new THREE.ShapeGeometry(dark, 4);
    geo.rotateY(Math.PI / 2);
    put(geo, INK, 0, 0, 0);
  }

  // --- three dark bands wrapping the body, as thin open shells hugging the surface ---
  for (const [z, r] of [
    [0.24, 0.175],
    [0.06, 0.185],
    [-0.18, 0.1],
  ]) {
    const bandGeo = new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.045, 9, 1, true);
    bandGeo.rotateX(Math.PI / 2);
    bandGeo.scale(0.43, 1.28, 1);
    put(bandGeo, INK, 0, 0, z);
  }

  // --- eyes: a slate ring with a near-black pupil riding just outside it, at the sides of
  // the head --- and a small dark mouth at the tip of the nose.
  for (const s of [-1, 1]) {
    put(new THREE.SphereGeometry(0.03, 5, 4), RING, s * 0.075, 0.13, 0.33);
    put(new THREE.SphereGeometry(0.017, 4, 3), PUPIL, s * 0.09, 0.13, 0.335);
  }
  put(new THREE.BoxGeometry(0.03, 0.018, 0.02), INK, 0, -0.02, 0.465);

  // --- normalise: base at y=0, centred on x and z, per the asset contract ---
  fish.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  fish.traverse((n) => {
    if (!n.isMesh) return;
    const p = n.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  const c = box.getCenter(new THREE.Vector3());
  fish.position.set(-c.x, -box.min.y, -c.z);

  return g;
}
