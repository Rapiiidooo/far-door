// meadow_grass, candidate A (primitives): every blade is a PlaneGeometry one quad wide and
// five tall whose vertices are rewritten onto a quadratic Bezier arch: root on the floor
// inside a 0.15 m base, a control point above it and the tip out where the blade ends, so
// the inner blades stand nearly straight and the outer ones rise, bow and droop at the tip.
// The strip narrows towards a point, collapsing its top edge to the tip, drifts a little
// sideways and twists as it rises; its normals are computed on the bent plane, so each
// blade shades smoothly along its length. Each blade's lower rows go to the moss green
// mesh and the upper rows and tip to the fern green one. Four stalks are bent open
// cylinders arching out at the top, each hung with a spiral of oat grains made of
// stretched low spheres. 0.6 m tall, 0.7 m across.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    m.name = 'foliage';
    return m;
  };
  const MOSS = mat(0x4f7a3a);
  const FERN = mat(0x7da04a);

  let seed = 2711;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // Triangles are copied out of each shaped primitive, with its normals and uvs, into one
  // bin per material; a triangle collapsed to a line by the pointed tip is dropped.
  const bins = new Map([[MOSS, { pos: [], nor: [], uv: [] }], [FERN, { pos: [], nor: [], uv: [] }]]);
  const pa = V(0, 0, 0), pb = V(0, 0, 0), pc = V(0, 0, 0);
  const take = (geo, pick) => {
    const idx = geo.index, P = geo.attributes.position, N = geo.attributes.normal, T = geo.attributes.uv;
    const n = idx ? idx.count : P.count;
    for (let f = 0; f < n / 3; f++) {
      const ids = [0, 1, 2].map((k) => (idx ? idx.getX(3 * f + k) : 3 * f + k));
      pa.fromBufferAttribute(P, ids[0]); pb.fromBufferAttribute(P, ids[1]); pc.fromBufferAttribute(P, ids[2]);
      if (pb.sub(pa).cross(pc.sub(pa)).lengthSq() < 1e-14) continue;
      const B = bins.get(pick(f));
      for (const i of ids) {
        B.pos.push(P.getX(i), P.getY(i), P.getZ(i));
        B.nor.push(N.getX(i), N.getY(i), N.getZ(i));
        B.uv.push(T.getX(i), T.getY(i));
      }
    }
  };

  // --- blades -----------------------------------------------------------------------------
  const NB = 36, SEG = 5;
  for (let k = 0; k < NB; k++) {
    // t runs from 0 (inner: tall, nearly upright) to 1 (outer: short, bowed, tip drooping)
    const t = Math.min(1, Math.max(0, (k + 0.5) / NB + jit(0.05)));
    const az = k * 2.39996 + jit(0.25);
    const O = V(Math.sin(az), 0, Math.cos(az)), S = V(Math.cos(az), 0, -Math.sin(az));
    const r0 = 0.006 + 0.058 * t + jit(0.008);
    const R0 = O.clone().multiplyScalar(r0).addScaledVector(S, jit(0.012));
    const sz = 1 + jit(0.08);
    const C = R0.clone().addScaledVector(O, (0.01 + 0.14 * t) * sz).setY((0.3 + 0.07 * t) * sz);
    const E = R0.clone().addScaledVector(O, (0.1 + 0.22 * t) * sz).addScaledVector(S, jit(0.06)).setY((0.53 - 0.45 * t) * sz);
    const bez = (u) => R0.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(C, 2 * u * (1 - u)).addScaledVector(E, u * u);
    const tan = (u) => C.clone().sub(R0).multiplyScalar(2 * (1 - u)).addScaledVector(E.clone().sub(C), 2 * u).normalize();
    const w0 = 0.02 * (1 + jit(0.12)), twist = jit(1.0), L = 0.6 - 0.25 * t;

    const geo = new THREE.PlaneGeometry(1, 1, 1, SEG);
    const pos = geo.attributes.position, uv = geo.attributes.uv, u0 = rnd();
    for (let i = 0; i < pos.count; i++) {
      const s = pos.getX(i), u = pos.getY(i) + 0.5;
      const T = tan(u);
      const W = S.clone().addScaledVector(T, -S.dot(T)).normalize().applyAxisAngle(T, twist * u);
      const p = bez(u).addScaledVector(W, s * w0 * (1 - Math.pow(u, 2.5)));
      pos.setXYZ(i, p.x, p.y, p.z);
      uv.setXY(i, u0 + s * 0.024, u * L);
    }
    geo.computeVertexNormals();
    // PlaneGeometry lists its rows from the top (the tip) down, two triangles per row
    const split = t < 0.35 ? 3 : 2;
    take(geo, (f) => (SEG - 1 - Math.floor(f / 2) < split ? MOSS : FERN));
  }

  // --- stalks and oat grains ------------------------------------------------------------------
  // The stalk is one open three-sided cylinder, four segments tall, bent onto a curve that rises
  // almost straight and arches outwards at the top without hooking over; six grains hang
  // from its last stretch in a spiral, pointing down and out.
  const stalk = (az, lean, H, nod) => {
    const O = V(Math.sin(az), 0, Math.cos(az));
    const R0 = O.clone().multiplyScalar(0.016);
    const C = R0.clone().addScaledVector(O, H * Math.tan(lean)).setY(H * 0.84);
    const E = R0.clone().addScaledVector(O, H * Math.tan(lean) + nod).setY(H);
    const bez = (u) => R0.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(C, 2 * u * (1 - u)).addScaledVector(E, u * u);
    const tan = (u) => C.clone().sub(R0).multiplyScalar(2 * (1 - u)).addScaledVector(E.clone().sub(C), 2 * u).normalize();
    const geo = new THREE.CylinderGeometry(0.0019, 0.0029, 1, 3, 4, true);
    const pos = geo.attributes.position, q = new THREE.Quaternion(), Y = V(0, 1, 0), p = V(0, 0, 0);
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getY(i) + 0.5;
      p.set(pos.getX(i), 0, pos.getZ(i)).applyQuaternion(q.setFromUnitVectors(Y, tan(u)));
      p.add(bez(u));
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    geo.computeVertexNormals();
    // the cylinder lists its triangles side by side, each side two per row from the top
    // down; the lower two rows go to the moss green mesh
    take(geo, (f) => (Math.floor((f % 8) / 2) >= 2 ? MOSS : FERN));

    const psi0 = rnd() * 6.3;
    for (let s = 0; s < 6; s++) {
      const at = bez(0.76 + 0.048 * s);
      const psi = psi0 + s * 2.4, phi = (s === 5 ? 18 : 38) * (Math.PI / 180);
      const side = V(Math.sin(psi), 0, Math.cos(psi)).lerp(O, 0.35).normalize();
      const dir = side.multiplyScalar(Math.sin(phi)).setY(-Math.cos(phi)).normalize();
      const len = 0.03 - 0.0012 * s;
      const grain = new THREE.SphereGeometry(1, 4, 2);
      grain.scale(0.0056, len / 2, 0.0056).translate(0, -len / 2, 0);
      grain.applyQuaternion(q.setFromUnitVectors(V(0, -1, 0), dir)).translate(at.x, at.y, at.z);
      grain.computeVertexNormals();
      take(grain, () => FERN);
    }
  };
  const S4 = [[0.6, 0.05, 0.6, 0.08], [2.3, 0.1, 0.57, 0.1], [4.0, 0.04, 0.54, 0.07], [5.4, 0.12, 0.5, 0.09]];
  for (const [az, lean, H, nod] of S4) stalk(az + jit(0.2), lean, H * (1 + jit(0.03)), nod);

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
