// supply_crates, candidate A: primitives. Each crate is boards and battens as boxes
// over a dark core that shows in the joints, rope handles are half tori, the barrel
// is a twelve-sided cylinder bulged in place with bronze tori for bands, and the straw
// is a squashed sphere bristling with cones. Flat shaded throughout.
// 1.8 m wide, 1.2 m deep, 1.3 m tall.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  // Values stay distinct per material: the loader merges by value, not by name.
  const TIMBER = mat(0x8a6a48, 'timber', { roughness: 0.9 });
  const DARK = mat(0x4b2e1e, 'timber', { roughness: 0.95 });
  const ROPE = mat(0xb49a6a, 'fabric', { roughness: 0.92 });
  const STRAW = mat(0xb49a6a, 'foliage', { roughness: 0.98, side: THREE.DoubleSide });
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });
  const PAPER = mat(0xe6d3ae, 'fabric', { roughness: 0.85 });
  const LEATHER = mat(0x4b2e1e, 'fabric', { roughness: 0.7 });

  const flat = (geo) => { const o = geo.index ? geo.toNonIndexed() : geo; o.computeVertexNormals(); return o; };
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const me = new THREE.Mesh(flat(geo), m);
    me.position.set(x, y, z);
    parent.add(me);
    return me;
  };
  const box = (parent, w, h, d, m, x, y, z) => add(parent, new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const rod = (parent, a, b, r, m, seg = 6) => {
    const d = b.clone().sub(a);
    const me = add(parent, new THREE.CylinderGeometry(r, r, d.length(), seg), m);
    me.position.copy(a).add(b).multiplyScalar(0.5);
    me.quaternion.setFromUnitVectors(UP, d.normalize());
    return me;
  };
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // --- a crate: boards with open joints, framed by battens, nailed, rope handles --------------
  const J = 0.012, T = 0.022, BT = 0.026, BW = 0.07;   // joint, board, batten thickness and width
  const crate = (w, h, d, { lid = true, fill = 1 } = {}) => {
    const c = new THREE.Group();
    box(c, w - 2 * T + 0.004, (lid ? h : h * fill) - 0.01, d - 2 * T + 0.004, DARK, 0, (lid ? h : h * fill) / 2, 0);
    const n = Math.max(2, Math.round(h / 0.2)), ph = (h - J * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const y = ph / 2 + i * (ph + J), jig = (rnd() - 0.5) * 0.008;
      for (const s of [-1, 1]) {
        box(c, w, ph, T, TIMBER, jig, y, s * (d / 2 - T / 2));
        box(c, T, ph, d - 2 * T, TIMBER, s * (w / 2 - T / 2), y, jig);
      }
    }
    // battens: upright at the corners of front and back, rails top and bottom on the ends
    for (const s of [-1, 1]) {
      for (const k of [-1, 1]) box(c, BW, h, BT, TIMBER, k * (w / 2 - BW / 2), h / 2, s * (d / 2 + BT / 2));
      for (const y of [BW / 2, h - BW / 2]) box(c, BT, BW, d + 2 * BT, TIMBER, s * (w / 2 + BT / 2), y, 0);
      // nail heads at the batten ends
      for (const k of [-1, 1]) {
        for (const y of [0.035, h - 0.035]) {
          rod(c, V(k * (w / 2 - BW / 2), y, s * (d / 2 + BT)), V(k * (w / 2 - BW / 2), y, s * (d / 2 + BT + 0.006)), 0.009, BRONZE, 5);
        }
      }
      // rope handle through the end boards
      const x = s * (w / 2 + BT);
      const loop = add(c, new THREE.TorusGeometry(0.075, 0.014, 4, 8, Math.PI), ROPE, x + s * 0.005, h * 0.62, 0);
      loop.rotation.set(0, Math.PI / 2, Math.PI);   // lower half, turned into the end face
      for (const k of [-1, 1]) box(c, 0.03, 0.035, 0.035, ROPE, x + s * 0.006, h * 0.62, k * 0.075);
    }
    if (lid) {
      const m = 4, pw = (d - J * (m - 1)) / m;
      for (let i = 0; i < m; i++) box(c, w, T, pw, TIMBER, (rnd() - 0.5) * 0.01, h + T / 2, -d / 2 + pw / 2 + i * (pw + J));
      for (const k of [-1, 1]) box(c, BW, BT, d, TIMBER, k * (w / 2 - 0.12), h + T + BT / 2, 0);
    }
    return c;
  };

  // --- the stack ---------------------------------------------------------------------------------
  const b1 = crate(0.8, 0.62, 0.58);
  b1.position.set(-0.46, 0, -0.3);
  g.add(b1);
  const b2 = crate(0.72, 0.56, 0.52);
  b2.position.set(-0.43, 0.62 + T + BT, -0.3);
  b2.rotation.y = 0.14;
  g.add(b2);

  // --- the open crate, straw and a rolled map inside, lid leaning on its front ------------------
  const b3 = crate(0.74, 0.5, 0.56, { lid: false, fill: 0.78 });
  b3.position.set(0.45, 0, -0.26);
  b3.rotation.y = -0.08;
  g.add(b3);
  const mound = add(b3, new THREE.SphereGeometry(0.34, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), STRAW, 0, 0.36, 0);
  mound.scale.set(1, 0.42, 0.78);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 0.05 + rnd() * 0.24;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.7;
    const len = 0.1 + rnd() * 0.12;
    const tuft = add(b3, new THREE.ConeGeometry(0.018, len, 3), STRAW, x, 0.43 + len * 0.3, z);
    tuft.rotation.set((rnd() - 0.5) * 1.3, rnd() * 3, (rnd() - 0.5) * 1.3);
  }
  const top = V(0.12, 0.86, 0.04), bot = V(-0.08, 0.3, -0.06);
  rod(b3, bot, top, 0.042, PAPER, 8);
  for (const f of [0.55, 0.8]) {
    const p = bot.clone().lerp(top, f);
    const tie = add(b3, new THREE.TorusGeometry(0.045, 0.008, 4, 8), LEATHER, p.x, p.y, p.z);
    tie.quaternion.setFromUnitVectors(V(0, 0, 1), top.clone().sub(bot).normalize());
  }
  // the lid: boards and two battens, leaning with its battens outward
  const lid = new THREE.Group();
  for (let i = 0; i < 4; i++) box(lid, 0.74, 0.13, T, TIMBER, 0, 0.065 + i * 0.142, 0);
  for (const k of [-1, 1]) box(lid, BW, 0.56, BT, TIMBER, k * 0.25, 0.28, T / 2 + BT / 2);
  lid.position.set(0, 0.012, 0.28 + BT + 0.2);
  lid.rotation.x = -0.38;
  b3.add(lid);
  // straw fallen out in front
  for (let i = 0; i < 9; i++) {
    const s = add(b3, new THREE.ConeGeometry(0.016, 0.12 + rnd() * 0.08, 3), STRAW, -0.25 + rnd() * 0.3, 0.012, 0.36 + rnd() * 0.2);
    s.rotation.set(Math.PI / 2, 0, rnd() * Math.PI);
  }

  // --- the barrel: twelve staves bulged in place, bronze bands, a sunk head ---------------------
  const BH = 0.56, BR = 0.17, BB = 0.045;
  const bg = new THREE.CylinderGeometry(BR, BR, BH, 12, 6);
  const p = bg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = 1 + (BB / BR) * (1 - (2 * y / BH) ** 2), x = p.getX(i), z = p.getZ(i);
    if (Math.hypot(x, z) > 1e-6) p.setXYZ(i, x * k, y, z * k);
  }
  const barrel = new THREE.Group();
  barrel.position.set(-0.52, 0, 0.36);
  g.add(barrel);
  add(barrel, bg, TIMBER, 0, BH / 2, 0);
  for (const y of [0.05, 0.17, BH - 0.17, BH - 0.05]) {
    const r = BR * (1 + (BB / BR) * (1 - (2 * (y - BH / 2) / BH) ** 2)) + 0.004;
    const band = add(barrel, new THREE.TorusGeometry(r, 0.013, 3, 12), BRONZE, 0, y, 0);
    band.rotation.x = Math.PI / 2;
  }
  add(barrel, new THREE.CylinderGeometry(BR - 0.02, BR - 0.02, 0.02, 12), DARK, 0, BH - 0.02, 0);
  const chime = add(barrel, new THREE.TorusGeometry(BR - 0.006, 0.014, 3, 12), TIMBER, 0, BH - 0.004, 0);
  chime.rotation.x = Math.PI / 2;

  // --- placement: base on y = 0, centred on x and z ------------------------------------------
  const b = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const q = n.isMesh && n.geometry.attributes.position; if (!q) return;
    const put = (mm) => { for (let i = 0; i < q.count; i++) b.expandByPoint(v.fromBufferAttribute(q, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = b.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= b.min.y; o.position.z -= c.z; });
  return g;
}
