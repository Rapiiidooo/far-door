// frost_cairn, candidate C (hand-built, a second reading): the stake does not stand free, it
// was driven in at the front right and has fallen back against the stack, resting on the
// flank of the upper stones. The five frost-slate stones are hand-built wedges with ragged,
// chipped outlines: each rests on the tilted top of the one below and tilts its own top
// another way, so the joints zig-zag, and the column steps left and then right toward the
// stake. The snow is a crust moulded over the capstone that spills over its windward edge, with
// small pillows caught on the ledges below. The vermilion strip is wound one and a half
// turns round the stake's top and knotted on the outer side; its long tail hangs plumb,
// turning as it falls, and ends in three torn fingers; a short tail sticks out of the knot.
// The stake's foot is cut flush with the ground. About 1.1 m of stone, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, name, roughness, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const SLATE = mat(0x3d4654, 'stone', 0.9);
  const SNOW = mat(0xe9f2f6, 'ground', 0.8);
  const TIMBER = mat(0x8a6a48, 'timber', 0.9);
  const CLOTH = mat(0xc2412d, 'fabric', 0.92, { side: THREE.DoubleSide });

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;

  // --- building blocks ------------------------------------------------------------------------
  // UVs in metres, projected on the dominant axis of each vertex normal.
  const finish = (geo, m) => {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = [];
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      uv.push(...(ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y]));
    }
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.add(new THREE.Mesh(geo, m));
  };
  // Faceted parts: a triangle soup, one normal per face.
  const Soup = () => {
    const t = [];
    const tri = (a, b, c) => t.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    return {
      tri,
      // ring A below ring B, both closed and turning the same way; faces point outward
      band(A, B) { for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; tri(A[i], B[i], B[j]); tri(A[i], B[j], A[j]); } },
      fan(R, c, up) { for (let i = 0; i < R.length; i++) { const j = (i + 1) % R.length; if (up) tri(c, R[j], R[i]); else tri(c, R[i], R[j]); } },
      mesh(m) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(t, 3));
        geo.computeVertexNormals();
        finish(geo, m);
      },
    };
  };
  // Soft parts: shared corners, so the normals average.
  const Smooth = () => {
    const vs = [], idx = [];
    const put = (R) => R.map((p) => (vs.push(p), vs.length - 1));
    return {
      put,
      band(A, B) { for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; idx.push(A[i], B[i], B[j], A[i], B[j], A[j]); } },
      fan(R, c, up) { for (let i = 0; i < R.length; i++) { const j = (i + 1) % R.length; if (up) idx.push(c, R[j], R[i]); else idx.push(c, R[i], R[j]); } },
      // an open strip: pairs of [left, right] corners down its length
      strip(S) { for (let i = 0; i < S.length - 1; i++) { const [a, b] = S[i], [c, d] = S[i + 1]; idx.push(a, c, b, b, c, d); } },
      mesh(m) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vs.flatMap((p) => [p.x, p.y, p.z]), 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        finish(geo, m);
      },
    };
  };
  const centroid = (R) => R.reduce((s, p) => s.add(p), V(0, 0, 0)).multiplyScalar(1 / R.length);

  // --- the stones -----------------------------------------------------------------------------
  // Each stone is a wedge: it rests on the tilted top of the one below and its own top tilts
  // another way, so the joints zig-zag the way a cairn is levelled by hand.
  // rx, rz half-widths; t thickness at the centre; n corners; x, z drift; a, b the slope of
  // the top (rise per metre along x and z).
  const STONES = [
    { rx: 0.44, rz: 0.36, t: 0.28, n: 10, x: 0, z: 0, a: 0.07, b: -0.05 },
    { rx: 0.36, rz: 0.3, t: 0.23, n: 10, x: -0.05, z: 0.035, a: -0.07, b: 0.05 },
    { rx: 0.31, rz: 0.26, t: 0.22, n: 9, x: 0.015, z: -0.03, a: 0.06, b: 0.06 },
    { rx: 0.25, rz: 0.21, t: 0.21, n: 9, x: 0.065, z: 0.0, a: -0.06, b: -0.05 },
    { rx: 0.2, rz: 0.17, t: 0.18, n: 8, x: 0.055, z: 0.025, a: 0.04, b: 0.03 },
  ];
  const SEAT = 0.01;
  const plane = (h, a, b, px, pz) => (x, z) => h + a * (x - px) + b * (z - pz);
  const stones = [];
  let below = () => 0;
  const rock = Soup();
  for (const s of STONES) {
    const turn = rnd() * Math.PI * 2, O = [];
    for (let k = 0; k < s.n; k++) {
      const a = turn + ((k + jit(0.3)) / s.n) * Math.PI * 2, r = 1 + jit(0.15);
      O.push([Math.cos(a) * s.rx * r, Math.sin(a) * s.rz * r]);
    }
    const foot = below, top = plane(foot(s.x, s.z) + s.t, s.a, s.b, s.x, s.z);
    // a ring of the outline scaled by f, lifted off the foot by an arris of up to 5 cm
    // (from the top when fromTop), each corner chipped by up to jr
    const ring = (f, lift, fromTop, jr = 0, jy = 0) => O.map(([x, z]) => {
      const q = f * (1 + jit(jr)), px = s.x + x * q, pz = s.z + z * q;
      const y0 = foot(px, pz), y1 = top(px, pz), e = Math.min(lift, 0.28 * (y1 - y0));
      return V(px, (fromTop ? y1 - e : y0 + e) + jit(jy), pz);
    });
    const rings = [ring(0.84, 0, false), ring(1, 0.045, false, 0.02), ring(0.97, 0.05, true, 0.02), ring(0.8, 0, true, 0.01, 0.004)];
    const cTop = centroid(rings[3]).add(V(0, 0.004, 0));
    for (let r = 0; r < 3; r++) rock.band(rings[r], rings[r + 1]);
    rock.fan(rings[3], cTop, true);
    rock.fan(rings[0], centroid(rings[0]), false);
    stones.push({ rings, top: cTop, plane: top });
    below = (x, z) => top(x, z) - SEAT;
  }
  rock.mesh(SLATE);

  // --- the stake, resting against the stack ---------------------------------------------------
  const F = V(0.4, 0, 0.3), AZ = (-105 * Math.PI) / 180, LEN = 1.3, RS = 0.036;
  const dirOf = (L) => V(Math.sin(L) * Math.cos(AZ), Math.cos(L), Math.sin(L) * Math.sin(AZ));
  // lean it back until it touches the stones' flanks (corners and points along each edge)
  const flank = [];
  for (const st of stones) {
    for (const R of st.rings.slice(1)) {
      for (let k = 0; k < R.length; k++) for (let q = 0; q < 4; q++) flank.push(R[k].clone().lerp(R[(k + 1) % R.length], q / 4));
    }
  }
  const clearance = (d) => {
    let min = Infinity;
    for (const p of flank) {
      const w = p.clone().sub(F), s = w.dot(d);
      if (s > 0 && s < LEN) min = Math.min(min, w.addScaledVector(d, -s).length() - RS);
    }
    return min;
  };
  let lo = 0.05, hi = 0.5;
  for (let it = 0; it < 24; it++) { const mid = (lo + hi) / 2; if (clearance(dirOf(mid)) > 0.003) lo = mid; else hi = mid; }
  const d = dirOf(lo);
  const along = (s) => F.clone().addScaledVector(d, s);
  // a frame across the stake: e1 toward the outer side, away from the stones' axis
  const topAxis = stones[4].top;
  const tip = along(LEN);
  const out = V(tip.x - topAxis.x, 0, tip.z - topAxis.z).normalize().add(V(0, 0, -0.35)).normalize();
  // (e1, e2) turn the same way round d as the stones' rings turn round +Y, so the same band
  // and fan windings face outward
  const e1 = out.clone().addScaledVector(d, -out.dot(d)).normalize(), e2 = V(0, 0, 0).crossVectors(e1, d);
  {
    // a hewn section: a square with its corners taken off, a few of them left a little proud
    const SEC = [];
    for (let k = 0; k < 8; k++) {
      const a = ((k >> 1) * Math.PI) / 2 + Math.PI / 4 + (k % 2 ? 0.34 : -0.34);
      SEC.push([Math.cos(a), Math.sin(a)]);
    }
    const ring = (s, r, lift = null) => SEC.map(([c, sn], k) => {
      const p = along(s).addScaledVector(e1, c * r * (1 + (k % 3 === 0 ? 0.05 : 0))).addScaledVector(e2, sn * r);
      if (lift) p.addScaledVector(d, lift(c, sn));
      return p;
    });
    const R = [ring(0, 0.036), ring(0.55, 0.035), ring(1.19, 0.032), ring(1.24, 0.038), ring(1.27, 0.036), ring(1.285, 0.028, (c) => 0.012 * c)];
    // the foot is cut flush with the ground
    for (const p of R[0]) p.addScaledVector(d, -p.y / d.y);
    const wood = Soup();
    for (let r = 0; r < R.length - 1; r++) wood.band(R[r], R[r + 1]);
    wood.fan(R[R.length - 1], centroid(R[R.length - 1]).addScaledVector(d, 0.004), true);
    wood.fan(R[0], centroid(R[0]), false);
    wood.mesh(TIMBER);
  }

  // --- snow: a crust moulded over the capstone, spilling over its windward edge -------------------
  const WIND = V(-0.8, 0, 0.6).normalize();
  {
    const { rings, top: C } = stones[4];
    const Rt = rings[rings.length - 1], Rc = rings[rings.length - 2];
    const sm = Smooth(), under = Soup();
    const S0 = [], S1 = [], S2 = [];
    for (let k = 0; k < Rt.length; k++) {
      const rad = Rt[k].clone().sub(C).setY(0).normalize();
      const w = Math.max(0, rad.dot(WIND));
      const p0 = Rt[k].clone().lerp(Rc[k], 0.06 + 0.62 * w * w).addScaledVector(rad, 0.004);
      p0.y += 0.003;
      S0.push(p0);
      // the shoulder rides over the stone's top edge, however far the rim has spilled
      S1.push(Rt[k].clone().addScaledVector(rad, 0.006).add(V(0, 0.016 + 0.006 * w, 0)));
      S2.push(C.clone().lerp(Rt[k], 0.55).add(V(0, 0.034, 0)));
    }
    const i0 = sm.put(S0), i1 = sm.put(S1), i2 = sm.put(S2), [ia] = sm.put([C.clone().add(V(0, 0.044, 0))]);
    sm.band(i0, i1);
    sm.band(i1, i2);
    sm.fan(i2, ia, true);
    sm.mesh(SNOW);
    under.fan(S0, C.clone().add(V(0, -0.002, 0)), false);
    under.mesh(SNOW);
  }
  // pillows caught on the widest ledge of each of the lower three stones, favouring the wind
  {
    const hit = (O, u, R) => {
      let best = 0;
      for (let k = 0; k < R.length; k++) {
        const a = R[k], b = R[(k + 1) % R.length];
        const ex = b.x - a.x, ez = b.z - a.z, den = u.x * ez - u.z * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((a.x - O.x) * ez - (a.z - O.z) * ex) / den, s = ((a.x - O.x) * u.z - (a.z - O.z) * u.x) / den;
        if (t > 0 && s >= 0 && s <= 1) best = Math.max(best, t);
      }
      return best;
    };
    const sm = Smooth();
    for (let i = 0; i < 3; i++) {
      const { rings, top: C } = stones[i], Rt = rings[rings.length - 1], above = stones[i + 1].rings[1];
      let pick = null;
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2, u = V(Math.cos(a), 0, Math.sin(a));
        const r0 = hit(C, u, above), r1 = hit(C, u, Rt), ledge = r1 - r0;
        const score = ledge * (1.4 + u.dot(WIND));
        if (ledge > 0.05 && (!pick || score > pick.score)) pick = { score, u, r0, ledge };
      }
      if (!pick) continue;
      const { u, r0, ledge } = pick, tv = V(-u.z, 0, u.x);
      const mid = C.clone().addScaledVector(u, r0 + ledge * 0.5);
      const ar = Math.min(0.08, ledge * 0.45), at = ar * 2.2;
      const on = (p, h) => p.setY(stones[i].plane(p.x, p.z) + h);
      const rim = [], ring2 = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        rim.push(on(mid.clone().addScaledVector(u, c * ar).addScaledVector(tv, s * at), -0.002));
        ring2.push(on(mid.clone().addScaledVector(u, c * ar * 0.55).addScaledVector(tv, s * at * 0.62), 0.013));
      }
      const ir = sm.put(rim), i2 = sm.put(ring2), [ia] = sm.put([on(mid.clone(), 0.018)]);
      sm.band(ir, i2);
      sm.fan(i2, ia, true);
    }
    sm.mesh(SNOW);
  }

  // --- the cloth: wound round the top, knotted on the outer side, two tails ---------------------
  {
    const cloth = Smooth();
    // one and a half turns, rising and standing a little further off with each turn
    const TURNS = 1.5, NW = 24, S_LO = 1.125, RISE = 0.06, WW = 0.05;
    const wrap = [];
    for (let i = 0; i <= NW; i++) {
      const f = i / NW, th = -TURNS * 2 * Math.PI * (1 - f);
      const rr = 0.034 + 0.002 + 0.008 * f;
      const c = along(S_LO + RISE * f).addScaledVector(e1, Math.cos(th) * rr).addScaledVector(e2, Math.sin(th) * rr);
      wrap.push(cloth.put([c.clone().addScaledVector(d, -WW / 2), c.clone().addScaledVector(d, WW / 2)]));
    }
    cloth.strip(wrap);
    // the knot: a lumpy bulb standing out from the last turn
    const K = along(S_LO + RISE).addScaledVector(e1, 0.035 + 0.012 + 0.018);
    {
      const ax = e1, b1 = e2, b2 = d;
      const lump = (h, r, n = 6, ph = 0) => Array.from({ length: n }, (_, k) => {
        const a = ph + (k / n) * Math.PI * 2;
        return K.clone().addScaledVector(ax, h).addScaledVector(b1, Math.cos(a) * r * 1.15).addScaledVector(b2, Math.sin(a) * r);
      });
      const A = cloth.put(lump(-0.016, 0.022)), B = cloth.put(lump(0.004, 0.027, 6, 0.4)), C2 = cloth.put(lump(0.018, 0.016, 6, 0.8));
      const [pa] = cloth.put([K.clone().addScaledVector(ax, -0.026)]), [pc] = cloth.put([K.clone().addScaledVector(ax, 0.026)]);
      cloth.band(A, B);
      cloth.band(B, C2);
      cloth.fan(C2, pc, true);
      cloth.fan(A, pa, false);
    }
    // A tail: a strip hanging from p0, drifting outward as it falls and swaying sideways, its
    // width turning from angle phi0 to phi1 about the vertical. Returns its last section.
    const outH = V(e1.x, 0, e1.z).normalize(), side = V(-outH.z, 0, outH.x);
    const tail = (p0, len, n, w0, w1, phi0, phi1, drift, sway) => {
      const S = [];
      let last = null;
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const c = p0.clone().add(V(0, -len * f, 0)).addScaledVector(outH, drift * f ** 1.4).addScaledVector(side, sway * Math.sin(Math.PI * f));
        const phi = phi0 + (phi1 - phi0) * f, w = w0 + (w1 - w0) * f;
        const across = side.clone().multiplyScalar(Math.cos(phi)).addScaledVector(outH, Math.sin(phi));
        const sec = [c.clone().addScaledVector(across, -w / 2), c.clone().addScaledVector(across, w / 2)];
        S.push(cloth.put(sec));
        last = { c, across, w, sec };
      }
      cloth.strip(S);
      return last;
    };
    const end = tail(K.clone().add(V(0, -0.02, 0)).addScaledVector(outH, 0.006), 0.4, 10, 0.1, 0.108, -0.35, 0.6, 0.075, 0.025);
    // the torn end: three fingers of unequal length, each narrowing to a ragged point
    const FING = [[0, 0.3, 0.07], [0.35, 0.64, 0.045], [0.69, 1, 0.085]];
    for (const [u0, u1, len] of FING) {
      const at = (u, dy, shrink) => {
        const m = (u0 + u1) / 2, uu = m + (u - m) * shrink;
        return end.c.clone().addScaledVector(end.across, (uu - 0.5) * end.w).add(V(0, -dy, 0)).addScaledVector(outH, dy * 0.25);
      };
      const S = [[at(u0, 0, 1), at(u1, 0, 1)], [at(u0, len * 0.55, 0.8), at(u1, len * 0.6, 0.75)], [at(u0, len, 0.12), at(u1, len * 0.9, 0.1)]];
      cloth.strip(S.map((sec) => cloth.put(sec)));
    }
    // the short tail, cocked out of the knot and curling back
    tail(K.clone().addScaledVector(outH, 0.012).add(V(0, -0.006, 0)), 0.15, 4, 0.08, 0.07, 1.25, 1.7, 0.06, -0.02);
    cloth.mesh(CLOTH);
  }

  // --- the six lines -------------------------------------------------------------------------
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
