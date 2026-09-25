// sea_house, arm A: primitives.
// A house of the drowned city, 4 m square and 7.2 m to the tip of its roof: a block of pale
// stone on a plinth, under a cornice, with a dark door under a stone arch and a step before
// it between two lit windows on its front, two more on its back, a sill under each window, and
// a four-sided copper roof with a gold finial. The game scatters it by the
// hundred round the city's rings, scaled a little differently each time. The windows are
// userData.parts.glow.
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
  const MARBLE = mat(0xe4dccd, 0.7, 'stone', { flatShading: true });
  const COPPER = mat(0x6fb8a6, 0.55, 'metal', { flatShading: true });
  const GOLD = mat(0xd8a443, 0.4, 'metal', { metalness: 0.3, emissive: 0x4a3006, emissiveIntensity: 0.7 });
  const CRYSTAL = mat(0xa8f8ff, 0.25, 'glass', { emissive: 0x52eeff, emissiveIntensity: 2.6 });
  const LIGHT = mat(0xffc46e, 0.6, 'glass', { emissive: 0xffc46e, emissiveIntensity: 2.4 });
  const DOOR = mat(0x33403f, 0.85, 'timber');

  put(new THREE.BoxGeometry(4, 5, 4), MARBLE, 0, 2.5, 0);
  put(new THREE.BoxGeometry(4.3, 0.3, 4.3), MARBLE, 0, 0.15, 0);
  put(new THREE.BoxGeometry(4.24, 0.25, 4.24), MARBLE, 0, 4.88, 0);
  put(new THREE.ConeGeometry(2.08 * Math.SQRT2, 2.2, 4).rotateY(Math.PI / 4), COPPER, 0, 6.1, 0);
  put(new THREE.SphereGeometry(0.16, 8, 6), GOLD, 0, 7.25, 0);
  for (const side of [-1, 1])
    for (const x of [-0.95, 0.95]) {
      put(new THREE.BoxGeometry(0.7, 1.1, 0.1), LIGHT, x, 2.9, side * 2.03, glow);
      put(new THREE.BoxGeometry(0.9, 0.08, 0.2), MARBLE, x, 2.31, side * 2.05);
    }
  put(new THREE.BoxGeometry(1.1, 2, 0.1), DOOR, 0, 1.3, 2.03);
  put(new THREE.TorusGeometry(0.58, 0.08, 6, 12, Math.PI), MARBLE, 0, 2.3, 2.05);
  put(new THREE.BoxGeometry(1.5, 0.15, 0.5), MARBLE, 0, 0.375, 2.2);
  return g;
}
