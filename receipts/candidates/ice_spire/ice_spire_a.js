// ice_spire, arm A: primitives.
// Five six-sided crystals, each a tapering open cylinder for the shaft and a cone for the
// pointed tip, both split by angle so the two faces that look down and out along the lean
// are deep ice, the tip facets that look up are glacier white and the rest ice blue. A
// flared hexagonal collar is the frost band at each root. The mound is two faceted sphere
// caps of frost slate (a wide low course and an off-centre hump) with half-sunk dodecahedron
// boulders on its flanks, and the snow is a narrower, taller copy of a rock shape whose top
// pokes through the rock.
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

  const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh; };
  const UP = new THREE.Vector3(0, 1, 0);
  const D = Math.PI / 180;

  // --- the mound -------------------------------------------------------------------------
  // A sphere cap with base radius rb and height h standing on y = 0. A cap meets the ground
  // at a slope, where a squashed hemisphere stands up like a puck.
  const cap = (rb, h, theta, ws, hs, phi = 0) => {
    const geo = new THREE.SphereGeometry(1, ws, hs, phi, Math.PI * 2, 0, theta);
    geo.translate(0, -Math.cos(theta), 0);
    geo.scale(rb / Math.sin(theta), h / (1 - Math.cos(theta)), rb / Math.sin(theta));
    return geo;
  };
  const capY = (rb, h, theta, rho) => {
    const s = (rho * Math.sin(theta)) / rb;
    return s >= 1 ? 0 : Math.max(0, ((Math.sqrt(1 - s * s) - Math.cos(theta)) * h) / (1 - Math.cos(theta)));
  };
  // a wide low course and an off-centre hump; this is the analytic surface of both, used
  // to find where each crystal leaves the rock
  const HX = 0.08, HZ = -0.06;
  const surface = (x, z) => Math.max(capY(1.3, 0.34, 1.0, Math.hypot(x, z)), capY(0.86, 0.62, 1.2, Math.hypot(x - HX, z - HZ)));
  {
    add(cap(1.3, 0.34, 1.0, 12, 3), SLATE);
    const hump = cap(0.86, 0.62, 1.2, 10, 3, 0.3);
    hump.translate(HX, 0, HZ);
    add(hump, SLATE);
    // narrower and taller, tipped a little: it shows only on top, with a ragged edge
    const snow = cap(0.84, 0.66, 1.2, 9, 3, 0.62);
    snow.rotateX(-5 * D); snow.rotateZ(4 * D);
    snow.translate(HX, 0, HZ);
    add(snow, FROST);
  }
  // boulders half sunk into the flanks, several with their own dusting on top
  for (const [az, rho, r, sy, spin, dusted] of [
    [20, 1.0, 0.3, 0.62, 0.4, true], [95, 1.04, 0.26, 0.7, 1.3, false], [160, 0.97, 0.33, 0.6, 2.2, true],
    [230, 1.03, 0.27, 0.66, 0.9, false], [290, 0.99, 0.3, 0.58, 1.8, true], [335, 1.08, 0.21, 0.7, 2.7, false],
  ]) {
    const x = Math.sin(az * D) * rho, z = Math.cos(az * D) * rho;
    const lift = surface(x, z) * 0.7;   // sunk into the course so the flank reads lumpy
    const place = (geo) => { geo.rotateY(spin); geo.translate(x, lift, z); return geo; };
    const b = new THREE.DodecahedronGeometry(r, 0);
    b.rotateX(0.35); b.scale(1, sy, 1);
    add(place(b), SLATE);
    if (dusted) {
      const s = new THREE.DodecahedronGeometry(r, 0);
      s.rotateX(0.35); s.scale(0.84, sy * 0.6, 0.84); s.translate(0, r * sy * 0.43, 0);
      add(place(s), FROST);
    }
  }

  // --- the crystals ----------------------------------------------------------------------
  // az is the lean direction measured from +Z towards +X; top is the apex height
  const crystal = ({ rho, baseAz, az, tilt, top, r, tipLen, taper = 0.9, sink = 0.28 }) => {
    const a = az * D, t = tilt * D;
    const dir = new THREE.Vector3(Math.sin(t) * Math.sin(a), Math.cos(t), Math.sin(t) * Math.cos(a));
    const bx = Math.sin(baseAz * D) * rho, bz = Math.cos(baseAz * D) * rho;
    const base = new THREE.Vector3(bx, surface(bx, bz) - sink, bz);
    const len = (top - base.y) / Math.cos(t), shaft = len - tipLen, rt = r * taper;
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const put = (geo, m) => { geo.applyQuaternion(q); geo.translate(base.x, base.y, base.z); return add(geo, m); };
    // a corner points along the lean, so the two faces either side of it look down
    const arc = (from, n) => [a + from * D, n * 60 * D];
    for (const [from, n, m] of [[-60, 2, DEEP], [60, 4, ICE]]) {
      const geo = new THREE.CylinderGeometry(rt, r, shaft, n, 1, true, ...arc(from, n));
      geo.translate(0, shaft / 2, 0);
      put(geo, m);
    }
    for (const [from, n, m] of [[-60, 2, DEEP], [60, 1, ICE], [120, 2, FROST], [240, 1, ICE]]) {
      const geo = new THREE.ConeGeometry(rt, tipLen, n, 1, true, ...arc(from, n));
      geo.translate(0, shaft + tipLen / 2, 0);
      put(geo, m);
    }
    // frost band: from inside the rock to a hand above where the axis leaves it
    let s = 0;
    while (s < shaft) { const p = base.clone().addScaledVector(dir, s); if (p.y > surface(p.x, p.z)) break; s += 0.01; }
    const top0 = s + 0.2 + r * 0.25;
    const band = new THREE.CylinderGeometry(r * 1.1, r * 1.3, top0, 6, 1, false, a, Math.PI * 2);
    band.translate(0, top0 / 2, 0);
    put(band, FROST);
  };

  crystal({ rho: 0.06, baseAz: 200, az: 200, tilt: 5, top: 4.0, r: 0.44, tipLen: 1.0, sink: 0.35 });
  crystal({ rho: 0.46, baseAz: 60, az: 60, tilt: 21, top: 2.85, r: 0.31, tipLen: 0.7 });
  crystal({ rho: 0.46, baseAz: 218, az: 222, tilt: 17, top: 2.7, r: 0.3, tipLen: 0.68 });
  crystal({ rho: 0.62, baseAz: 142, az: 148, tilt: 36, top: 1.45, r: 0.27, tipLen: 0.5, taper: 0.94 });
  crystal({ rho: 0.6, baseAz: 305, az: 300, tilt: 31, top: 1.35, r: 0.28, tipLen: 0.5, taper: 0.94 });

  // --- flat facets -----------------------------------------------------------------------
  // Cylinder and sphere normals are smooth around the revolution and would shade a hexagon
  // round; de-indexing and recomputing gives every facet its own normal. Degenerate
  // triangles (sphere poles) are dropped so every vertex carries a real facet normal.
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

  // --- place: base on y = 0, centred on x and z ------------------------------------------
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
