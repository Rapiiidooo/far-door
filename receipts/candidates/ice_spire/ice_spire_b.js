// ice_spire, arm B: profiles.
// Every crystal is a stack of twelve-segment lathes turned about its own axis, and the
// twelve vertices of each ring are then pulled into pairs either side of six corners, so
// the cross-section is a hexagon with bevelled edges. The profiles carry the form: a
// snug frost sleeve with a bevelled top, a tapering shaft, and a two-tier tip (a shoulder
// of short facets under a long point). Lathes split by angle give the faces that look down
// along the lean deep ice and the upper tip facets glacier white. The mound is a lathed
// bell of frost slate whose rings are jittered into lumps, with its crown lathed
// separately as a snow cap that shares the jittered edge.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (hex, rough, name) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
    if (name) m.name = name;
    return m;
  };
  // Ice has no recipe in the contract's list, so its materials stay unnamed; the game
  // gives ice its gloss and translucency at load.
  const ICE = mat(0xa9d2e3, 0.35);
  const DEEP = mat(0x5b9bbd, 0.4);
  const FROST = mat(0xe9f2f6, 0.85);
  const SLATE = mat(0x3d4654, 0.9, 'stone');

  let seed = 90210;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const D = Math.PI / 180, UP = new THREE.Vector3(0, 1, 0);
  const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh; };
  const lathe = (pts, seg, from, len) =>
    new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, from, len);

  // --- the mound: a bell profile, jittered, the crown split off as snow --------------------
  const R = 1.3, H = 0.64;
  const bell = (rho) => H * Math.pow(Math.max(0, 1 - (rho / R) ** 2), 1.3);
  const SNOW_EDGE = 0.9;
  {
    const ring = [0, 0.3, 0.6, SNOW_EDGE, 1.06, 1.18, 1.26, R];
    const rock = lathe(ring.slice(3).map((r) => [r, bell(r)]).reverse(), 13, 0.2, Math.PI * 2);
    // the snow sits 2 cm proud of the rock inside its edge ring
    const snow = lathe(ring.slice(0, 4).map((r) => [r, bell(r) + (r < SNOW_EDGE ? 0.02 : 0)]).reverse(), 13, 0.2, Math.PI * 2);
    // one jitter per welded vertex, shared by both lathes so the snow edge stays closed
    const seen = new Map();
    for (const geo of [rock, snow]) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
        if (!seen.has(key)) {
          // the snow edge swings in and out much further than the other rings, so the snow
          // lies in lobes; the bounds keep every ring inside the next one, so nothing folds
          const rho = Math.hypot(p.getX(i), p.getZ(i)), onEdge = Math.abs(rho - SNOW_EDGE) < 0.01;
          const k = rho > 1e-3 ? (onEdge ? rr(0.8, 1.08) : rr(0.94, 1.06)) : 1;
          const edge = onEdge ? rr(-0.08, 0.1) : 0;
          seen.set(key, [p.getX(i) * k, p.getY(i) > 1e-3 ? p.getY(i) * rr(0.86, 1.12) + edge : 0, p.getZ(i) * k]);
        }
        p.setXYZ(i, ...seen.get(key));
      }
    }
    add(rock, SLATE);
    add(snow, FROST);
  }
  // a few lathed stones at the foot, five-sided, their upper rings jittered (welded, so
  // the apex stays one point)
  for (const [az, rho, r, h] of [[35, 1.08, 0.24, 0.2], [140, 1.1, 0.2, 0.17], [205, 1.05, 0.27, 0.23], [300, 1.1, 0.22, 0.18]]) {
    const geo = lathe([[r * 0.92, 0], [r, h * 0.45], [r * 0.7, h * 0.92], [0, h]], 5, rr(0, 1), Math.PI * 2);
    const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!seen.has(key)) seen.set(key, p.getY(i) > 0.5 * h ? p.getY(i) * rr(0.8, 1.15) : p.getY(i));
      p.setY(i, seen.get(key));
    }
    geo.translate(Math.sin(az * D) * rho, 0, Math.cos(az * D) * rho);
    add(geo, SLATE);
  }

  // --- the crystals -------------------------------------------------------------------------
  // 12-segment lathes start 15 degrees before the lean direction, so their vertices sit
  // 15 degrees either side of six corners; this pulls each pair to CH either side instead
  // and onto the hexagon's faces, which leaves a narrow bevel at every corner.
  const CH = 8 * D;
  const chamfer = (geo, a) => {
    const p = geo.attributes.position, step = Math.PI / 3;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (r < 1e-6) continue;
      const off = (((Math.atan2(x, z) - a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const k = Math.round(off / step), ang = a + k * step + Math.sign(off - k * step) * CH;
      const rc = (r * Math.cos(Math.PI / 6)) / Math.cos(Math.PI / 6 - CH);
      p.setX(i, rc * Math.sin(ang)); p.setZ(i, rc * Math.cos(ang));
    }
    return geo;
  };

  const crystal = ({ rho, baseAz, az, tilt, top, r, tipLen, taper = 0.9, sink = 0.28 }) => {
    const a = az * D, t = tilt * D;
    const dir = new THREE.Vector3(Math.sin(t) * Math.sin(a), Math.cos(t), Math.sin(t) * Math.cos(a));
    const bx = Math.sin(baseAz * D) * rho, bz = Math.cos(baseAz * D) * rho;
    const base = new THREE.Vector3(bx, bell(Math.hypot(bx, bz)) - sink, bz);
    const len = (top - base.y) / Math.cos(t), shaft = len - tipLen, rt = r * taper;
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    // arcs in degrees from the lean direction, [start, segments]: 3 segments span a face
    // pair and the bevel between them, so 'down' is the two faces that look down the lean
    const piece = (pts, arcs) => {
      for (const [from, n, m] of arcs) {
        const geo = chamfer(lathe(pts, n, a + from * D, n * 30 * D), a);
        geo.applyQuaternion(q);
        geo.translate(base.x, base.y, base.z);
        add(geo, m);
      }
    };
    // where the axis leaves the rock
    let s = 0;
    while (s < shaft) { const p = base.clone().addScaledVector(dir, s); if (p.y > bell(Math.hypot(p.x, p.z)) + 0.03) break; s += 0.01; }
    const c = s + 0.2 + r * 0.3, rAt = (y) => r + ((rt - r) * y) / shaft;
    piece([[r * 1.24, 0], [r * 1.2, c * 0.55], [r * 1.12, c - 0.05], [r * 1.05, c], [rAt(c) * 0.99, c + 0.03]], [[-15, 12, FROST]]);
    piece([[r, 0], [rt, shaft]], [[-45, 3, DEEP], [45, 9, ICE]]);
    piece([[rt, shaft], [rt * 0.74, shaft + tipLen * 0.22], [0, shaft + tipLen]],
      [[-45, 3, DEEP], [45, 3, ICE], [135, 3, FROST], [225, 3, ICE]]);
  };

  crystal({ rho: 0.05, baseAz: 150, az: 150, tilt: 4, top: 4.0, r: 0.43, tipLen: 1.05, sink: 0.36 });
  crystal({ rho: 0.44, baseAz: 25, az: 30, tilt: 19, top: 2.82, r: 0.3, tipLen: 0.72 });
  crystal({ rho: 0.47, baseAz: 250, az: 248, tilt: 22, top: 2.72, r: 0.29, tipLen: 0.7 });
  crystal({ rho: 0.62, baseAz: 122, az: 128, tilt: 38, top: 1.42, r: 0.27, tipLen: 0.5, taper: 0.94 });
  crystal({ rho: 0.6, baseAz: 322, az: 318, tilt: 32, top: 1.36, r: 0.28, tipLen: 0.52, taper: 0.94 });

  // --- flat facets ----------------------------------------------------------------------------
  // Lathe normals are smooth around the revolution and would shade a hexagon round;
  // de-indexing and recomputing gives every facet its own normal. Lathes close at the axis
  // with zero-area triangles, which are dropped.
  const a0 = new THREE.Vector3(), b0 = new THREE.Vector3(), c0 = new THREE.Vector3();
  for (const m of g.children) {
    const flat = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = flat.attributes.position, uv = flat.attributes.uv, P = [], U = [];
    for (let i = 0; i < p.count; i += 3) {
      a0.fromBufferAttribute(p, i); b0.fromBufferAttribute(p, i + 1); c0.fromBufferAttribute(p, i + 2);
      if (b0.sub(a0).cross(c0.sub(a0)).lengthSq() < 1e-12) continue;
      for (let j = i; j < i + 3; j++) { P.push(p.getX(j), Math.max(0, p.getY(j)), p.getZ(j)); U.push(uv.getX(j), uv.getY(j)); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    geo.computeVertexNormals();
    m.geometry = geo;
  }

  // --- place: base on y = 0, centred on x and z ---------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
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
