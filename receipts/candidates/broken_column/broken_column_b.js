// broken_column, candidate B (profiles): the stepped base is three square
// lathes, each drum is a fluted plan outline extruded with a chamfer so the
// joints read as grooves, the top drum's upper ring is sheared onto one plane,
// the capital band is a partial lathe clipped by that plane, and the fallen
// fragment is a half outline with a jagged broken chord. 3.4 m ruin, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SUN = mat(0xd4a373, 0.84);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.95);
  const BONE = mat(0xe6d3ae, 0.76);
  const BASALT = mat(0x3a3531, 0.82);

  const add = (geo, m, parent = g) => { const o = new THREE.Mesh(geo, m); parent.add(o); return o; };
  const flat = (geo) => { const f = geo.toNonIndexed(); f.computeVertexNormals(); return f; };
  // Extrude UVs are in metres; bring them to 0..1 so load-time surfaces keep one texel density.
  const normUV = (geo) => {
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    const L = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) || 1;
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / L, uv.getY(i) / L);
    return geo;
  };
  // A plan outline (x, z) extruded up from y0 to y1. The bevel keeps the drawn
  // outline on the end faces and pushes the walls out by bev.
  const plan = (pts, y0, y1, bev) => {
    const s = new THREE.Shape();
    pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: y1 - y0 - 2 * bev, steps: 1, bevelEnabled: bev > 0,
      bevelThickness: bev, bevelSize: bev, bevelSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y0 + bev, 0);
    return normUV(geo);
  };
  // ExtrudeGeometry keeps its end faces in group 0 and its walls in group 1;
  // split them so a break or a dressed top can take its own colour.
  const split = (geo) => geo.groups.map(({ start, count }) => {
    const part = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const a = geo.attributes[name];
      part.setAttribute(name, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
    }
    return part;
  });
  const lathe = (pts, seg, phi = 0, len = Math.PI * 2) =>
    new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phi, len);

  // ------------------------------------------------------------------- base
  // square lathes: four segments turned 45 degrees, radius = half width * sqrt 2
  const R2 = Math.SQRT2;
  const tierGeo = (pts) => flat(lathe(pts.map(([h, y]) => [h * R2, y]), 4, Math.PI / 4));
  add(tierGeo([[0, 0], [0.7, 0], [0.7, 0.17], [0.67, 0.2], [0, 0.2]]), SIENNA);
  add(tierGeo([[0, 0.2], [0.62, 0.2], [0.62, 0.49], [0.59, 0.52], [0, 0.52]]), SAND);
  add(tierGeo([[0, 0.52], [0.55, 0.52], [0.55, 0.59], [0.53, 0.62], [0, 0.62]]), SUN);
  // an inlaid basalt disc in a carved ring on each face of the middle tier
  for (let k = 0; k < 4; k++) {
    const face = new THREE.Group();
    face.rotation.y = (k * Math.PI) / 2;
    g.add(face);
    add(lathe([[0, 0], [0.1, 0], [0.1, 0.02], [0, 0.02]], 18).rotateX(Math.PI / 2).translate(0, 0.36, 0.615), BASALT, face);
    add(lathe([[0.11, 0], [0.16, 0], [0.16, 0.025], [0.11, 0.025], [0.11, 0]], 24).rotateX(Math.PI / 2).translate(0, 0.36, 0.612), SIENNA, face);
  }

  // ------------------------------------------------------------------ drums
  // twelve concave flutes between narrow fillets, shallow as the brief asks
  const FL = 12;
  const fluted = (turn, from = 0, to = Math.PI * 2) => {
    const pts = [];
    for (let i = 0; i < FL; i++) {
      const a0 = turn + (i / FL) * Math.PI * 2, step = (Math.PI * 2) / FL;
      for (const [f, r] of [[0, 0.5], [0.26, 0.5], [0.34, 0.468], [0.5, 0.455], [0.66, 0.468], [0.74, 0.5]]) {
        const a = a0 + f * step;
        if (a >= from - 1e-6 && a <= to + 1e-6) pts.push([Math.sin(a) * r, Math.cos(a) * r]);
      }
    }
    return pts;
  };
  const TOP = 3.4;
  // The shear: highest at the back left, falling 0.45 m toward the front right.
  const shear = (x, z) => TOP - 0.45 * (0.5 + (x * 0.8 + z * 0.6));
  add(plan(fluted(0), 0.62, 1.52, 0.018), SAND);
  add(plan(fluted(0.12), 1.52, 2.42, 0.018), SAND);
  const d3 = plan(fluted(-0.09), 2.42, TOP, 0.018);
  const p3 = d3.attributes.position;
  for (let i = 0; i < p3.count; i++) {
    const y = p3.getY(i);
    if (y > TOP - 0.06) p3.setY(i, y - (TOP - shear(p3.getX(i), p3.getZ(i))));
  }
  d3.computeVertexNormals();
  const [ends3, walls3] = split(d3);
  add(ends3, SUN);    // the fresh break (its twin underneath is hidden on drum two)
  add(walls3, SAND);
  // what survives of the bone capital band, clipped by the same plane; its cut
  // face sits a hair above the break so the bone shows where the band was broken
  const band = lathe([[0.44, 3.16], [0.535, 3.16], [0.55, 3.18], [0.55, 3.38], [0.535, TOP], [0.44, TOP], [0.44, 3.16]], 28, Math.PI * 0.72, Math.PI * 1.1);
  const bp = band.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i);
    if (y > 3.165) bp.setY(i, Math.max(3.16, Math.min(y, shear(bp.getX(i), bp.getZ(i)) + 0.004)));
  }
  add(flat(band), BONE);

  // ------------------------------------------------------- fallen fragment
  // a slice of drum split through its axis, lying on the split face against the
  // first step: the fluted arch on top, the dressed joint faces toward +X and -X
  const arch = [];
  for (let i = 0; i < 6; i++) {
    const step = Math.PI / 6;
    for (const [f, r] of [[0, 0.5], [0.13, 0.5], [0.21, 0.468], [0.5, 0.455], [0.79, 0.468], [0.87, 0.5]]) {
      const a = i * step + f * step;
      arch.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  arch.push([-0.5, 0], [-0.3, 0.03], [-0.1, 0], [0.12, 0.04], [0.32, 0]);
  const sh = new THREE.Shape();
  arch.forEach(([zz, y], i) => (i ? sh.lineTo(zz, y) : sh.moveTo(zz, y)));
  sh.closePath();
  const fragGeo = normUV(new THREE.ExtrudeGeometry(sh, { depth: 0.48, steps: 1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }));
  fragGeo.rotateY(-Math.PI / 2);   // profile (z, y) extruded along -X
  fragGeo.translate(0.495, 0.015, 0);
  const [fragEnds, fragWalls] = split(fragGeo);
  const frag = new THREE.Group();
  frag.position.set(0.73, 0.021, 0.1);
  frag.rotation.set(0.04, 0.22, 0);
  g.add(frag);
  add(fragEnds, SUN, frag);
  add(fragWalls, SAND, frag);

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
