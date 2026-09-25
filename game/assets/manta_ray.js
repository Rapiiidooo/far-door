// manta_ray, arm A: primitives.
// A manta ray a metre across, nose to +z: a flat disc of body and wings (a sphere pressed
// thin), a low hump on its back, two horns curling down at the front, dark eyes at the sides
// of its head and a mouth between the horns, and a whip of a tail. Set on the ground and
// centred on its footprint; the game's vertex shader flaps its wings.
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
  const SKIN = mat(0x2e4150, 0.6, 'skin', { flatShading: true });
  const EYE = mat(0x0c1014, 0.3, 'eye');
  const ray = new THREE.Group();
  g.add(ray);

  put(new THREE.SphereGeometry(0.5, 16, 8).scale(1, 0.12, 0.62), SKIN, 0, 0, 0, ray);
  put(new THREE.SphereGeometry(0.16, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1.5), SKIN, 0, 0.04, -0.02, ray);
  put(new THREE.CylinderGeometry(0.012, 0.003, 0.7, 3).rotateX(Math.PI / 2), SKIN, 0, 0, -0.62, ray);
  for (const s of [-1, 1]) {
    put(new THREE.ConeGeometry(0.035, 0.16, 5).rotateX(Math.PI / 2 + 0.35), SKIN, s * 0.09, -0.01, 0.33, ray);
    put(new THREE.SphereGeometry(0.022, 6, 4), EYE, s * 0.12, 0.035, 0.24, ray);
  }
  put(new THREE.BoxGeometry(0.12, 0.02, 0.02), EYE, 0, -0.035, 0.3, ray);
  ray.position.set(0, 0.06, 0.28);
  return g;
}
