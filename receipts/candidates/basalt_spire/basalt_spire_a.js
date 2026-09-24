// basalt_spire, arm A: primitives.
// Three leaning hexagonal columns built as stacks of six-sided cylinder drums.
// Each drum tapers a little, so every columnar joint leaves a ledge that catches
// light, and each column ends in a slanted fracture with a glassy face. Ash-lilac
// streaks run along the faces that tilt towards the sky. Squat hexagonal masses
// fuse the roots, and broken stubs ring the foot.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (hex, rough) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const BASALT = mat(0x2a2830, 0.8);
  const GLASS = mat(0x2a2830, 0.28);   // fresh fracture: the same rock, glassy
  const LILAC = mat(0x8c7fa3, 0.92);

  let seed = 9001;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();

  const UP = new THREE.Vector3(0, 1, 0);
  const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh; };
  const axis = (tilt, az) => new THREE.Vector3(Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az));

  // Turn a y-up part about its own axis, tilt it onto dir, stand it at base.
  const place = (geo, base, dir, turn) => {
    geo.rotateY(turn);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
    geo.translate(base.x, base.y, base.z);
    return geo;
  };
  // Shear vertices at or above yFrom onto a plane rising with `slope` towards ang.
  const shear = (geo, yFrom, slope, ang) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < yFrom - 1e-4) continue;
      p.setY(i, p.getY(i) + slope * (p.getX(i) * Math.cos(ang) + p.getZ(i) * Math.sin(ang)));
    }
    return geo;
  };
  // A thin hexagonal plate lying exactly on a sheared hexagonal top.
  const topPlate = (r, y, slope, ang) => {
    const geo = new THREE.CylinderGeometry(r, r, 0.025, 6, 1);
    geo.translate(0, y + 0.0125, 0);
    return shear(geo, -Infinity, slope, ang);
  };

  const column = ({ base, tilt, az, len, r, drums, slope, cutAz, streaks }) => {
    const dir = axis(tilt, az);
    // CylinderGeometry(6) has a face towards +x; this turn points that face
    // away from the lean, so once tilted it is the face that looks at the sky.
    const turn = Math.PI - az;
    const hs = Array.from({ length: drums }, () => rr(0.8, 1.2));
    const k = (len + 0.6) / hs.reduce((a, b) => a + b, 0);
    let s = -0.6, rad = r;
    const spans = [];
    hs.forEach((h0, i) => {
      const h = h0 * k, rTop = rad * 0.93, at = base.clone().addScaledVector(dir, s);
      const geo = new THREE.CylinderGeometry(rTop, rad, h, 6, 1);
      geo.translate(0, h / 2, 0);
      if (i === drums - 1) {
        add(place(shear(geo, h, slope, cutAz), at, dir, turn), BASALT);
        add(place(topPlate(rTop, h, slope, cutAz), at, dir, turn), GLASS);
      } else {
        add(place(geo, at, dir, turn), BASALT);
      }
      spans.push([s, s + h, rad, rTop]);
      s += h;
      rad = rTop * 1.055;   // the next drum starts a little proud: a joint ledge
    });
    // ash-lilac streaks on the sky-facing face: tapered spindles of varying
    // width, cut per drum so each piece sits on its own drum's tapered face
    for (const [from, to, off, w] of streaks) {
      for (const [s0, s1, rb, rt] of spans) {
        const a = Math.max(from * len, s0) + rr(0, 0.15), b = Math.min(to * len, s1 - 0.02) - rr(0, 0.2);
        if (b - a < 0.2) continue;
        const apo = ((rb + rt) / 2) * Math.cos(Math.PI / 6), ww = w * rr(0.6, 1.25);
        const geo = new THREE.BoxGeometry(0.08, b - a, ww, 1, 2, 1);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i)) > 1e-4) p.setZ(i, p.getZ(i) * 0.25);
        geo.translate(apo + 0.01, (a + b) / 2, off + rr(-0.03, 0.03));
        add(place(geo, base.clone(), dir, turn), LILAC);
      }
    }
  };

  column({ base: new THREE.Vector3(-0.2, 0, 0.1), tilt: 0.12, az: 0.35, len: 9.1, r: 0.78, drums: 7, slope: 0.55, cutAz: 2.4,
    streaks: [[0.42, 0.95, 0.0, 0.22], [0.6, 0.86, -0.3, 0.1], [0.28, 0.5, 0.24, 0.09]] });
  column({ base: new THREE.Vector3(0.5, 0, -0.45), tilt: 0.24, az: -1.1, len: 6.9, r: 0.64, drums: 6, slope: 0.7, cutAz: 0.4,
    streaks: [[0.38, 0.96, 0.04, 0.18], [0.55, 0.82, -0.24, 0.08]] });
  column({ base: new THREE.Vector3(-0.55, 0, -0.5), tilt: 0.3, az: 3.7, len: 5.2, r: 0.58, drums: 5, slope: 0.45, cutAz: -1.2,
    streaks: [[0.33, 0.94, -0.02, 0.16], [0.5, 0.8, 0.2, 0.07]] });

  // squat hexagonal masses that fuse the three roots into one foot
  for (const [x, z, r, h, rot] of [[0.05, -0.2, 1.25, 1.1, 0.2], [-0.75, 0.35, 0.8, 0.7, 0.7], [0.8, 0.35, 0.72, 0.55, 1.1], [0.15, -1.05, 0.7, 0.8, 0.4]]) {
    const geo = new THREE.CylinderGeometry(r * 0.9, r, h, 6, 1);
    geo.translate(0, h / 2, 0);
    shear(geo, h, rr(-0.25, 0.25), rr(0, 6.28));
    geo.rotateY(rot);
    geo.translate(x, 0, z);
    add(geo, BASALT);
  }
  // broken stubs around the foot, some tipped over; their breaks are glassy or
  // carry a skin of settled ash
  for (const [ang, dist, r, h, tip] of [[0.3, 1.6, 0.38, 0.9, 0.1], [1.5, 1.55, 0.3, 0.45, 0.35], [2.4, 1.65, 0.42, 1.2, 0.05], [3.6, 1.55, 0.33, 0.6, 0.25], [4.6, 1.5, 0.36, 0.75, 0.15], [5.5, 1.7, 0.26, 0.35, 0.4]]) {
    const top = h - 0.15, slope = rr(0.3, 0.8), cut = rr(0, 6.28), turn = rr(0, 1);
    const geo = new THREE.CylinderGeometry(r * 0.97, r, h, 6, 1);
    geo.translate(0, h / 2 - 0.15, 0);
    shear(geo, top, slope, cut);
    const dir = axis(tip, ang);
    const base = new THREE.Vector3(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
    add(place(geo, base, dir, turn), BASALT);
    add(place(topPlate(r * 0.97, top, slope, cut), base, dir, turn), ang > 1 && ang < 2.5 ? LILAC : GLASS);
  }

  // --- flat facets, flatten what went below the ground, fix the height ------
  // Six-sided cylinders carry smooth radial normals that shade a hexagon round;
  // de-indexing and recomputing gives every facet its own flat normal.
  const bb = new THREE.Box3(), v = new THREE.Vector3();
  for (const m of g.children) {
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = geo.attributes.position;
    // tilted roots dip under y = 0: press them onto the ground plane
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
    geo.computeVertexNormals();
    m.geometry = geo;
    for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i));
  }
  // the brief fixes the height at 9 m; scale uniformly so the tallest break lands there
  const k = 9 / bb.max.y;
  for (const m of g.children) m.geometry.scale(k, k, k);

  // --- place: base on y = 0, centred on x and z -----------------------------
  // Every part is built in place, so meshes stay translation-only and the
  // loader's own bounding box agrees with the vertex bounds.
  const box = new THREE.Box3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mm.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
