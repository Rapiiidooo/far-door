// glyph_stela, arm A: assembled from primitives.
// The shaft is a stack of courses, each a BoxGeometry whose corners are moved onto
// the slab's slight taper; the carved bands are thinner courses set back 3 cm and
// darkened. The panel recess is cut by building the front skin around it. The lens
// is a cylinder with a spherical dome in a torus bezel; the crown is two receding
// steps under a chamfered frustum cap.
// 1.3 x 2.4 x 0.68 m. Lens centre 1.3 m up, level with the sun mirror's disc.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials ------------------------------------------------------------
  const stone = (color, roughness = 0.9) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const sand = stone(0xb57f4f);
  const sunlit = stone(0xd4a373, 0.86);
  const sienna = stone(0x8a5433, 0.94);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x9a6a35, roughness: 0.45, metalness: 0.7 });
  bronze.name = 'metal';
  // Dormant crystal, its own material so the game can light it (raise
  // emissiveIntensity). Unnamed and just under opaque so the loader's procedural
  // surfaces leave it alone.
  const crystal = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 0,
    roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  // ---- static parts are merged per material at the end ----------------------
  const buckets = new Map();
  const add = (geo, mat) => {
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(geo);
  };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      if (x.attributes.uv) uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };

  // A BoxGeometry with its eight corners moved: every bound may be a number or a
  // function of height, so one call makes a tapered course or a frustum. Each
  // face keeps its own four vertices, so its normals stay flat.
  const tbox = (xl, xr, y0, y1, zb, zf) => {
    const b = new THREE.BoxGeometry(1, 1, 1), p = b.attributes.position;
    const at = (v, y) => (typeof v === 'function' ? v(y) : v);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) < 0 ? y0 : y1;
      p.setXYZ(i, at(p.getX(i) < 0 ? xl : xr, y), y, at(p.getZ(i) < 0 ? zb : zf, y));
    }
    b.computeVertexNormals();
    return b;
  };
  const lerp = (a, b, y0, y1) => (y) => a + ((b - a) * (y - y0)) / (y1 - y0);

  // ---- base: two 0.25 m tiers, stepped mostly in width ----------------------
  add(tbox(-0.65, 0.65, 0, 0.22, -0.34, 0.34), sienna);
  add(tbox(lerp(-0.65, -0.62, 0.22, 0.25), lerp(0.65, 0.62, 0.22, 0.25), 0.22, 0.25,
    lerp(-0.34, -0.32, 0.22, 0.25), lerp(0.34, 0.32, 0.22, 0.25)), sienna);
  add(tbox(-0.575, 0.575, 0.25, 0.48, -0.32, 0.32), sand);
  add(tbox(lerp(-0.575, -0.555, 0.48, 0.5), lerp(0.575, 0.555, 0.48, 0.5), 0.48, 0.5,
    lerp(-0.32, -0.302, 0.48, 0.5), lerp(0.32, 0.302, 0.48, 0.5)), sunlit);

  // ---- shaft: 1.0 x 0.6 at the foot, tapering in width to 0.9 at 2.04 m ------
  const Y0 = 0.5, YT = 2.04, ZF = 0.3, ZB = -0.3, INS = 0.03;
  const hw = (y) => 0.5 - (0.05 * (y - Y0)) / (YT - Y0);
  const PW = 0.48, PY0 = 0.525, PY1 = PY0 + PW, PZ = ZF - 0.08;   // panel recess
  const LY = 1.3, LR = 0.225;                                    // lens centre height, radius
  // band: 0 solid course, 1 carved on the sides and back, 2 carved all round
  // A side-and-back band keeps a full-width sandstone front skin, so its channel
  // stops short of the front face instead of crossing it.
  const course = (y0, y1, band) => {
    const i = band ? INS : 0, mat = band ? sienna : sand;
    const xl = (y) => -hw(y) + i, xr = (y) => hw(y) - i;
    const fl = (y) => -hw(y) + (band === 2 ? INS : 0), fr = (y) => hw(y) - (band === 2 ? INS : 0);
    const skin = band === 2 ? sienna : sand;
    const zb = ZB + i, zf = ZF - (band === 2 ? INS : 0);
    const inPanel = y1 > PY0 && y0 < PY1;
    const zs = inPanel ? PZ : band === 1 ? ZF - 0.05 : zf;       // where the front skin starts
    add(tbox(xl, xr, y0, y1, zb, zs), mat);                      // core
    if (zs >= zf) return;
    const cuts = inPanel ? [y0, Math.max(y0, PY0), Math.min(y1, PY1), y1] : [y0, y0, y1, y1];
    for (let k = 0; k < 3; k++) {
      const a = cuts[k], b = cuts[k + 1];
      if (b - a < 1e-6) continue;
      if (inPanel && k === 1) {                                    // beside the panel
        add(tbox(fl, -PW / 2, a, b, zs, zf), skin);
        add(tbox(PW / 2, fr, a, b, zs, zf), skin);
      } else add(tbox(fl, fr, a, b, zs, zf), skin);
    }
  };
  const rows = [[0.5, 0.66, 0], [0.66, 0.7, 1], [0.7, 1.14, 0], [1.14, 1.18, 1], [1.18, 1.66, 0],
    [1.66, 1.7, 2], [1.7, 1.82, 0], [1.82, 1.86, 2], [1.86, YT, 0]];
  for (const [a, b, band] of rows) course(a, b, band);
  // the recess floor, darker, a hair proud of the core so it does not flicker
  add(tbox(-PW / 2, PW / 2, PY0, PY1, PZ, PZ + 0.006), sienna);

  // ---- crown: two receding steps and a chamfered cap ------------------------
  add(tbox(-0.42, 0.42, YT, 2.16, -0.26, 0.26), sunlit);
  add(tbox(-0.33, 0.33, 2.16, 2.27, -0.21, 0.21), sunlit);
  add(tbox(lerp(-0.25, -0.17, 2.27, 2.4), lerp(0.25, 0.17, 2.27, 2.4), 2.27, 2.4,
    lerp(-0.16, -0.09, 2.27, 2.4), lerp(0.16, 0.09, 2.27, 2.4)), sunlit);

  // ---- lens in its bronze bezel, facing +Z ---------------------------------
  const faceZ = (geo, z) => { geo.rotateX(Math.PI / 2); geo.translate(0, LY, z); return geo; };
  add(faceZ(new THREE.CylinderGeometry(0.27, 0.27, 0.012, 40), ZF + 0.006), bronze);   // seat plate
  const ring = new THREE.TorusGeometry(0.247, 0.024, 10, 40);
  ring.translate(0, LY, ZF + 0.018);
  add(ring, bronze);
  const disc = new THREE.CylinderGeometry(LR, LR, 0.03, 40);
  disc.rotateX(Math.PI / 2);
  disc.translate(0, 0, -0.01);                                 // front face 5 mm proud of the slab
  const R = 0.9, dome = new THREE.SphereGeometry(R, 40, 4, 0, Math.PI * 2, 0, Math.asin(LR / R));
  dome.rotateX(Math.PI / 2);                                   // cap axis +Y -> +Z
  dome.translate(0, 0, 0.005 - R * Math.cos(Math.asin(LR / R)));
  const lens = new THREE.Mesh(merge([disc, dome]), crystal);
  lens.name = 'lens';
  lens.position.set(0, LY, ZF);
  g.add(lens);
  const LZ = ZF + 0.005 + R - R * Math.cos(Math.asin(LR / R)); // apex of the dome

  for (const [mat, geos] of buckets) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  const r3 = (x, y, z) => [+(x - c.x).toFixed(3), +(y - box.min.y).toFixed(3), +(z - c.z).toFixed(3)];
  g.userData.parts = { lens };
  g.userData.lens = { center: r3(0, LY, LZ), radius: LR };               // front apex of the lens
  g.userData.panel = { center: r3(0, (PY0 + PY1) / 2, PZ + 0.006), size: PW }; // recess floor, faces +Z
  return g;
}
