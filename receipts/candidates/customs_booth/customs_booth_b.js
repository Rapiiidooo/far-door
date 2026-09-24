// customs_booth, arm B: profiles.
// Every stepped course (plinth, striped band, cornice and roof tiers) is one
// chamfered profile swept round the booth's rectangle with mitred corners, so the
// steps run unbroken round all four sides. The walls are extruded shapes with real
// holes: the window, and recesses where chalk panels sit 5 cm back. Medallions,
// stamp, lamp collar and barrier post are revolved; the crescents, diagonal
// stamp-ochre stripes, slates and the tapering barrier arm are extruded outlines.
// Booth 2.4 x 2.0 m, 2.8 m to the top of the lamp; 6.65 m wide with the arm.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const NIGHT = M(0x2a2830, 'stone', 0.84);
  const SHADOW = M(0x131118, 'stone', 0.96);
  const CHALK = M(0xc9c2d8, 'plaster', 0.82);
  const OCHRE = M(0xd9a441, 'plaster', 0.72);
  const BRONZE = M(0x9a6a35, 'metal', 0.5, 0.6);
  const TIMBER = M(0x8a6a48, 'timber', 0.86);
  const SLATE = M(0x8c7fa3, 'stone', 0.74);
  // The lamp keeps a material of its own so the game can dim or flash it (lit at 2,
  // above the second world's bloom threshold; 0 shows dormant crystal). Unnamed and
  // just under opaque so the loader's procedural surfaces leave it alone.
  const LAMP = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 2,
    roughness: 0.3, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  // ---- merging: one mesh per material per moving group --------------------------
  // UVs are projected from each face's dominant axis over the merged mesh's box, so
  // the loader's surfaces keep one texel density across big and small parts.
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
  const STATIC = new Map(), ARM = new Map();
  const put = (mat, geo, bucket = STATIC) => { if (!bucket.has(mat)) bucket.set(mat, []); bucket.get(mat).push(geo); return geo; };
  const flush = (bucket, parent) => { for (const [mat, geos] of bucket) parent.add(new THREE.Mesh(merge(geos), mat)); };

  // ---- profile tools --------------------------------------------------------------
  // rectSweep: profile points [d, y], bottom to top along the outside, each a ring of
  // half-size (hx + d, hz + d) at height y; corners are mitred by construction.
  const rectSweep = (profile, hx, hz, cx, cz, capBottom = true, capTop = true) => {
    const P = [], N = [];
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
    const tri = (a, b, c, want) => {
      e1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      e2.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      n.crossVectors(e1, e2);
      if (n.lengthSq() < 1e-14) return;
      n.normalize();
      if (want !== undefined && n.y * want < 0) { [b, c] = [c, b]; n.negate(); }
      P.push(...a, ...b, ...c);
      for (let k = 0; k < 3; k++) N.push(n.x, n.y, n.z);
    };
    const at = ([d, y], sx, sz) => [cx + sx * (hx + d), y, cz + sz * (hz + d)];
    // left and right corners of each side as seen from outside it: +z, +x, -z, -x
    const SIDES = [[[-1, 1], [1, 1]], [[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]]];
    for (let i = 0; i < profile.length - 1; i++) {
      for (const [[lx, lz], [rx, rz]] of SIDES) {
        const a = at(profile[i], lx, lz), b = at(profile[i], rx, rz);
        const c = at(profile[i + 1], rx, rz), d = at(profile[i + 1], lx, lz);
        tri(a, b, c); tri(a, c, d);
      }
    }
    const cap = (p, want) => {
      const a = at(p, -1, 1), b = at(p, 1, 1), c = at(p, 1, -1), d = at(p, -1, -1);
      tri(a, b, c, want); tri(a, c, d, want);
    };
    if (capBottom) cap(profile[0], -1);
    if (capTop) cap(profile[profile.length - 1], 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    return geo;
  };
  // lathe: [r, y] bottom to top along the outside. One lathe per edge keeps steps
  // crisp; LatheGeometry leaves its last normal unnormalised, so renormalise.
  const fixNormals = (geo) => {
    const nr = geo.attributes.normal, v = new THREE.Vector3();
    for (let k = 0; k < nr.count; k++) { v.fromBufferAttribute(nr, k).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    return geo;
  };
  const lathe = (pts, segs, smooth = false) => {
    if (smooth) return [fixNormals(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs))];
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i][0] === 0 && pts[i + 1][0] === 0) continue;
      out.push(fixNormals(new THREE.LatheGeometry([new THREE.Vector2(...pts[i]), new THREE.Vector2(...pts[i + 1])], segs)));
    }
    return out;
  };
  const turn = (geos, axis) => {                 // lathe axis y onto +x or +z
    for (const geo of geos) { if (axis === 'x') geo.rotateZ(-Math.PI / 2); if (axis === 'z') geo.rotateX(Math.PI / 2); }
    return geos;
  };
  const shift = (geos, x, y, z) => { for (const geo of geos) geo.translate(x, y, z); return geos; };
  const putAll = (mat, geos, bucket = STATIC) => { for (const geo of geos) put(mat, geo, bucket); };
  // extrude: an outline in (u, v), depth along +w, no bevel (a bevel grows the outline)
  const shape = (pts, holes = []) => {
    const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
    return s;
  };
  const extrude = (s, w0, w1, curveSegments = 12) => {
    const geo = new THREE.ExtrudeGeometry(s, { depth: w1 - w0, bevelEnabled: false, curveSegments });
    geo.translate(0, 0, w0);
    return geo;
  };
  const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const rectHole = (u0, v0, u1, v1) => [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
  const crescent = (R, r2, ox, oy, n = 20) => {
    const d = Math.hypot(ox, oy), a = (R * R - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
    const px = (a / d) * ox, py = (a / d) * oy, qx = (-oy / d) * h, qy = (ox / d) * h;
    const i1 = [px + qx, py + qy], i2 = [px - qx, py - qy];
    const t1 = Math.atan2(i1[1], i1[0]), t2 = Math.atan2(i2[1], i2[0]);
    const f1 = Math.atan2(i1[1] - oy, i1[0] - ox), f2 = Math.atan2(i2[1] - oy, i2[0] - ox);
    const TAU = Math.PI * 2, span = (x) => ((x % TAU) + TAU) % TAU;
    const pts = [];
    const so = span(t2 - t1), si = span(f2 - f1);
    for (let k = 0; k <= n; k++) { const t = t1 + (so * k) / n; pts.push([R * Math.cos(t), R * Math.sin(t)]); }
    for (let k = 1; k < n; k++) { const t = f2 - (si * k) / n; pts.push([ox + r2 * Math.cos(t), oy + r2 * Math.sin(t)]); }
    return pts;
  };

  // ---- layout ------------------------------------------------------------------------
  // Walls at x = +-1.06, z = 0.66 (front) and -0.86 (back), 16 cm thick; the plinth and
  // cornice step out round them; the counter reaches z = 1.0.
  const WX = 1.06, WF = 0.66, WB = -0.86, T = 0.16, ZC = (WF + WB) / 2, HZ = (WF - WB) / 2;
  const BASE = 0.18, SILL = 1.08, HEAD = 1.72, WIN = 0.78, FLOOR = 0.55, BAND0 = 1.8, BAND1 = 2.02;
  // a face frame: u runs to the right as seen from outside, w outwards from the face
  const FACES = {
    pz: { half: WX, put: (geo, w = 0) => geo.translate(0, 0, WF + w) },
    nz: { half: WX, put: (geo, w = 0) => { geo.rotateY(Math.PI); return geo.translate(0, 0, WB - w); } },
    px: { half: HZ, put: (geo, w = 0) => { geo.rotateY(Math.PI / 2); return geo.translate(WX + w, 0, ZC); } },
    nx: { half: HZ, put: (geo, w = 0) => { geo.rotateY(-Math.PI / 2); return geo.translate(-WX - w, 0, ZC); } },
  };

  // plinth: two chamfered steps swept round the walls
  put(NIGHT, rectSweep([[0.12, 0], [0.12, 0.06], [0.09, 0.09], [0.06, 0.09], [0.06, 0.15], [0.03, BASE], [0, BASE]], WX, HZ, 0, ZC));

  // walls: front with the window and a recess under the counter, back with a door
  // recess, sides with a panel recess each; the sides fit between front and back
  const PANEL = { pz: [-0.56, 0.3, 0.56, 0.78], nz: [-0.4, 0.3, 0.4, 1.6], px: [-0.52, 0.32, 0.52, 1.6], nx: [-0.52, 0.32, 0.52, 1.6] };
  for (const [f, F] of Object.entries(FACES)) {
    const half = f === 'px' || f === 'nx' ? HZ - T : F.half;
    const holes = [rectHole(...PANEL[f])];
    if (f === 'pz') holes.push(rectHole(-WIN, SILL - 0.07, WIN, HEAD));
    put(NIGHT, F.put(extrude(shape(rect(-half, BASE, half, BAND0), holes), -T, 0)));
    // the chalk panel sits 5 cm back in its recess
    put(CHALK, F.put(extrude(shape(rect(...PANEL[f])), -0.08, -0.05)));
  }
  // the room: raised floor and a near-black lining so the window reads dark
  put(NIGHT, rectSweep([[0, BASE], [0, FLOOR]], WX - T, HZ - T, 0, ZC, false, true));
  const inner = (w, h, x, y, z, rx, ry) => {
    const geo = new THREE.PlaneGeometry(w, h);
    if (rx) geo.rotateX(rx);
    if (ry) geo.rotateY(ry);
    put(SHADOW, geo.translate(x, y, z));
  };
  const RX = WX - T - 0.004, RB = WB + T + 0.004, RF = WF - T, RH = HEAD - FLOOR - 0.008;
  inner(2 * RX, RH, 0, (FLOOR + HEAD) / 2, RB);
  inner(2 * RX, RF - RB, 0, FLOOR + 0.004, (RF + RB) / 2, -Math.PI / 2);
  inner(2 * RX, RF - RB, 0, HEAD - 0.004, (RF + RB) / 2, Math.PI / 2);
  inner(RF - RB, RH, -RX, (FLOOR + HEAD) / 2, (RF + RB) / 2, 0, Math.PI / 2);
  inner(RF - RB, RH, RX, (FLOOR + HEAD) / 2, (RF + RB) / 2, 0, -Math.PI / 2);
  put(NIGHT, rectSweep([[0, HEAD], [0, BAND0]], WX - T + 0.001, HZ - T + 0.001, 0, ZC, true, false));

  // medallions: a revolved chamfered disc, a bronze rim, an extruded ochre crescent
  const medallion = (f, u, v, r) => {
    const F = FACES[f];
    const disc = lathe([[0, 0], [r, 0], [r, 0.02], [r - 0.02, 0.04], [0, 0.04]], 32);
    const rim = lathe([[r - 0.03, 0.035], [r + 0.012, 0.035], [r + 0.02, 0.05], [r + 0.012, 0.065], [r - 0.03, 0.065], [r - 0.03, 0.035]], 32);
    for (const geo of [...turn(disc, 'z'), ...turn(rim, 'z')]) geo.translate(u, v, 0);
    for (const geo of disc) put(NIGHT, F.put(geo, -0.05));
    for (const geo of rim) put(BRONZE, F.put(geo, -0.05));
    const cr = extrude(shape(crescent(r * 0.66, r * 0.56, r * 0.24, r * 0.14)), 0, 0.012, 24);
    put(OCHRE, F.put(cr.translate(u, v, 0), -0.05 + 0.04));
  };
  medallion('pz', 0, 0.54, 0.19);
  medallion('px', 0, 1.02, 0.3);
  medallion('nx', 0, 1.02, 0.3);
  medallion('nz', 0, 1.3, 0.15);
  // door ring and pull, and three raised ribs either side of the door
  const pull = turn(lathe([[0, 0], [0.03, 0], [0.03, 0.03], [0.045, 0.045], [0.045, 0.06], [0, 0.06]], 16), 'z');
  for (const geo of shift(pull, 0.28, 0.96, 0)) put(BRONZE, FACES.nz.put(geo, -0.05));
  for (const s of [-1, 1]) for (const v of [0.55, 0.7, 0.85]) {
    put(NIGHT, FACES.nz.put(extrude(shape([[s * 0.52, v], [s * 0.86, v], [s * 0.86, v + 0.035], [s * 0.52, v + 0.035]]), 0, 0.03)));
  }

  // counter: a chalk ledge with a rounded nosing over a stepped basalt corbel course,
  // both extruded side profiles; the outline is drawn in (z, y) and swept along x
  const alongX = (pts, x0, x1) => {
    const geo = extrude(shape(pts), x0, x1, 8);
    geo.rotateY(-Math.PI / 2);                  // outline u -> +z, sweep w -> -x
    return geo.translate(0, 0, 0);
  };
  const nose = [];
  for (let k = 0; k <= 6; k++) { const t = -Math.PI / 2 + (Math.PI * k) / 6; nose.push([0.965 + 0.035 * Math.cos(t), SILL - 0.035 + 0.035 * Math.sin(t)]); }
  put(CHALK, alongX([[WF - T - 0.1, SILL - 0.07], ...nose, [WF - T - 0.1, SILL]], -0.94, 0.94));
  put(OCHRE, alongX([[WF, SILL - 0.1], [0.94, SILL - 0.1], [0.94, SILL - 0.07], [WF, SILL - 0.07]], -0.9, 0.9));
  put(NIGHT, alongX([[WF, SILL - 0.26], [0.76, SILL - 0.26], [0.76, SILL - 0.18], [0.86, SILL - 0.18], [0.86, SILL - 0.1], [WF, SILL - 0.1]], -0.86, 0.86));

  // a round stamp and a teetering stack of slate papers
  putAll(NIGHT, shift(lathe([[0, 0], [0.125, 0], [0.125, 0.025], [0.11, 0.035], [0, 0.035]], 28), -0.48, SILL, 0.84));
  putAll(OCHRE, shift(lathe([[0.1, 0.035], [0.115, 0.05], [0.115, 0.08], [0.09, 0.1], [0.04, 0.11], [0, 0.11]], 28), -0.48, SILL, 0.84));
  putAll(TIMBER, shift(lathe([[0.032, 0.11], [0.026, 0.2], [0.04, 0.23], [0.058, 0.27], [0.05, 0.31], [0.02, 0.33], [0, 0.332]], 16, true), -0.48, SILL, 0.84));
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const slate = [];
  for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2 + Math.PI / 8; slate.push([Math.sign(Math.cos(t)) * 0.15 + Math.cos(t) * 0.02, Math.sign(Math.sin(t)) * 0.105 + Math.sin(t) * 0.02]); }
  for (let i = 0; i < 12; i++) {
    const top = i === 11;
    const geo = extrude(shape(slate), 0, 0.013, 4);
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(top ? 0.5 : rnd() * 0.24);
    put(SLATE, geo.translate(0.42 + (top ? 0.06 : rnd() * 0.03), SILL + i * 0.018, 0.84 + (top ? 0.03 : rnd() * 0.02)));
  }

  // striped band: a course swept round the top of the walls, carrying diagonal
  // stamp-ochre stripes on every face
  put(NIGHT, rectSweep([[0.03, BAND0], [0.03, BAND1]], WX, HZ, 0, ZC, true, true));
  for (const [f, F] of Object.entries(FACES)) {
    const half = F.half + 0.03 - 0.05, pitch = 0.26, w = 0.13, s = 0.16;
    const n = Math.floor((2 * half - w - s) / pitch) + 1, u0 = -((n - 1) * pitch + w + s) / 2;
    for (let i = 0; i < n; i++) {
      const u = u0 + i * pitch;
      put(OCHRE, F.put(extrude(shape([[u, BAND0 + 0.03], [u + w, BAND0 + 0.03], [u + w + s, BAND1 - 0.03], [u + s, BAND1 - 0.03]]), 0, 0.012), 0.03));
    }
  }

  // stepped roof: cornice, chalk tier, basalt tier, each a chamfered sweep
  put(NIGHT, rectSweep([[0.03, BAND1], [0.14, BAND1], [0.14, 2.14], [0.1, 2.18], [0.0, 2.18]], WX, HZ, 0, ZC, false, true));
  put(CHALK, rectSweep([[-0.08, 2.18], [-0.08, 2.3], [-0.11, 2.33], [-0.2, 2.33]], WX, HZ, 0, ZC, false, true));
  put(NIGHT, rectSweep([[-0.34, 2.33], [-0.34, 2.44], [-0.37, 2.47], [-0.45, 2.47]], WX, HZ, 0, ZC, false, true));
  putAll(BRONZE, shift(lathe([[0.31, 2.47], [0.31, 2.5], [0.29, 2.53], [0.272, 2.53], [0.272, 2.55], [0, 2.55]], 36), 0, 0, ZC));
  const dome = [];
  for (let k = 0; k <= 10; k++) { const t = (Math.PI / 2) * (k / 10); dome.push([0.25 * Math.cos(t), 0.25 * Math.sin(t)]); }
  const lamp = new THREE.Mesh(lathe(dome, 36, true)[0], LAMP);
  lamp.name = 'lamp';
  lamp.position.set(0, 2.55, ZC);
  g.add(lamp);

  // ---- barrier post: a revolved stepped post with a bronze saddle and two cheeks ------
  const PX = 1.45, PZ = 0.3, PIVOT = 1.12;
  putAll(NIGHT, shift(lathe([[0.2, 0], [0.2, 0.08], [0.17, 0.11], [0.14, 0.11], [0.14, 0.18], [0.1, 0.22], [0.095, 0.22], [0.095, 0.96], [0, 0.96]], 24), PX, 0, PZ));
  for (const y of [0.42, 0.72]) putAll(CHALK, shift(lathe([[0.095, y], [0.1, y], [0.1, y + 0.1], [0.095, y + 0.1]], 24), PX, 0, PZ));
  putAll(BRONZE, shift(lathe([[0.095, 0.96], [0.12, 0.96], [0.12, 1.0], [0.1, 1.02], [0, 1.02]], 24), PX, 0, PZ));
  for (const s of [-1, 1]) {
    const cheek = turn(lathe([[0, 0], [0.085, 0], [0.085, 0.03], [0.07, 0.045], [0, 0.045]], 20), 'z');
    for (const geo of cheek) {
      if (s < 0) geo.rotateY(Math.PI);
      put(BRONZE, geo.translate(PX, PIVOT, PZ + s * 0.058));
    }
    put(BRONZE, extrude(shape([[-0.07, 1.0], [0.07, 1.0], [0.07, PIVOT], [-0.07, PIVOT]]), 0, 0.045).translate(PX, 0, PZ + (s > 0 ? 0.058 : -0.103)));
  }

  // ---- the barrier arm: a Group on the pivot, a tapering striped beam along +x ---------
  const barrier = new THREE.Group();
  barrier.name = 'barrier';
  barrier.position.set(PX, PIVOT, PZ);
  const L = 4.0, BANDS = 9, START = 0.05, TIP = 0.1;
  const h = (x) => 0.075 - (0.025 * x) / L;
  putAll(BRONZE, shift(turn(lathe([[0, -0.052], [0.07, -0.052], [0.07, 0.052], [0, 0.052]], 20), 'z'), 0, 0, 0), ARM);
  for (let i = 0; i < BANDS; i++) {
    const x0 = START + ((L - TIP - START) * i) / BANDS, x1 = START + ((L - TIP - START) * (i + 1)) / BANDS;
    put(i % 2 ? CHALK : OCHRE, extrude(shape([[x0, -h(x0)], [x1, -h(x1)], [x1, h(x1)], [x0, h(x0)]]), -0.045, 0.045, 1), ARM);
  }
  const tip = [[L - TIP, -h(L - TIP) - 0.01]];
  for (let k = 0; k <= 8; k++) { const t = -Math.PI / 2 + (Math.PI * k) / 8; tip.push([L - 0.06 + 0.06 * Math.cos(t), 0.06 * Math.sin(t)]); }
  tip.push([L - TIP, h(L - TIP) + 0.01]);
  put(BRONZE, extrude(shape(tip), -0.05, 0.05, 8), ARM);
  put(BRONZE, extrude(shape([[0, -0.08], [0.3, -0.07], [0.3, 0.07], [0, 0.08]]), -0.05, 0.05, 1), ARM);
  flush(ARM, barrier);
  g.add(barrier);

  flush(STATIC, g);

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
  g.userData.joints = { barrier };
  g.userData.parts = { lamp };
  g.userData.window = { center: at(0, (SILL + HEAD) / 2, WF), width: 2 * WIN, height: +(HEAD - SILL).toFixed(3) };
  g.userData.counter = { center: at(0, SILL, (WF + 1.0) / 2), width: 1.88, depth: +(1.0 - WF).toFixed(3) };
  g.userData.inside = at(0, FLOOR, ZC + 0.1);
  return g;
}
