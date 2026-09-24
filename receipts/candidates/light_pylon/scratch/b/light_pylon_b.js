// light_pylon, arm B: profiles.
// The stone is square lathes with chamfered corners, flat shaded, whose profile
// carries everything: a burnt sienna foot course, two chamfered plinth tiers (1.1
// and 0.85 m square), a shaft tapering from 0.5 to 0.36 m with two incised grooves
// floored in sienna, a raised bone band and a bronze cap. The ring (grooved rim,
// stepped bezel), the biconvex lens, rivets and hubs are turned about +Z; the yoke
// and the threshold plate are chamfered extrusions. The ring's foot sits in the
// yoke's saddle. 1.12 x 2.8 x 1.65 m; the lens centre is 2.35 m up, 0.275 m behind
// the origin, because the plate extends the box towards +Z.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const SAND = M(0xb57f4f, 'stone', 0.9);
  const SIENNA = M(0x8a5433, 'stone', 0.94);
  const BONE = M(0xe6d3ae, 'stone', 0.85);
  const BRONZE = M(0x9a6a35, 'metal', 0.45, 0.7);
  // Dormant crystal, one material per part so the game can light each on its own
  // by raising emissiveIntensity. Unnamed and just under opaque so the loader's
  // procedural surfaces leave it alone.
  const crystal = (roughness) => new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 0,
    roughness, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  // ---- merging: one mesh per material ---------------------------------------------
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
  const PARTS = new Map();
  const put = (mat, geo) => { if (!PARTS.has(mat)) PARTS.set(mat, []); PARTS.get(mat).push(geo); return geo; };

  // ---- profile tools --------------------------------------------------------------
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
  // turned about +Z, the ring's axis: heights run towards the front
  const turn = (pts, segs) => lathe(pts, segs).rotateX(Math.PI / 2);
  // every edge of a stepped profile turned on its own, so its steps stay crisp
  const crisp = (pts, segs) => pts.slice(1).map((p, i) => turn([pts[i], p], segs));

  // ---- extrusion tools ----------------------------------------------------------------
  const shape = (pts, holes = []) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    return s;
  };
  // along +Z from z0 to z1; the bevel is pulled back onto the drawn outline, so it
  // is a chamfer and every size stays as drawn
  const extrude = (s, z0, z1, bev) => new THREE.ExtrudeGeometry(s, {
    depth: z1 - z0 - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev,
    bevelOffset: -bev, bevelSegments: 1, curveSegments: 1,
  }).translate(0, 0, z0 + bev);
  // a plan outline of [x, z] points extruded up from y0 to y1
  const flip = (pts) => pts.map(([x, z]) => [x, -z]);
  const slab = (pts, holes, y0, y1, bev) => extrude(shape(flip(pts), holes.map(flip)), y0, y1, bev).rotateX(-Math.PI / 2);
  const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  // Extrusions come flat shaded. Faces that meet at under 30 degrees share their
  // normals, so a curved outline turns smoothly while its chamfers stay crisp.
  const crease = (geo, deg = 30) => {
    const f = geo.index ? geo.toNonIndexed() : geo;
    const p = f.attributes.position, n = p.count, lim = Math.cos((deg * Math.PI) / 180);
    const fn = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      a.fromBufferAttribute(p, t); b.fromBufferAttribute(p, t + 1); c.fromBufferAttribute(p, t + 2);
      fn.push(b.sub(a).cross(c.sub(a)).clone());
    }
    const at = new Map();
    for (let i = 0; i < n; i++) {
      const k = `${Math.round(p.getX(i) * 1e4)}|${Math.round(p.getY(i) * 1e4)}|${Math.round(p.getZ(i) * 1e4)}`;
      if (!at.has(k)) at.set(k, []);
      at.get(k).push(i);
    }
    const out = new Float32Array(n * 3), s = new THREE.Vector3(), u = new THREE.Vector3(), w = new THREE.Vector3();
    for (const ids of at.values()) {
      for (const i of ids) {
        u.copy(fn[(i / 3) | 0]).normalize();
        s.set(0, 0, 0);
        for (const j of ids) { w.copy(fn[(j / 3) | 0]); if (w.clone().normalize().dot(u) >= lim) s.add(w); }
        if (s.lengthSq() === 0) s.copy(u);
        s.normalize();
        out[i * 3] = s.x; out[i * 3 + 1] = s.y; out[i * 3 + 2] = s.z;
      }
    }
    f.setAttribute('normal', new THREE.BufferAttribute(out, 3));
    return f;
  };

  // ---- the stone: square lathes, profiles in half-widths --------------------------
  // Turned with eight sides whose corners are then pulled onto a chamfered square,
  // so the profile still carries every step and each vertical corner gets a chamfer.
  const CX = [[1, 1], [1, 0], [1, 0], [1, 1], [-1, -1], [-1, 0], [-1, 0], [-1, -1]];
  const CZ = [[1, 0], [1, 1], [-1, -1], [-1, 0], [-1, 0], [-1, -1], [1, 1], [1, 0]];
  const square = (pts, cut) => {
    const geo = new THREE.LatheGeometry(pts.map(([h, y]) => new THREE.Vector2(h, y)), 8, Math.PI / 8);
    const p = geo.attributes.position;
    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j < pts.length; j++) {
        const h = pts[j][0], c = Math.min(cut, 0.4 * h), k = i % 8, q = i * pts.length + j;
        p.setX(q, CX[k][0] * h - CX[k][1] * c);
        p.setZ(q, CZ[k][0] * h - CZ[k][1] * c);
      }
    }
    return facets(geo);
  };
  const Y0 = 0.5, Y1 = 2.0;                                          // shaft foot and top
  const hw = (y) => 0.25 - (0.07 * (y - Y0)) / (Y1 - Y0);            // 0.5 m tapering to 0.36 m
  const DG = 0.035;                                                  // groove depth
  const groove = (a, b) => [[hw(a), a], [hw(a) - DG, a], [hw(b) - DG, b], [hw(b), b]];
  const band = (a, b, p = 0.022, c = 0.01) => [[hw(a), a], [hw(a) + p - c, a], [hw(a) + p, a + c],
    [hw(b) + p, b - c], [hw(b) + p - c, b], [hw(b), b]];
  const CAP = 2.02;                                                  // top of the yoke's bronze cap on the head
  const runs = [
    [SIENNA, [[0.001, 0], [0.55, 0], [0.55, 0.125], [0.54, 0.135]]],
    [SAND, [[0.54, 0.135], [0.55, 0.145], [0.55, 0.27], [0.52, 0.3], [0.425, 0.3], [0.425, 0.475], [0.4, 0.5],
      [0.272, 0.5], [0.272, 0.53], [hw(0.552), 0.552], [hw(1.02), 1.02]]],
    [SIENNA, groove(1.02, 1.09)],
    [SAND, [[hw(1.09), 1.09], [hw(1.16), 1.16]]],
    [SIENNA, groove(1.16, 1.23)],
    [SAND, [[hw(1.23), 1.23], [hw(1.7), 1.7]]],
    [BONE, band(1.7, 1.82)],
    [SAND, [[hw(1.82), 1.82], [hw(1.95), 1.95]]],
    [BRONZE, [[hw(1.95), 1.95], [hw(1.95) + 0.014, 1.95], [hw(Y1) + 0.014, 2.005], [hw(Y1), CAP], [0.001, CAP]]],
  ];
  for (const [mat, pts] of runs) put(mat, square(pts, 0.022));

  // ---- the ring: a stepped bronze profile turned about +Z ---------------------------
  const RY = 2.35;                                                   // ring and lens centre; the top is at 2.8
  // bore, stepped bezel, outer band and a grooved rim, the same on both faces
  const ring = [[0.3, -0.02], [0.33, -0.035], [0.365, -0.035], [0.365, -0.05], [0.435, -0.05], [0.45, -0.035],
    [0.45, -0.013], [0.44, -0.013], [0.44, 0.013], [0.45, 0.013],
    [0.45, 0.035], [0.435, 0.05], [0.365, 0.05], [0.365, 0.035], [0.33, 0.035], [0.3, 0.02], [0.3, -0.02]];
  for (const geo of crisp(ring, 36)) put(BRONZE, geo.translate(0, RY, 0));
  // four rivets through the outer band on the diagonals, headed on both faces
  const rivet = [...crisp([[0.026, -0.004], [0.026, 0.006]], 8),
    turn([[0.026, 0.006], [0.021, 0.013], [0.012, 0.018], [0.001, 0.0195]], 8)];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    for (const face of [1, -1]) {
      for (const geo of rivet) {
        const r = geo.clone();
        if (face < 0) r.rotateY(Math.PI);
        put(BRONZE, r.translate(0.4 * Math.cos(a), RY + 0.4 * Math.sin(a), 0.05 * face));
      }
    }
  }

  // ---- the lens: biconvex, its own mesh, centred on its own origin -------------------
  const LR = 0.31, RIM = 0.02, RISE = 0.035;                          // radius, half-thickness at the rim, dome rise
  const RS = (LR * LR + RISE * RISE) / (2 * RISE);
  const dome = (r) => RIM + Math.sqrt(RS * RS - r * r) - Math.sqrt(RS * RS - LR * LR);
  const back = [], front = [];
  for (let i = 0; i <= 5; i++) {
    const r = Math.max(0.001, (LR * i) / 5);
    back.push([r, -dome(r)]);
    front.unshift([r, dome(r)]);
  }
  const lens = new THREE.Mesh(merge([turn(back, 36), turn([[LR, -RIM], [LR, RIM]], 36), turn(front, 36)]), crystal(0.18));
  lens.name = 'lens';
  lens.position.set(0, RY, 0);
  g.add(lens);

  // ---- the yoke: one bronze U seated on the cap, rising to eyes at 3 and 9 o'clock ----
  // Drawn in the front plane, right half first: from inside the cap, down a cheek
  // clamped on the head, an underside sweeping out to the tine, a round eye at the
  // pivot, down the tine and back along the saddle, whose slot takes the ring's foot.
  const PX = 0.505, RE = 0.055, XO = 0.54, XI = 0.47, RC = 0.12;     // pivot, eye radius, tine edges, inner corner
  const FL = 2.035;                                                  // saddle top, where the ring's foot goes in
  const ch = (y) => hw(y) - 0.01;                                    // the cheeks sit 1 cm into the head
  const half = [[0, 1.99], [ch(1.99), 1.99], [ch(1.88), 1.88]];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    half.push([0.24 + (XO - 0.24) * Math.sin(t), 2.12 - 0.24 * Math.cos(t)]);
  }
  const a1 = -Math.acos((XO - PX) / RE), a2 = Math.PI + Math.acos((PX - XI) / RE);
  for (let i = 0; i <= 14; i++) {
    const a = a1 + ((a2 - a1) * i) / 14;
    half.push([PX + RE * Math.cos(a), RY + RE * Math.sin(a)]);
  }
  for (let i = 0; i <= 6; i++) {
    const a = (-Math.PI / 2) * (i / 6);
    half.push([XI - RC + RC * Math.cos(a), FL + RC + RC * Math.sin(a)]);
  }
  half.push([0, FL]);
  const yoke = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
  put(BRONZE, crease(extrude(shape(yoke), -0.07, 0.07, 0.012)));
  // a stepped hub on each face of each eye
  const hub = [[0.036, -0.004], [0.036, 0.008], [0.027, 0.017], [0.001, 0.017]];
  for (const s of [1, -1]) {
    for (const face of [1, -1]) {
      for (const geo of crisp(hub, 12)) {
        if (face < 0) geo.rotateY(Math.PI);
        put(BRONZE, geo.translate(s * PX, RY, 0.07 * face));
      }
    }
  }

  // ---- the threshold plate: bronze on the ground in front, the slot at its front ----
  // It tucks 2 cm under the plinth. A lower slab carries the slot; a chamfered top
  // layer adds three channels running out to the slot, and four rivets pin it down.
  const PT = 0.04, SZ = [1.0, 1.06];                                 // plate top; slot back and front edges
  const plate = [[-0.55, 0.53], [0.55, 0.53], [0.55, 1.07], [0.52, 1.1], [-0.52, 1.1], [-0.55, 1.07]];
  const SLOT = rect(-0.4, SZ[0], 0.4, SZ[1]);
  const channels = [-0.25, 0, 0.25].map((x) => rect(x - 0.025, 0.63, x + 0.025, 0.94));
  put(BRONZE, slab(plate, [SLOT], 0, 0.02, 0));
  put(BRONZE, slab(plate, [SLOT, ...channels], 0.012, PT, 0.008));
  for (const [x, z] of [[-0.49, 0.6], [0.49, 0.6], [-0.49, 1.03], [0.49, 1.03]]) {
    for (const geo of rivet) put(BRONZE, geo.clone().rotateX(-Math.PI / 2).translate(x, PT, z));
  }
  // the crystal bar, its own mesh, 3 mm inside the slot and 6 mm below the top
  const SC = [0, 0.018, (SZ[0] + SZ[1]) / 2];
  const slotGeo = slab(rect(-0.397, SZ[0] + 0.003, 0.397, SZ[1] - 0.003), [], 0.002, 0.034, 0.006);
  const slot = new THREE.Mesh(merge([slotGeo.translate(-SC[0], -SC[1], -SC[2])]), crystal(0.28));
  slot.name = 'slot';
  slot.position.set(...SC);
  g.add(slot);

  for (const [mat, geos] of PARTS) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const q = n.isMesh && n.geometry.attributes.position; if (!q) return;
    const add = (mat) => { for (let i = 0; i < q.count; i++) bb.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });

  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.parts = { lens, slot };
  g.userData.lens = { center: lens.position.toArray().map(r3), radius: LR };             // mid-plane of the lens
  g.userData.emit = [r3(-c.x), r3(PT - bb.min.y), r3(SZ[1] - c.z)];                     // slot's front edge, plate top
  return g;
}
