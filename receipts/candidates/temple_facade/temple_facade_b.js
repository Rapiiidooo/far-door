// temple_facade, arm B: profiles.
// Every mass is a 2D outline swept along one axis: elevations with holes pushed
// back in depth (walls, the stepped doorway orders, the lintel with round
// sinkages), plans pushed upward (chamfered, channelled pillars and capitals),
// sections swept sideways (the channelled crown tiers and plinth), lathed
// medallions, and bevelled polygons for the uncut cliff blocks.
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

  let seed = 1357911;
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
  // A bevel normally grows the outline by bevelSize and the depth by twice
  // bevelThickness (docs/traps.md). bevelOffset = -size keeps the side walls on
  // the drawn outline and cuts the chamfer inward; the depth is corrected here.
  const extrudeGeo = (outline, holes, depth, b, segs = 1) => {
    // three.js only re-winds the holes when the outline arrives counter-clockwise
    const ccw = !THREE.ShapeUtils.isClockWise(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    const s = pathPts(new THREE.Shape(), ccw ? outline : outline.slice().reverse());
    for (const h of holes) s.holes.push(pathPts(new THREE.Path(), h));
    const geo = new THREE.ExtrudeGeometry(s, b > 0
      ? { depth: depth - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: segs, curveSegments: 12 }
      : { depth, bevelEnabled: false, curveSegments: 12 });
    geo.translate(0, 0, b);
    return normUV(geo);
  };
  // elevation (x, y) pushed back from z0 to z1
  const slabZ = (pts, z0, z1, m, b = 0, holes = [], segs = 1) => {
    const geo = extrudeGeo(pts, holes, z1 - z0, b, segs); geo.translate(0, 0, z0); return add(geo, m);
  };
  // plan (x, z) pushed up from y0 to y1
  const slabY = (pts, y0, y1, m, b = 0) => {
    const geo = extrudeGeo(pts.map(([x, z]) => [x, -z]), [], y1 - y0, b);
    geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0); return add(geo, m);
  };
  // section (z, y) swept along x from x0 to x1
  const slabX = (pts, x0, x1, m, b = 0) => {
    const geo = extrudeGeo(pts.map(([z, y]) => [-z, y]), [], x1 - x0, b);
    geo.rotateY(Math.PI / 2); geo.translate(x0, 0, 0); return add(geo, m);
  };
  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const circle = (cx, cy, r, n = 32) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);

  // --- key planes (identical composition across the three arms) -------------
  const BACK = -1.5, CORE = 0.05, WALL = 0.45, CARVE = 6.25;
  const DW = 1.75, DH = 6.0, DOOR_FRONT = 0.8, DOOR_BACK = DOOR_FRONT - 2.0;
  const PILLARS = [3.55, 5.45], PW = 0.45;
  const LINTEL = [7.3, 8.75];
  const TIERS = [[6.25, 0.98], [5.2, 0.72], [4.15, 0.46]];
  const TIER_H = 1.05;

  // --- solid rock and the dressed wall --------------------------------------
  slabZ([[-CARVE, 0], [-DW - 0.3, 0], [-DW - 0.3, DH + 0.3], [DW + 0.3, DH + 0.3], [DW + 0.3, 0], [CARVE, 0], [CARVE, 11.95], [-CARVE, 11.95]], BACK, CORE, SAND);
  slabZ(rect(-DW - 0.3, DW + 0.3, 0, DH + 0.3), BACK, DOOR_BACK - 0.06, SAND);
  slabZ(rect(-7.95, 7.95, 0, 12.85), BACK, -1.32, SAND);
  const niche = (s) => {
    const a = s * (PILLARS[0] + PW + 0.2), d = s * (PILLARS[1] - PW - 0.2), b = a + s * 0.1, c = d - s * 0.1;
    return [[a, 1.2], [d, 1.2], [d, 5.5], [c, 5.5], [c, 5.75], [b, 5.75], [b, 5.5], [a, 5.5]];
  };
  slabZ([[-CARVE, 0], [-DW - 1.05, 0], [-DW - 1.05, 7.05], [DW + 1.05, 7.05], [DW + 1.05, 0], [CARVE, 0], [CARVE, LINTEL[0]], [-CARVE, LINTEL[0]]],
    CORE, WALL, SAND, 0.03, [niche(1), niche(-1)]);
  both((s) => slabZ(niche(s), CORE, CORE + 0.02, SIENNA));
  slabZ(rect(-DW - 1.05, DW + 1.05, 7.05, LINTEL[0]), CORE, WALL, SAND);
  // weathered plinth, a section with a chamfered top
  both((s) => {
    const x0 = s > 0 ? DW + 1.05 : -CARVE, x1 = s > 0 ? CARVE : -DW - 1.05;
    slabX([[CORE, 0], [0.62, 0], [0.62, 0.8], [0.52, 0.9], [CORE, 0.9]], x0, x1, SIENNA);
  });

  // --- doorway: three U-shaped orders stepping back to a 2 m dark tunnel -----
  const U = (xi, xo, yi, yo) => [[-xo, 0], [-xi, 0], [-xi, yi], [xi, yi], [xi, 0], [xo, 0], [xo, yo], [-xo, yo]];
  slabZ(U(DW + 0.6, DW + 1.05, 6.6, 7.05), 0.1, DOOR_FRONT, BONE, 0.06);
  slabZ(U(DW + 0.3, DW + 0.6, 6.3, 6.6), CORE, 0.5, SAND, 0.05);
  slabZ(U(DW, DW + 0.3, DH, 6.3), DOOR_BACK - 0.06, 0.2, SIENNA, 0.05);
  const dark = slabZ(rect(-DW, DW, 0, DH), DOOR_BACK - 0.06, DOOR_BACK, BASALT);
  dark.name = 'doorway_dark';
  slabY(rect(-DW, DW, DOOR_BACK, DOOR_FRONT), 0, 0.05, SIENNA);

  // --- pillars: chamfered plans with a front channel, pushed upward ---------
  const plan = (cx, hw, front, ch, chan) => {
    const p = [[cx - hw, CORE], [cx + hw, CORE], [cx + hw, front - ch], [cx + hw - ch, front]];
    if (chan) p.push([cx + chan, front], [cx + chan, front - 0.15], [cx - chan, front - 0.15], [cx - chan, front]);
    p.push([cx - hw + ch, front], [cx - hw, front - ch]);
    return p;
  };
  for (const cx0 of PILLARS) both((s) => {
    const cx = s * cx0;
    slabY(plan(cx, 0.7, 1.4, 0.12), 0, 0.4, SIENNA, 0.06);
    slabY(plan(cx, 0.58, 1.28, 0.1), 0.4, 0.8, SAND, 0.05);
    for (const [y0, y1] of [[0.8, 5.7], [5.8, 5.95], [6.05, 6.4]]) slabY(plan(cx, PW, 1.16, 0.09, 0.12), y0, y1, SAND);
    for (const y0 of [5.7, 5.95]) slabY(plan(cx, PW - 0.05, 1.08, 0.06), y0, y0 + 0.1, SIENNA);
    slabY(rect(cx - 0.12, cx + 0.12, 1.0, 1.02), 0.8, 6.4, SIENNA);          // channel floor
    slabY(plan(cx, 0.56, 1.23, 0.08), 6.4, 6.7, SAND, 0.04);
    slabY(plan(cx, 0.67, 1.3, 0.08), 6.7, 7.0, SAND, 0.04);
    slabY(plan(cx, 0.78, 1.37, 0.08), 7.0, LINTEL[0], SUNLIT, 0.04);
  });

  // --- lintel: a bone band with round sinkages, lathed medallions in them ---
  const MED_Y = (LINTEL[0] + LINTEL[1]) / 2;
  const MEDS = [[0, 0.58], [1.78, 0.44], [-1.78, 0.44], [3.55, 0.44], [-3.55, 0.44], [5.45, 0.44], [-5.45, 0.44]];
  slabZ(rect(-CARVE, CARVE, LINTEL[0], LINTEL[1]), CORE, 1.07, SIENNA);
  slabZ(rect(-CARVE, CARVE, LINTEL[0], LINTEL[1]), 1.07, 1.25, BONE, 0.035, MEDS.map(([x, r]) => circle(x, MED_Y, r + 0.1, 36)));
  const lathe = (profile, R, seg = 28) => {
    const geo = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r * R, h)), seg);
    geo.rotateX(Math.PI / 2);   // lathe axis +Y becomes the facing direction +Z
    return geo;
  };
  const DOMED = [[1, 0], [1, 0.16], [0.93, 0.22], [0.77, 0.22], [0.7, 0.14], [0.51, 0.14], [0.46, 0.2], [0.38, 0.26], [0.22, 0.3], [0, 0.31]];
  const FLAT = [[1, 0], [1, 0.16], [0.93, 0.22], [0.77, 0.22], [0.7, 0.14], [0, 0.14]];
  const medal = (x, R, profile) => { const m = add(lathe(profile, R), SAND); m.position.set(x, MED_Y, 1.07); return m; };
  medal(0, 0.58, DOMED);
  both((s) => {
    medal(s * 5.45, 0.44, DOMED);
    // a tilted crescent: outer arc and inner arc of two offset circles
    medal(s * 1.78, 0.44, FLAT);
    const R = 0.27, r = 0.22, d = 0.1, ys = (R * R - r * r + d * d) / (2 * d), xs = Math.sqrt(R * R - ys * ys);
    const pts = [];
    const t1 = Math.atan2(ys, xs), t2 = Math.atan2(ys, -xs) - 2 * Math.PI;
    for (let i = 0; i <= 16; i++) { const t = t1 + (t2 - t1) * (i / 16); pts.push([R * Math.cos(t), R * Math.sin(t)]); }
    const p1 = Math.atan2(ys - d, -xs), p2 = Math.atan2(ys - d, xs) + 2 * Math.PI;
    for (let i = 1; i < 16; i++) { const t = p1 + (p2 - p1) * (i / 16); pts.push([r * Math.cos(t), d + r * Math.sin(t)]); }
    const tilt = s * 0.6;
    const rot = pts.map(([x, y]) => [s * 1.78 + x * Math.cos(tilt) - y * Math.sin(tilt), MED_Y + x * Math.sin(tilt) + y * Math.cos(tilt)]);
    slabZ(rot, 1.2, 1.3, BONE, 0.02);
    // twin circles
    medal(s * 3.55, 0.44, FLAT);
    for (const dx of [-0.14, 0.14]) {
      const m = add(lathe([[1, 0], [1, 0.05], [0.7, 0.1], [0, 0.12]], 0.11, 16), BONE);
      m.position.set(s * 3.55 + dx, MED_Y, 1.2);
    }
  });

  // --- stepped crown: channelled sections swept sideways, bone caps ---------
  TIERS.forEach(([hw, front], i) => {
    const y0 = LINTEL[1] + i * TIER_H, y1 = y0 + TIER_H - 0.15, zb = CORE - 0.3;
    slabX([[zb, y0], [front, y0], [front, y0 + 0.36], [front - 0.14, y0 + 0.41], [front - 0.14, y0 + 0.47], [front, y0 + 0.52], [front, y1], [zb, y1]],
      -hw, hw, i ? SUNLIT : SAND);
    slabX(rect(front - 0.15, front - 0.13, y0 + 0.41, y0 + 0.47), -hw + 0.02, hw - 0.02, SIENNA);
    slabX([[zb, y1], [front, y1], [front + 0.07, y1 + 0.07], [front + 0.07, y1 + 0.15], [zb, y1 + 0.15]], -hw - 0.07, hw + 0.07, BONE);
  });

  // featureless mask, a rounded pillow with one vertical slit cut through it
  {
    const ell = Array.from({ length: 44 }, (_, i) => { const a = (i / 44) * Math.PI * 2; return [0.82 * Math.cos(a), 10.72 + 1.1 * Math.sin(a)]; });
    // a bevelled hole would flare into a funnel, so the slit is a dark inlay
    slabZ(ell, 0.4, 1.02, BONE, 0.16, [], 3);
    slabZ(rect(-0.08, 0.08, 10.1, 11.34), 0.9, 1.024, BASALT);
  }

  // --- uncut cliff rock: chunky polygons with broken corners, bevelled ------
  const rockBlock = (x0, x1, y0, y1, zFront, m) => {
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const cs = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    const pts = [];
    cs.forEach(([x, y], i) => {
      if (rnd() < 0.7) {
        const [px, py] = cs[(i + 3) % 4], [nx, ny] = cs[(i + 1) % 4];
        const a = rr(0.15, 0.42) * Math.min(w, h), b = rr(0.15, 0.42) * Math.min(w, h);
        const li = Math.hypot(px - x, py - y), lo = Math.hypot(nx - x, ny - y);
        pts.push([x + ((px - x) / li) * a, y + ((py - y) / li) * a], [x + ((nx - x) / lo) * b, y + ((ny - y) / lo) * b]);
      } else pts.push([x, y]);
    });
    const zBack = -1.25;
    const geo = extrudeGeo(pts.map(([x, y]) => [x + rr(-0.06, 0.06), y + rr(-0.06, 0.06)]), [], zFront - zBack, 0.12);
    geo.translate(0, 0, zBack);
    geo.rotateX(rr(-0.12, 0.12)); geo.rotateY(rr(-0.1, 0.1));
    geo.translate(cx, cy, 0);
    // clamp to the brief's 16 x 13 x 3 m, so blocks at the edge read as cut
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(i, Math.max(-8, Math.min(8, p.getX(i))), Math.max(0, Math.min(13, p.getY(i))), Math.max(-1.45, Math.min(1.5, p.getZ(i))));
    }
    geo.computeVertexNormals();
    return add(geo, m);
  };
  const toneAt = (y) => {
    const t = rnd();
    if (y < 2.4) return t < 0.75 ? SIENNA : SAND;
    if (y > 10.2) return t < 0.55 ? SUNLIT : SAND;
    return t < 0.8 ? SAND : (t < 0.9 ? SUNLIT : SIENNA);
  };
  both((s) => {
    const span = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    let y = -0.3;
    while (y < 11.9) {
      const h = rr(1.4, 2.4), y1 = y + h;
      if (rnd() < 0.5) {
        const xm = rr(6.9, 7.3);
        rockBlock(...span(rr(6.0, 6.15), xm + 0.15), y, y1 + 0.15, rr(1.0, 1.4), toneAt(y + h / 2));
        rockBlock(...span(xm - 0.1, 8.3), y + rr(-0.2, 0.3), y1 + rr(-0.1, 0.2), rr(0.8, 1.25), toneAt(y + h / 2));
      } else {
        rockBlock(...span(rr(6.0, 6.15), 8.3), y, y1 + 0.15, rr(0.95, 1.4), toneAt(y + h / 2));
      }
      y = y1;
    }
    rockBlock(...span(6.4, 7.4), -0.2, rr(0.6, 0.85), 1.45, SIENNA);
  });
  {
    let x = -8.3;
    while (x < 8) {
      let w = rr(1.6, 2.7);
      if (8.3 - (x + w) < 1.1) w = 8.3 - x;
      const x1 = x + w, mid = Math.abs((x + x1) / 2);
      rockBlock(x, x1 + 0.1, 11.85, rr(12.5, 13.15), mid < 4.5 ? rr(0.6, 1.05) : rr(0.9, 1.35), toneAt(12.5));
      x = x1 - 0.05;
    }
  }

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
