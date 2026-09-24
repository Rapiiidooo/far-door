// push_block, candidate B: profiles. The shell is a lathe with a chamfered-square
// section (base chamfer, sienna band, both grooves, top chamfer and the dished top
// in one swept profile); the recess zone is one vertical extrusion of the plan
// with a notch in each face; the disc and crescent are cut through an extruded
// floor plate over dark inlays. 1.9 m cube.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const SAND = mat(0xb57f4f, 'stone');
  const SAND_LIT = mat(0xd4a373, 'stone', { roughness: 0.86 });
  const SIENNA = mat(0x8a5433, 'stone', { roughness: 0.95 });

  const A = 0.95, C = 0.07, T = 1.9;       // half size, chamfer, top
  const N = 0.08, G = 0.035, W = 0.5;      // notch depth (5 cm recess + 3 cm cut), groove depth, recess half-width
  const DISH = 0.03;

  // Chamfered square inset by t: the faces move in by t and the chamfer faces
  // stay parallel, so the chamfer shortens by (2 - sqrt 2) t. Points as [x, z].
  const ring = (t) => {
    const a = A - t, k = Math.max(0, C - (2 - Math.SQRT2) * t);
    return [[a - k, a], [a, a - k], [a, -(a - k)], [a - k, -a], [-(a - k), -a], [-a, -(a - k)], [-a, a - k], [-(a - k), a]];
  };
  // Rows [t, y] run like a lathe profile: outward along a bottom, up a side,
  // inward across a top. Flat shaded; zero-area triangles at the axis are skipped.
  const loft = (rows, m) => {
    const pos = [];
    const tri = (a, b, c) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) > 1e-9) pos.push(...a, ...b, ...c);
    };
    for (let r = 0; r < rows.length - 1; r++) {
      const R0 = ring(rows[r][0]), R1 = ring(rows[r + 1][0]), y0 = rows[r][1], y1 = rows[r + 1][1];
      for (let e = 0; e < 8; e++) {
        const f = (e + 1) % 8;
        const p0 = [R0[e][0], y0, R0[e][1]], q0 = [R0[f][0], y0, R0[f][1]];
        const p1 = [R1[e][0], y1, R1[e][1]], q1 = [R1[f][0], y1, R1[f][1]];
        tri(p0, q0, q1); tri(p0, q1, p1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, m);
    g.add(mesh);
    return mesh;
  };

  // --- the swept shell ---------------------------------------------------------
  loft([[A, 0], [C, 0], [0, C], [0, 0.25]], SIENNA);                 // underside, base chamfer, band
  loft([[0, 0.25], [0, 0.4], [N, 0.4]], SAND);                        // ends in the recess sills
  loft([[N, 1.4], [0, 1.4], [0, 1.55]], SAND);                        // starts with the recess lintels
  loft([[0, 1.55], [G, 1.55], [G, 1.6], [0, 1.6]], SIENNA);           // groove
  loft([[0, 1.6], [0, 1.68]], SAND);
  loft([[0, 1.68], [G, 1.68], [G, 1.73], [0, 1.73]], SIENNA);         // groove
  loft([[0, 1.73], [0, T - C]], SAND);
  const top = [[0, T - C], [C, T]];
  for (let k = 1; k <= 6; k++) {
    const t = C + (A - C) * (k / 6);
    top.push([t, T - DISH * (1 - ((A - t) / (A - C)) ** 2)]);        // worn, very slightly dished
  }
  loft(top, SAND_LIT);

  // --- recess zone: the plan with a 1 m wide notch in each face, extruded up --
  const a = A, k = C;
  const plan = new THREE.Shape();
  plan.moveTo(a - k, a);
  plan.lineTo(W, a); plan.lineTo(W, a - N); plan.lineTo(-W, a - N); plan.lineTo(-W, a);
  plan.lineTo(-(a - k), a); plan.lineTo(-a, a - k);
  plan.lineTo(-a, W); plan.lineTo(-a + N, W); plan.lineTo(-a + N, -W); plan.lineTo(-a, -W);
  plan.lineTo(-a, -(a - k)); plan.lineTo(-(a - k), -a);
  plan.lineTo(-W, -a); plan.lineTo(-W, -a + N); plan.lineTo(W, -a + N); plan.lineTo(W, -a);
  plan.lineTo(a - k, -a); plan.lineTo(a, -(a - k));
  plan.lineTo(a, -W); plan.lineTo(a - N, -W); plan.lineTo(a - N, W); plan.lineTo(a, W);
  plan.lineTo(a, a - k);
  const zone = new THREE.Mesh(new THREE.ExtrudeGeometry(plan, { depth: 1.0, bevelEnabled: false }), SAND);
  zone.rotation.x = -Math.PI / 2;   // extrusion axis +Z turned to +Y (the plan is symmetric in z)
  zone.position.y = 0.4;
  g.add(zone);

  // --- disc and crescent, cut 3 cm into the recess floor ------------------------
  // Crescent: inside a 0.30 m circle and outside a 0.27 m circle raised 0.12 m,
  // horns up; the disc sits in its cradle. Coordinates local to the recess centre.
  const R0 = 0.3, R1 = 0.27, DY = 0.12, RD = 0.13, YC = 0.025;
  const hy = (R0 * R0 - R1 * R1 + DY * DY) / (2 * DY), hx = Math.sqrt(R0 * R0 - hy * hy);
  const aH = Math.atan2(hy, hx), bH = Math.atan2(hy - DY, hx);
  const crescent = (p) => {
    p.moveTo(hx, YC + hy);
    p.absarc(0, YC, R0, aH, Math.PI - aH, true);             // outer edge, through the bottom
    p.absarc(0, YC + DY, R1, Math.PI - bH, bH, false);       // inner edge, back through its bottom
    return p;
  };
  const disc = (p) => { p.absarc(0, YC + DY, RD, 0, Math.PI * 2, false); return p; };
  const floor = new THREE.Shape();
  floor.moveTo(-W, -0.5); floor.lineTo(W, -0.5); floor.lineTo(W, 0.5); floor.lineTo(-W, 0.5);
  floor.holes.push(crescent(new THREE.Path()), disc(new THREE.Path()));
  const floorGeo = new THREE.ExtrudeGeometry(floor, { depth: 0.03, bevelEnabled: false, curveSegments: 16 });
  const inlayGeo = new THREE.ExtrudeGeometry([crescent(new THREE.Shape()), disc(new THREE.Shape())],
    { depth: 0.005, bevelEnabled: false, curveSegments: 16 });
  for (let f = 0; f < 4; f++) {
    const face = new THREE.Group();
    face.rotation.y = (f * Math.PI) / 2;
    g.add(face);
    const fl = new THREE.Mesh(floorGeo, SAND);
    fl.position.set(0, 0.9, A - N);            // front of the plate at A - 0.05
    face.add(fl);
    const inl = new THREE.Mesh(inlayGeo, SIENNA);
    inl.position.set(0, 0.9, A - N);           // floor of the cut, 5 mm proud of the notch
    face.add(inl);
  }

  // --- placement: base on y = 0, centred on x and z ----------------------------
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
