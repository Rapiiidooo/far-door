// manta_ray, arm A: extruded planform.
// A manta about 1m across, nose to +z: a true manta planform cut as a thin ExtrudeGeometry of
// a THREE.Shape with bezier curves (broad head, curved leading edges sweeping back to pointed
// wingtips, a straighter trailing edge, a small bevel) and pushed into a gentle dome across the
// span by a vertex edit, dark slate on top and a second, slightly smaller pale layer
// underneath for the belly, two cephalic fins rolled forward at the head's corners (a curved
// tube, not a straight horn), eyes at the sides of the head and a thin whip tail behind. The
// game's vertex shader flaps the wings by distance from the middle along x, so the wingtips
// sit at |x| = 0.5. The game never recolours the manta (see atlantis.js `swimmers()`: it only
// tints swimmers that were handed a colour, and mantas are not), so both skin tones are used
// exactly as authored.
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

  // --- the planform, drawn as if seen from directly above: x is the wing span, y here is
  // "how far back from the nose" and becomes world z once the extrude is stood upright. Nose
  // is a broad, gently convex margin between the head corners; the leading edges sweep back
  // to pointed wingtips at |x| = 0.5; the trailing edges run back in, straighter, to a rounded
  // rear margin where the tail attaches. ---
  // The trailing edge meets the leading edge at each wingtip with sharply DIFFERENT
  // tangents (a shallow, near-straight approach into the tip, then a steep departure back
  // toward the nose) so the tip reads as an actual point rather than a smoothed-through
  // curve; a first version used near-continuous tangents there and the whole wing rendered
  // as a rounded oval blob with no visible tip at all.
  const OUTLINE = [
    [0, -0.28],
    [0.09, -0.3, 0.17, -0.23],
    [0.4, 0.08, 0.5, 0.1],
    [0.5, 0.32, 0.37, 0.47, 0.19, 0.42],
    [0, 0.5, -0.19, 0.42],
    [-0.37, 0.47, -0.5, 0.32, -0.5, 0.1],
    [-0.4, 0.08, -0.17, -0.23],
    [-0.09, -0.3, 0, -0.28],
  ];
  const scaleAbout = (pts, s, cx, cy) =>
    pts.map((p) => p.map((n, i) => (i % 2 === 0 ? cx + (n - cx) * s : cy + (n - cy) * s)));
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
  // a gentle vaulted dome across the span: the middle rides a little higher than the tips,
  // falling off faster than a parabola so the outer wing stays thin and flat like a real
  // manta's and only the body over the gills is domed
  const dome = (geo, amount, half) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = Math.pow(1 - Math.min(1, (p.getX(i) / half) ** 2), 2);
      p.setY(i, p.getY(i) + amount * f);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };

  // top layer: a real extrude with a small bevel, for a rounded rim
  const topGeo = new THREE.ExtrudeGeometry(shapeFrom(OUTLINE), {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.007,
    bevelSize: 0.007,
    bevelSegments: 2,
    curveSegments: 7,
  });
  topGeo.translate(0, 0, -0.025);
  topGeo.rotateX(Math.PI / 2);
  dome(topGeo, 0.038, 0.22);
  put(topGeo, TOP, 0, 0, 0);

  // belly: a second, slightly smaller flat layer underneath, riding the same dome
  const bellyGeo = new THREE.ShapeGeometry(shapeFrom(scaleAbout(OUTLINE, 0.92, 0, 0.08)), 7);
  bellyGeo.rotateX(Math.PI / 2);
  dome(bellyGeo, 0.038, 0.22);
  put(bellyGeo, BELLY, 0, -0.065, 0);

  // cephalic fins: small curved tubes reaching forward from the head's corners, levelling
  // out rather than rising, with only a slight downward curl at the very tip
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.15, 0.006, 0.405),
      new THREE.Vector3(s * 0.18, 0.016, 0.47),
      new THREE.Vector3(s * 0.175, 0.006, 0.515),
      new THREE.Vector3(s * 0.155, -0.012, 0.535),
    ]);
    const tube = new THREE.TubeGeometry(curve, 10, 0.011, 6, false);
    put(tube, TOP, 0, 0, 0);
  }

  // eyes, at the sides of the head
  for (const s of [-1, 1]) put(new THREE.SphereGeometry(0.02, 7, 5), EYE, s * 0.19, 0.0, 0.365);

  // a thin whip tail trailing behind the rear margin
  const tail = new THREE.CylinderGeometry(0.004, 0.016, 0.42, 6).rotateX(Math.PI / 2);
  put(tail, TOP, 0, -0.006, -0.51);

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
