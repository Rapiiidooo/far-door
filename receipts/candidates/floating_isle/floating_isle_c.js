// floating_isle, candidate C (a second reading, hand-built lofts): the underside is read
// as bedrock strata torn out of the ground rather than a turned cone. Each of five
// isle-rock strata is its own slab, lofted through its own irregular plan with a chamfered
// foot, shifted and tipped a few degrees against its neighbours, so the steps run wide on
// one side and narrow on the other and the whole cone leans to its tip 9 m below the top.
// The dawn limestone cap is lofted the same way, a gently domed top over a chamfered,
// overhanging rim. Fragments are tipped chunks of the same strata; tufts are hand-cut
// blade clusters and the boulders small lofted stones. Flat shaded throughout.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, roughness) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = name;
    return m;
  };
  const LIME = mat(0xeadcc0, 'stone', 0.9);
  const ROCK = mat(0x9b7658, 'stone', 0.92);
  const SAGE = mat(0x7a8766, 'foliage', 0.85);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  let seed = 101;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const PARTS = new Map();
  const add = (m, pos) => {
    if (!PARTS.has(m)) PARTS.set(m, []);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    PARTS.get(m).push(geo);
  };
  const centroid = (r) => r.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / r.length);

  // --- the loft: rings of equal size, top to bottom, faces turned outward; optional caps -----
  const loft = (m, rings, capTop = false, capBot = true) => {
    const pos = [], N = rings[0].length;
    const tri = (a, b, c, out) => {
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      if (n.lengthSq() < 1e-12) return;
      if (n.dot(out) < 0) [b, c] = [c, b];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    };
    for (let k = 0; k < rings.length - 1; k++) {
      const axis = centroid(rings[k]).lerp(centroid(rings[k + 1]), 0.5);
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, a = rings[k][i], b = rings[k][j], c = rings[k + 1][i], d = rings[k + 1][j];
        const out = a.clone().add(b).add(c).add(d).multiplyScalar(0.25).sub(axis);
        tri(a, b, c, out); tri(b, d, c, out);
      }
    }
    const cap = (r, up) => {
      for (const [i0, i1, i2] of THREE.ShapeUtils.triangulateShape(r.map((p) => V2(p.x, p.z)), [])) tri(r[i0], r[i1], r[i2], V(0, up, 0));
    };
    if (capTop) cap(rings[0], 1);
    if (capBot) cap(rings[rings.length - 1], -1);
    add(m, pos);
  };
  // an irregular plan: N radii about 1, smooth lobes plus a little per-point roughness
  const plan = (N, lobes) => {
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    return Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2;
      const r = 1 + lobes * (0.6 * Math.sin(2 * a + ph[0]) + 0.5 * Math.sin(3 * a + ph[1]) + 0.3 * Math.sin(5 * a + ph[2])) + 0.03 * (rnd() - 0.5);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
  };
  // a ring of the plan at radius R and height y, in a slab's frame (centre, tilt quaternion)
  const ring = (pl, R, y, f) => pl.map(([x, z]) => V(x * R, y, z * R).sub(V(0, f.yc, 0)).applyQuaternion(f.q).add(V(f.cx, f.yc, f.cz)));
  const frameOf = (cx, cz, yc, tx, tz) => ({ cx, cz, yc, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(tx, rnd() * 6, tz)) });

  // --- the cap: dawn limestone, top centre at y = 0 -------------------------------------------
  const NC = 16, capPlan = plan(NC, 0.045), capF = { cx: 0, cz: 0, yc: 0, q: new THREE.Quaternion() };
  const DOME = [[0.42, -0.1], [0.74, -0.27], [0.94, -0.46]];
  {
    const top = V(0, 0, 0), first = ring(capPlan, 6.85 * DOME[0][0], DOME[0][1], capF);
    const pos = [];
    for (let i = 0; i < NC; i++) {
      const a = first[i], b = first[(i + 1) % NC];
      const n = b.clone().sub(a).cross(top.clone().sub(a));
      if (n.y > 0) pos.push(top.x, top.y, top.z, a.x, a.y, a.z, b.x, b.y, b.z);
      else pos.push(top.x, top.y, top.z, b.x, b.y, b.z, a.x, a.y, a.z);
    }
    add(LIME, pos);
    loft(LIME, [...DOME.map(([f, y]) => ring(capPlan, 6.85 * f, y, capF)), ring(capPlan, 6.85, -0.78, capF), ring(capPlan, 6.85, -1.56, capF), ring(capPlan, 6.85 * 0.955, -1.82, capF)]);
  }

  // --- five strata, each its own slab, shifted and tipped, leaning towards the tip -----------
  // [radius, top y, foot y, chamfer depth, chamfer inset, sides]
  // each slab's top reaches well up inside the one above, so no tipped seam can open a gap
  const STRATA = [[6.3, -1.2, -3.55, 0.36, 0.09, 15], [4.95, -2.9, -4.95, 0.32, 0.1, 14], [3.75, -4.3, -6.75, 0.3, 0.11, 13],
    [2.55, -6.1, -7.7, 0.26, 0.12, 12], [1.6, -7.05, -8.42, 0.22, 0.14, 10]];
  const lean = (y) => { const t = Math.max(0, -y - 1.7) / 7.3; return [1.1 * t * t, -0.7 * t * t]; };
  let last;
  STRATA.forEach(([R, y0, y1, ch, inset, N], k) => {
    const [lx, lz] = lean((y0 + y1) / 2);
    // each stratum pushed off the axis in its own direction and tipped a few degrees
    const sh = k === 0 ? 0 : 0.35 + 0.25 * rnd(), sa = rnd() * 6.3;
    const f = frameOf(lx + Math.cos(sa) * sh, lz + Math.sin(sa) * sh, (y0 + y1) / 2, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12);
    const pl = plan(N, 0.06 + 0.012 * k);
    loft(ROCK, [ring(pl, R, y0, f), ring(pl, R * 0.97, y1 + ch, f), ring(pl, R * (0.97 - inset), y1, f)]);
    last = { pl, R: R * (0.97 - inset), y: y1, f };
  });
  // the tip: the last stratum's foot drawn down to a point
  {
    const { pl, R, y, f } = last;
    const tip = V(f.cx + 0.1, -9.0, f.cz - 0.05);
    loft(ROCK, [ring(pl, R, y, f), ring(pl, R * 0.45, y - 0.34, f), pl.map(() => tip.clone())], false, false);
  }

  // --- three fragments, tipped chunks of the same strata --------------------------------------
  const chunk = (cx, cy, cz, s, capped, tilt) => {
    const f = frameOf(cx, cz, cy, tilt[0], tilt[1]);
    const pl = plan(9, 0.1);
    if (capped) loft(LIME, [ring(pl, s * 0.9, cy + 0.2 * s, f), ring(pl, s, cy + 0.08 * s, f), ring(pl, s, cy - 0.12 * s, f)], true, false);
    else loft(ROCK, [ring(pl, s * 0.88, cy + 0.2 * s, f), ring(pl, s, cy + 0.08 * s, f)], true, false);
    loft(ROCK, [ring(pl, s, capped ? cy - 0.12 * s : cy + 0.08 * s, f), ring(pl, s * 0.92, cy - 0.5 * s, f), ring(pl, s * 0.7, cy - 0.66 * s, f),
      ring(pl, s * 0.56, cy - 0.72 * s, f), ring(pl, s * 0.48, cy - 1.1 * s, f), pl.map(() => V(0, cy - 1.62 * s, 0).sub(V(0, cy, 0)).applyQuaternion(f.q).add(V(cx, cy, cz)))], false, false);
  };
  chunk(0.95, -10.2, -0.6, 1.15, true, [0.12, -0.14]);
  chunk(5.6, -6.2, 1.9, 0.8, false, [0.34, 0.22]);
  chunk(-5.2, -4.85, -3.6, 0.56, false, [-0.28, 0.4]);

  // --- the top: tufts of sage grass and two boulders, the centre left clear -------------------
  // the dome surface height at (x, z), read off the cap's own profile
  const domeY = (x, z) => {
    const a = Math.atan2(z, x), i = Math.round((((a / (Math.PI * 2)) % 1) + 1) % 1 * NC) % NC;
    const [px, pz] = capPlan[i], r = Math.hypot(x, z) / (6.85 * Math.hypot(px, pz));
    const prof = [[0, 0], ...DOME];
    for (let k = 0; k < prof.length - 1; k++) {
      const [r0, h0] = prof[k], [r1, h1] = prof[k + 1];
      if (r <= r1) return h0 + ((h1 - h0) * (r - r0)) / (r1 - r0);
    }
    return DOME[DOME.length - 1][1];
  };
  {
    const pos = [];
    const blade = (b, dir, h, w) => {
      const side = V(-dir.z, 0, dir.x).normalize().multiplyScalar(w);
      const tip = b.clone().addScaledVector(dir, h);
      const back = V(0, 0, 0).crossVectors(dir, side).normalize().multiplyScalar(w * 0.8);
      const p = [b.clone().add(side), b.clone().sub(side), b.clone().add(back)];
      for (let k = 0; k < 3; k++) {
        const a = p[k], c = p[(k + 1) % 3];
        const n = c.clone().sub(a).cross(tip.clone().sub(a)), mid = a.clone().add(c).multiplyScalar(0.5).sub(b);
        if (n.dot(mid) >= 0) pos.push(a.x, a.y, a.z, c.x, c.y, c.z, tip.x, tip.y, tip.z);
        else pos.push(c.x, c.y, c.z, a.x, a.y, a.z, tip.x, tip.y, tip.z);
      }
    };
    const TUFTS = [];
    for (const [px, pz, sp, n] of [[3.7, 1.5, 0.9, 4], [-2.3, 4.0, 0.8, 4], [-4.9, -0.7, 0.75, 3], [1.6, -4.9, 0.8, 3], [5.3, -2.1, 0.5, 2], [-3.5, -4.0, 0.65, 3]]) {
      for (let k = 0; k < n; k++) { const a = rnd() * 6.3, r = sp * Math.sqrt(rnd()); TUFTS.push([px + Math.cos(a) * r, pz + Math.sin(a) * r]); }
    }
    for (const [x, z] of TUFTS) {
      const s = 1.1 + 0.5 * rnd(), base = V(x, domeY(x, z) - 0.03, z), a0 = rnd() * 6;
      for (let k = 0; k < 6; k++) {
        const a = a0 + (k / 6) * Math.PI * 2 + rnd() * 0.5, lean2 = 0.3 + 0.55 * rnd();
        const dir = V(Math.cos(a) * Math.sin(lean2), Math.cos(lean2), Math.sin(a) * Math.sin(lean2));
        blade(base, dir, s * (0.34 + 0.18 * rnd()), 0.035 * s);
      }
    }
    add(SAGE, pos);
  }
  for (const [x, z, w, h] of [[-3.4, 1.6, 0.66, 0.55], [2.9, -3.0, 0.46, 0.4]]) {
    const y = domeY(x, z) - 0.08, f = frameOf(x, z, y + h / 2, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3);
    const pl = plan(7, 0.12);
    loft(ROCK, [ring(pl, w * 0.55, y + h, f), ring(pl, w, y + h * 0.62, f), ring(pl, w * 0.95, y + h * 0.18, f), ring(pl, w * 0.7, y, f)], true, true);
  }

  // --- merge per material, UVs projected over each merged box --------------------------
  const merged = (geos) => {
    let n = 0;
    for (const x of geos) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const x of geos) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      o += x.attributes.position.count;
    }
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    const uv = new Float32Array(n * 2);
    for (let t = 0; t < n; t += 3) {
      const a = V(pos[t * 3], pos[t * 3 + 1], pos[t * 3 + 2]);
      const f = V(pos[t * 3 + 3], pos[t * 3 + 4], pos[t * 3 + 5]).sub(a).cross(V(pos[t * 3 + 6], pos[t * 3 + 7], pos[t * 3 + 8]).sub(a));
      const fx = Math.abs(f.x), fy = Math.abs(f.y), fz = Math.abs(f.z);
      for (let k = t; k < t + 3; k++) {
        const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
        const [u, v] = fy >= fx && fy >= fz ? [x, z] : fx >= fz ? [z, y] : [x, y];
        uv[k * 2] = u / su; uv[k * 2 + 1] = v / sv;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  };
  const meshes = new Map();
  for (const [m, geos] of PARTS) { const me = new THREE.Mesh(merged(geos), m); meshes.set(m, me); g.add(me); }

  // --- placement: lowest point on y = 0, centred on x and z (measured on vertices) -------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  // the walkable top at the asset's centre (x = z = 0 after the shift), cast down onto the cap
  g.updateMatrixWorld(true);
  const hit = new THREE.Raycaster(V(0, box.max.y - box.min.y + 5, 0), V(0, -1, 0)).intersectObject(meshes.get(LIME), false)[0];
  g.userData.top = hit ? Math.round(hit.point.y * 1000) / 1000 : null;
  return g;
}
