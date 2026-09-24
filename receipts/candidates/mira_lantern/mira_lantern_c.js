// mira_lantern, arm C: a second reading, every part lofted by hand from rings.
// Where A and B stand a straight box on a low plinth, this is a taller round drum
// under a body that flares towards the top, the carriage-lantern taper: four round
// rods at the corners, square rails top and bottom, four trapezoid panes leaning
// with them 6 mm behind the rods. A broad eave, then a steeper cone pierced by
// eight round holes, each a tile of the cone's own surface with a hole in it, over
// a soot cone; a chimney and a cap. The bail is a wire bent square over the top,
// carrying a turned timber grip. A stouter dish, candle and flame; the flame is
// its own mesh, origin at the wick. About 0.26 x 0.45 x 0.24 m.
export default function (THREE) {
  const g = new THREE.Group();
  const TAU = Math.PI * 2;

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
  const TIMBER = M(0x8a6a48, 'timber', 0.85);
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

  // ---- merging: one mesh per material, UVs projected from each face's main axis ---------
  const boxUv = (pos, n) => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    const uv = new Float32Array(n * 2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      a.fromArray(pos, t * 3); b.fromArray(pos, t * 3 + 3); c.fromArray(pos, t * 3 + 6);
      const f = b.sub(a).cross(c.sub(a));
      const ax = Math.abs(f.x), ay = Math.abs(f.y), az = Math.abs(f.z);
      for (let k = t; k < t + 3; k++) {
        const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
        const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
        uv[k * 2] = u / su; uv[k * 2 + 1] = v / sv;
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
    out.setAttribute('uv', boxUv(pos, n));
    return out;
  };
  const buckets = new Map();
  const put = (mat, geo) => { if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(geo); return geo; };

  // ---- rings and lofts ------------------------------------------------------------------
  // A ring runs round in the direction of increasing angle (x = r sin a, z = r cos a);
  // rings listed along a profile that runs out along the bottom, up the outside and
  // in along the top give faces that look out, as a lathe's do.
  const finish = (pos, idx, smooth) => {
    const b = new THREE.BufferGeometry();
    b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    b.setIndex(idx);
    const out = smooth ? b : b.toNonIndexed();
    out.computeVertexNormals();
    return out;
  };
  const ring = (r, y, n, phase = 0) => Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * TAU;
    return [r * Math.sin(a), y, r * Math.cos(a)];
  });
  const loft = (rings, smooth = true) => {
    const pos = [], idx = [], n = rings[0].length;
    for (const rg of rings) for (const p of rg) pos.push(p[0], p[1], p[2]);
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < n; i++) {
        const a = r * n + i, b = r * n + ((i + 1) % n);
        idx.push(a, b, b + n, a, b + n, a + n);
      }
    }
    return finish(pos, idx, smooth);
  };
  const cap = (rg, up) => {
    const n = rg.length, c = [0, 0, 0];
    for (const p of rg) for (let k = 0; k < 3; k++) c[k] += p[k] / n;
    const pos = [...c], idx = [];
    for (const p of rg) pos.push(p[0], p[1], p[2]);
    for (let i = 0; i < n; i++) {
      const a = 1 + i, b = 1 + ((i + 1) % n);
      if (up) idx.push(0, a, b); else idx.push(0, b, a);
    }
    return finish(pos, idx, false);
  };
  // a profile of [radius, height] in runs, smooth within a run and crisp between runs
  const turned = (runs, rf, smooth = true) => runs.map((run) => loft(run.map(([r, y]) => rf(r, y)), smooth));
  const turn = (mat, runs, rf, smooth = true) => turned(runs, rf, smooth).forEach((x) => put(mat, x));
  const round = (n) => (r, y) => ring(r, y, n);
  const square = (hw, y) => ring(hw * Math.SQRT2, y, 4, Math.PI / 4);   // half width to corner radius
  // a tube along a path in the XY plane, each ring square to the path
  const tube = (pts, r, n) => loft(pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    return Array.from({ length: n }, (_, k) => {
      const f = (k / n) * TAU;
      return [p[0] + r * Math.cos(f) * nx, p[1] + r * Math.cos(f) * ny, p[2] + r * Math.sin(f)];
    });
  }));

  // ---- the round drum -----------------------------------------------------------------
  const Y0 = 0.05;                                          // floor of the lantern
  turn(BRONZE, [[[0.001, 0], [0.101, 0]]], round(12));       // underside, never seen
  turn(BRONZE, [
    [[0.101, 0], [0.106, 0.004], [0.106, 0.01]],            // bevelled foot ring
    [[0.106, 0.01], [0.099, 0.013]],
    [[0.099, 0.013], [0.097, 0.04]],                         // the drum wall
    [[0.097, 0.04], [0.102, 0.045], [0.097, Y0]],            // rolled rim
    [[0.097, Y0], [0.001, Y0]],                              // floor
  ], round(24));

  // ---- the body, flaring from 0.12 to 0.148 m across the rods --------------------------------
  const Y1 = 0.225, WB = 0.06, WT = 0.074;
  const w = (y) => WB + ((WT - WB) * (y - Y0)) / (Y1 - Y0);
  turn(BRONZE, [[[WB - 0.01, Y0 + 0.016], [WB - 0.01, Y0], [WB + 0.005, Y0], [WB + 0.005, Y0 + 0.011],
    [WB + 0.002, Y0 + 0.016], [WB - 0.01, Y0 + 0.016]]], square, false);
  turn(BRONZE, [[[WT - 0.01, Y1], [WT - 0.01, Y1 - 0.016], [WT + 0.002, Y1 - 0.016], [WT + 0.005, Y1 - 0.011],
    [WT + 0.005, Y1], [WT - 0.01, Y1]]], square, false);
  // round rods leaning out with the taper, their ends buried in the rails
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const at = (y) => ring(0.0065, y, 8).map(([x, yy, z]) => [x + sx * (w(y) - 0.001), yy, z + sz * (w(y) - 0.001)]);
      put(BRONZE, loft([at(Y0 + 0.006), at(Y1 - 0.006)]));
    }
  }
  // trapezoid panes 6 mm behind the rods' axes, their edges buried in rods and rails
  const PT = 0.004;
  const paneRing = (y) => {
    const s = w(y) - 0.001, z = w(y) - 0.006;
    return [[s, y, z + PT / 2], [s, y, z - PT / 2], [-s, y, z - PT / 2], [-s, y, z + PT / 2]];
  };
  const yb = Y0 + 0.008, yt = Y1 - 0.008;
  for (let k = 0; k < 4; k++) {
    const turnY = new THREE.Matrix4().makeRotationY((k * Math.PI) / 2);
    for (const x of [loft([paneRing(yb), paneRing(yt)], false), cap(paneRing(yb), false), cap(paneRing(yt), true)]) {
      put(PANE, x.applyMatrix4(turnY));
    }
  }

  // ---- inside: dish, candle stub, wick ------------------------------------------------------
  turn(BRONZE, [
    [[0.029, Y0], [0.037, Y0 + 0.006], [0.039, Y0 + 0.009], [0.035, Y0 + 0.011]],   // wall and rolled lip
    [[0.035, Y0 + 0.011], [0.03, Y0 + 0.005], [0.001, Y0 + 0.005]],                 // inside and floor
  ], round(14));
  const CY1 = Y0 + 0.05;                                   // candle top, 0.1
  turn(WAX, [
    [[0.019, Y0 + 0.005], [0.0186, CY1 - 0.005], [0.0172, CY1]],
    [[0.0172, CY1], [0.011, CY1 - 0.0025], [0.002, CY1 - 0.0035]],                   // melted, dished top
  ], round(12));
  turn(SOOT, [[[0.002, CY1 - 0.004], [0.0017, CY1 + 0.007], [0.0004, CY1 + 0.0095]]], round(5));

  // ---- the flame: its own mesh, origin at its root on the wick -------------------------------
  const flame = new THREE.Mesh(loft([[0.0004, 0], [0.007, 0.0025], [0.0115, 0.009], [0.0124, 0.017], [0.0104, 0.027],
    [0.0068, 0.037], [0.0029, 0.045], [0.0003, 0.051]].map(([r, y]) => ring(r, y, 10))), FLAME);
  flame.name = 'flame';
  flame.position.set(0, CY1 + 0.0015, 0);
  g.add(flame);

  // ---- the roof ---------------------------------------------------------------------------
  // Eight holes, one facing front. Every roof ring uses the tiles' own angles (four
  // per tile, at u = -1, -tan 22.5, 0, tan 22.5), so the rows meet the tiles exactly.
  const HOLES = 8, DA = TAU / HOLES, T8 = Math.SQRT2 - 1;
  const ANG = [];
  for (let k = 0; k < HOLES; k++) for (const u of [-1, -T8, 0, T8]) ANG.push(k * DA + (u * DA) / 2);
  const ringA = (r, y) => ANG.map((a) => [r * Math.sin(a), y, r * Math.cos(a)]);
  turn(BRONZE, [
    [[0.07, Y1], [0.118, Y1]],                                 // eave, underneath
    [[0.118, Y1], [0.121, Y1 + 0.004], [0.116, Y1 + 0.01]],     // eave bead
    [[0.116, Y1 + 0.01], [0.112, Y1 + 0.011]],
  ], ringA);
  // the cone, straight from the eave to the chimney: a row, the pierced band, a row
  const R0 = 0.112, H0 = Y1 + 0.011, R1 = 0.03, H1 = Y1 + 0.104, F0 = 0.3, F1 = 0.62;
  const onCone = (a, f) => { const r = R0 + (R1 - R0) * f; return [r * Math.sin(a), H0 + (H1 - H0) * f, r * Math.cos(a)]; };
  const cone = [
    loft([ANG.map((a) => onCone(a, 0)), ANG.map((a) => onCone(a, F0))]),
    loft([ANG.map((a) => onCone(a, F1)), ANG.map((a) => onCone(a, 1))]),
  ];
  {
    // per hole, a tile: sixteen points round the tile's square and sixteen round the
    // hole, in (u, v) across the tile's angle and up its slant, joined as quads
    const K = 16, HR = 0.0095, pos = [], idx = [];
    const rm = R0 + (R1 - R0) * ((F0 + F1) / 2);
    const hu = HR / ((rm * DA) / 2), hv = HR / ((Math.hypot(R1 - R0, H1 - H0) * (F1 - F0)) / 2);
    for (let k = 0; k < HOLES; k++) {
      const b = pos.length / 3;
      const uv = (u, v) => pos.push(...onCone(k * DA + (u * DA) / 2, F0 + ((v + 1) / 2) * (F1 - F0)));
      for (let i = 0; i < K; i++) {
        const f = (i / K) * TAU, c = Math.cos(f), s = Math.sin(f), m = Math.max(Math.abs(c), Math.abs(s));
        uv(c / m, s / m);
      }
      for (let i = 0; i < K; i++) uv(hu * Math.cos((i / K) * TAU), hv * Math.sin((i / K) * TAU));
      for (let i = 0; i < K; i++) {
        const j = (i + 1) % K;
        idx.push(b + i, b + j, b + K + j, b + i, b + K + j, b + K + i);
      }
    }
    cone.push(finish(pos, idx, true));
  }
  // one normal field for the whole cone, so the rows and the tiles shade as one sheet
  const dl = Math.hypot(H1 - H0, R1 - R0), ny = -(R1 - R0) / dl, nh = (H1 - H0) / dl;
  for (const x of cone) {
    const p = x.attributes.position, n = x.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getX(i), p.getZ(i));
      n.setXYZ(i, nh * Math.sin(a), ny, nh * Math.cos(a));
    }
    put(BRONZE, x);
  }
  // soot cone 4 mm inside, closed underneath: the dark behind every hole
  turn(SOOT, [[[0.001, Y1 + 0.009], [0.105, Y1 + 0.009]], [[0.105, Y1 + 0.009], [0.023, Y1 + 0.102]]], round(24));
  turn(BRONZE, [
    [[R1, H1], [0.026, H1 + 0.002], [0.026, H1 + 0.014]],             // chimney
    [[0.026, H1 + 0.014], [0.037, H1 + 0.014]],                        // cap, underneath
    [[0.037, H1 + 0.014], [0.037, H1 + 0.017], [0.009, H1 + 0.031]],   // cap
    [[0.009, H1 + 0.031], [0.0095, H1 + 0.036], [0.001, H1 + 0.042]],  // knob
  ], round(16));

  // ---- the bail: bosses on the eave, a wire bent square over the top, a timber grip ----------
  const BY = Y1 + 0.005, BX = 0.128, TOPY = 0.44, RS = 0.05;
  for (const s of [-1, 1]) {
    for (const x of turned([[[0.008, 0], [0.008, 0.006]], [[0.008, 0.006], [0.0045, 0.0085], [0.001, 0.009]]], round(8))) {
      put(BRONZE, x.rotateZ((-s * Math.PI) / 2).translate(s * 0.116, BY, 0));
    }
  }
  const path = [[-BX, BY - 0.001, 0], [-BX, TOPY - RS, 0]];
  for (let i = 1; i <= 6; i++) {                             // left shoulder
    const a = Math.PI - (i / 6) * (Math.PI / 2);
    path.push([-(BX - RS) + RS * Math.cos(a), TOPY - RS + RS * Math.sin(a), 0]);
  }
  for (let i = 0; i <= 6; i++) {                             // right shoulder
    const a = Math.PI / 2 - (i / 6) * (Math.PI / 2);
    path.push([BX - RS + RS * Math.cos(a), TOPY - RS + RS * Math.sin(a), 0]);
  }
  path.push([BX, BY - 0.001, 0]);
  put(BRONZE, tube(path, 0.0045, 6));
  for (const x of turned([
    [[0.0045, -0.052], [0.0068, -0.052]],                    // end, round the wire
    [[0.0068, -0.052], [0.0068, -0.047]],                    // collar
    [[0.0068, -0.047], [0.0092, -0.042], [0.0103, -0.02], [0.0103, 0.02], [0.0092, 0.042], [0.0068, 0.047]],
    [[0.0068, 0.047], [0.0068, 0.052]],
    [[0.0068, 0.052], [0.0045, 0.052]],
  ], round(8))) {
    put(TIMBER, x.rotateZ(-Math.PI / 2).translate(0, TOPY, 0));
  }

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
  g.userData.light = [r3(flame.position.x), r3(flame.position.y + 0.02), r3(flame.position.z)];
  return g;
}
