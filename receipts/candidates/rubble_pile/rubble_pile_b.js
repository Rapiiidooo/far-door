// rubble_pile, candidate B (profiles): a heap of fallen masonry about 2.4 m
// across and 0.9 m tall. Each dressed block is one extrusion of its section, a
// chamfered rectangle with a sienna groove notched into both long faces, bevelled
// at the ends; the far end is then pulled onto an oblique break and closed by a
// hand-built fracture in the other sandstone, the outline and a few loose points
// inside it triangulated and pushed in or out. The drum is a lathe with a
// chamfered bed and a raised bone band, its top rings pushed into a rough slanted
// snap. The chunks and flakes are bevelled extrusions of irregular outlines.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SUN = mat(0xd4a373, 0.86);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.95);
  const BONE = mat(0xe6d3ae, 0.78);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // Triangles [a, b, c] to a flat-shaded mesh, with UVs projected on each
  // triangle's dominant axis so the load-time surfaces have something to follow.
  const meshOf = (tris, m) => {
    const pos = [], uv = [], n = V(0, 0, 0), e1 = V(0, 0, 0), e2 = V(0, 0, 0);
    for (const [a, b, c] of tris) {
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      for (const p of [a, b, c]) {
        pos.push(p.x, p.y, p.z);
        if (ax >= ay && ax >= az) uv.push(p.z, p.y);
        else if (ay >= az) uv.push(p.x, p.z);
        else uv.push(p.x, p.y);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, m);
  };
  const trisOf = (geo) => {
    const p = geo.attributes.position, out = [];
    for (let i = 0; i < p.count; i += 3) out.push([0, 1, 2].map((k) => V(p.getX(i + k), p.getY(i + k), p.getZ(i + k))));
    return out;
  };

  // Lowest world-space point of an object, measured on its vertices.
  const _v = V(0, 0, 0);
  const lowest = (o) => {
    g.updateMatrixWorld(true);
    let min = Infinity;
    o.traverse((n) => {
      const p = n.isMesh && n.geometry.attributes.position;
      if (!p) return;
      for (let i = 0; i < p.count; i++) min = Math.min(min, _v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).y);
    });
    return min;
  };
  const settle = (o, sink = 0.01) => { o.position.y -= lowest(o) + sink; return o; };

  // --- dressed blocks ------------------------------------------------------------
  // The section in (across, up): a chamfered W x H rectangle with a groove notched
  // into each long face at height gy. It is drawn inset by the bevel b, because the
  // extrusion's bevel grows the whole outline back out by b.
  const section = (W, H, c, gy, gw, gd, b) => {
    const w = W / 2 - b, y0 = b, y1 = H - b, k = c - 0.4 * b, nw = gw / 2 + b;
    const pts = [
      [w - k, y0], [w, y0 + k], [w, gy - nw], [w - gd, gy - nw + 0.012], [w - gd, gy + nw - 0.012], [w, gy + nw], [w, y1 - k], [w - k, y1],
      [-w + k, y1], [-w, y1 - k], [-w, gy + nw], [-w + gd, gy + nw - 0.012], [-w + gd, gy - nw + 0.012], [-w, gy - nw], [-w, y0 + k], [-w + k, y0],
    ];
    return pts.map(([x, y]) => new THREE.Vector2(x, y));
  };

  // A block, dressed end at x = 0 and broken toward +x, where the break lies at
  // x = frac(y, z). Returns a group of three meshes: body, groove and fracture.
  const block = (body, broken, o) => {
    const { L, H, W, c, gy, gw, gd, frac, bumps, bumpDepth } = o;
    const b = 0.03;
    const outline = section(W, H, c, gy, gw, gd, b);
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(outline), {
      depth: L - 2 * b, steps: 1, curveSegments: 1, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1,
    });
    geo.rotateY(Math.PI / 2);       // length along +x, section across z
    geo.translate(b, 0, 0);          // dressed end at x = 0
    const far = L - b - 1e-4, capX = L - 1e-4;
    const parts = { body: [], groove: [], broken: [] };
    for (const tri of trisOf(geo)) {
      if (tri.every((p) => p.x >= capX)) continue;       // the flat far cap: replaced below
      const end = tri.every((p) => p.x >= far);
      for (const p of tri) if (p.x >= far) p.x = frac(p.y, p.z);
      if (end) { parts.broken.push(tri); continue; }
      // the notch: every corner inside the groove band and behind the face
      const inGroove = tri.every((p) => Math.abs(p.y - gy) <= gw / 2 + 0.002 && Math.abs(p.z) <= W / 2 - 0.004);
      (inGroove && tri.every((p) => p.x > 0.01) ? parts.groove : parts.body).push(tri);
    }
    // The break: the cap outline laid on the break and triangulated together with
    // a few loose points inside it (single-point holes, which earcut keeps as
    // vertices), each pushed in or out of the break, so the fracture comes out as
    // uneven facets rather than one plane.
    const inside = bumps.map(([u, v]) => new THREE.Vector2(u * (W / 2 - b), b + v * (H - 2 * b)));
    const all = [...outline, ...inside];
    const at = (q, i) => {
      const y = q.y, z = -q.x, k = i - outline.length;
      return V(frac(y, z) + (k >= 0 ? bumpDepth[k % bumpDepth.length] : 0), y, z);
    };
    for (const [i0, i1, i2] of THREE.ShapeUtils.triangulateShape(outline, inside.map((q) => [q]))) {
      const a = at(all[i0], i0), b2 = at(all[i1], i1), c2 = at(all[i2], i2);
      const n = V(0, 0, 0).crossVectors(V(0, 0, 0).subVectors(b2, a), V(0, 0, 0).subVectors(c2, a));
      parts.broken.push(n.x > 0 ? [a, b2, c2] : [a, c2, b2]);
    }
    const grp = new THREE.Group();
    grp.add(meshOf(parts.body, body), meshOf(parts.groove, SIENNA), meshOf(parts.broken, broken));
    return grp;
  };

  // the bed block, dressed end to the left, broken toward +x
  const B1 = {
    L: 1.2, H: 0.52, W: 0.6, c: 0.055, gy: 0.34, gw: 0.075, gd: 0.045,
    // the break runs back toward the rear and dips at the top front
    frac: (y, z) => 1.2 - 0.16 * (0.5 - z / 0.6) - 0.12 * Math.max(0, y / 0.52 - 0.4) * (z / 0.6 + 0.5) * 2 + 0.03 * Math.sin(9 * z + 1),
    bumps: [[-0.45, 0.25], [0.3, 0.2], [-0.1, 0.52], [0.5, 0.72], [-0.55, 0.8], [0.05, 0.88]],
    bumpDepth: [0.045, -0.03, 0.06, 0.02, -0.025, 0.035],
  };
  const b1 = block(SAND, SUN, B1);
  b1.position.set(-0.34, 0, -0.22);
  b1.rotation.y = 0.07;
  g.add(b1);
  settle(b1, 0.015);

  // the leaning block: dressed foot on the ground at the left, pitched up onto the
  // bed block's dressed end, its break in the air above the bed block
  const B2 = {
    L: 1.0, H: 0.36, W: 0.48, c: 0.045, gy: 0.2, gw: 0.07, gd: 0.04,
    frac: (y, z) => 1.0 + 0.13 * (z / 0.48 + 0.5) - 0.09 * (y / 0.36) + 0.025 * Math.sin(11 * y + 7 * z),
    bumps: [[-0.4, 0.3], [0.35, 0.25], [0.0, 0.6], [-0.5, 0.82], [0.45, 0.78]],
    bumpDepth: [0.04, -0.03, 0.05, -0.02, 0.03],
  };
  const lean = new THREE.Group();
  const pitch = new THREE.Group();
  pitch.add(block(SUN, SAND, B2));
  lean.add(pitch);
  g.add(lean);
  lean.position.set(-0.9, 0, -0.1);
  lean.rotation.y = 0.2;   // local +x runs to the right, a little toward the back
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(lean.matrixWorld).invert();
  let reach = Infinity;
  for (let s = -0.5; s <= 0.5; s += 0.01) {
    for (const x of [0, 0.05, 0.1]) {
      const p = b1.localToWorld(V(x, B1.H, s * (B1.W - 2 * B1.c))).applyMatrix4(inv);
      if (Math.abs(p.z) <= B2.W / 2 && p.x > 0) reach = Math.min(reach, p.x);
    }
  }
  const top1 = b1.localToWorld(V(0, B1.H, 0)).y;
  pitch.rotation.z = Math.atan2(top1 + 0.004, reach);
  settle(lean, 0.012);

  // --- the drum ------------------------------------------------------------------
  // Lathes about +y, bed at y = 0: the shaft with a chamfered bed, the snapped top
  // as rings pushed into a rough slant, and a raised bone band with bevelled edges.
  const R = 0.28, LD = 0.56, SEG = 18;
  const snap = (x, z) => LD - 0.13 * (x / R) + 0.022 * Math.sin(17.3 * x + 4.1) * Math.cos(13.7 * z - 2.3) + 0.014 * Math.sin(29 * (x - z));
  const lathe = (pts, onTop) => {
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), SEG);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (onTop && p.getY(i) >= LD - 1e-4) p.setY(i, snap(p.getX(i), p.getZ(i)));
    const n = geo.toNonIndexed();
    n.computeVertexNormals();
    return n;
  };
  const drumUp = new THREE.Group();
  drumUp.add(new THREE.Mesh(lathe([[0, 0], [R - 0.035, 0], [R, 0.035], [R, LD]], true), SAND));
  // the break, from the rim to the core, lathed the other way round so it faces up
  drumUp.add(new THREE.Mesh(lathe([[R, LD], [0.7 * R, LD], [0.4 * R, LD], [0.12 * R, LD], [0, LD]], true), SUN));
  drumUp.add(new THREE.Mesh(lathe([[R - 0.01, 0.07], [R + 0.024, 0.085], [R + 0.024, 0.165], [R - 0.01, 0.18]], false), BONE));
  const drum = new THREE.Group();
  drumUp.quaternion.setFromUnitVectors(V(0, 1, 0), V(0.8, 0, 0.6));   // snapped end toward the front right
  drum.add(drumUp);
  drum.position.set(0.0, R, 0.34);
  g.add(drum);
  settle(drum, 0.02);   // the band holds the shaft up; bed it in the grit

  // --- chunks and flakes ---------------------------------------------------------
  // Each an irregular outline of n corners, extruded t thick with a small bevel.
  const chip = (n, r, stretch, t, m) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = ((i + (rnd() - 0.5) * 0.7) / n) * Math.PI * 2, rr = r * (0.66 + rnd() * 0.6);
      pts.push(new THREE.Vector2(Math.cos(a) * rr * stretch, Math.sin(a) * rr));
    }
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
      depth: Math.max(0.01, t - 0.024), bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 1,
    });
    geo.center();
    return meshOf(trisOf(geo), m);
  };
  // [corners, radius, stretch, thickness, material, x, z, rot x, y, z]
  const bits = [
    // spilled from the bed block's break, to the right
    [5, 0.15, 1.3, 0.2, SAND, 0.98, -0.34, 1.57, 0.3, 0.2],
    [6, 0.17, 1.2, 0.05, SAND, 0.99, 0.18, 1.62, 0.1, 0.4],
    [5, 0.12, 1.1, 0.17, SIENNA, 0.84, 0.6, 1.2, 0.5, -0.3],
    [4, 0.13, 1.4, 0.16, SAND, 0.64, -0.78, 1.5, -0.4, 0.9],
    // in front
    [6, 0.16, 1.25, 0.05, SIENNA, -0.28, 0.62, 1.52, 0.2, 1.1],
    [5, 0.12, 1.2, 0.15, SAND, -0.6, 0.78, 1.3, -0.3, 0.2],
    [5, 0.1, 1.3, 0.13, SIENNA, 0.46, 0.84, 1.7, 0.4, 2.0],
    // round the leaning block's foot, and behind
    [4, 0.14, 1.2, 0.18, SIENNA, -1.02, 0.44, 1.4, 0.2, -0.5],
    [6, 0.18, 1.1, 0.05, SAND, -0.9, -0.66, 1.6, -0.1, 0.3],
    [5, 0.13, 1.2, 0.14, SIENNA, 0.1, -0.8, 1.35, 0.3, -1.2],
    [6, 0.15, 1.3, 0.045, SIENNA, -0.46, -0.78, 1.85, 0.1, 2.4],
  ];
  for (const [n, r, st, t, m, x, z, rx, ry, rz] of bits) {
    const o = new THREE.Group();
    const piece = chip(n, r, st, t, m);
    piece.rotation.set(rx, ry, rz);
    o.add(piece);
    o.position.set(x, 0, z);
    g.add(o);
    settle(o, 0.008);
  }

  // --- the six lines -------------------------------------------------------------
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put4 = (mat4) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put4(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put4(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });
  return g;
}
