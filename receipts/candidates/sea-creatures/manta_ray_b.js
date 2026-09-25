// manta_ray, arm B: hub and panels.
// A manta about 1m across, nose to +z, built from a different part breakdown than a single
// swept planform: a round, domed hub (a LatheGeometry, thin and lens-shaped) for the head and
// gill region, and two flat swept wing panels (THREE.Shape curves stood upright) attached at
// its flanks, curved on the leading edge and straighter on the trailing edge, tapering to a
// point at |x| = 0.5 and tilted up a few degrees for a shallow dihedral. Dark slate on top,
// with a second, smaller pale hub and pair of under-wing panels beneath for the belly, two
// cephalic fins rolled forward at the head, eyes at the sides and a thin whip tail behind. The
// game's vertex shader flaps the wings by distance from the middle along x. The game never
// recolours the manta (see atlantis.js `swimmers()`: only swimmers handed a colour are
// tinted, and mantas are not), so both skin tones are used exactly as authored.
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

  const ray = new THREE.Group();
  g.add(ray);

  const TOP = mat(0x2e4150, 0.55, 'skin', { side: THREE.DoubleSide });
  const BELLY = mat(0xe6e8e4, 0.5, 'skinBelly', { side: THREE.DoubleSide });
  const EYE = mat(0x0b0e12, 0.25, 'eye', { metalness: 0.1 });

  const put = (geo, m, x, y, z, parent = ray) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  // --- the hub: a thin, lens-shaped body of revolution for the head and gill region ---
  const hubProfile = [
    [0.0, -0.034],
    [0.09, -0.03],
    [0.15, -0.012],
    [0.165, 0.01],
    [0.15, 0.026],
    [0.09, 0.033],
    [0.0, 0.037],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const hubGeo = new THREE.LatheGeometry(hubProfile, 16);
  put(hubGeo, TOP, 0, 0, 0.15);
  const hubBellyGeo = new THREE.LatheGeometry(
    hubProfile.map((p) => new THREE.Vector2(p.x * 0.86, p.y * 0.7 - 0.02)),
    16,
  );
  put(hubBellyGeo, BELLY, 0, 0, 0.15);

  // --- wing panels: flat swept shapes, drawn as if seen from above (x = span, y = "how far
  // back", becomes world z once stood upright), attached along the hub's flank. ---
  const shapeFrom = (pts) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else s.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    }
    s.closePath();
    return s;
  };
  const scalePts = (pts, sx, sy) => pts.map((p) => p.map((n, i) => (i % 2 === 0 ? n * sx : n * sy)));
  // The leading edge meets the trailing edge at the tip with sharply different tangents (a
  // steep approach, then a near-flat departure) so it reads as an actual point; matched
  // tangents there first rendered as a rounded oval with no visible wingtip.
  const WING = [
    [0.12, 0.32],
    [0.33, 0.4, 0.5, 0.07],
    [0.3, -0.02, 0.14, -0.24],
    [0.18, 0.04, 0.12, 0.32],
  ];
  const wingMesh = (pts, m, curveSeg, s, y0, dihedral) => {
    const geo = new THREE.ShapeGeometry(shapeFrom(scalePts(pts, s, 1)), curveSeg);
    geo.rotateX(Math.PI / 2);
    const o = new THREE.Mesh(geo, m);
    o.position.set(0, y0, 0.02);
    o.rotation.z = -s * dihedral;
    ray.add(o);
    return o;
  };
  // belly wings are a uniformly smaller copy (both span and length), well clear of the top
  // wings, so a rotated tip cannot cross past the darker layer above it
  for (const s of [-1, 1]) {
    wingMesh(WING, TOP, 7, s, 0.012, 0.05);
    wingMesh(scalePts(WING, 0.84, 0.84), BELLY, 6, s, -0.03, 0.05);
  }

  // cephalic fins: small curved tubes reaching forward from the front of the head, levelling
  // out rather than rising, with only a slight downward curl at the tip
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.09, 0.008, 0.3),
      new THREE.Vector3(s * 0.115, 0.02, 0.365),
      new THREE.Vector3(s * 0.108, 0.006, 0.405),
      new THREE.Vector3(s * 0.09, -0.012, 0.42),
    ]);
    put(new THREE.TubeGeometry(curve, 10, 0.011, 6, false), TOP, 0, 0, 0);
  }

  // eyes, at the sides of the head
  for (const s of [-1, 1]) put(new THREE.SphereGeometry(0.02, 7, 5), EYE, s * 0.145, 0.0, 0.25);

  // a thin whip tail trailing behind the hub
  const tail = new THREE.CylinderGeometry(0.004, 0.016, 0.46, 6).rotateX(Math.PI / 2);
  put(tail, TOP, 0, -0.004, -0.35);

  // --- normalise: base at y=0, centred on x and z, per the asset contract ---
  ray.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  ray.traverse((n) => {
    if (!n.isMesh) return;
    const p = n.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  const c = box.getCenter(new THREE.Vector3());
  ray.position.set(-c.x, -box.min.y, -c.z);

  return g;
}
