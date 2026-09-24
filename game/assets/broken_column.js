// broken_column, candidate C (a second reading, hand-built lofts): an
// earthquake ruin. The drums have walked off their beds, the top one ends in a
// rough fracture rather than a clean cut, and the piece that fell is the
// column's own crown, propped on its rim against the base with the rest of the
// bone capital band on it. Everything is skinned from fluted rings by one loft
// routine. 3.4 m ruin, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SUN = mat(0xd4a373, 0.84);
  const SAND = mat(0xb57f4f, 0.9);
  const SIENNA = mat(0x8a5433, 0.95);
  const BONE = mat(0xe6d3ae, 0.76);
  const BASALT = mat(0x3a3531, 0.82);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const add = (geo, m, parent = g) => { const o = new THREE.Mesh(geo, m); parent.add(o); return o; };
  const newell = (r) => {
    const n = V(0, 0, 0);
    for (let j = 0; j < r.length; j++) {
      const a = r[j], b = r[(j + 1) % r.length];
      n.x += (a.y - b.y) * (a.z + b.z); n.y += (a.z - b.z) * (a.x + b.x); n.z += (a.x - b.x) * (a.y + b.y);
    }
    return n;
  };
  const centre = (r) => r.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / r.length);
  // Skin rings of equal length into one flat-shaded mesh. Winding follows the
  // first ring against the loft direction unless `flip` is given (rings that
  // close inward in one plane have no direction to go by). Caps are optional.
  const loft = (rings, o = {}) => {
    const N = rings[0].length, M = rings.length, pos = [], uv = [];
    const dir = centre(rings[M - 1]).sub(centre(rings[0]));
    const flip = o.flip !== undefined ? o.flip : newell(rings[0]).dot(dir) < 0;
    const tri = (a, b, c, ta, tb, tc, f) => {
      if (f) { [b, c] = [c, b]; [tb, tc] = [tc, tb]; }
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      uv.push(...ta, ...tb, ...tc);
    };
    for (let i = 0; i < M - 1; i++) {
      for (let j = 0; j < (o.open ? N - 1 : N); j++) {
        const k = (j + 1) % N;
        const u0 = j / N, u1 = (j + 1) / N, v0 = i / (M - 1), v1 = (i + 1) / (M - 1);
        tri(rings[i][j], rings[i][k], rings[i + 1][k], [u0, v0], [u1, v0], [u1, v1], flip);
        tri(rings[i][j], rings[i + 1][k], rings[i + 1][j], [u0, v0], [u1, v1], [u0, v1], flip);
      }
    }
    const cap = (r, out) => {
      const n = newell(r).normalize();
      const U = V(0, 0, 0).crossVectors(n, Math.abs(n.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).normalize();
      const W = V(0, 0, 0).crossVectors(n, U);
      const p2 = r.map((p) => new THREE.Vector2(p.dot(U), p.dot(W)));
      for (const [i0, i1, i2] of THREE.ShapeUtils.triangulateShape(p2, [])) {
        let [a, b, c] = [i0, i1, i2];
        const nn = V(0, 0, 0).subVectors(r[b], r[a]).cross(V(0, 0, 0).subVectors(r[c], r[a]));
        tri(r[a], r[b], r[c], [p2[a].x, p2[a].y], [p2[b].x, p2[b].y], [p2[c].x, p2[c].y], nn.dot(out) < 0);
      }
    };
    if (M > 1 && o.capStart !== false) cap(rings[0], o.outStart || dir.clone().negate());
    if (o.capEnd !== false) cap(rings[M - 1], o.outEnd || dir);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
  };

  // Fluted outline, counter-clockwise about +Y: twelve shallow channels between
  // narrow fillets, as unit directions with a radius each.
  const FLUTE = [];
  for (let i = 0; i < 12; i++) {
    for (const [f, r] of [[0, 0.5], [0.24, 0.5], [0.4, 0.466], [0.62, 0.456], [0.84, 0.47]]) {
      const a = ((i + f) / 12) * Math.PI * 2;
      FLUTE.push([Math.sin(a), Math.cos(a), r]);
    }
  }
  const CIRCLE = Array.from({ length: 32 }, (_, i) => [Math.sin((i / 32) * Math.PI * 2), Math.cos((i / 32) * Math.PI * 2)]);
  // A ring of the fluted outline scaled by s, each point at height h(x, z).
  const fring = (s, h, xf = (p) => p) => FLUTE.map(([sx, cz, r]) => { const x = sx * r * s, z = cz * r * s; return xf(V(x, h(x, z), z)); });
  const flat = (y) => () => y;

  // The break: a plane falling 0.6 m toward the front right, roughened into a fracture.
  const TOP = 3.4;
  const shear = (x, z) => TOP - 0.6 * (0.5 + (x * 0.8 + z * 0.6));
  const rough = (x, z) => 0.035 * Math.sin(7.1 * x + 2.3) + 0.03 * Math.sin(9.7 * z - 1.1) + 0.022 * Math.sin(13.3 * (x + z) + 0.7);
  const breakH = (x, z) => shear(x, z) + rough(x, z);
  const clampY = (y, lo, hi) => Math.max(lo, Math.min(hi, y));

  // Each drum has walked a little off its bed: shifted, turned and tipped about its own foot.
  const walked = (y0, dx, dz, turn, tip) => {
    const m = new THREE.Matrix4().makeTranslation(dx, y0, dz)
      .multiply(new THREE.Matrix4().makeRotationZ(tip))
      .multiply(new THREE.Matrix4().makeRotationY(turn))
      .multiply(new THREE.Matrix4().makeTranslation(0, -y0, 0));
    return (p) => p.applyMatrix4(m);
  };

  // ------------------------------------------------------------------- base
  const plate = (hw, y0, y1, c, m, chip = 0) => {
    const ring = (w, y) => {
      const pts = [[w, -(w - c)], [w, w - c], [w - c, w], [-(w - c), w], [-w, w - c], [-w, -(w - c)], [-(w - c), -w], [w - c, -w]];
      // a chipped front left corner on the lowest tier
      if (chip) { pts[3] = [-(w - c - chip), w]; pts[4] = [-w, w - c - chip * 0.8]; }
      return pts.map(([x, z]) => V(x, y, z));
    };
    return add(loft([ring(hw - c, y0), ring(hw, y0 + c), ring(hw, y1 - c), ring(hw - c, y1)]), m);
  };
  plate(0.7, 0, 0.2, 0.03, SIENNA, 0.16);
  plate(0.62, 0.2, 0.52, 0.03, SAND);
  plate(0.55, 0.52, 0.62, 0.02, SUN);
  // an inlaid basalt disc in a carved ring on each face of the middle tier
  for (let k = 0; k < 4; k++) {
    const face = new THREE.Group();
    face.rotation.y = (k * Math.PI) / 2;
    g.add(face);
    const disc = (r, z0, z1) => [z0, z1].map((z) => CIRCLE.map(([s, c]) => V(s * r, 0.36 + c * r, z)));
    add(loft(disc(0.1, 0.6, 0.635)), BASALT, face);
    add(loft([0.16, 0.16, 0.11, 0.11].map((r, i) => CIRCLE.map(([s, c]) => V(s * r, 0.36 + c * r, i === 0 || i === 3 ? 0.6 : 0.64))), { flip: true, capStart: false, capEnd: false }), SIENNA, face);
  }

  // ------------------------------------------------------------------ drums
  const drum = (y0, y1, xf) => add(loft([fring(0.96, flat(y0), xf), fring(1, flat(y0 + 0.02), xf), fring(1, flat(y1 - 0.02), xf), fring(0.96, flat(y1), xf)]), SAND);
  drum(0.62, 1.52, walked(0.62, 0.012, -0.008, 0.03, 0.004));
  drum(1.52, 2.42, walked(1.52, -0.028, 0.024, 0.14, -0.012));
  const top = walked(2.42, 0.034, 0.03, -0.1, 0.014);
  // the top drum's wall rises to the ragged edge of the fracture, which the
  // sunlit break surface then closes in toward the core
  const edge = (x, z) => Math.min(TOP, breakH(x, z));
  add(loft([fring(0.96, flat(2.42), top), fring(1, flat(2.44), top), fring(1, edge, top)], { capEnd: false }), SAND);
  add(loft([1, 0.78, 0.55, 0.32, 0.12].map((s) => fring(s, (x, z) => Math.min(TOP, breakH(x, z) + (s < 1 ? 0.04 * (1 - s) : 0)), top)),
    { flip: false, capStart: false, outEnd: V(0, 1, 0) }), SUN);
  // the bone capital band survives only where the fracture stays above it
  // Band rings between heights lo and hi at each angle. Where the band has
  // gone (hi - lo shrinks to nothing) it also draws back inside the stone, so
  // no flat bone lip is left standing proud of the break.
  const bandRings = (lo, hi) => {
    const prof = [[0.44, 'lo'], [0.54, 'lo'], [0.552, 'mid'], [0.552, 'hi2'], [0.54, 'hi'], [0.44, 'hi']];
    return prof.map(([r, key]) => CIRCLE.map(([s, c]) => {
      const a = lo(s * 0.5, c * 0.5), b = hi(s * 0.5, c * 0.5);
      const y = { lo: a, mid: Math.min(b, a + 0.02), hi2: Math.max(a, b - 0.02), hi: b }[key];
      const k = clampY((b - a) / 0.03, 0, 1);
      const rr = 0.44 + (r - 0.44) * k;
      return V(s * rr, y, c * rr);
    }));
  };
  const onColumn = bandRings((x, z) => Math.min(3.16, breakH(x, z)), (x, z) => clampY(breakH(x, z) + 0.004, Math.min(3.16, breakH(x, z)), TOP));
  add(loft(onColumn.map((r) => r.map(top)), { capStart: false, capEnd: false }), BONE);

  // ------------------------------------------------ the fallen crown piece
  // The thick half of what broke off, built where it stood: fluted wall and
  // band on the arc, a jagged chord where it split in two when it landed, the
  // rough fracture beneath and the dressed top above. It came to rest on its
  // fracture, so the dressed top tilts up and the band rides the raised edge.
  const PHI = Math.atan2(0.8, 0.6), SPAN = 1.72;
  const off = (a) => Math.atan2(Math.sin(a - PHI), Math.cos(a - PHI));
  const arc = FLUTE.map(([sx, cz, r]) => [Math.atan2(sx, cz), sx * r, cz * r]).filter(([a]) => Math.abs(off(a)) <= SPAN)
    .sort((p, q) => off(p[0]) - off(q[0])).map(([, x, z]) => [x, z]);
  const [ax, az] = arc[arc.length - 1], [bx, bz] = arc[0];
  const chord = [0.2, 0.38, 0.55, 0.72, 0.86].map((t, i) => {
    const jag = [0.05, -0.03, 0.06, -0.04, 0.03][i];
    const nx = -(bz - az), nz = bx - ax, nl = Math.hypot(nx, nz);
    return [ax + (bx - ax) * t + (nx / nl) * jag, az + (bz - az) * t + (nz / nl) * jag];
  });
  const dOutline = [...arc, ...chord];
  const under = (x, z) => Math.min(TOP - 0.004, breakH(x, z));
  const at = (pts, h) => pts.map(([x, z]) => V(x, h(x, z), z));
  const crown = new THREE.Group();
  add(loft([at(arc, under), at(arc, flat(TOP))], { open: true, capStart: false, capEnd: false }), SAND, crown);
  add(loft([at([arc[arc.length - 1], ...chord, arc[0]], under), at([arc[arc.length - 1], ...chord, arc[0]], flat(TOP))],
    { open: true, flip: false, capStart: false, capEnd: false }), SUN, crown);
  add(loft([at(dOutline, flat(TOP))], { capStart: false, outEnd: V(0, 1, 0) }), SUN, crown);
  add(loft([at(dOutline, under)], { capStart: false, outEnd: V(0, -1, 0) }), SUN, crown);
  // the band swept along the arc as a cross-section, closed where the chord cut it
  const sweep = [];
  for (let i = 0; i <= 20; i++) {
    const a = PHI - SPAN * 0.97 + (i / 20) * SPAN * 1.94;
    const R = V(Math.sin(a), 0, Math.cos(a));
    const lo = clampY(breakH(R.x * 0.5, R.z * 0.5) - 0.004, 3.16, TOP), hi = TOP;
    const k = clampY((hi - lo) / 0.03, 0, 1);
    sweep.push([[0.44, lo], [0.54, lo], [0.552, Math.min(hi, lo + 0.02)], [0.552, Math.max(lo, hi - 0.02)], [0.54, hi], [0.44, hi]]
      .map(([r, y]) => V(R.x * (0.44 + (r - 0.44) * k), y, R.z * (0.44 + (r - 0.44) * k))));
  }
  const tan = (a) => V(Math.cos(a), 0, -Math.sin(a));
  add(loft(sweep, { flip: true, outStart: tan(PHI - SPAN * 0.97).negate(), outEnd: tan(PHI + SPAN * 0.97) }), BONE, crown);
  crown.children.forEach((m) => m.geometry.translate(0, -TOP, 0));
  const over = new THREE.Group(), turn = new THREE.Group();
  // lay the fracture plane flat (its normal onto +Y), then turn the chord to face the base
  over.quaternion.setFromUnitVectors(V(0.48, 1, 0.36).normalize(), V(0, 1, 0));
  turn.rotation.y = 0.86;
  over.add(crown); turn.add(over); g.add(turn);
  turn.updateMatrixWorld(true);
  const fb = new THREE.Box3(), fv = V(0, 0, 0);
  turn.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    for (let i = 0; i < p.count; i++) fb.expandByPoint(fv.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  turn.position.set(0.63 - fb.min.x, -fb.min.y, 0.08 - (fb.min.z + fb.max.z) / 2);

  // --- the six lines -------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
