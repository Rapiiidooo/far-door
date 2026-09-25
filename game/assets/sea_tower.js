// sea_tower, arm A: primitives.
// A slender tower of the drowned city, 24.4 m tall: a round shaft of pale stone narrowing a
// little as it rises, seven lit windows climbing it in a spiral, a gold band under a copper
// spire, and a glowing crystal at the tip. The game scales its girth and height. The windows
// and the crystal are userData.parts.glow.
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

  put(new THREE.CylinderGeometry(1, 1.2, 20, 14), MARBLE, 0, 10, 0);
  put(new THREE.TorusGeometry(1.02, 0.08, 6, 24).rotateX(Math.PI / 2), GOLD, 0, 19.2, 0);
  put(new THREE.ConeGeometry(1.25, 2.4, 14), COPPER, 0, 21.2, 0);
  put(new THREE.OctahedronGeometry(1).scale(0.45, 1.1, 0.45), CRYSTAL, 0, 23.3, 0, glow);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.2,
      y = 4 + i * 2.2,
      r = 1.21 - (0.2 * y) / 20;
    put(new THREE.BoxGeometry(0.28, 0.6, 0.1), LIGHT, Math.sin(a) * r, y, Math.cos(a) * r, glow).rotation.y = a;
  }
  return g;
}
