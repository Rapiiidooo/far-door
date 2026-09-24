// temple_facade, arm C: a different part breakdown, horizontal beds.
// The cliff is read as bedded sandstone: every stratum is a plan outline with a
// ragged front lip, pushed up through its own thickness with chamfered edges, so
// the rock frame is a stack of ledges that each throw a shadow on the next. The
// carving is built the same way, as plan outlines pushed upward course by
// course: stepped-corner piers, chamfered tier blocks, bevelled disc medallions.
export default function (THREE) {
  const g = new THREE.Group();
  g.userData.mounts = 'back';

  const mat = (hex, rough) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SUNLIT = mat(0xd4a373, 0.86);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.94);
  const BONE = mat(0xe6d3ae, 0.8);
  const BASALT = mat(0x3a3531, 0.96);

  let seed = 20260924;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const both = (fn) => { fn(1); fn(-1); };
  const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh; };

  const pathPts = (P, pts) => { pts.forEach(([x, y], i) => (i ? P.lineTo(x, y) : P.moveTo(x, y))); P.closePath(); return P; };
  // Extrude UVs come out in metres; the surface pass expects 0..1 per mesh.
  const normUV = (geo) => {
    const uv = geo.attributes.uv; if (!uv) return geo;
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (let i = 0; i < uv.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - u0) / (u1 - u0 || 1), (uv.getY(i) - v0) / (v1 - v0 || 1));
    return geo;
  };
  // bevelOffset = -size keeps the side walls on the drawn outline and cuts the
  // chamfer inward, so a bevel never grows the part (docs/traps.md).
  const extrudeGeo = (outline, holes, depth, b, segs = 1) => {
    const ccw = !THREE.ShapeUtils.isClockWise(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    const s = pathPts(new THREE.Shape(), ccw ? outline : outline.slice().reverse());
    for (const h of holes) s.holes.push(pathPts(new THREE.Path(), h));
    const geo = new THREE.ExtrudeGeometry(s, b > 0
      ? { depth: depth - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: segs, curveSegments: 12 }
      : { depth, bevelEnabled: false, curveSegments: 12 });
    geo.translate(0, 0, b);
    return normUV(geo);
  };
  const slabZ = (pts, z0, z1, m, b = 0, segs = 1) => {
    const geo = extrudeGeo(pts, [], z1 - z0, b, segs); geo.translate(0, 0, z0); return add(geo, m);
  };
  // plan (x, z) pushed up from y0 to y1
  const slabY = (pts, y0, y1, m, b = 0) => {
    const geo = extrudeGeo(pts.map(([x, z]) => [x, -z]), [], y1 - y0, b);
    geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0); return add(geo, m);
  };
  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const circle = (cx, cy, r, n = 32) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);
  // plan of a block whose two front corners are notched into a step
  const stepped = (cx, hw, back, front, n) => [
    [cx - hw, back], [cx + hw, back], [cx + hw, front - n], [cx + hw - n, front - n], [cx + hw - n, front],
    [cx - hw + n, front], [cx - hw + n, front - n], [cx - hw, front - n]];
  // plan of a block whose two front corners are chamfered
  const chamf = (x0, x1, back, front, c) => [[x0, back], [x1, back], [x1, front - c], [x1 - c, front], [x0 + c, front], [x0, front - c]];

  // --- key planes (identical composition across the three arms) -------------
  const BACK = -1.5, CORE = 0.05, WALL = 0.45, CARVE = 6.25;
  const DW = 1.75, DH = 6.0, DOOR_FRONT = 0.8, DOOR_BACK = DOOR_FRONT - 2.0;
  const PILLARS = [3.55, 5.45], PW = 0.5;
  const LINTEL = [7.3, 8.75];
  const TIERS = [[6.25, 0.98], [5.2, 0.72], [4.15, 0.46]];
  const TIER_H = 1.05;

  // --- solid rock and the dressed wall --------------------------------------
  slabZ([[-CARVE, 0], [-DW - 0.3, 0], [-DW - 0.3, DH + 0.3], [DW + 0.3, DH + 0.3], [DW + 0.3, 0], [CARVE, 0], [CARVE, 11.95], [-CARVE, 11.95]], BACK, CORE, SAND);
  slabZ(rect(-DW - 0.3, DW + 0.3, 0, DH + 0.3), BACK, DOOR_BACK - 0.06, SAND);
  slabZ(rect(-7.95, 7.95, 0, 12.9), BACK, -1.32, SAND);
  both((s) => {
    const x = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    const b0 = PILLARS[0] + PW, b1 = PILLARS[1] - PW, n0 = b0 + 0.2, n1 = b1 - 0.2;
    // the dressed wall, course by course, opening into a stepped niche per bay
    slabY(rect(...x(DW + 1.05, CARVE), CORE, WALL), 0, 1.2, SAND);
    slabY(rect(...x(DW + 1.05, n0), CORE, WALL), 1.2, LINTEL[0], SAND);
    slabY(rect(...x(n1, CARVE), CORE, WALL), 1.2, LINTEL[0], SAND);
    slabY(rect(...x(n0, n0 + 0.1), CORE, WALL), 5.5, LINTEL[0], SAND);
    slabY(rect(...x(n1 - 0.1, n1), CORE, WALL), 5.5, LINTEL[0], SAND);
    slabY(rect(...x(n0 + 0.1, n1 - 0.1), CORE, WALL), 5.75, LINTEL[0], SAND);
    slabY(rect(...x(n0, n1), CORE, CORE + 0.02), 1.2, 5.75, SIENNA);
    slabY(rect(...x(DW + 1.05, CARVE), WALL - 0.02, 0.62), 0, 0.9, SIENNA, 0.06);   // weathered plinth
  });
  slabY(rect(-DW - 1.05, DW + 1.05, CORE, WALL), 7.05, LINTEL[0], SAND);

  // --- doorway: jambs stepping back in plan to a 2 m dark tunnel ------------
  both((s) => {
    const x = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    slabY(chamf(...x(DW + 0.6, DW + 1.05), 0.1, DOOR_FRONT, 0.07), 0, 7.05, BONE);
    slabY(rect(...x(DW + 0.3, DW + 0.6), CORE, 0.5), 0, 6.6, SAND);
    slabY(rect(...x(DW, DW + 0.3), DOOR_BACK - 0.06, 0.2), 0, 6.3, SIENNA);
  });
  slabY(chamf(-DW - 1.05, DW + 1.05, 0.1, DOOR_FRONT, 0.07), 6.6, 7.05, BONE, 0.04);
  slabY(rect(-DW - 0.6, DW + 0.6, CORE, 0.5), 6.3, 6.6, SAND);
  slabY(rect(-DW - 0.3, DW + 0.3, DOOR_BACK - 0.06, 0.2), DH, 6.3, SIENNA);
  const dark = slabY(rect(-DW, DW, DOOR_BACK - 0.06, DOOR_BACK), 0, DH, BASALT);
  dark.name = 'doorway_dark';
  slabY(rect(-DW, DW, DOOR_BACK, DOOR_FRONT), 0, 0.05, SIENNA);

  // --- piers with stepped corners, two collar grooves, stepped capitals -----
  for (const cx0 of PILLARS) both((s) => {
    const cx = s * cx0;
    slabY(stepped(cx, 0.74, CORE, 1.42, 0.12), 0, 0.4, SIENNA, 0.05);
    slabY(stepped(cx, 0.62, CORE, 1.3, 0.12), 0.4, 0.8, SAND, 0.04);
    for (const [y0, y1] of [[0.8, 5.55], [5.65, 5.85], [5.95, 6.4]]) slabY(stepped(cx, PW, CORE, 1.18, 0.14), y0, y1, SAND);
    for (const y0 of [5.55, 5.85]) slabY(stepped(cx, PW - 0.06, CORE, 1.1, 0.1), y0, y0 + 0.1, SIENNA);
    slabY(stepped(cx, 0.6, CORE, 1.25, 0.12), 6.4, 6.7, SAND, 0.04);
    slabY(stepped(cx, 0.7, CORE, 1.31, 0.12), 6.7, 7.0, SAND, 0.04);
    slabY(stepped(cx, 0.8, CORE, 1.38, 0.12), 7.0, LINTEL[0], SUNLIT, 0.04);
  });

  // --- lintel band and a row of bevelled disc medallions --------------------
  slabY(chamf(-CARVE, CARVE, CORE, 1.25, 0.05), LINTEL[0], LINTEL[1], BONE, 0.04);
  const MED_Y = (LINTEL[0] + LINTEL[1]) / 2;
  const medallion = (x, r) => {
    slabZ(circle(x, MED_Y, r + 0.1, 36), 1.2, 1.27, SIENNA);
    slabZ(circle(x, MED_Y, r, 36), 1.2, 1.39, SAND, 0.05);
  };
  medallion(0, 0.58);
  slabZ(circle(0, MED_Y, 0.36, 32), 1.3, 1.44, BONE, 0.04);
  slabZ(circle(0, MED_Y, 0.2, 24), 1.3, 1.5, SAND, 0.05);
  both((s) => {
    medallion(s * 5.45, 0.44);
    slabZ(circle(s * 5.45, MED_Y, 0.22, 24), 1.3, 1.47, BONE, 0.05);
    medallion(s * 3.55, 0.44);
    for (const dx of [-0.14, 0.14]) slabZ(circle(s * 3.55 + dx, MED_Y, 0.11, 16), 1.3, 1.46, BONE, 0.03);
    medallion(s * 1.78, 0.44);
    const R = 0.27, r = 0.22, d = 0.1, ys = (R * R - r * r + d * d) / (2 * d), xs = Math.sqrt(R * R - ys * ys);
    const pts = [];
    const t1 = Math.atan2(ys, xs), t2 = Math.atan2(ys, -xs) - 2 * Math.PI;
    for (let i = 0; i <= 16; i++) { const t = t1 + (t2 - t1) * (i / 16); pts.push([R * Math.cos(t), R * Math.sin(t)]); }
    const p1 = Math.atan2(ys - d, -xs), p2 = Math.atan2(ys - d, xs) + 2 * Math.PI;
    for (let i = 1; i < 16; i++) { const t = p1 + (p2 - p1) * (i / 16); pts.push([r * Math.cos(t), d + r * Math.sin(t)]); }
    const tilt = s * 0.6;
    slabZ(pts.map(([px, py]) => [s * 1.78 + px * Math.cos(tilt) - py * Math.sin(tilt), MED_Y + px * Math.sin(tilt) + py * Math.cos(tilt)]), 1.3, 1.44, BONE, 0.03);
  });

  // --- stepped crown: chamfered tier blocks with a channel and a bone cap ---
  TIERS.forEach(([hw, front], i) => {
    const y0 = LINTEL[1] + i * TIER_H, y1 = y0 + TIER_H - 0.15;
    const m = i ? SUNLIT : SAND;
    slabY(chamf(-hw, hw, CORE, front, 0.1), y0, y0 + 0.38, m, 0.03);
    slabY(chamf(-hw + 0.04, hw - 0.04, CORE, front - 0.15, 0.08), y0 + 0.38, y0 + 0.52, SIENNA);
    slabY(chamf(-hw, hw, CORE, front, 0.1), y0 + 0.52, y1, m, 0.03);
    slabY(chamf(-hw - 0.06, hw + 0.06, CORE, front + 0.06, 0.12), y1, y1 + 0.15, BONE, 0.04);
  });

  // featureless mask with one vertical slit: an egg, broad at the brow
  {
    const egg = Array.from({ length: 48 }, (_, i) => {
      const t = (i / 48) * Math.PI * 2;
      return [0.8 * Math.cos(t) * (1 + 0.12 * Math.sin(t)), 10.72 + 1.08 * Math.sin(t)];
    });
    slabZ(egg, 0.4, 1.02, BONE, 0.16, 3);
    slabZ(rect(-0.08, 0.08, 10.45, 11.45), 0.9, 1.024, BASALT);
  }

  // --- bedded cliff rock: ragged ledges at the sides and across the top -----
  const lip = (x0, x1, n, zLo, zHi) => {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n + (i > 0 && i < n ? rr(-0.2, 0.2) : 0), rr(zLo, zHi)]);
    return pts;
  };
  const ledge = (x0, x1, y0, y1, zLo, zHi, m) => {
    const front = lip(x0, x1, Math.max(3, Math.round((x1 - x0) / 1.4)), zLo, zHi);
    const pts = [[x0, -1.3], [x1, -1.3], ...front.reverse()];
    return slabY(pts.map(([x, z]) => [Math.max(-8, Math.min(8, x)), z]), y0, y1, m, 0.1);
  };
  const bedTone = (y) => {
    if (y < 2.2) return SIENNA;
    if (y > 10.8) return rnd() < 0.6 ? SUNLIT : SAND;
    const t = rnd();
    return t < 0.6 ? SAND : (t < 0.85 ? SUNLIT : SIENNA);
  };
  let y = 0;
  while (y < 11.9) {
    let h = rr(0.75, 1.4);
    if (11.9 - (y + h) < 0.5) h = 11.9 - y;
    const m = bedTone(y + h / 2);
    both((s) => {
      const x = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
      const xin = rr(6.05, 6.3);
      if (rnd() < 0.45) {
        const xm = rr(6.9, 7.4);
        ledge(...x(xin, xm), y, y + h, 0.85, 1.5, m);
        ledge(...x(xm - 0.02, 8), y, y + h - rr(0, 0.12), 0.75, 1.35, m);
      } else {
        ledge(...x(xin, 8), y, y + h, 0.85, 1.5, m);
      }
    });
    y += h;
  }
  // two beds across the top, the upper one broken into blocks of their own height
  ledge(-8, 8, 11.9, 12.45, 0.55, 1.05, bedTone(12.2));
  {
    let x = -8;
    while (x < 7.9) {
      let w = rr(2.0, 3.6);
      if (8 - (x + w) < 1.4) w = 8 - x;
      ledge(x, x + w + 0.02, 12.45, rr(12.7, 13.0), 0.2, 0.85, bedTone(12.8));
      x += w;
    }
  }
  both((s) => ledge(...(s > 0 ? [6.45, 7.4] : [-7.4, -6.45]), 0, rr(0.55, 0.8), 1.2, 1.5, SIENNA));   // fallen block

  // --- bake transforms, then place: base on y = 0, centred on x and z --------
  // Baking leaves every mesh translation-only, so the loader's Box3.setFromObject
  // agrees with the vertex bounds and the doorway data below holds in both modes.
  for (const m of g.children) {
    m.updateMatrix();
    m.geometry = m.geometry.clone().applyMatrix4(m.matrix);
    m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
  }
  const bb = new THREE.Box3(), v = new THREE.Vector3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mm.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });

  const r3 = (a) => a.map((n) => Math.round(n * 1000) / 1000);
  g.userData.doorway = {
    center: r3([-c.x, DH / 2 - bb.min.y, (DOOR_FRONT + DOOR_BACK) / 2 - c.z]),
    size: [2 * DW, DH, DOOR_FRONT - DOOR_BACK],
    threshold: r3([-c.x, 0.05 - bb.min.y, DOOR_FRONT - c.z]),
  };
  return g;
}
