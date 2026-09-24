// stamp_plate, arm B: profiles.
// The whole plate is turned. One night-basalt profile carries the two chamfered
// tiers of the stepped edge, the deck and the 3 cm recess round the field. The
// chalk rim is its own chamfered profile on the upper tier, turned in sixteen arcs
// so that eight of them can be stamp ochre: the ticks are inlaid flush in the rim
// and run down its outer wall, one of them on +Z. The dormant crystal inlay is a
// low domed ring between the rim and the field, its own mesh.
// 1.8 m across, 0.14 m tall; the field is 1.3 m across with its floor 0.07 m up.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const NIGHT = M(0x2a2830, 'stone', 0.88);
  const CHALK = M(0xc9c2d8, 'plaster', 0.8);
  const OCHRE = M(0xd9a441, 'plaster', 0.72);
  // Dormant crystal with its own material, so the game can light it by raising
  // emissiveIntensity. Unnamed and just under opaque so the loader's procedural
  // surfaces leave it alone.
  const CRYSTAL = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 0,
    roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  // ---- merging: one mesh per material ---------------------------------------------
  // The loader's surfaces stretch u by a mesh's width and v by its height, and on
  // a plate 0.14 m tall the height clamps. So every face is projected at one scale
  // (metres over the widest side), which keeps the stone within 2:1 when textured.
  const planarUv = (pos, n) => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const s = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;
    const uv = new Float32Array(n * 2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      a.fromArray(pos, t * 3); b.fromArray(pos, t * 3 + 3); c.fromArray(pos, t * 3 + 6);
      const f = b.sub(a).cross(c.sub(a));
      const ax = Math.abs(f.x), ay = Math.abs(f.y), az = Math.abs(f.z);
      for (let k = t; k < t + 3; k++) {
        const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
        const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
        uv[k * 2] = u / s; uv[k * 2 + 1] = v / s;
      }
    }
    return new THREE.BufferAttribute(uv, 2);
  };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', planarUv(pos, n));
    return out;
  };
  const PARTS = new Map();
  const put = (mat, geo) => { if (!PARTS.has(mat)) PARTS.set(mat, []); PARTS.get(mat).push(geo); return geo; };

  // ---- profile tools --------------------------------------------------------------
  // Profiles are [radius, height] and run out along the bottom, up the outside and
  // in along the top, so faces look out. LatheGeometry leaves the last normal of a
  // profile unnormalised; fix it.
  const SEG = 64;
  const fixNormals = (geo) => {
    const nr = geo.attributes.normal, v = new THREE.Vector3();
    for (let k = 0; k < nr.count; k++) { v.fromBufferAttribute(nr, k).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    return geo;
  };
  const turn = (pts, segs, phi0, dphi) =>
    fixNormals(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs, phi0, dphi));
  // every edge of a crisp profile turned on its own, so its corners stay sharp
  const lathe = (mat, pts, segs = SEG, phi0 = 0, dphi = Math.PI * 2) => {
    for (let i = 0; i < pts.length - 1; i++) put(mat, turn([pts[i], pts[i + 1]], segs, phi0, dphi));
  };
  // a flat disc facing up or down whose rim matches the lathe's vertices
  const disc = (mat, r, y, up) => {
    const geo = new THREE.CircleGeometry(r, SEG, up ? -Math.PI / 2 : Math.PI / 2);
    geo.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
    put(mat, geo.translate(0, y, 0));
  };

  // ---- layout ------------------------------------------------------------------------
  const R = 0.9, TOP = 0.14, DECK = 0.1, FIELD_R = 0.65, FIELD_Y = 0.07;
  const RIM_O = 0.82, RIM_I = 0.7, CH = 0.015;              // rim 0.12 m wide
  const INL_O = 0.695, INL_I = 0.66;                          // inlay 3.5 cm wide

  // basalt: two chamfered tiers, the deck either side of the inlay, the recess wall
  lathe(NIGHT, [[R, 0], [R, 0.034], [R - 0.016, 0.05], [0.858, 0.05], [0.858, 0.086], [0.844, DECK], [RIM_O, DECK]]);
  lathe(NIGHT, [[RIM_I, DECK], [INL_O, DECK]]);
  lathe(NIGHT, [[INL_I, DECK], [FIELD_R, DECK], [FIELD_R, FIELD_Y]]);
  disc(NIGHT, FIELD_R + 0.001, FIELD_Y, true);                 // the field floor
  disc(NIGHT, R, 0, false);                                    // underside

  // chalk rim in sixteen arcs, the eight ticks 8 cm wide at mid-rim, centred on
  // every 45 degrees starting at +Z
  const rim = [[RIM_O, DECK], [RIM_O, TOP - CH], [RIM_O - CH, TOP], [RIM_I + CH, TOP], [RIM_I, TOP - CH], [RIM_I, DECK]];
  const TICK = 0.08 / ((RIM_O + RIM_I) / 2), STEP = Math.PI / 4;
  for (let k = 0; k < 8; k++) {
    const a = k * STEP;
    lathe(OCHRE, rim, 1, a - TICK / 2, TICK);
    lathe(CHALK, rim, 7, a + TICK / 2, STEP - TICK);
  }

  // the inlay: a low dome standing 3.5 mm proud of the deck
  const inlay = new THREE.Mesh(merge([turn([[INL_O, DECK], [(INL_O + INL_I) / 2, DECK + 0.0035], [INL_I, DECK]], SEG, 0, Math.PI * 2)]), CRYSTAL);
  inlay.name = 'inlay';
  g.add(inlay);

  for (const [mat, geos] of PARTS) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  const at = (x, y, z) => [+(x - c.x).toFixed(3), +(y - box.min.y).toFixed(3), +(z - c.z).toFixed(3)];
  g.userData.parts = { inlay };
  g.userData.field = { center: at(0, FIELD_Y, 0), size: 2 * FIELD_R };   // top of the field floor, faces +Y
  return g;
}
