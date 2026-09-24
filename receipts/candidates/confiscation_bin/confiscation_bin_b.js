// confiscation_bin, arm B: profiles.
// The chest body is one profile swept round its rectangle with mitred corners: a
// chamfered foot, the outer wall, the rim and the inner wall down to the floor, so it is
// hollow in a single piece. Bronze bands are swept rings, corner caps extruded L-shapes,
// the lid a swept stepped profile like the builders' roofs. The heap is revolved and
// extruded: a lathed kettle with a dent and tube spout, a lathed hat, a lathed map, an
// extruded boot, and one rope swept along a wandering curve that spills over the rim.
// This reading: the chest is so full the lid cannot close; it rests ajar at 38 degrees
// on a boot standing in the heap.
// Chest 1.2 x 0.8 x 0.8 m closed; about 1.2 m tall with the lid resting ajar.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const BASALT = M(0x3a3531, 'stone', 0.84);
  const BRONZE = M(0x9a6a35, 'metal', 0.5, 0.6);
  const CHALK = M(0xc9c2d8, 'plaster', 0.82);
  const OCHRE = M(0xd9a441, 'fabric', 0.8);
  const LEATHER = M(0x4b2e1e, 'fabric', 0.86);
  const CANVAS = M(0xcdbf9f, 'fabric', 0.92);
  const PAPER = M(0xe6d3ae, 'fabric', 0.9);
  const ROPE = M(0xb49a6a, 'fabric', 0.95);
  const TIMBER = M(0x8a6a48, 'timber', 0.86);
  const HEAP = M(0x2b2420, 'fabric', 0.95);

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
  const STATIC = new Map(), LID = new Map();
  const put = (mat, geo, bucket = STATIC) => { if (!bucket.has(mat)) bucket.set(mat, []); bucket.get(mat).push(geo); return geo; };
  const putAll = (mat, geos, bucket = STATIC) => { for (const geo of geos) put(mat, geo, bucket); };
  const flush = (bucket, parent) => { for (const [mat, geos] of bucket) parent.add(new THREE.Mesh(merge(geos), mat)); };

  // ---- profile tools --------------------------------------------------------------
  // rectSweep: profile points [d, y], run so the solid lies on their left (up the
  // outside, across the top, down an inside), each a ring of half-size (hx + d, hz + d).
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
  const fixNormals = (geo) => {
    const nr = geo.attributes.normal, v = new THREE.Vector3();
    for (let k = 0; k < nr.count; k++) { v.fromBufferAttribute(nr, k).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    return geo;
  };
  // lathe: [r, y] bottom to top along the outside; crisp (one lathe per edge) or smooth
  const lathe = (pts, segs, smooth = false) => {
    if (smooth) return [fixNormals(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs))];
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i][0] === 0 && pts[i + 1][0] === 0) continue;
      out.push(fixNormals(new THREE.LatheGeometry([new THREE.Vector2(...pts[i]), new THREE.Vector2(...pts[i + 1])], segs)));
    }
    return out;
  };
  const shape = (pts, holes = []) => {
    const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
    return s;
  };
  // extrude along +w from w0 to w1; a bevel is pulled back onto the outline with
  // bevelOffset and taken out of the depth, so the part keeps its drawn size
  const extrude = (s, w0, w1, bevel = 0, curveSegments = 10) => {
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: w1 - w0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
      bevelOffset: -bevel, bevelSegments: 2, curveSegments,
    });
    return geo.translate(0, 0, w0 + bevel);
  };
  const place = (geos, rx, ry, rz, x, y, z) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
    for (const geo of geos) { geo.applyMatrix4(m); geo.translate(x, y, z); }
    return geos;
  };

  // ---- the chest ---------------------------------------------------------------------
  const X = 0.56, Z = 0.36, RIM = 0.645, WALL = 0.055;
  // foot, outer wall, rim, inner wall, floor: one sweep
  put(BASALT, rectSweep([[0.03, 0], [0.03, 0.045], [0.012, 0.065], [0, 0.065], [0, RIM - 0.012], [-0.012, RIM],
    [-WALL + 0.008, RIM], [-WALL, RIM - 0.008], [-WALL, 0.14]], X, Z, 0, 0));
  // bronze bands: rim and middle, swept rings
  put(BRONZE, rectSweep([[0, RIM - 0.065], [0.014, RIM - 0.065], [0.014, RIM - 0.008], [0.004, RIM + 0.002], [-0.006, RIM + 0.002]], X, Z, 0, 0, false, false));
  put(BRONZE, rectSweep([[0, 0.3], [0.012, 0.3], [0.012, 0.345], [0, 0.345]], X, Z, 0, 0, false, false));
  // straps: extruded strips on every face
  const strap = (face, u, y0, y1) => {
    const geo = extrude(shape([[u - 0.03, y0], [u + 0.03, y0], [u + 0.03, y1], [u - 0.03, y1]]), 0, 0.01);
    if (face === 'pz') geo.translate(0, 0, Z);
    if (face === 'nz') geo.rotateY(Math.PI).translate(0, 0, -Z);
    if (face === 'px') geo.rotateY(Math.PI / 2).translate(X, 0, 0);
    if (face === 'nx') geo.rotateY(-Math.PI / 2).translate(-X, 0, 0);
    put(BRONZE, geo);
  };
  for (const u of [-0.3, 0.3]) for (const f of ['pz', 'nz']) { strap(f, u, 0.065, 0.3); strap(f, u, 0.345, RIM - 0.065); }
  for (const f of ['px', 'nx']) { strap(f, 0, 0.065, 0.3); strap(f, 0, 0.345, RIM - 0.065); }
  // corner caps: L-shaped angle pieces extruded upright, with a plate on the rim
  const lCap = (sx, sz, y0, y1, plate) => {
    const t = 0.014, L = 0.1, x = X, z = Z;
    const pts = [[x + t, z + t], [x + t, z - L], [x, z - L], [x, z], [x - L, z], [x - L, z + t]].map(([a, b]) => [sx * a, sz * b]);
    const geo = extrude(shape(pts), -y1, -y0).rotateX(Math.PI / 2);
    put(BRONZE, geo);
    if (plate) {
      const sq = [[x + t, z + t], [x + t, z - L], [x - L, z - L], [x - L, z + t]].map(([a, b]) => [sx * a, sz * b]);
      put(BRONZE, extrude(shape(sq), -(RIM + 0.006), -(RIM - 0.004)).rotateX(Math.PI / 2));
    }
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { lCap(sx, sz, 0, 0.13, false); lCap(sx, sz, RIM - 0.11, RIM + 0.004, true); }
  // hasp staple and hinge knuckles (revolved, turned onto x)
  const onX = (geos) => { for (const geo of geos) geo.rotateZ(-Math.PI / 2); return geos; };
  putAll(BRONZE, place(lathe([[0.022, 0], [0.034, 0.012], [0.034, 0.03], [0.022, 0.042], [0.012, 0.042], [0.012, 0], [0.022, 0]], 12), Math.PI / 2, 0, 0, 0, RIM - 0.1, Z + 0.006));
  const HZ = -0.385;                                                        // hinge axis z, at y = RIM
  const knuckle = () => onX(lathe([[0, -0.035], [0.021, -0.035], [0.021, 0.035], [0, 0.035]], 12));
  for (const s of [-1, 1]) putAll(BRONZE, knuckle().map((geo) => geo.translate(s * 0.3, RIM, HZ)));
  for (const s of [-1, 1]) put(BRONZE, extrude(shape([[s * 0.3 - 0.04, RIM - 0.1], [s * 0.3 + 0.04, RIM - 0.1], [s * 0.3 + 0.04, RIM - 0.012], [s * 0.3 - 0.04, RIM - 0.012]]), -Z - 0.012, -Z - 0.002));

  // ---- the lid: a stepped sweep built closed round the hinge axis, resting 38 degrees open
  const lid = new THREE.Group();
  lid.name = 'lid';
  lid.position.set(0, RIM, HZ);
  const LX = 0.575, LZ = 0.395, LC = 0.395 - 0.01;                          // half sizes, centre z in the lid frame
  put(BASALT, rectSweep([[0, 0], [0, 0.045], [-0.028, 0.073], [-0.06, 0.073], [-0.06, 0.1], [-0.085, 0.118], [-0.15, 0.118], [-0.15, 0.13], [-0.165, 0.14], [-0.24, 0.14]], LX, LZ, 0, LC), LID);
  put(BRONZE, rectSweep([[0, -0.002], [0.013, -0.002], [0.013, 0.045], [0, 0.045]], LX, LZ, 0, LC, false, false), LID);
  // a revolved bronze boss on the top step, with a chalk disc and an ochre crescent-like ring
  putAll(BRONZE, lathe([[0.15, 0.14], [0.15, 0.15], [0.13, 0.165], [0, 0.165]], 32).map((geo) => geo.translate(0, 0, LC)), LID);
  putAll(CHALK, lathe([[0.095, 0.165], [0.095, 0.172], [0, 0.172]], 28).map((geo) => geo.translate(0, 0, LC)), LID);
  putAll(OCHRE, lathe([[0.05, 0.172], [0.05, 0.178], [0, 0.178]], 20).map((geo) => geo.translate(0, 0, LC)), LID);
  // hinge knuckles and leaves on the lid, hasp tongue at the front
  for (const s of [-1, 1]) {
    for (const k of [-1, 1]) putAll(BRONZE, knuckle().map((geo) => geo.translate(s * 0.3 + k * 0.075, 0, 0)), LID);
    put(BRONZE, extrude(shape([[s * 0.3 - 0.11, 0.004], [s * 0.3 + 0.11, 0.004], [s * 0.3 + 0.09, 0.07], [s * 0.3 - 0.09, 0.07]]), -0.02, -0.008), LID);
  }
  const tongue = extrude(shape([[-0.04, -0.09], [0.04, -0.09], [0.04, 0.05], [-0.04, 0.05]]), 0, 0.012);
  put(BRONZE, tongue.translate(0, 0, LC + LZ), LID);
  // underside: an extruded bronze frame and a chalk seal with an ochre crescent
  const under = (geo) => geo.rotateX(Math.PI / 2);                          // outline in (x, z), facing down
  put(BRONZE, under(extrude(shape([[-0.5, 0.07], [0.5, 0.07], [0.5, 0.71], [-0.5, 0.71]], [[[-0.46, 0.11], [-0.46, 0.67], [0.46, 0.67], [0.46, 0.11]]]), -0.001, 0.008)), LID);
  putAll(CHALK, lathe([[0, 0], [0.15, 0], [0.15, 0.01], [0, 0.01]], 32).map((geo) => geo.rotateX(Math.PI).translate(0, 0, LC)), LID);
  const TAU = Math.PI * 2;
  const cres = (() => {
    const R = 0.1, r2 = 0.085, ox = 0.035, oy = 0.02, d = Math.hypot(ox, oy), a = (R * R - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
    const px = (a / d) * ox, py = (a / d) * oy, qx = (-oy / d) * h, qy = (ox / d) * h;
    const t1 = Math.atan2(py + qy, px + qx), t2 = Math.atan2(py - qy, px - qx);
    const f1 = Math.atan2(py + qy - oy, px + qx - ox), f2 = Math.atan2(py - qy - oy, px - qx - ox);
    const span = (x) => ((x % TAU) + TAU) % TAU, so = span(t2 - t1), si = span(f2 - f1), pts = [];
    for (let k = 0; k <= 20; k++) { const t = t1 + (so * k) / 20; pts.push([R * Math.cos(t), R * Math.sin(t)]); }
    for (let k = 1; k < 20; k++) { const t = f2 - (si * k) / 20; pts.push([ox + r2 * Math.cos(t), oy + r2 * Math.sin(t)]); }
    return pts;
  })();
  put(OCHRE, under(extrude(shape(cres), 0.009, 0.016, 0, 20)).translate(0, 0, LC), LID);
  const OPEN = (38 * Math.PI) / 180;
  for (const geos of LID.values()) for (const geo of geos) geo.rotateX(-OPEN);
  flush(LID, lid);
  g.add(lid);

  // ---- the heap ----------------------------------------------------------------------
  const mound = lathe([[0.3, 0], [0.28, 0.05], [0.22, 0.1], [0.12, 0.135], [0, 0.145]], 16, true)[0];
  put(HEAP, mound.scale(1.72, 1, 1.06).translate(0, 0.58, 0));

  // a boot standing in the heap, its shaft top under the lid: what keeps it ajar
  const bootShape = shape([[-0.09, 0], [0.17, 0], [0.205, 0.02], [0.2, 0.06], [0.16, 0.1], [0.07, 0.115], [0.035, 0.145], [0.03, 0.3], [-0.075, 0.3], [-0.08, 0.1], [-0.095, 0.03]]);
  const lidY = (z) => RIM + Math.tan(OPEN) * (z - HZ);                      // the underside's height over z
  const BZ = 0.02, BY = lidY(BZ - 0.075) - 0.3 - 0.004;
  const boot = extrude(bootShape, -0.048, 0.048, 0.014, 8).rotateY(-Math.PI / 2);
  put(LEATHER, boot.translate(-0.05, BY, BZ));

  // a dented kettle on its side at the front right, spout over the rim
  {
    const body = lathe([[0.07, 0], [0.09, 0.012], [0.12, 0.06], [0.122, 0.09], [0.1, 0.145], [0.062, 0.172], [0.058, 0.185], [0.03, 0.198], [0.018, 0.2], [0.02, 0.216], [0.003, 0.222]], 18, true)[0];
    const p = body.attributes.position, v = new THREE.Vector3(), dent = new THREE.Vector3(-0.09, 0.12, 0.06);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = v.distanceTo(dent);
      if (d < 0.075) { const k = (0.075 - d) * 0.6; v.x += k * 0.8; v.z -= k * 0.5; p.setXYZ(i, v.x, v.y, v.z); }
    }
    body.computeVertexNormals();
    const spout = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.07, 0.1), new THREE.Vector3(0, 0.1, 0.19), new THREE.Vector3(0, 0.17, 0.23)), 8, 0.018, 8);
    const arc = new THREE.EllipseCurve(0, 0, 0.088, 0.1, 0, Math.PI).getPoints(10).map((q) => new THREE.Vector3(q.x, q.y + 0.17, 0));
    const handle = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 12, 0.011, 6);
    place([body, spout, handle], -0.25, -0.3, -1.2, 0.3, 0.74, 0.14);
    putAll(BRONZE, [body, spout, handle]);
  }

  // a canvas hat, brim curled, perched on the back left
  {
    const hat = lathe([[0, 0.004], [0.19, 0], [0.205, 0.014], [0.198, 0.024], [0.12, 0.014], [0.112, 0.028], [0.108, 0.1], [0.09, 0.128], [0.04, 0.14], [0, 0.132]], 22, true);
    const band = lathe([[0.1135, 0.026], [0.1135, 0.058]], 22, true);
    putAll(CANVAS, place(hat, -0.22, 0.3, 0.18, -0.32, 0.68, -0.2));
    putAll(LEATHER, place(band, -0.22, 0.3, 0.18, -0.32, 0.68, -0.2));
  }

  // a rolled map poking out over the front left corner
  {
    const L = 0.56;
    const roll = lathe([[0.043, 0], [0.047, 0.012], [0.042, 0.03], [0.042, L - 0.03], [0.047, L - 0.012], [0.043, L]], 16, true);
    const ends = [...lathe([[0, 0.004], [0.043, 0]], 16), ...lathe([[0.043, L], [0, L - 0.004]], 16)];
    const ties = [...lathe([[0.044, 0.16], [0.047, 0.17], [0.044, 0.18]], 12, true), ...lathe([[0.044, L - 0.18], [0.047, L - 0.17], [0.044, L - 0.16]], 12, true)];
    // lying across the heap from the middle out over the left rim
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.9, 0.12, 0.42).normalize());
    const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
    for (const [mat, geos] of [[PAPER, roll], [CANVAS, ends], [ROPE, ties]]) for (const geo of geos) put(mat, geo.applyMatrix4(m).translate(-0.12, 0.71, 0.1));
  }

  // one rope: a tangle in the back right, then over the right rim and hanging down
  {
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 * 2.3, r = 0.11 + 0.05 * Math.sin(3 * a);
      pts.push(new THREE.Vector3(0.22 + r * Math.cos(a), 0.75 + 0.035 * Math.sin(2 * a + 1), -0.14 + r * Math.sin(a) * 0.75));
    }
    pts.push(new THREE.Vector3(0.44, 0.72, -0.02), new THREE.Vector3(0.56, 0.68, 0.04), new THREE.Vector3(0.6, 0.655, 0.06));
    pts.push(new THREE.Vector3(0.61, 0.58, 0.08), new THREE.Vector3(0.605, 0.48, 0.05), new THREE.Vector3(0.605, 0.42, -0.02));
    const rope = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 110, 0.016, 5, false);
    put(ROPE, rope);
    putAll(ROPE, lathe([[0, -0.03], [0.02, -0.02], [0.02, 0], [0, 0.004]], 8, true).map((geo) => geo.translate(0.605, 0.42, -0.02)));
  }

  // a stamp-ochre tag on a stick, in front of the lid's edge
  {
    const stick = lathe([[0.011, 0], [0.009, 0.46], [0.014, 0.47], [0, 0.485]], 8);
    const tag = extrude(shape([[0, -0.05], [0.13, -0.05], [0.16, -0.02], [0.16, 0.05], [0, 0.05]], [[[0.13, 0.0], [0.14, 0.012], [0.15, 0.0], [0.14, -0.012]]]), -0.004, 0.004);
    tag.translate(0.012, 0.4, 0);
    const pose = [0.1, 0.9, -0.08, 0.1, 0.62, 0.3];
    putAll(TIMBER, place(stick, ...pose));
    putAll(OCHRE, place([tag], ...pose));
  }

  flush(STATIC, g);

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });

  g.userData.joints = { lid };
  return g;
}
