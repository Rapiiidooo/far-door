// boulder_cluster, candidate C (hand-built lofts): each boulder is a stack of strata
// courses, every course lofted through irregular ten-point rings that bulge between
// chamfered edges, so neighbouring courses meet in a V-groove and erode unevenly. The
// big boulder stands; the middle one leans into it, the small one tips against both,
// and the two tipped stones are cut at the floor so they sit in it. Burnt sienna
// underside course, sandstone body, sunlit crown.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const SUN = mat(0xd4a373, 0.86);
  const SAND = mat(0xb57f4f, 0.92);
  const SIENNA = mat(0x8a5433, 0.95);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const X = V(1, 0, 0), Y = V(0, 1, 0);
  let seed = 41;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;

  const newell = (r) => {
    const n = V(0, 0, 0);
    for (let j = 0; j < r.length; j++) {
      const a = r[j], b = r[(j + 1) % r.length];
      n.x += (a.y - b.y) * (a.z + b.z); n.y += (a.z - b.z) * (a.x + b.x); n.z += (a.x - b.x) * (a.y + b.y);
    }
    return n;
  };
  const centre = (r) => r.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / r.length);
  const loft = (rings) => {
    const N = rings[0].length, M = rings.length, pos = [], uv = [];
    const dir = centre(rings[M - 1]).sub(centre(rings[0]));
    const flip = newell(rings[0]).dot(dir) < 0;
    const tri = (a, b, c, ta, tb, tc) => {
      if (flip) { [b, c] = [c, b]; [tb, tc] = [tc, tb]; }
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      uv.push(...ta, ...tb, ...tc);
    };
    for (let i = 0; i < M - 1; i++) {
      for (let j = 0; j < N; j++) {
        const k = (j + 1) % N;
        const u0 = j / N, u1 = (j + 1) / N, v0 = i / (M - 1), v1 = (i + 1) / (M - 1);
        tri(rings[i][j], rings[i][k], rings[i + 1][k], [u0, v0], [u1, v0], [u1, v1]);
        tri(rings[i][j], rings[i + 1][k], rings[i + 1][j], [u0, v0], [u1, v1], [u0, v1]);
      }
    }
    const cap = (r, out) => {
      const n = newell(r).normalize();
      const U = V(0, 0, 0).crossVectors(n, Math.abs(n.y) < 0.9 ? Y : X).normalize();
      const W = V(0, 0, 0).crossVectors(n, U);
      const p2 = r.map((p) => new THREE.Vector2(p.dot(U), p.dot(W)));
      let lo = Infinity, span = 1e-6;
      for (const p of p2) { lo = Math.min(lo, p.x, p.y); span = Math.max(span, Math.abs(p.x), Math.abs(p.y)); }
      const t2 = (i) => [(p2[i].x - lo) / (2 * span), (p2[i].y - lo) / (2 * span)];
      for (const [i0, i1, i2] of THREE.ShapeUtils.triangulateShape(p2, [])) {
        let [a, b, c] = [i0, i1, i2];
        const nn = V(0, 0, 0).subVectors(r[b], r[a]).cross(V(0, 0, 0).subVectors(r[c], r[a]));
        if (nn.dot(out) < 0) [b, c] = [c, b];
        pos.push(r[a].x, r[a].y, r[a].z, r[b].x, r[b].y, r[b].z, r[c].x, r[c].y, r[c].z);
        uv.push(...t2(a), ...t2(b), ...t2(c));
      }
    };
    cap(rings[0], dir.clone().negate());
    cap(rings[M - 1], dir);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
  };

  // One boulder in its own frame, base at y = 0. The silhouette is one profile of
  // [height fraction, scale] over an irregular eight-facet plan whose facets lean in
  // or out with height, so the mass is continuous; strata grooves are cut into it as
  // narrow V rings, and the colour changes inside the first and last groove.
  const N = 6, CUT = 0.16;
  const boulder = (rx, rz, H, prof, grooves, mats, lean, slope) => {
    const main = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 + jit(0.32), r = 1 + jit(0.2);
      // tilt leans a facet in or out with height; bite scales how deep each groove cuts there
      return { x: Math.cos(a) * rx * r, z: Math.sin(a) * rz * r, tilt: jit(0.55), bite: 0.25 + rnd() * 0.95 };
    });
    // every corner of the seven-facet plan is cut by a narrow chamfer facet
    const plan = [];
    main.forEach((p, i) => {
      const a = main[(i + N - 1) % N], b = main[(i + 1) % N];
      plan.push({ x: p.x + (a.x - p.x) * CUT, z: p.z + (a.z - p.z) * CUT, tilt: p.tilt, bite: p.bite },
        { x: p.x + (b.x - p.x) * CUT, z: p.z + (b.z - p.z) * CUT, tilt: p.tilt, bite: p.bite });
    });
    const sAt = (t) => {
      for (let i = 0; i < prof.length - 1; i++) {
        const [t0, s0] = prof[i], [t1, s1] = prof[i + 1];
        if (t <= t1) return s0 + ((s1 - s0) * (t - t0)) / (t1 - t0);
      }
      return prof[prof.length - 1][1];
    };
    const ring = (t, inset = 0) => plan.map(({ x, z, tilt, bite }) => {
      const len = Math.hypot(x, z), s = sAt(t) * (1 + tilt * (t - 0.45));
      const k = Math.max(0.04, (s * len - inset * bite) / len);
      const cx = lean[0] * t * t, cz = lean[1] * t * t, px = x * k + cx, pz = z * k + cz;
      const crown = Math.max(0, (t - 0.7) / 0.3);
      return V(px, t * H + crown * (slope[0] * px + slope[1] * pz), pz);
    });
    // rings in height order, grooves as (edge, bottom, edge) triples
    // a groove is [height fraction, depth]; profile points just either side of it set
    // the layers' widths, so a hard layer stands out as a ledge over a soft one
    const W = 0.045 / H;
    const stops = [];
    for (const [t] of prof) if (!grooves.some(([q]) => Math.abs(q - t) < W * 1.5)) stops.push([t, 0]);
    for (const [q, d] of grooves) stops.push([q - W, 0], [q, d, true], [q + W, 0]);
    stops.sort((a, b) => a[0] - b[0]);
    const group = new THREE.Group();
    let rings = [], part = 0;
    for (const [t, inset, cut] of stops) {
      rings.push(ring(t, inset));
      const split = cut && (t === grooves[0][0] || t === grooves[grooves.length - 1][0]);
      if (split) {
        group.add(new THREE.Mesh(loft(rings), mats[part++]));
        rings = [rings[rings.length - 1]];
      }
    }
    group.add(new THREE.Mesh(loft(rings), mats[part]));
    return group;
  };

  const big = boulder(1.15, 0.95, 2.08, [[0, 0.84], [0.05, 0.95], [0.13, 0.97], [0.17, 1.02], [0.31, 1.0], [0.35, 0.93], [0.53, 0.94], [0.57, 1.02],
    [0.66, 1.0], [0.7, 0.93], [0.81, 0.91], [0.85, 0.9], [0.93, 0.8], [1, 0.66]],
  [[0.15, 0.11], [0.33, 0.08], [0.55, 0.12], [0.68, 0.07], [0.83, 0.1]], [SIENNA, SAND, SUN], [0.18, -0.08], [-0.3, 0.16]);
  big.position.set(-0.55, 0, -0.25);
  big.rotation.y = 0.3;
  const mid = boulder(0.88, 0.7, 1.55, [[0, 0.84], [0.07, 0.96], [0.18, 1.0], [0.22, 0.95], [0.4, 0.97], [0.44, 1.02], [0.56, 1.0], [0.6, 0.92],
    [0.78, 0.9], [0.82, 0.86], [0.92, 0.76], [1, 0.64]],
  [[0.2, 0.1], [0.42, 0.07], [0.58, 0.11], [0.8, 0.08]], [SIENNA, SAND, SUN], [-0.12, 0.08], [0.24, -0.14]);
  mid.position.set(1.08, -0.12, 0.2);
  mid.rotation.set(0, -0.4, 0.2);
  const small = boulder(0.58, 0.48, 0.95, [[0, 0.84], [0.1, 0.97], [0.26, 1.0], [0.3, 0.94], [0.58, 0.95], [0.62, 1.0], [0.8, 0.9], [1, 0.62]],
    [[0.28, 0.09], [0.6, 0.08]], [SIENNA, SAND, SUN], [0.08, 0.05], [0.14, 0.2]);
  small.position.set(0.12, -0.1, 1.02);
  small.rotation.set(-0.26, 0.8, 0);
  const stones = [big, mid, small];
  for (const [x, z, r] of [[-1.55, 0.55, 0.17], [1.75, -0.55, 0.14], [0.95, 1.2, 0.11], [-0.2, 1.25, 0.09]]) {
    const p = boulder(r * 1.2, r, r * 1.3, [[0, 0.85], [0.3, 1.0], [0.75, 0.85], [1, 0.4]], [[0.45, 0.03]], [SIENNA, SAND], [0, 0], [0.1, 0]);
    p.position.set(x, -0.03, z);
    p.rotation.set(jit(0.3), rnd() * 6, jit(0.3));
    stones.push(p);
  }

  // Bake into the group and cut at the floor: triangles wholly below are dropped, the
  // rest clamped to y = 0, so the tipped stones sit in the ground rather than on a corner.
  for (const s of stones) {
    g.add(s);
    g.updateMatrixWorld(true);
    const parts = s.children.slice();
    g.remove(s);
    for (const o of parts) {
      const src = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const p = src.attributes.position.array, t = src.attributes.uv.array, pos = [], uv = [];
      for (let i = 0; i < p.length; i += 9) {
        if (p[i + 1] < 0 && p[i + 4] < 0 && p[i + 7] < 0) continue;
        for (let k = 0; k < 3; k++) {
          pos.push(p[i + k * 3], Math.max(0, p[i + k * 3 + 1]), p[i + k * 3 + 2]);
          uv.push(t[(i / 9) * 6 + k * 2], t[(i / 9) * 6 + k * 2 + 1]);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, o.material));
    }
  }

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
