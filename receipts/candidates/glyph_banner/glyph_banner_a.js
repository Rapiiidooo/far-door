// glyph_banner, candidate A (primitives): the cloth is a mosaic of thin box plates,
// each set on the breeze surface and turned to its slope, so it reads as stiff, folded
// cloth; three tails of shrinking plates hang below the torn hem. The device is a
// half-cylinder disc and a flattened torus crescent in each colour, counterchanged
// across the seam. Cylinders for the pole, crossbar and finial, dodecahedra for the
// cairn. 3.6 m tall, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const BONE = mat(0xe6d3ae, 0.92, 'fabric');
  const SIENNA_C = mat(0x8a5433, 0.94, 'fabric');
  const TIMBER = mat(0x8a6a48, 0.88, 'timber', { flatShading: true });
  const ROPE = mat(0xb49a6a, 0.95, 'fabric');
  const BRONZE = mat(0x9a6a35, 0.5, 'metal', { metalness: 0.6 });
  const SAND = mat(0xb57f4f, 0.92, 'stone'), SUN = mat(0xd4a373, 0.88, 'stone'), SIENNA = mat(0x8a5433, 0.95, 'stone');

  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };

  // the same breeze surface as a guide: u across, v down
  const W = 1.1, TOP = 3.1, LEN = 2.42, Z0 = 0.13;
  const S = (u, v) => {
    const v2 = v * v;
    const fold = (0.02 + 0.1 * v2) * Math.sin(Math.PI * 2 * (u * 2.3 + v * 0.7) + 0.6);
    return V((u - 0.5) * W + 0.4 * v2, TOP - v * LEN + 0.36 * v2, Z0 + 0.46 * Math.sin(Math.PI * 0.5 * v) * v + fold);
  };
  // A plate centred on the surface at (u, v), du wide and dv tall, turned to the surface.
  const plate = (u, v, du, dv, m, lift = 0, thick = 0.018) => {
    const c = S(u, v), right = S(u + 0.01, v).sub(S(u - 0.01, v)).normalize(), down = S(u, v + 0.01).sub(S(u, v - 0.01)).normalize();
    const n = V(0, 0, 0).crossVectors(right, down).normalize(), up = V(0, 0, 0).crossVectors(n, right);
    const w = S(u + du / 2, v).distanceTo(S(u - du / 2, v)) * 1.08, h = S(u, v + dv / 2).distanceTo(S(u, v - dv / 2)) * 1.1;
    const o = mesh(new THREE.BoxGeometry(w, h, thick), m);
    o.position.copy(c).addScaledVector(n, lift);
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
    return o;
  };
  const NU = 8, NV = 7, VS = 0.6;
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const u = (i + 0.5) / NU, v = ((j + 0.5) / NV) * VS;
      const edge = i === 0 || i === NU - 1 ? jit(0.02) : 0;
      plate(u + edge, v, 1 / NU, VS / NV, u < 0.5 ? BONE : SIENNA_C);
    }
  }
  // three tails below the hem, each a column of narrowing plates flicking outward
  for (const [cu, len, fan, k] of [[0.15, 0.26, -0.05, 0], [0.5, 0.4, 0.02, 1], [0.85, 0.2, 0.08, 2]]) {
    const n = 4;
    for (let r = 0; r < n; r++) {
      const q = (r + 0.5) / n, v = VS + len * q, width = 0.28 * (1 - 0.55 * q);
      const u = cu + fan * q;
      if (k === 1) {
        plate(u - width / 4, v, width / 2, len / n, BONE);
        plate(u + width / 4, v, width / 2, len / n, SIENNA_C);
      } else {
        plate(u, v, width, len / n, k === 0 ? BONE : SIENNA_C);
      }
    }
  }

  // the device: a disc in two half cylinders and a crescent in two torus arcs, lifted off
  // the plates and turned to the surface; the left halves sienna, the right bone
  const device = (side) => {
    const c = S(0.5, 0.3), right = S(0.51, 0.3).sub(S(0.49, 0.3)).normalize(), down = S(0.5, 0.31).sub(S(0.5, 0.29)).normalize();
    const n = V(0, 0, 0).crossVectors(right, down).normalize(), up = V(0, 0, 0).crossVectors(n, right);
    const holder = new THREE.Group();
    holder.position.copy(c).addScaledVector(n, 0.03 * side);
    holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
    g.add(holder);
    for (const left of [true, false]) {
      const m = left ? SIENNA_C : BONE;
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12, 1, false, left ? Math.PI : 0, Math.PI), m);
      d.rotation.x = Math.PI / 2;
      d.position.y = 0.02;
      holder.add(d);
      // the arc runs under the disc from one horn to the other; each half is one colour
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.045, 5, 12, Math.PI * 0.6), m);
      arc.rotation.z = left ? Math.PI * 0.9 : Math.PI * 1.5;
      arc.scale.z = 0.4;
      arc.position.y = -0.03;
      holder.add(arc);
    }
  };
  device(1);
  device(-1);

  // pole, crossbar with bronze caps, the sleeve, rope, finial
  const cyl = (r0, r1, h, m, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), m);
  const pole = cyl(0.058, 0.049, 3.39, TIMBER);
  pole.position.set(0, 0.05 + 3.39 / 2, 0);
  g.add(pole);
  const bar = cyl(0.036, 0.034, 1.32, TIMBER);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 3.195, 0.095);
  g.add(bar);
  for (const x of [-0.67, 0.67]) { const c = cyl(0.045, 0.045, 0.06, BRONZE, 10); c.rotation.z = Math.PI / 2; c.position.set(x, 3.195, 0.095); g.add(c); }
  for (const [x0, x1, m] of [[-0.57, 0, BONE], [0, 0.57, SIENNA_C]]) {
    const s = cyl(0.048, 0.048, x1 - x0, m, 10);
    s.rotation.z = Math.PI / 2;
    s.position.set((x0 + x1) / 2, 3.15, 0.11);
    g.add(s);
  }
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 5, 12), ROPE);
    r.position.set(0, 3.13 + i * 0.045, 0.045);
    r.rotation.set(Math.PI / 2 + 0.35, 0, 0.3);
    g.add(r);
  }
  const collar = cyl(0.066, 0.06, 0.06, BRONZE, 10);
  collar.position.set(0, 3.43, 0);
  g.add(collar);
  const neck = cyl(0.025, 0.025, 0.04, BRONZE, 8);
  neck.position.set(0, 3.48, 0);
  g.add(neck);
  const fin = cyl(0.1, 0.1, 0.036, BRONZE, 20);
  fin.rotation.x = Math.PI / 2;
  fin.position.set(0, 3.5, -0.004);
  g.add(fin);

  // the cairn
  const stone = (x, y, z, r, m) => {
    const o = mesh(new THREE.DodecahedronGeometry(r, 0), m, x, y, z);
    o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    o.scale.set(1.15, 0.72, 0.95);
  };
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + jit(0.2), r = 0.36 + jit(0.05);
    stone(Math.cos(a) * r, 0.12, Math.sin(a) * r, 0.19 + jit(0.03), [SAND, SIENNA, SAND, SUN][i % 4]);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.5 + jit(0.2), r = 0.17 + jit(0.03);
    stone(Math.cos(a) * r, 0.32, Math.sin(a) * r, 0.15, [SAND, SUN, SIENNA, SAND, SUN][i]);
  }
  stone(0.03, 0.47, -0.07, 0.11, SIENNA);

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
