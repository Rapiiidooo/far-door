// sea_coral, arm A: primitives.
// A head of coral about 1.4 m across and 0.9 m tall: a mound of three squashed, faceted
// boulders of brain coral, the largest in the middle, with four fingers of branching coral
// leaning out between them. One pale colour, which the game tints for each head.
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
  const glow = new THREE.Group();
  g.add(glow);
  g.userData.parts = { glow };
  const put = (geo, m, x, y, z, parent = g) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const CORAL = mat(0xf2e6e0, 0.75, 'coral', { flatShading: true });

  put(new THREE.IcosahedronGeometry(0.45, 1).scale(1.1, 0.7, 1), CORAL, 0, 0.32, 0);
  put(new THREE.IcosahedronGeometry(0.3, 1).scale(1, 0.8, 1.1), CORAL, 0.42, 0.24, 0.18);
  put(new THREE.IcosahedronGeometry(0.26, 1).scale(1.1, 0.75, 1), CORAL, -0.38, 0.22, -0.2);
  for (const [x, z, h, lean] of [[0.12, 0.3, 0.55, 0.2], [-0.2, 0.28, 0.45, -0.25], [0.3, -0.25, 0.5, 0.3], [-0.05, -0.35, 0.4, -0.15]])
    put(new THREE.CylinderGeometry(0.03, 0.06, h, 6), CORAL, x, 0.32 + h / 2, z).rotation.set(lean * 0.6, 0, lean);
  return g;
}
