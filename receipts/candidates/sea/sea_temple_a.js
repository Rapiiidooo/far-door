// sea_temple, arm A: primitives.
// The domed temple at the heart of the drowned city, about 50 m across and 51 m tall: an
// island of three round steps, the top one 9 m high; sixteen columns about a round sanctum
// lit through twelve slits; an entablature under a copper dome ringed in gold; and a lantern
// with a gold cone, crowned with a glowing crystal. The slits and the crystal are
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

  for (const [r, h] of [[24, 3], [20, 6], [16, 9]])
    put(new THREE.CylinderGeometry(r, r + 0.8, h, 64), MARBLE, 0, h / 2, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    put(new THREE.CylinderGeometry(0.8, 0.95, 11, 12), MARBLE, Math.sin(a) * 13, 14.5, Math.cos(a) * 13);
  }
  put(new THREE.CylinderGeometry(8.5, 8.5, 11, 40), MARBLE, 0, 14.5, 0);
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2;
    put(new THREE.BoxGeometry(0.9, 6, 0.3), LIGHT, Math.sin(a) * 8.55, 13, Math.cos(a) * 8.55, glow).rotation.y = a;
  }
  put(new THREE.CylinderGeometry(14.2, 14.2, 1.8, 64), MARBLE, 0, 20.9, 0);
  put(new THREE.TorusGeometry(14.25, 0.35, 6, 96).rotateX(Math.PI / 2), GOLD, 0, 21.8, 0);
  put(new THREE.SphereGeometry(13.4, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), COPPER, 0, 21.8, 0);
  put(new THREE.CylinderGeometry(2.2, 2.6, 4, 20), MARBLE, 0, 37.2, 0);
  put(new THREE.ConeGeometry(2.6, 6, 20), GOLD, 0, 42.2, 0);
  put(new THREE.OctahedronGeometry(1).scale(1.5, 3.2, 1.5), CRYSTAL, 0, 47.8, 0, glow);
  return g;
}
