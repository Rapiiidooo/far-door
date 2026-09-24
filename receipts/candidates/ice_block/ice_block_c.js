// ice_block, candidate C: a second reading, the block as a shell of clear ice round a
// darker core. Each wall is a faceted frame, raised round its window or sloping into it,
// cut back 7 to 10 cm through one irregular window to a separate deep-ice core block,
// where trapped bubbles show on the core's face. Glacier white bevels are strips between
// the frames; the top is a faceted dish carrying its own slab of frost with a jagged edge.
export default function (THREE) {
  const g = new THREE.Group();
  const V3 = THREE.Vector3;
  const UP = new V3(0, 1, 0);

  // Seeded, so every load builds the same block.
  let seed = 104729;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const lerp = (a, b, f) => a + (b - a) * f;

  const mat = (color, roughness) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const ICE = mat(0xa9d2e3, 0.4); // the clear shell
  const DEEP = mat(0x5b9bbd, 0.35); // the core
  const RIME = mat(0xe9f2f6, 0.65); // bevels and bubbles
  const FROST = mat(0xe9f2f6, 0.9); // the crust on top

  // --- triangles, bucketed per material ------------------------------------------------
  const buckets = new Map();
  const tri = (m, a, b, c) => {
    let arr = buckets.get(m);
    if (!arr) buckets.set(m, (arr = []));
    arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  // A polygon fanned from its first point and wound to face `out` (Newell normal).
  const poly = (m, pts, out) => {
    const P = pts.filter((p, i) => p.distanceToSquared(pts[(i + pts.length - 1) % pts.length]) > 1e-10);
    if (P.length < 3) return;
    const n = new V3();
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      n.x += (a.y - b.y) * (a.z + b.z);
      n.y += (a.z - b.z) * (a.x + b.x);
      n.z += (a.x - b.x) * (a.y + b.y);
    }
    const Q = n.dot(out) < 0 ? P.slice().reverse() : P;
    for (let i = 1; i < Q.length - 1; i++) tri(m, Q[0], Q[i], Q[i + 1]);
  };
  // Stitch two closed loops round a common centre into a band of triangles, walking both
  // by angle. Each loop is a list of { p, a } with `a` its angle round that centre.
  const zip = (m, outer, inner, n) => {
    const A = outer.slice().sort((p, q) => p.a - q.a), B = inner.slice().sort((p, q) => p.a - q.a);
    const na = A.length, nb = B.length, TAU = 2 * Math.PI;
    const angA = (i) => A[i % na].a + TAU * Math.floor(i / na);
    const angB = (j) => B[j % nb].a + TAU * Math.floor(j / nb);
    let i = 0, j = 0;
    while (i < na || j < nb) {
      if (j >= nb || (i < na && angA(i + 1) <= angB(j + 1))) {
        poly(m, [A[i % na].p, A[(i + 1) % na].p, B[j % nb].p], n);
        i++;
      } else {
        poly(m, [A[i % na].p, B[(j + 1) % nb].p, B[j % nb].p], n);
        j++;
      }
    }
  };

  const HW = 0.95, D = 0.085, U = HW - D; // half width, bevel inset (0.12 m across), flat half face
  const H = 1.87, S = 4; // top rim of the ice (the frost rises to 1.9), rim segments per edge
  const Y0 = D, Y1 = H - D, YM = (Y0 + Y1) / 2;
  const CORE = 0.845; // half width of the core block

  // --- the core, seen only through the windows -------------------------------------------
  const core = new THREE.Mesh(new THREE.BoxGeometry(2 * CORE, H - 0.1, 2 * CORE), DEEP);
  core.position.y = (H - 0.1) / 2;
  g.add(core);

  // A trapped bubble: a flat lens a few millimetres proud of the core's face.
  const bubbleGeo = new THREE.SphereGeometry(1, 10, 5);
  const bubble = (p, n, r) => {
    const b = new THREE.Mesh(bubbleGeo, RIME);
    b.scale.set(r, r * 0.2, r);
    b.quaternion.setFromUnitVectors(UP, n);
    b.position.copy(p).addScaledVector(n, 0.007 - 0.2 * r);
    g.add(b);
  };

  // --- the four walls: frame, window, cut ------------------------------------------------
  // Per wall: a frame that bulges round its window or dips into it; the window's centre
  // (metres from the middle of the face), size, stretch and turn; bubbles as [distance from
  // the window's centre as a fraction of its size, angle, radius].
  const WALLS = [
    { bulge: false, cu: -0.14, cv: 0.1, R: 0.4, sx: 1.25, sy: 0.85, turn: 0.5, bubbles: [[0.45, -2.4, 0.07], [0.6, -1.9, 0.045]] },
    { bulge: true, cu: 0.2, cv: -0.16, R: 0.3, sx: 0.9, sy: 1.2, turn: 1.1, bubbles: [[0.45, 0.9, 0.065]] },
    { bulge: false, cu: 0.08, cv: 0.18, R: 0.42, sx: 1.3, sy: 0.75, turn: -0.35, bubbles: [[0.55, 3.5, 0.075]] },
    { bulge: true, cu: -0.2, cv: -0.12, R: 0.34, sx: 1.05, sy: 1.0, turn: 0.7, bubbles: [] },
  ];

  const walls = WALLS.map((spec, k) => {
    const a = (k * Math.PI) / 2;
    const n = new V3(Math.sin(a), 0, Math.cos(a)); // +Z, +X, -Z, -X
    const t = new V3().crossVectors(UP, n); // along the wall, left to right seen from outside
    const at = (u, y, w) => t.clone().multiplyScalar(u).addScaledVector(n, w).setY(y);
    const cu = spec.cu, cy = YM + spec.cv;
    const ang = (u, y) => Math.atan2(y - cy, u - cu);
    const W = (base, j) => HW + Math.min(0, base + jit(j));

    // Rim: S segments per edge, counter-clockwise from the bottom-left corner seen from
    // outside. Points keep their place along the rim so the bevels stay straight in plan.
    const corners = [[-U, Y0], [U, Y0], [U, Y1], [-U, Y1]];
    const rim = [];
    for (let e = 0; e < 4; e++) {
      const [u0, y0] = corners[e], [u1, y1] = corners[(e + 1) % 4];
      for (let s = 0; s < S; s++) {
        const u = lerp(u0, u1, s / S), y = lerp(y0, y1, s / S) + (s ? jit(0.012) : 0);
        rim.push({ p: at(u, y, W(spec.bulge ? -0.03 : 0, 0.006)), a: ang(u, y) });
      }
    }

    // The window: an irregular heptagon round (cu, cy), stretched and turned.
    const win = [];
    const ct = Math.cos(spec.turn), st = Math.sin(spec.turn);
    for (let m = 0; m < 7; m++) {
      const th = (m / 7) * 2 * Math.PI + jit(0.25);
      const r = spec.R * (0.72 + 0.5 * rnd());
      const x = r * Math.cos(th) * spec.sx, z = r * Math.sin(th) * spec.sy;
      const u = cu + x * ct - z * st, y = cy + x * st + z * ct;
      win.push({ u, y, p: at(u, y, W(spec.bulge ? -0.015 : -0.045, 0.006)), a: ang(u, y) });
    }
    win.sort((p, q) => p.a - q.a);
    // How far the window's edge is from its centre at angle th.
    const winDist = (th) => {
      const dx = Math.cos(th), dy = Math.sin(th);
      for (let m = 0; m < 7; m++) {
        const p = win[m], q = win[(m + 1) % 7];
        const ex = q.u - p.u, ey = q.y - p.y, px = p.u - cu, py = p.y - cy;
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const r = (px * ey - py * ex) / den, s = (px * dy - py * dx) / den;
        if (r > 0 && s >= -1e-9 && s <= 1 + 1e-9) return r;
      }
      return spec.R;
    };

    // A ring halfway between window and rim: the crest of a bulging frame, or the
    // shoulder of a dipping one.
    const rimDist = (th) => {
      const dx = Math.cos(th), dy = Math.sin(th);
      const tx = dx > 1e-6 ? (U - cu) / dx : dx < -1e-6 ? (-U - cu) / dx : Infinity;
      const ty = dy > 1e-6 ? (Y1 - cy) / dy : dy < -1e-6 ? (Y0 - cy) / dy : Infinity;
      return Math.min(tx, ty);
    };
    const mid = [];
    for (let m = 0; m < 10; m++) {
      const th = spec.turn + 0.3 + (m / 10) * 2 * Math.PI + jit(0.15);
      const r = lerp(winDist(th) + 0.06, rimDist(th), 0.42 + jit(0.1));
      const u = cu + r * Math.cos(th), y = cy + r * Math.sin(th);
      mid.push({ p: at(u, y, W(spec.bulge ? 0 : -0.022, 0.008)), a: ang(u, y) });
    }
    zip(ICE, rim, mid, n);
    zip(ICE, mid, win, n);

    // The cut: clear-ice sides from the window's edge down into the core, narrowing a
    // little so they show from the front, ending just inside the core's face.
    const floor = (q) => at(cu + (q.u - cu) * 0.86, cy + (q.y - cy) * 0.86, CORE - 0.03);
    const centre = at(cu, cy, 0);
    for (let m = 0; m < 7; m++) {
      const q0 = win[m], q1 = win[(m + 1) % 7];
      const inward = centre.clone().sub(q0.p.clone().add(q1.p).multiplyScalar(0.5));
      inward.addScaledVector(n, -inward.dot(n)).normalize().addScaledVector(n, 0.3);
      poly(ICE, [q0.p, q1.p, floor(q1), floor(q0)], inward);
    }
    for (const [f, th, r] of spec.bubbles) {
      bubble(at(cu + f * spec.R * Math.cos(th), cy + f * spec.R * Math.sin(th), CORE), n, r);
    }
    return { n, t, rim };
  });

  // --- the top: a shallow faceted dish under a slab of frost ------------------------------
  const T = [];
  for (let i = 0; i <= S; i++) {
    const col = [];
    for (let j = 0; j <= S; j++) {
      const rim = i === 0 || i === S || j === 0 || j === S;
      let x = lerp(-U, U, i / S), v = lerp(-U, U, j / S); // v runs towards -Z
      if (!rim) { x += jit(0.07); v += jit(0.07); }
      const y = rim ? H - rnd() * 0.006 : H - 0.012 - rnd() * 0.01;
      col.push(new V3(x, y, -v));
    }
    T.push(col);
  }
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < S; j++) {
      const q = [T[i][j], T[i + 1][j], T[i + 1][j + 1], T[i][j + 1]];
      if (rnd() < 0.5) { poly(ICE, [q[0], q[1], q[2]], UP); poly(ICE, [q[0], q[2], q[3]], UP); }
      else { poly(ICE, [q[0], q[1], q[3]], UP); poly(ICE, [q[1], q[2], q[3]], UP); }
    }
  }
  const topAt = (p) => T[Math.round(((p.x + U) / (2 * U)) * S)][Math.round(((-p.z + U) / (2 * U)) * S)];

  // The crust: a thin slab with a jagged outline, faceted on top, its skirt sunk into the dish.
  const K = 22, cx = 0.03, cz = -0.04, CT = H + 0.024;
  const edge = [], mids = [];
  for (let m = 0; m < K; m++) {
    const th = (m / K) * 2 * Math.PI + jit(0.1);
    const r = 0.58 * (1 + 0.13 * Math.sin(2 * th + 0.5) + 0.09 * Math.sin(3 * th + 2)) + (m % 2 ? -0.03 : 0.03) + jit(0.05);
    edge.push(new V3(cx + r * Math.cos(th), CT + jit(0.003), cz + r * Math.sin(th)));
    mids.push(new V3(cx + 0.55 * r * Math.cos(th + 0.2), CT + 0.003 + jit(0.003), cz + 0.55 * r * Math.sin(th + 0.2)));
  }
  const crown = new V3(cx, CT + 0.005, cz);
  for (let m = 0; m < K; m++) {
    const m1 = (m + 1) % K;
    poly(FROST, [crown, mids[m], mids[m1]], UP);
    poly(FROST, [mids[m], edge[m], edge[m1], mids[m1]], UP);
    const out = edge[m].clone().add(edge[m1]).multiplyScalar(0.5).sub(crown).setY(0);
    poly(FROST, [edge[m], edge[m1], edge[m1].clone().setY(H - 0.03), edge[m].clone().setY(H - 0.03)], out);
  }

  // --- bevels: glacier white strips between the frames, the top and the base ---------------
  const inset = (t, n, u) => t.clone().multiplyScalar(u).addScaledVector(n, U); // on y = 0
  for (let k = 0; k < 4; k++) {
    const A = walls[k], B = walls[(k + 1) % 4];
    const nn = A.n.clone().add(B.n);
    // A's right edge rises through rim[S..2S]; B's left edge descends through rim[3S..4S].
    for (let j = 0; j < S; j++) {
      poly(RIME, [A.rim[S + j].p, A.rim[S + j + 1].p, B.rim[(4 * S - j - 1) % (4 * S)].p, B.rim[(4 * S - j) % (4 * S)].p], nn);
    }
    const corner = inset(A.t, A.n, U);
    poly(RIME, [A.rim[2 * S].p, B.rim[3 * S].p, topAt(corner)], nn.clone().add(UP));
    poly(RIME, [A.rim[S].p, B.rim[0].p, corner], nn.clone().sub(UP));
  }
  const ring = [];
  for (const { n, t, rim } of walls) {
    for (let s = 0; s < S; s++) {
      const pa = inset(t, n, lerp(-U, U, s / S)), pb = inset(t, n, lerp(-U, U, (s + 1) / S));
      poly(RIME, [rim[3 * S - s].p, rim[3 * S - s - 1].p, topAt(pb), topAt(pa)], n.clone().add(UP));
      poly(RIME, [rim[s].p, rim[s + 1].p, pb, pa], n.clone().sub(UP));
      ring.push(pa);
    }
  }
  // The base: one flat fan on y = 0 over the whole footprint inside the bevel.
  const O = new V3();
  for (let m = 0; m < ring.length; m++) poly(ICE, [O, ring[m], ring[(m + 1) % ring.length]], UP.clone().negate());

  for (const [m, arr] of buckets) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    geo.computeVertexNormals(); // unindexed, so every facet keeps its own normal
    g.add(new THREE.Mesh(geo, m));
  }

  // --- placement: base on y = 0, centred on x and z ---------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((o) => {
    const p = o.isMesh && o.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (o.isInstancedMesh) { for (let c = 0; c < o.count; c++) { o.getMatrixAt(c, im); put(m4.multiplyMatrices(o.matrixWorld, im)); } return; }
    put(o.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
