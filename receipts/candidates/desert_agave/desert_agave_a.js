// desert_agave, candidate A (primitives): every leaf is a chain of two four-sided
// cylinders turned to a diamond section and flattened, then a four-sided cone for the
// pale tip, each link bent a little further down so the leaf curls; eighteen of them on
// a golden-angle spiral. The dry stalk is stacked thin cylinders with small spheres
// for seed pods, standing out of a flattened spherical cap of sand. 1.0 m tall overall.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true });
    m.name = name;
    return m;
  };
  const SAGE = mat(0x7a8766, 0.8, 'foliage');
  const TIP = mat(0xb5b18e, 0.85, 'foliage');
  const STRAW = mat(0xb49a6a, 0.9, 'timber');
  const POD = mat(0x8a6a48, 0.9, 'timber');
  const DUNE = mat(0xd4a373, 0.98, 'ground');

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;

  // A link runs up its local +Y from its pivot. rotation.x = a swings +Y toward +Z,
  // so a positive bend lowers the next link toward the ground on the outward side. A
  // four-sided cylinder is already a diamond on the axes; the holder flattens it to the
  // leaf's half-width (x) and half-thickness (z), and the next joint hangs off the
  // pivot, not the holder, so it is not squashed.
  const link = (parent, geo, m, w, t, bend) => {
    const pivot = new THREE.Group();
    pivot.rotation.x = bend;
    parent.add(pivot);
    const holder = new THREE.Group();
    holder.scale.set(w, 1, t);
    holder.add(new THREE.Mesh(geo, m));
    pivot.add(holder);
    return pivot;
  };
  const joint = (parent, y) => { const j = new THREE.Group(); j.position.y = y; parent.add(j); return j; };
  const COUNT = 18, GOLD = 2.39996;
  for (let k = 0; k < COUNT; k++) {
    const f = k / (COUNT - 1);
    const L = 0.62 - 0.27 * f + jit(0.03), lift = (18 + 56 * f + jit(5)) * (Math.PI / 180);
    const curl = (26 - 14 * f + jit(5)) * (Math.PI / 180);
    const w = 0.1 - 0.03 * f, t = 0.062 - 0.016 * f;
    const az = new THREE.Group();
    az.rotation.y = k * GOLD + 0.4;
    az.position.set(0, 0.05 + 0.11 * f, 0);
    g.add(az);
    const l1 = L * 0.42, l2 = L * 0.33, l3 = L * 0.25;
    const a = link(az, new THREE.CylinderGeometry(1, 0.72, l1, 4).translate(0, l1 / 2, 0), SAGE, w, t, Math.PI / 2 - lift);
    const b = link(joint(a, l1), new THREE.CylinderGeometry(0.62, 0.98, l2, 4).translate(0, l2 / 2, 0), SAGE, w, t, curl * 0.45);
    link(joint(b, l2), new THREE.ConeGeometry(0.62, l3, 4).translate(0, l3 / 2, 0), TIP, w, t, curl * 0.55);
  }

  // the dry stalk and its pods
  const cyl = (r0, r1, h, x, y, z, rx, rz, m) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 6).translate(0, h / 2, 0), m);
    o.position.set(x, y, z);
    o.rotation.set(rx, 0, rz);
    g.add(o);
    return o;
  };
  cyl(0.03, 0.022, 0.5, 0, 0.08, 0, 0, -0.03, STRAW);
  cyl(0.022, 0.014, 0.37, 0.015, 0.575, 0, -0.03, -0.06, STRAW);
  const top = new THREE.Vector3(0.037, 0.94, -0.011);
  for (const [y, az, len] of [[0.8, 0.3, 0.13], [0.87, 2.4, 0.11], [0.91, 4.3, 0.09]]) {
    const base = new THREE.Vector3(0.015 + (y - 0.575) * 0.06, y, -0.01);
    const br = cyl(0.01, 0.007, len, base.x, base.y, base.z, 0, 0, STRAW);
    br.rotation.set(Math.sin(az) * 0.9, 0, -Math.cos(az) * 0.9);
    br.updateMatrixWorld(true);
    const end = new THREE.Vector3(0, len, 0).applyMatrix4(br.matrixWorld);
    for (const [dx, dy, r] of [[0, 0.02, 0.03], [0.025, -0.01, 0.024]]) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), POD);
      p.position.set(end.x + dx * Math.cos(az), end.y + dy, end.z + dx * Math.sin(az));
      p.scale.y = 1.4;
      g.add(p);
    }
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.034, 6, 4), POD);
  crown.position.copy(top).add(new THREE.Vector3(0, 0.035, 0));
  crown.scale.y = 1.4;
  g.add(crown);

  // the mound: a flattened spherical cap
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 5, 0, Math.PI * 2, 0, 0.9).translate(0, -Math.cos(0.9), 0), DUNE);
  cap.scale.set(0.4 / Math.sin(0.9), 0.09 / (1 - Math.cos(0.9)), 0.37 / Math.sin(0.9));
  g.add(cap);

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
