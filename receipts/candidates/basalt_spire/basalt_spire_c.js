// basalt_spire, arm C: a different reading, a honeycomb pack.
// The spire is read as one cooling cell pattern: hexagonal prisms packed edge to
// edge so they touch at the root (fused by construction) and part as they rise.
// Three cells run tall, each sheared into its lean and slowly twisted, which is
// what makes the geometry feel too perfect to be of this world; the rest of the
// pack breaks off low with sloping fractures. Everything is hand-built geometry.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (hex, rough) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const BASALT = mat(0x2a2830, 0.8);
  const GLASS = mat(0x2a2830, 0.28);   // fresh fracture: the same rock, glassy
  const LILAC = mat(0x8c7fa3, 0.92);

  let seed = 777;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh; };
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

  // triangle soup with flat facet normals and UVs (the surface pass needs them)
  const soup = (pos, uv) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
  };
  const ringAt = (cx, y, cz, r, rot) => Array.from({ length: 6 }, (_, k) => {
    const a = rot + (k * Math.PI) / 3;
    return [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
  });

  // A cell: a horizontal root hexagon whose rings shift with the lean, turn with
  // the twist, shrink with the taper, and end in a sloping break plane. The
  // break is its own mesh, glassy or skinned with settled ash.
  const cell = ({ cx, cz, r, rot = 0, h, tilt = 0, az = 0, twist = 0, taper = 0.93, slope = 0, cutAz = 0, rings = 1, cap = GLASS, streaks = 0 }) => {
    const dx = Math.tan(tilt) * Math.cos(az), dz = Math.tan(tilt) * Math.sin(az);
    const y0 = -0.4, levels = [];
    for (let i = 0; i <= rings; i++) {
      const y = y0 + ((h - y0) * i) / rings;
      levels.push(ringAt(cx + dx * (y - y0), y, cz + dz * (y - y0), r * (1 + ((taper - 1) * (y - y0)) / (h - y0)), rot + (twist * i) / rings));
    }
    const top = levels[rings], tc = top.reduce((s, p) => [s[0] + p[0] / 6, s[1] + p[1] / 6, s[2] + p[2] / 6], [0, 0, 0]);
    for (const p of top) p[1] += slope * ((p[0] - tc[0]) * Math.cos(cutAz) + (p[2] - tc[2]) * Math.sin(cutAz));
    const pos = [], uv = [];
    for (let i = 0; i < rings; i++) {
      const A = levels[i], B = levels[i + 1], v0 = i / rings, v1 = (i + 1) / rings;
      for (let k = 0; k < 6; k++) {
        const k1 = (k + 1) % 6, u0 = k / 6, u1 = (k + 1) / 6;
        pos.push(...A[k], ...B[k], ...B[k1]); uv.push(u0, v0, u0, v1, u1, v1);
        pos.push(...A[k], ...B[k1], ...A[k1]); uv.push(u0, v0, u1, v1, u1, v0);
      }
    }
    const bot = levels[0], bc = [cx, y0, cz];
    for (let k = 0; k < 6; k++) { const k1 = (k + 1) % 6; pos.push(...bc, ...bot[k], ...bot[k1]); uv.push(0.5, 0.5, 0, 0, 1, 0); }
    add(soup(pos, uv), BASALT);
    const cp = [], cu = [];
    for (let k = 0; k < 6; k++) {
      const k1 = (k + 1) % 6;
      cp.push(...tc, ...top[k1], ...top[k]);
      cu.push(0.5, 0.5, 0.5 + 0.5 * Math.cos(((k + 1) * Math.PI) / 3), 0.5 + 0.5 * Math.sin(((k + 1) * Math.PI) / 3), 0.5 + 0.5 * Math.cos((k * Math.PI) / 3), 0.5 + 0.5 * Math.sin((k * Math.PI) / 3));
    }
    const tcy = top.reduce((s, p) => s + p[1] / 6, 0);
    cp[1] = tcy; for (let k = 1; k < 6; k++) cp[k * 9 + 1] = tcy;
    add(soup(cp, cu), cap);

    // ash-lilac streaks on the faces that look at the sky: ribbons laid 1.5 cm
    // above the (twisted) face, narrow at the root and widening towards the top
    if (!streaks) return;
    const surf = (k, u, lv) => {
      const i = Math.min(rings - 1, Math.floor(lv * rings)), t = lv * rings - i, k1 = (k + 1) % 6;
      const A = levels[i], B = levels[i + 1];
      const a = V(A[k]).lerp(V(A[k1]), u), b = V(B[k]).lerp(V(B[k1]), u);
      return a.lerp(b, t);
    };
    const faces = [];
    for (let k = 0; k < 6; k++) {
      const p0 = surf(k, 0, 0.5), p1 = surf(k, 1, 0.5), p2 = surf(k, 0.5, 0.6);
      const n = p1.clone().sub(p0).cross(p2.clone().sub(p0)).normalize();
      const out = p0.clone().add(p1).multiplyScalar(0.5).sub(new THREE.Vector3(cx + dx * (h / 2), 0, cz + dz * (h / 2)).setY(p0.y));
      if (n.dot(out) < 0) n.negate();
      faces.push([n.y, k]);
    }
    faces.sort((a, b) => b[0] - a[0]);
    faces.slice(0, streaks).forEach(([, k], fi) => {
      const mid = rr(0.35, 0.65), w0 = 0.04, w1 = fi ? rr(0.12, 0.2) : rr(0.25, 0.38);
      const from = rr(0.38, 0.55), to = rr(0.9, 0.97), n = 10;
      const sp = [], su = [];
      let prev = null;
      for (let j = 0; j <= n; j++) {
        const lv = from + ((to - from) * j) / n;
        const w = (w0 + (w1 - w0) * Math.sin((Math.PI / 2) * (j / n))) * rr(0.8, 1.15) / 2 / r;
        const L = surf(k, Math.max(0.04, mid - w), lv), R = surf(k, Math.min(0.96, mid + w), lv);
        const nn = surf(k, 1, lv).sub(surf(k, 0, lv)).cross(surf(k, 0.5, Math.min(1, lv + 0.02)).sub(surf(k, 0.5, lv))).normalize();
        if (nn.dot(L.clone().sub(new THREE.Vector3(cx + dx * (L.y - y0), L.y, cz + dz * (L.y - y0)))) < 0) nn.negate();
        L.addScaledVector(nn, 0.015); R.addScaledVector(nn, 0.015);
        if (prev) {
          sp.push(...prev[0].toArray(), ...R.toArray(), ...L.toArray(), ...prev[0].toArray(), ...prev[1].toArray(), ...R.toArray());
          su.push(0, (j - 1) / n, 1, j / n, 0, j / n, 0, (j - 1) / n, 1, (j - 1) / n, 1, j / n);
        }
        prev = [L, R];
      }
      const geo = soup(sp, su);
      // wind the ribbon so it faces out of the rock, whichever way the face turned
      const nrm = geo.attributes.normal, test = new THREE.Vector3(nrm.getX(0), nrm.getY(0), nrm.getZ(0));
      const outward = surf(k, 0.5, 0.7).sub(new THREE.Vector3(cx + dx * (h * 0.7), 0, cz + dz * (h * 0.7)).setY(surf(k, 0.5, 0.7).y));
      if (test.dot(outward) < 0) {
        const p = geo.attributes.position;
        for (let t = 0; t < p.count; t += 3) {
          const x = p.getX(t + 1), y = p.getY(t + 1), z = p.getZ(t + 1);
          p.setXYZ(t + 1, p.getX(t + 2), p.getY(t + 2), p.getZ(t + 2));
          p.setXYZ(t + 2, x, y, z);
        }
        geo.computeVertexNormals();
      }
      add(geo, LILAC);
    });
  };

  // honeycomb: cells of circumradius R touch edge to edge at the root
  const R = 0.62, S = Math.sqrt(3) * R;
  const at = (ang, d = S) => [d * Math.cos(ang), d * Math.sin(ang)];
  const deg = Math.PI / 180;
  // the three tall cells
  cell({ cx: 0, cz: 0, r: R, h: 9.0, tilt: 7 * deg, az: 100 * deg, twist: 0.3, slope: 0.62, cutAz: 2.6, rings: 6, streaks: 3 });
  { const [x, z] = at(-30 * deg); cell({ cx: x, cz: z, r: R, h: 6.8, tilt: 8 * deg, az: -30 * deg, twist: -0.26, slope: 0.75, cutAz: 0.3, rings: 5, streaks: 2 }); }
  { const [x, z] = at(210 * deg); cell({ cx: x, cz: z, r: R, h: 5.0, tilt: 13 * deg, az: 235 * deg, twist: 0.22, slope: 0.5, cutAz: -1.3, rings: 4, streaks: 2 }); }
  // the rest of the ring breaks off low: the fused foot
  for (const [a, h, cut, capMat] of [[30, 2.3, 1.2, GLASS], [90, 1.2, 4.0, LILAC], [150, 1.75, 2.2, GLASS], [270, 1.4, 5.0, LILAC]]) {
    const [x, z] = at(a * deg);
    cell({ cx: x, cz: z, r: R, h, tilt: rr(2, 5) * deg, az: a * deg, slope: rr(0.35, 0.7), cutAz: cut, cap: capMat });
  }
  // loose broken stubs around the foot, in the next ring's gaps
  for (const [a, d, r, h, tilt, capMat] of [[0, 1.86, 0.3, 0.75, 9, GLASS], [60, 1.86, 0.26, 0.4, 18, LILAC], [120, 1.9, 0.34, 1.0, 6, GLASS], [180, 1.86, 0.28, 0.5, 14, LILAC], [300, 1.9, 0.3, 0.6, 11, GLASS]]) {
    const [x, z] = at(a * deg, d);
    cell({ cx: x, cz: z, r, rot: rr(0, 1), h, tilt: tilt * deg, az: a * deg, slope: rr(0.3, 0.9), cutAz: rr(0, 6.28), cap: capMat });
  }

  // --- flatten what went below the ground, fix the height -------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3();
  for (const m of g.children) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
    m.geometry.computeVertexNormals();
    for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i));
  }
  const k = 9 / bb.max.y;
  for (const m of g.children) m.geometry.scale(k, k, k);

  // --- place: base on y = 0, centred on x and z -----------------------------
  const box = new THREE.Box3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mm.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
