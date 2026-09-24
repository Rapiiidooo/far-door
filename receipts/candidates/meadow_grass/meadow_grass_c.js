// meadow_grass, candidate C (a second reading, tillers of folded blades): a tussock is a
// few shoots, not one fountain. Six sub-clumps stand round the rim of a 0.15 m base, each
// a fan of five blades leaning out together, the middle one tall and the side ones bowing
// away until their tips droop; a seventh in the centre holds three tall blades and the
// three seed stalks. Every blade is folded along its midrib into a shallow V, the edges
// raised on its upper side, so it never thins to a line edge-on and shades from one edge
// to the other like a real leaf; it rises straight in its tiller's sheath, then arcs over,
// harder towards the tip, twists a little and tapers to a point. Moss green below, fern
// green above. The oat heads are open panicles: three short branches splay from the top
// of each stalk, each hanging two spikelets. 0.6 m tall, 0.7 m across.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    m.name = 'foliage';
    return m;
  };
  const MOSS = mat(0x4f7a3a);
  const FERN = mat(0x7da04a);

  let seed = 9173;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const bins = new Map([[MOSS, { pos: [], nor: [], uv: [] }], [FERN, { pos: [], nor: [], uv: [] }]]);
  // Build a small indexed piece, let three compute its normals across the shared vertices,
  // then copy its triangles into the bin that `pick(face)` names.
  const piece = (pts, uvs, index, pick) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const N = geo.attributes.normal;
    for (let f = 0; f < index.length / 3; f++) {
      const B = bins.get(pick(f));
      for (let k = 0; k < 3; k++) {
        const i = index[3 * f + k];
        B.pos.push(pts[i].x, pts[i].y, pts[i].z);
        B.nor.push(N.getX(i), N.getY(i), N.getZ(i));
        B.uv.push(uvs[i][0], uvs[i][1]);
      }
    }
  };

  // --- blades -----------------------------------------------------------------------------
  // A V-folded strip. Its first stretch is a straight sheath along the tiller's axis, bundled
  // with the other blades of the tiller; past it the blade swings off towards its own
  // azimuth and arcs over from the axis angle down to th1, bending harder towards the tip
  // where the strip is narrow, so its few segments show less as elbows.
  const blade = (root, psi, axis, us, az, th1, L, w0, twist, segs) => {
    const swing = (u) => { const k = Math.min(1, Math.max(0, (u - us) / (1 - us))); return psi + (az - psi) * k * k * (3 - 2 * k); };
    const NI = 36, line = [root];
    for (let i = 1; i <= NI; i++) {
      const u = (i - 0.5) / NI, k = Math.max(0, (u - us) / (1 - us));
      const th = axis + (th1 - axis) * Math.pow(k, 1.2), a = swing(u);
      const p = line[i - 1].clone().add(V(Math.sin(a) * Math.cos(th), Math.sin(th), Math.cos(a) * Math.cos(th)).multiplyScalar(L / NI));
      line.push(p);
    }
    const P = (u) => { const f = Math.min(Math.max(u, 0), 1) * NI, i = Math.min(Math.floor(f), NI - 1); return line[i].clone().lerp(line[i + 1], f - i); };
    const rows = segs === 4 ? [0, us, us + (1 - us) * 0.4, us + (1 - us) * 0.72, 1] : [0, us, us + (1 - us) * 0.28, us + (1 - us) * 0.53, us + (1 - us) * 0.76, 1];
    const pts = [], uvs = [], index = [], u0 = rnd();
    rows.forEach((u) => {
      const c = P(u);
      if (u === 1) { pts.push(c); uvs.push([u0, L]); return; }
      const T = P(u + 0.03).sub(P(u - 0.03)).normalize();
      const a = swing(u), S0 = V(Math.cos(a), 0, -Math.sin(a));
      const W = S0.addScaledVector(T, -S0.dot(T)).normalize().applyAxisAngle(T, twist * u);
      const N = V(0, 0, 0).crossVectors(T, W);
      const hw = (w0 / 2) * (1 - 0.2 * u) * Math.pow(Math.min(1, (1 - u) / 0.4), 0.75);
      const lift = 0.42 * hw * (1 - 0.6 * u);
      pts.push(c.clone().addScaledVector(W, -hw).addScaledVector(N, lift), c, c.clone().addScaledVector(W, hw).addScaledVector(N, lift));
      uvs.push([u0 - 0.012, u * L], [u0, u * L], [u0 + 0.012, u * L]);
    });
    const pick = [];
    for (let i = 0; i < rows.length - 1; i++) {
      const a = 3 * i, m = i < 2 ? MOSS : FERN;
      if (i === rows.length - 2) {
        const tip = a + 3;
        index.push(a, a + 1, tip, a + 1, a + 2, tip);
        pick.push(m, m);
      } else {
        index.push(a, a + 1, a + 4, a, a + 4, a + 3, a + 1, a + 2, a + 5, a + 1, a + 5, a + 4);
        pick.push(m, m, m, m);
      }
    }
    piece(pts, uvs, index, (f) => pick[f]);
  };

  // Six tillers round the rim, each leaning out on its own axis. In a tiller the middle blade
  // is the tallest and stands; the side ones swing off to either side and droop. t is 0 for
  // a standing blade and 1 for a low, drooping one.
  const FAN = [-0.42, -0.2, 0, 0.2, 0.42];
  for (let j = 0; j < 6; j++) {
    const psi = (j / 6) * Math.PI * 2 + jit(0.25);
    const Op = V(Math.sin(psi), 0, Math.cos(psi)), Sp = V(Math.cos(psi), 0, -Math.sin(psi));
    const hub = Op.clone().multiplyScalar(0.05 + jit(0.008));
    const axis = (72 + jit(4)) * D, us = 0.16 + 0.05 * rnd(), size = 0.9 + 0.2 * rnd();
    const ts = [0.95, 0.55, 0.05, 0.6, 1].map((t) => Math.min(1, Math.max(0, t + jit(0.1))));
    FAN.forEach((df, b) => {
      const t = ts[b];
      const root = hub.clone().addScaledVector(Sp, df * 0.016 + jit(0.003));
      const L = (0.52 - 0.12 * t) * size * (1 + jit(0.05));
      blade(root, psi, axis, us, psi + df * (1 + 0.8 * t) + jit(0.1), (48 - 112 * t + jit(8)) * D, L,
        0.021 * (1 + jit(0.1)), jit(0.8), t < 0.3 ? 4 : 5);
    });
  }
  // the central tiller: three tall blades standing in a loose sheaf
  for (let b = 0; b < 3; b++) {
    const az = b * ((Math.PI * 2) / 3) + 0.4 + jit(0.3);
    const root = V(Math.sin(az), 0, Math.cos(az)).multiplyScalar(0.008);
    blade(root, az, (87 + jit(2)) * D, 0.22, az + jit(0.2), (48 + jit(6)) * D, 0.53 * (1 + jit(0.05)), 0.02, jit(0.8), 4);
  }

  // --- oat panicles -----------------------------------------------------------------------
  // A lofted tube with parallel-transported three-sided rings; radius 0 closes it to a point.
  const tube = (line, rad, m) => {
    const n = line.length, pts = [], uvs = [], index = [];
    const T = line.map((p, i) => line[Math.min(i + 1, n - 1)].clone().sub(line[Math.max(i - 1, 0)]).normalize());
    const Nr = V(1, 0, 0).addScaledVector(T[0], -T[0].x).normalize();
    if (Nr.lengthSq() < 1e-6) Nr.set(0, 0, 1);
    const ring = [];
    for (let i = 0; i < n; i++) {
      if (i) {
        const axis = V(0, 0, 0).crossVectors(T[i - 1], T[i]), s = axis.length();
        if (s > 1e-6) Nr.applyAxisAngle(axis.normalize(), Math.atan2(s, T[i - 1].dot(T[i])));
        Nr.addScaledVector(T[i], -Nr.dot(T[i])).normalize();
      }
      const Bn = V(0, 0, 0).crossVectors(T[i], Nr);
      if (rad[i] <= 0) { ring.push(pts.length); pts.push(line[i].clone()); uvs.push([0.5, i / n]); continue; }
      ring.push(pts.length);
      for (let j = 0; j < 3; j++) {
        const q = (j / 3) * Math.PI * 2;
        pts.push(line[i].clone().addScaledVector(Nr, Math.cos(q) * rad[i]).addScaledVector(Bn, Math.sin(q) * rad[i]));
        uvs.push([j / 3, i / n]);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      for (let j = 0; j < 3; j++) {
        const k = (j + 1) % 3;
        const A = rad[i] > 0 ? a + j : a, Ak = rad[i] > 0 ? a + k : a;
        const Bj = rad[i + 1] > 0 ? b + j : b, Bk = rad[i + 1] > 0 ? b + k : b;
        // wound outwards: the rings turn from Nr towards Bn = T x Nr
        if (rad[i + 1] > 0) index.push(A, Bk, Bj);
        if (rad[i] > 0) index.push(A, Ak, Bk);
      }
    }
    piece(pts, uvs, index, typeof m === 'function' ? m : () => m);
  };
  const spikelet = (at, dir, len, r) => tube([at, at.clone().addScaledVector(dir, len * 0.55), at.clone().addScaledVector(dir, len)], [0, r, 0], FERN);

  const panicle = (az, lean, H) => {
    const O = V(Math.sin(az), 0, Math.cos(az));
    const base = O.clone().multiplyScalar(0.012);
    // the stalk: three points on a gentle outward curve
    const line = [0, 0.4, 0.75, 1].map((u) => base.clone().addScaledVector(O, H * Math.tan(lean) * u * u).setY(H * u));
    tube(line, [0.0028, 0.0024, 0.002, 0.0017], (f) => (f < 6 ? MOSS : FERN));
    const top = line[3], psi0 = rnd() * 6.3;
    for (let b = 0; b < 3; b++) {
      const psi = psi0 + b * 2.1;
      const out = V(Math.sin(psi), 0, Math.cos(psi)).lerp(O, 0.35).normalize();
      const from = top.clone().addScaledVector(line[3].clone().sub(line[2]).normalize(), -0.02 * b);
      const tipB = from.clone().addScaledVector(out, 0.03 + 0.008 * b).setY(from.y - 0.012 - 0.008 * b);
      tube([from, tipB], [0.0014, 0.0011], FERN);
      for (let s = 0; s < 2; s++) {
        const dir = out.clone().multiplyScalar(0.35 + 0.3 * s).setY(-1).normalize();
        spikelet(tipB.clone().addScaledVector(out, -0.012 * s).setY(tipB.y + 0.004 * s), dir, 0.026 - 0.003 * s, 0.0055);
      }
    }
  };
  panicle(0.3, 0.08, 0.6);
  panicle(2.5, 0.12, 0.56);
  panicle(4.4, 0.1, 0.53);

  for (const [m, B] of bins) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
    const mesh = new THREE.Mesh(geo, m);
    mesh.name = m === MOSS ? 'grass_lower' : 'grass_upper';
    g.add(mesh);
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
