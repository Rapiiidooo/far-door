// fern_cluster, candidate A (primitives): eleven fronds, each a chain of pivoted links
// that tilt a little further at every joint, so the frond rises from the crown and arches
// out and down. Every link carries a thin three-sided rachis tube and, on the blade, one
// pair of pinnae: open four-sided cones flattened into ridged leaflets, swept towards the
// tip and sized along a lanceolate outline, so the leaflets make the notched edge. The
// lower links are moss green, the upper fern green. Two fiddleheads are coils of three
// torus half-arcs of shrinking radius on short stalks; the crown is two low faceted caps
// of bark. 1.2 m across, 0.8 m tall.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true, side: THREE.DoubleSide });
    m.name = name;
    return m;
  };
  const MOSS = mat(0x4f7a3a, 0.85, 'foliage');
  const FERN = mat(0x7da04a, 0.8, 'foliage');
  const BARK = mat(0x5a4030, 0.95, 'timber');

  let seed = 29;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // A pinna: an open four-sided cone, base on the rachis, apex at +Y. Scaled per leaflet
  // to (half-width, length, half-thickness), its section is a flat rhombus with a ridge.
  const PINNA = new THREE.ConeGeometry(1, 1, 4, 1, true).translate(0, 0.5, 0);
  const add = (parent, geo, m) => { const o = new THREE.Mesh(geo, m); parent.add(o); return o; };

  // Widest a third of the way up the blade, the lowest pinnae shorter, a point at the tip.
  const outline = (v) => (v < 0.33 ? 0.42 + 0.58 * Math.sin((v / 0.33) * (Math.PI / 2)) : Math.pow((1 - v) / 0.67, 0.8));

  // t runs from 0 (inner, young, upright) to 1 (outer, old, spreading low). The frond's
  // angle above the horizontal falls from th0 to th1 along its length, slowly at first.
  const frond = (az, t, scale) => {
    const th0 = (86 - 26 * t) * D, th1 = (-50 - 24 * t) * D, pw = 2.4 - t;
    const L = (1.12 - 0.44 * t) * scale;
    const theta = (u) => th0 - (th0 - th1) * Math.pow(u, pw);
    const NS = 3, NB = 13, US = 0.2, M = NS + NB;
    const split = NS + Math.round(NB * (0.42 + 0.2 * t));
    const W = 0.13 * L;
    // a slight sideways curl and a roll of the blade, so no two fronds share a plane
    const curl = jit(1.6) * D, roll = jit(2.2) * D;
    const root = new THREE.Group();
    root.rotation.y = az;
    root.position.set(Math.sin(az) * 0.04, 0.036 - 0.01 * t, Math.cos(az) * 0.04);
    g.add(root);
    let parent = root, prevTilt = 0, prevLen = 0;
    for (let j = 0; j < M; j++) {
      const u0 = j < NS ? (j / NS) * US : US + ((j - NS) / NB) * (1 - US);
      const u1 = j < NS ? ((j + 1) / NS) * US : US + ((j - NS + 1) / NB) * (1 - US);
      const len = (u1 - u0) * L;
      // rotation.x swings the link's +Y towards +Z, which is outwards along the azimuth
      const tilt = Math.PI / 2 - theta((u0 + u1) / 2);
      const pivot = new THREE.Group();
      pivot.position.y = prevLen;
      pivot.rotation.set(tilt - prevTilt, j ? roll : 0, j ? curl : 0);
      parent.add(pivot);
      const m = j < split ? MOSS : FERN;
      const r0 = 0.013 * (1 - 0.75 * u0), r1 = 0.013 * (1 - 0.75 * u1);
      add(pivot, new THREE.CylinderGeometry(r1, r0, len * 1.04, 3, 1, true).translate(0, (len * 1.04) / 2, 0), m);
      if (j >= NS) {
        const v = (j - NS + 0.5) / NB;
        const l = W * outline(v) * (1 + jit(0.06));
        const sweep = (32 + 22 * v) * D, droop = (8 + 10 * v) * D;
        const w = Math.min(0.46 * len, 0.34 * l);
        for (const s of [-1, 1]) {
          const d = V(s * Math.cos(sweep) * Math.cos(droop), Math.sin(sweep) * Math.cos(droop), Math.sin(droop)).normalize();
          const zn = V(0, 0, 1).addScaledVector(d, -d.z).normalize();
          const xn = V(0, 0, 0).crossVectors(d, zn);
          const o = add(pivot, PINNA, m);
          o.position.y = len * 0.5;
          o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xn, d, zn));
          o.scale.set(w, l, w * 0.42);
        }
      }
      parent = pivot;
      prevTilt = tilt;
      prevLen = len;
    }
  };

  const N = 11;
  const tiers = [0, 0.7, 0.35, 1, 0.15, 0.8, 0.5, 0.95, 0.25, 0.6, 0.85];
  for (let k = 0; k < N; k++) frond((k / N) * Math.PI * 2 + jit(0.12), tiers[k], 1 + jit(0.04));

  // --- fiddleheads: a two-link stalk, then a coil of torus half-arcs. The coil lies in
  // the stalk's own Y-Z plane: over the top, down, under, and over again, each arc smaller.
  const fiddlehead = (az, lean, h, k) => {
    const root = new THREE.Group();
    root.rotation.y = az;
    root.position.set(Math.sin(az) * 0.02, 0.03, Math.cos(az) * 0.02);
    g.add(root);
    const a = new THREE.Group();
    a.rotation.x = lean;
    root.add(a);
    add(a, new THREE.CylinderGeometry(0.012 * k, 0.015 * k, h * 0.55, 5, 1, true).translate(0, h * 0.275, 0), MOSS);
    const b = new THREE.Group();
    b.position.y = h * 0.55;
    b.rotation.x = -lean * 1.6;
    a.add(b);
    add(b, new THREE.CylinderGeometry(0.012 * k, 0.012 * k, h * 0.45, 5, 1, true).translate(0, h * 0.225, 0), FERN);
    const top = h * 0.45;
    const R = [0.042, 0.026, 0.014].map((r) => r * k), T = [0.02, 0.016, 0.012].map((r) => r * k);
    const arc = (cz, r, tube, from) => {
      const geo = new THREE.TorusGeometry(r, tube, 4, 8, Math.PI).rotateZ(from).rotateY(-Math.PI / 2).translate(0, top, cz);
      add(b, geo, FERN);
    };
    arc(R[0], R[0], T[0], 0);
    arc(2 * R[0] - R[1], R[1], T[1], Math.PI);
    arc(2 * R[0] - 2 * R[1] + R[2], R[2], T[2], 0);
    const bud = add(b, new THREE.SphereGeometry(1, 6, 4), FERN);
    bud.position.set(0, top + 0.002 * k, 2 * R[0] - 2 * R[1] + R[2]);
    bud.scale.setScalar(R[2] * 0.62);
  };
  fiddlehead(0.9, 0.2, 0.34, 1.1);
  fiddlehead(3.6, 0.28, 0.26, 0.95);

  // --- the crown: two low faceted caps of bark, one tucked against the other. A cap cut
  // at 0.9 rad rather than a hemisphere, so its rim slopes into the ground instead of
  // standing up like the wall of a pot.
  const CAP = new THREE.SphereGeometry(1, 7, 2, 0, Math.PI * 2, 0, 0.9).translate(0, -Math.cos(0.9), 0);
  for (const [x, z, rx, ry, rz, a] of [[0, 0, 0.11, 0.05, 0.1, 0.4], [0.04, -0.03, 0.07, 0.06, 0.065, 1.1]]) {
    const dome = add(g, CAP, BARK);
    dome.position.set(x, 0, z);
    dome.scale.set(rx / Math.sin(0.9), ry / (1 - Math.cos(0.9)), rz / Math.sin(0.9));
    dome.rotation.y = a;
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
