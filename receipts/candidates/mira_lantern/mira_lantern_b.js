// mira_lantern, arm B: built from profiles.
// The round foot is one turned profile (a rolled bead, a cove, a lipped floor).
// The body's bottom and top frames are square lathes whose profiles carry a
// chamfered lip; the four corner posts are angle irons extruded from an L, and
// the four panes sit 5 mm behind their faces. Inside, a turned dish with a rolled
// lip and a turned candle stub with a melted top, a drip swept down its side.
// The roof is turned: an eave bead, then a cone whose two rows of square holes
// are punched out of the lathe's own mesh over a soot cone, then a chimney, a
// cap and a knob. The bail is a tube swept along a raised arch between two
// turned bosses on the eave. The flame is a turned teardrop, its own mesh,
// origin at the wick. About 0.26 x 0.45 x 0.23 m.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials ------------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const BRONZE = M(0x9a6a35, 'metal', 0.5, 0.6);
  // soot on the inside of the roof, seen through its holes, and the wick
  const SOOT = M(0x4b2e1e, 'metal', 0.9);
  const WAX = M(0xe6d3ae, 'plaster', 0.75);
  // Translucent so the candle and flame show through. Unnamed and under 0.95
  // opacity so the loader's surfaces leave them flat; no depth write, so a pane
  // drawn first never cuts the flame out.
  const PANE = new THREE.MeshStandardMaterial({
    color: 0xe6d3ae, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false,
  });
  // Lantern amber is emission only: a black base so the sun adds nothing and the
  // flame shows its own colour from every side. Its own material so the game can
  // light, dim or hide it; unnamed and just under opaque so surfaces skip it.
  const FLAME = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: 0xffb24a, emissiveIntensity: 1.2,
    roughness: 1, metalness: 0, transparent: true, opacity: 0.94,
  });

  // ---- merging: one mesh per material -------------------------------------------------
  const buckets = new Map();
  const put = (mat, geo) => { if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(geo); return geo; };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };

  // ---- profile tools ----------------------------------------------------------------------
  // Profiles are [radius, height] and run out along the bottom, up the outside and
  // in along the top, so faces look out. LatheGeometry leaves the last normal of a
  // profile unnormalised; fix it.
  const fixNormals = (geo) => {
    const nr = geo.attributes.normal, v = new THREE.Vector3();
    for (let k = 0; k < nr.count; k++) { v.fromBufferAttribute(nr, k).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    return geo;
  };
  const lathe = (pts, segs, phi = 0) => fixNormals(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs, phi));
  const facets = (geo) => { const f = geo.toNonIndexed(); f.computeVertexNormals(); return f; };
  // a profile in runs: smooth within a run, a crisp edge between runs
  const turn = (mat, runs, segs) => { for (const run of runs) put(mat, lathe(run, segs)); };
  // a square lathe: half widths turned to corner radii, four flat faces
  const square = (mat, pts) => put(mat, facets(lathe(pts.map(([h, y]) => [h * Math.SQRT2, y]), 4, Math.PI / 4)));

  // ---- the round foot ---------------------------------------------------------------------
  const Y0 = 0.038;                                         // floor of the lantern
  put(BRONZE, lathe([[0.001, 0], [0.11, 0]], 10));           // underside, never seen
  turn(BRONZE, [
    [[0.11, 0], [0.114, 0.005], [0.111, 0.012]],                       // rolled foot bead
    [[0.111, 0.012], [0.103, 0.017], [0.103, 0.031]],                  // cove
    [[0.103, 0.031], [0.108, 0.034], [0.104, Y0]],                     // lip round the floor
    [[0.104, Y0], [0.001, Y0]],                                        // floor
  ], 28);

  // ---- the body: square frames, angle-iron posts, panes -----------------------------------
  const HW = 0.072, Y1 = 0.232;                             // posts' outer faces; body top
  const IN = 0.057;                                         // frames' inner wall
  square(BRONZE, [[IN, Y0 + 0.02], [IN, Y0], [HW + 0.003, Y0], [HW + 0.003, Y0 + 0.01], [HW, Y0 + 0.013], [HW, Y0 + 0.02], [IN, Y0 + 0.02]]);
  square(BRONZE, [[IN, Y1], [IN, Y1 - 0.02], [HW, Y1 - 0.02], [HW, Y1 - 0.013], [HW + 0.003, Y1 - 0.01], [HW + 0.003, Y1], [IN, Y1]]);
  // an L in the corner at (+HW, +HW), in shape coordinates (x, -z), extruded up
  const T = 0.005, L = 0.018;
  const ell = new THREE.Shape();
  [[HW, HW], [HW - L, HW], [HW - L, HW - T], [HW - T, HW - T], [HW - T, HW - L], [HW, HW - L]]
    .forEach(([x, z], i) => (i ? ell.lineTo(x, -z) : ell.moveTo(x, -z)));
  const post = new THREE.ExtrudeGeometry(ell, { depth: Y1 - Y0, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, Y0, 0);
  for (let k = 0; k < 4; k++) put(BRONZE, post.clone().rotateY((k * Math.PI) / 2));
  // panes against the posts' inner faces, their edges buried in the frames
  const PT = 0.004, PD = HW - T - PT / 2, PW = 2 * (HW - T), PH = Y1 - Y0 - 0.02;
  const paneShape = new THREE.Shape();
  [[-PW / 2, -PH / 2], [PW / 2, -PH / 2], [PW / 2, PH / 2], [-PW / 2, PH / 2]].forEach(([x, y], i) => (i ? paneShape.lineTo(x, y) : paneShape.moveTo(x, y)));
  const pane = new THREE.ExtrudeGeometry(paneShape, { depth: PT, bevelEnabled: false }).translate(0, (Y0 + Y1) / 2, PD - PT / 2);
  for (let k = 0; k < 4; k++) put(PANE, pane.clone().rotateY((k * Math.PI) / 2));

  // ---- inside: dish, candle stub, drip, wick --------------------------------------------------
  turn(BRONZE, [
    [[0.026, Y0], [0.035, Y0 + 0.007], [0.037, Y0 + 0.009], [0.034, Y0 + 0.01]],   // wall and rolled lip
    [[0.034, Y0 + 0.01], [0.028, Y0 + 0.004], [0.001, Y0 + 0.004]],                 // inside and floor
  ], 14);
  const CY1 = Y0 + 0.056;                                   // candle top at the rim, 0.094
  turn(WAX, [
    [[0.0166, Y0 + 0.004], [0.016, CY1 - 0.004], [0.0148, CY1]],
    [[0.0148, CY1], [0.009, CY1 - 0.002], [0.002, CY1 - 0.003]],                      // melted, dished top
  ], 12);
  const drip = new THREE.CatmullRomCurve3([[0.013, CY1 - 0.001, 0.009], [0.0155, CY1 - 0.01, 0.0075], [0.0165, CY1 - 0.022, 0.0065],
    [0.0168, CY1 - 0.03, 0.006]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  put(WAX, new THREE.TubeGeometry(drip, 6, 0.0032, 5, false));
  put(SOOT, lathe([[0.0018, CY1 - 0.004], [0.0015, CY1 + 0.007], [0.0004, CY1 + 0.009]], 5));

  // ---- the flame: a turned teardrop, its own mesh, origin at its root on the wick -------------
  const flame = new THREE.Mesh(lathe([[0.0004, 0], [0.006, 0.002], [0.0098, 0.008], [0.0105, 0.015], [0.0088, 0.024],
    [0.0056, 0.033], [0.0024, 0.04], [0.0003, 0.045]], 10), FLAME);
  flame.name = 'flame';
  flame.position.set(0, CY1 + 0.001, 0);
  g.add(flame);

  // ---- the roof: eave, pierced cone, chimney, cap -----------------------------------------------
  turn(BRONZE, [
    [[0.066, Y1], [0.11, Y1]],                                                        // eave underside
    [[0.11, Y1], [0.114, Y1 + 0.004], [0.112, Y1 + 0.01]],                             // eave bead
    [[0.112, Y1 + 0.01], [0.106, Y1 + 0.012]],
  ], 24);
  // The cone, in rows up its slant. Rows 1 and 3 lose every other cell, offset, and
  // the cells go by where each triangle's centre falls, not by index order.
  const C0 = [0.106, Y1 + 0.012], C1 = [0.024, Y1 + 0.086], SEG = 32;
  const FR = [0, 0.24, 0.37, 0.58, 0.71, 1];
  const cone = lathe(FR.map((f) => [C0[0] + (C1[0] - C0[0]) * f, C0[1] + (C1[1] - C0[1]) * f]), SEG);
  {
    const p = cone.attributes.position, idx = cone.index.array, keep = [];
    const rowY = FR.map((f) => C0[1] + (C1[1] - C0[1]) * f);
    for (let t = 0; t < idx.length; t += 3) {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < 3; k++) { x += p.getX(idx[t + k]) / 3; y += p.getY(idx[t + k]) / 3; z += p.getZ(idx[t + k]) / 3; }
      const row = rowY.findIndex((ry, i) => i < rowY.length - 1 && y >= ry && y < rowY[i + 1]);
      const cell = Math.floor((((Math.atan2(x, z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * SEG);
      const hole = (row === 1 && cell % 2 === 0) || (row === 3 && cell % 2 === 1);
      if (!hole) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    cone.setIndex(keep);
  }
  put(BRONZE, cone);
  // soot cone 5 mm inside, closed underneath: the dark behind every hole
  put(SOOT, lathe([[0.001, Y1 + 0.011], [0.1, Y1 + 0.011]], 12));
  put(SOOT, lathe([[0.1, Y1 + 0.011], [0.018, Y1 + 0.085]], 24));
  turn(BRONZE, [
    [[0.024, Y1 + 0.086], [0.021, Y1 + 0.088], [0.021, Y1 + 0.1]],                  // chimney
    [[0.021, Y1 + 0.1], [0.032, Y1 + 0.1]],                                          // cap, underneath
    [[0.032, Y1 + 0.1], [0.032, Y1 + 0.103], [0.007, Y1 + 0.116]],                   // cap
    [[0.007, Y1 + 0.116], [0.007, Y1 + 0.12], [0.001, Y1 + 0.126]],                  // knob
  ], 12);

  // ---- the bail: turned bosses on the eave, a tube swept along a raised arch -------------------
  const BY = Y1 + 0.006, TOP = 0.4455, BR = 0.0048;         // pivot height; the arch's crown
  for (const s of [-1, 1]) {
    const boss = lathe([[0.001, 0], [0.0075, 0], [0.0075, 0.005], [0.004, 0.009], [0.001, 0.0095]], 8);
    boss.rotateZ(-s * Math.PI / 2).translate(s * 0.112, BY, 0);
    put(BRONZE, boss);
  }
  // a superellipse, squarer in the shoulders than an ellipse, entering the bosses level
  const arch = [];
  arch.push(new THREE.Vector3(-0.117, BY, 0));
  for (let i = 0; i <= 16; i++) {
    const t = Math.PI - (i / 16) * Math.PI, c = Math.cos(t), sn = Math.sin(t);
    arch.push(new THREE.Vector3(0.124 * Math.sign(c) * Math.abs(c) ** (2 / 2.6), BY + (TOP - BY) * Math.abs(sn) ** (2 / 2.6), 0));
  }
  arch.push(new THREE.Vector3(0.117, BY, 0));
  put(BRONZE, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arch, false, 'centripetal'), 32, BR, 6, false));

  for (const [mat, geos] of buckets) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ------------------
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

  // the flame's centre, where a point light belongs, measured after the shift
  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.parts = { flame };
  g.userData.light = [r3(flame.position.x), r3(flame.position.y + 0.018), r3(flame.position.z)];
  return g;
}
