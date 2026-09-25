// sea_rings, arm A: primitives.
// The stonework of the drowned city, 196.5 m across: three concentric rings of pale stone
// wall, 5 to 6 m high, round an open centre where the temple stands; the old canals between
// them spanned by four bridges, each on a pair of piers; and a line of blue light along both
// edges of every wall's top. The lines of light are userData.parts.glow.
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
  const RAIL = mat(0x62eaff, 0.4, 'glass', { emissive: 0x62eaff, emissiveIntensity: 2.2 });
  const V2 = (x, y) => new THREE.Vector2(x, y);

  for (const [ri, ro, h] of [[32, 42, 5], [56, 68, 5.5], [86, 98, 6]]) {
    put(new THREE.LatheGeometry([V2(ri, 0), V2(ro, 0), V2(ro, h), V2(ri, h), V2(ri, 0)], 128), MARBLE, 0, 0, 0);
    for (const r of [ri - 0.05, ro + 0.05])
      put(new THREE.TorusGeometry(r, 0.2, 6, 160).rotateX(Math.PI / 2), RAIL, 0, h + 0.1, 0, glow);
  }
  for (let b = 0; b < 4; b++) {
    const a = (b * Math.PI) / 2;
    for (const [from, to] of [[24, 32], [42, 56], [68, 86]]) {
      const mid = (from + to) / 2;
      put(new THREE.BoxGeometry(6, 1.1, to - from + 1), MARBLE, Math.sin(a) * mid, 4.95, Math.cos(a) * mid).rotation.y = a;
      for (const s of [-2.2, 2.2])
        put(new THREE.CylinderGeometry(0.8, 0.95, 4.4, 12), MARBLE, Math.sin(a) * mid + Math.cos(a) * s, 2.2, Math.cos(a) * mid - Math.sin(a) * s);
    }
  }
  return g;
}
