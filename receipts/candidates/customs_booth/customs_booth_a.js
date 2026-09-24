// customs_booth, arm A: primitives.
// A hollow night-basalt kiosk assembled from boxes: plinth courses, four walls
// round a real room, a wide window above a warden-chalk counter on stepped
// corbels, framed chalk panels with disc-and-crescent medallions, a stamp-ochre
// striped band under a three-tier stepped roof and a turquoise lamp dome. The
// barrier post is stacked cylinders with a bronze fork; the arm is nine boxes.
// Booth 2.4 x 2.0 m, 2.8 m to the top of the lamp; 6.75 m wide with the arm.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const NIGHT = M(0x2a2830, 'stone', 0.84);
  const SHADOW = M(0x131118, 'stone', 0.96);   // the room behind the window
  const CHALK = M(0xc9c2d8, 'plaster', 0.82);
  const OCHRE = M(0xd9a441, 'plaster', 0.72);
  const BRONZE = M(0x9a6a35, 'metal', 0.5, 0.6);
  const TIMBER = M(0x8a6a48, 'timber', 0.86);
  const SLATE = M(0x8c7fa3, 'stone', 0.74);
  // The lamp keeps a material of its own so the game can dim or flash it (lit at 2,
  // above the second world's bloom threshold; 0 shows dormant crystal). Unnamed and
  // just under opaque so the loader's procedural surfaces leave it alone.
  const LAMP = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 2,
    roughness: 0.3, metalness: 0.05, transparent: true, opacity: 0.94,
  });

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
  const STATIC = new Map(), ARM = new Map();
  const put = (bucket, mat, geo) => { if (!bucket.has(mat)) bucket.set(mat, []); bucket.get(mat).push(geo); return geo; };
  const flush = (bucket, parent) => { for (const [mat, geos] of bucket) parent.add(new THREE.Mesh(merge(geos), mat)); };

  // ---- primitive helpers --------------------------------------------------------
  // slab: a box between two corners; cyl: a cylinder along y, x or z; disc: a flat
  // cylinder facing +x, -x, +z or -z.
  const slab = (mat, x0, y0, z0, x1, y1, z1, bucket = STATIC, ry = 0) => {
    const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    if (ry) geo.rotateY(ry);
    geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return put(bucket, mat, geo);
  };
  const cyl = (mat, rTop, rBot, h, seg, x, y, z, axis = 'y', bucket = STATIC) => {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    if (axis === 'x') geo.rotateZ(-Math.PI / 2);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    geo.translate(x, y, z);
    return put(bucket, mat, geo);
  };
  const disc = (mat, r, t, face, x, y, z, seg = 28) => {
    const geo = new THREE.CylinderGeometry(r, r, t, seg);
    if (face === 'x') geo.rotateZ(-Math.PI / 2); else geo.rotateX(Math.PI / 2);
    geo.translate(x, y, z);
    return put(STATIC, mat, geo);
  };
  const ring = (mat, r, tube, face, x, y, z) => {
    const geo = new THREE.TorusGeometry(r, tube, 6, 32);
    if (face === 'x') geo.rotateY(Math.PI / 2);
    if (face === 'y') geo.rotateX(Math.PI / 2);
    geo.translate(x, y, z);
    return put(STATIC, mat, geo);
  };

  // ---- the booth -----------------------------------------------------------------
  // Walls stand at x = +-1.12, z = 0.74 (front) and -0.92 (back); the plinth and
  // cornice step out to +-1.2 and z 0.82 / -1.0; the counter reaches z = 1.0.
  const WX = 1.12, WF = 0.74, WB = -0.92, T = 0.16;
  const SILL = 1.1, HEAD = 1.8, WIN = 0.82, FLOOR = 0.55, TOP = 1.88;
  const ZC = (WF + WB) / 2;

  // plinth: two chamfer-like steps
  slab(NIGHT, -1.2, 0, -1.0, 1.2, 0.08, 0.82);
  slab(NIGHT, -1.16, 0.08, -0.96, 1.16, 0.16, 0.78);

  // walls round the room
  slab(NIGHT, -WX, 0.16, WF - T, WX, SILL - 0.07, WF);            // under the counter
  slab(NIGHT, -WX, SILL - 0.07, WF - T, -WIN, TOP, WF);           // window jambs
  slab(NIGHT, WIN, SILL - 0.07, WF - T, WX, TOP, WF);
  slab(NIGHT, -WIN, HEAD, WF - T, WIN, TOP, WF);                  // lintel
  slab(NIGHT, -WX, 0.16, WB, -WX + T, TOP, WF - T);               // sides
  slab(NIGHT, WX - T, 0.16, WB, WX, TOP, WF - T);
  slab(NIGHT, -WX + T, 0.16, WB, WX - T, TOP, WB + T);            // back
  slab(NIGHT, -WX + T, 0.16, WB + T, WX - T, FLOOR, WF - T);      // raised floor inside
  slab(NIGHT, -WX + T, HEAD, WB + T, WX - T, TOP, WF - T);        // ceiling

  // the room's lining: five inward planes in near black, so the window reads dark
  const inner = (w, h, x, y, z, rx, ry) => {
    const geo = new THREE.PlaneGeometry(w, h);
    if (rx) geo.rotateX(rx);
    if (ry) geo.rotateY(ry);
    geo.translate(x, y, z);
    put(STATIC, SHADOW, geo);
  };
  const RX = WX - T - 0.004, RB = WB + T + 0.004, RF = WF - T, RH = HEAD - FLOOR - 0.008;
  inner(2 * RX, RH, 0, (FLOOR + HEAD) / 2, RB);                                        // back, faces +z
  inner(2 * RX, RF - RB, 0, FLOOR + 0.004, (RF + RB) / 2, -Math.PI / 2);                // floor, faces +y
  inner(2 * RX, RF - RB, 0, HEAD - 0.004, (RF + RB) / 2, Math.PI / 2);                  // ceiling, faces -y
  inner(RF - RB, RH, -RX, (FLOOR + HEAD) / 2, (RF + RB) / 2, 0, Math.PI / 2);            // faces +x
  inner(RF - RB, RH, RX, (FLOOR + HEAD) / 2, (RF + RB) / 2, 0, -Math.PI / 2);            // faces -x

  // corner piers, 3 cm proud of both faces
  for (const sx of [-1, 1]) for (const [zf, dz] of [[WF, 1], [WB, -1]]) {
    const x0 = sx * (WX + 0.03), x1 = sx * (WX - 0.14), z0 = zf + dz * 0.03, z1 = zf - dz * 0.14;
    slab(NIGHT, Math.min(x0, x1), 0.16, Math.min(z0, z1), Math.max(x0, x1), TOP, Math.max(z0, z1));
  }

  // framed chalk panels: a basalt frame 3 cm proud, the panel 1.5 cm proud
  const frameZ = (x0, x1, y0, y1, zf, dir) => {        // on a face looking along +-z
    const f = zf + dir * 0.03, p = zf + dir * 0.015;
    const lo = Math.min(zf, f), hi = Math.max(zf, f);
    slab(NIGHT, x0 - 0.07, y0 - 0.07, lo, x1 + 0.07, y0, hi);
    slab(NIGHT, x0 - 0.07, y1, lo, x1 + 0.07, y1 + 0.07, hi);
    slab(NIGHT, x0 - 0.07, y0, lo, x0, y1, hi);
    slab(NIGHT, x1, y0, lo, x1 + 0.07, y1, hi);
    slab(CHALK, x0, y0, Math.min(zf, p), x1, y1, Math.max(zf, p));
  };
  const frameX = (z0, z1, y0, y1, xf, dir) => {        // on a face looking along +-x
    const f = xf + dir * 0.03, p = xf + dir * 0.015;
    const lo = Math.min(xf, f), hi = Math.max(xf, f);
    slab(NIGHT, lo, y0 - 0.07, z0 - 0.07, hi, y0, z1 + 0.07);
    slab(NIGHT, lo, y1, z0 - 0.07, hi, y1 + 0.07, z1 + 0.07);
    slab(NIGHT, lo, y0, z0 - 0.07, hi, y1, z0);
    slab(NIGHT, lo, y0, z1, hi, y1, z1 + 0.07);
    slab(CHALK, Math.min(xf, p), y0, z0, Math.max(xf, p), y1, z1);
  };
  // disc-and-crescent medallion: basalt disc, bronze rim, ochre disc, basalt bite
  const medallion = (face, dir, cx, cy, cz, r) => {
    const o = (d) => (face === 'x' ? [cx + dir * d, cy, cz] : [cx, cy, cz + dir * d]);
    disc(NIGHT, r, 0.03, face, ...o(0.03));
    ring(BRONZE, r, 0.022, face, ...o(0.04));
    disc(OCHRE, r * 0.62, 0.02, face, ...o(0.05));
    const [bx, by, bz] = o(0.056);
    disc(NIGHT, r * 0.5, 0.016, face, face === 'x' ? bx : bx + r * 0.26 * dir, by + r * 0.12, face === 'x' ? bz - r * 0.26 * dir : bz);
  };

  frameZ(-0.56, 0.56, 0.3, 0.86, WF, 1);                           // front, under the counter
  medallion('z', 1, 0, 0.58, WF + 0.015, 0.2);
  for (const s of [-1, 1]) {
    frameX(WB + 0.2, WF - 0.2, 0.3, 1.66, s * WX, s);               // sides
    medallion('x', s, s * WX + s * 0.015, 1.02, ZC, 0.3);
  }
  frameZ(-0.4, 0.4, 0.3, 1.62, WB, -1);                            // the back door
  medallion('z', -1, 0, 1.3, WB - 0.015, 0.16);
  ring(BRONZE, 0.06, 0.014, 'z', 0.26, 0.95, WB - 0.03);           // door ring
  cyl(BRONZE, 0.025, 0.025, 0.04, 10, 0.26, 1.01, WB - 0.03, 'z');
  for (const s of [-1, 1]) for (const y of [0.55, 0.7, 0.85]) {  // raised ribs beside the door
    slab(NIGHT, s * 0.56, y, WB - 0.03, s * 0.86, y + 0.04, WB);
  }

  // counter: chalk ledge with an ochre nosing on two stepped corbels
  slab(CHALK, -0.95, SILL - 0.07, WF - T - 0.12, 0.95, SILL, 0.985);
  slab(OCHRE, -0.96, SILL - 0.08, 0.985, 0.96, SILL + 0.005, 1.0);
  for (const s of [-1, 1]) {
    slab(NIGHT, s * 0.72 - 0.08, 0.84, WF, s * 0.72 + 0.08, SILL - 0.07, 0.95);
    slab(NIGHT, s * 0.72 - 0.08, 0.68, WF, s * 0.72 + 0.08, 0.84, 0.84);
  }
  // a round stamp and a teetering stack of slate papers
  cyl(NIGHT, 0.12, 0.12, 0.035, 24, -0.5, SILL + 0.0175, 0.82);
  cyl(OCHRE, 0.105, 0.115, 0.06, 24, -0.5, SILL + 0.065, 0.82);
  cyl(TIMBER, 0.03, 0.036, 0.14, 12, -0.5, SILL + 0.165, 0.82);
  const knob = new THREE.SphereGeometry(0.055, 14, 10);
  knob.translate(-0.5, SILL + 0.265, 0.82);
  put(STATIC, TIMBER, knob);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (let i = 0; i < 11; i++) {
    const y = SILL + 0.009 + i * 0.019, top = i === 10;
    const geo = new THREE.BoxGeometry(0.34, 0.014, 0.25);
    geo.rotateY(top ? 0.42 : rnd() * 0.22);
    geo.translate(0.42 + (top ? 0.05 : rnd() * 0.03), y, 0.83 + (top ? 0.02 : rnd() * 0.02));
    put(STATIC, SLATE, geo);
  }

  // stamp-ochre stripes on a basalt band under the cornice, all four faces
  slab(NIGHT, -WX - 0.03, TOP, WB - 0.03, WX + 0.03, 2.02, WF + 0.03);
  const stripes = (n, len, along, fixed, dir) => {
    const w = len / (2 * n - 1);
    for (let i = 0; i < n; i++) {
      const a = -len / 2 + i * 2 * w;
      if (along === 'x') slab(OCHRE, a, TOP + 0.015, Math.min(fixed, fixed + dir * 0.012), a + w, 2.005, Math.max(fixed, fixed + dir * 0.012));
      else slab(OCHRE, Math.min(fixed, fixed + dir * 0.012), TOP + 0.015, ZC + a, Math.max(fixed, fixed + dir * 0.012), 2.005, ZC + a + w);
    }
  };
  stripes(7, 2.1, 'x', WF + 0.03, 1);
  stripes(7, 2.1, 'x', WB - 0.03, -1);
  stripes(5, 1.5, 'z', WX + 0.03, 1);
  stripes(5, 1.5, 'z', -WX - 0.03, -1);

  // stepped roof: basalt cornice, chalk tier, basalt tier, bronze collar
  slab(NIGHT, -1.2, 2.02, -1.0, 1.2, 2.18, 0.82);
  slab(CHALK, -0.98, 2.18, ZC - 0.75, 0.98, 2.33, ZC + 0.75);
  slab(NIGHT, -0.66, 2.33, ZC - 0.47, 0.66, 2.47, ZC + 0.47);
  cyl(BRONZE, 0.285, 0.31, 0.08, 32, 0, 2.51, ZC);
  const rim = new THREE.TorusGeometry(0.255, 0.022, 8, 40);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, 2.556, ZC);
  put(STATIC, BRONZE, rim);

  const lampGeo = new THREE.SphereGeometry(0.25, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const lamp = new THREE.Mesh(lampGeo, LAMP);
  lamp.name = 'lamp';
  lamp.position.set(0, 2.55, ZC);
  g.add(lamp);

  // ---- barrier post, beside the left (+x) wall ------------------------------------
  const PX = 1.55, PZ = 0.45, PIVOT = 1.13;
  slab(NIGHT, PX - 0.22, 0, PZ - 0.22, PX + 0.22, 0.1, PZ + 0.22);
  slab(NIGHT, PX - 0.17, 0.1, PZ - 0.17, PX + 0.17, 0.2, PZ + 0.17);
  cyl(NIGHT, 0.105, 0.115, 0.8, 20, PX, 0.6, PZ);
  for (const y of [0.46, 0.78]) cyl(CHALK, 0.118, 0.118, 0.09, 20, PX, y, PZ);
  cyl(BRONZE, 0.13, 0.14, 0.05, 20, PX, 1.025, PZ);
  for (const s of [-1, 1]) {
    slab(BRONZE, PX - 0.06, 1.05, PZ + s * 0.065, PX + 0.06, 1.2, PZ + s * 0.1);
  }
  cyl(BRONZE, 0.035, 0.035, 0.24, 12, PX, PIVOT, PZ, 'z');

  // ---- the barrier arm: a Group on the pin, geometry offset along +x ---------------
  const barrier = new THREE.Group();
  barrier.name = 'barrier';
  barrier.position.set(PX, PIVOT, PZ);
  cyl(BRONZE, 0.075, 0.075, 0.1, 20, 0, 0, 0, 'z', ARM);
  const L = 4.0, START = 0.07, BANDS = 9, BW = (L - 0.04 - START) / BANDS;
  for (let i = 0; i < BANDS; i++) {
    slab(i % 2 ? CHALK : OCHRE, START + i * BW, -0.07, -0.05, START + (i + 1) * BW, 0.07, 0.05, ARM);
  }
  slab(BRONZE, L - 0.04, -0.08, -0.06, L, 0.08, 0.06, ARM);       // end cap
  slab(BRONZE, 0, -0.074, -0.056, 0.32, 0.074, 0.056, ARM);        // strap plates at the hub
  flush(ARM, barrier);
  g.add(barrier);

  flush(STATIC, g);

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  const at = (x, y, z) => [+(x - c.x).toFixed(3), +(y - box.min.y).toFixed(3), +(z - c.z).toFixed(3)];
  g.userData.joints = { barrier };
  g.userData.parts = { lamp };
  // where the game stands a Warden, lays a paper or aims a camera
  g.userData.window = { center: at(0, (SILL + HEAD) / 2, WF), width: 2 * WIN, height: +(HEAD - SILL).toFixed(3) };
  g.userData.counter = { center: at(0, SILL, (WF + 1.0) / 2), width: 1.9, depth: +(1.0 - WF).toFixed(3) };
  g.userData.inside = at(0, FLOOR, ZC + 0.1);
  return g;
}
