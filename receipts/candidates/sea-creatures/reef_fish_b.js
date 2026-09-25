// reef_fish, arm B: primitive, reshaped.
// A tropical reef fish about 1m long, nose to +z: a deep, laterally compressed body built by
// reshaping a sphere (elongating it, then pinching the tail end into a narrow peduncle and the
// front into a pointed snout by moving its own vertices, not by sweeping a profile), the same
// forked tail fin with a dark trailing edge, tall dorsal and anal fins, small pectoral fins,
// eyes with a slate ring and dark pupil, a small dark mouth, and three dark bands wrapping the
// body in a separate material. Pale body so the game can tint each fish of a shoal gold,
// silver, blue or coral; the game's vertex shader beats the tail (z below the middle,
// strongest near z=-0.55) and swims the fish nose-first along +z.
//
// The game recolours ANY material whose HSL lightness is above 0.5 (see atlantis.js
// `swimmers()`), not just "the palest" one, so every non-body material here (bands, eye ring,
// pupil, fin edge) is kept at or below 0.5 lightness on purpose, or a tint would silently
// swallow it and the bands would vanish into the body colour.
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

  const SCALES = mat(0xd6e2e8, 0.38, 'scales', { metalness: 0.15, side: THREE.DoubleSide });
  const INK = mat(0x1a2030, 0.55, 'bands', { side: THREE.DoubleSide });
  const RING = mat(0x5c6b74, 0.4, 'eyeRing');
  const PUPIL = mat(0x0a0d10, 0.25, 'pupil', { metalness: 0.1 });

  const put = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, parent = fish) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    if (rx || ry || rz) o.rotation.set(rx, ry, rz);
    parent.add(o);
    return o;
  };

  // --- body: a sphere, elongated, then reshaped by moving its own vertices along the length
  // axis: a pinched peduncle at the tail and a drawn-out, tapered snout at the nose. A
  // different construction from arm A's swept profile, not a re-scale of the same idea. ---
  const bodyGeo = new THREE.SphereGeometry(0.2, 12, 9);
  {
    const pos = bodyGeo.attributes.position;
    const v = new THREE.Vector3();
    const clamp01 = THREE.MathUtils.clamp,
      lerp = THREE.MathUtils.lerp;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const t = v.z / 0.2; // -1 (tail pole) .. 1 (nose pole) on the source sphere
      let shrink = 1;
      if (t < -0.4) shrink = lerp(1, 0.22, clamp01((-0.4 - t) / 0.55, 0, 1)); // peduncle pinch
      if (t > 0.55) shrink *= lerp(1, 0.08, clamp01((t - 0.55) / 0.45, 0, 1)); // snout taper
      const z = v.z * 2.75 + (t > 0.55 ? (t - 0.55) * 0.16 : 0); // draw the snout out further
      pos.setXYZ(i, v.x * shrink, v.y * shrink, z);
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();
  }
  bodyGeo.scale(0.44, 1.05, 1);
  bodyGeo.translate(0, 0, -0.03);
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

  // dorsal fin
  finMesh(
    [
      [0.16, 0.17],
      [0.06, 0.31, -0.02, 0.38],
      [-0.1, 0.36, -0.17, 0.29, -0.22, 0.2],
      [-0.03, 0.18, 0.16, 0.17],
    ],
    SCALES,
  );
  // anal fin
  finMesh(
    [
      [0.02, -0.16],
      [-0.05, -0.27, -0.11, -0.3],
      [-0.17, -0.27, -0.21, -0.18],
      [-0.11, -0.17, 0.02, -0.16],
    ],
    SCALES,
  );
  // pectoral fins
  for (const s of [-1, 1]) {
    const geo = new THREE.ShapeGeometry(
      shape2([
        [0.22, 0.02],
        [0.11, -0.03, 0.03, -0.1],
        [0.13, -0.13, 0.22, -0.12],
        [0.25, -0.05, 0.22, 0.02],
      ]),
      3,
    );
    geo.rotateY(Math.PI / 2);
    put(geo, SCALES, s * 0.082, 0.0, 0, 0, s * 0.5, 0);
  }
  // tail fin: pale centre with a dark trailing edge cut as a ring around it, so the two
  // layers never overlap
  const tailPale = [
    [-0.29, 0.03],
    [-0.43, 0.14, -0.56, 0.19],
    [-0.48, 0.09, -0.41, 0.0],
    [-0.48, -0.09, -0.56, -0.19],
    [-0.43, -0.14, -0.29, -0.03],
  ];
  const tailDark = [
    [-0.29, 0.03],
    [-0.46, 0.16, -0.62, 0.215],
    [-0.52, 0.1, -0.44, 0.0],
    [-0.52, -0.1, -0.62, -0.215],
    [-0.46, -0.16, -0.29, -0.03],
  ];
  finMesh(tailPale, SCALES);
  {
    const dark = shape2(tailDark);
    dark.holes.push(path2(tailPale));
    const geo = new THREE.ShapeGeometry(dark, 4);
    geo.rotateY(Math.PI / 2);
    put(geo, INK, 0, 0, 0);
  }

  // --- three dark bands wrapping the body, as thin open shells hugging the surface. Radii
  // matched by eye to the reshaped body at each z, not read off a profile array this time. ---
  for (const [z, r] of [
    [0.22, 0.165],
    [0.04, 0.195],
    [-0.16, 0.115],
  ]) {
    const bandGeo = new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.045, 9, 1, true);
    bandGeo.rotateX(Math.PI / 2);
    bandGeo.scale(0.44, 1.05, 1);
    put(bandGeo, INK, 0, 0, z);
  }

  // --- eyes and a small dark mouth ---
  for (const s of [-1, 1]) {
    put(new THREE.SphereGeometry(0.029, 5, 4), RING, s * 0.075, 0.115, 0.3);
    put(new THREE.SphereGeometry(0.017, 4, 3), PUPIL, s * 0.088, 0.115, 0.305);
  }
  put(new THREE.BoxGeometry(0.03, 0.018, 0.02), INK, 0, -0.02, 0.42);

  // --- normalise: base at y=0, centred on x and z, per the asset contract ---
  fish.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v3 = new THREE.Vector3();
  fish.traverse((n) => {
    if (!n.isMesh) return;
    const p = n.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v3.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  const c = box.getCenter(new THREE.Vector3());
  fish.position.set(-c.x, -box.min.y, -c.z);

  return g;
}
