// reef_fish, arm A: primitives.
// A reef fish a metre long, nose to +z, resting on y = 0 by the tip of its tail fin: a deep, narrow body (a squashed
// sphere), a flat tail fin and a fin on its back (flattened four-sided cones) and two dark
// eyes. Pale silver, so the game can tint each fish of a shoal; the game's vertex shader
// beats its tail and swims it.
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
  const SCALES = mat(0xd6e2e8, 0.35, 'scales', { metalness: 0.25, flatShading: true, side: THREE.DoubleSide });
  const EYE = mat(0x101418, 0.3, 'eye');

  put(new THREE.SphereGeometry(1, 8, 6).scale(0.075, 0.17, 0.4), SCALES, 0, 0.2, 0.1);
  put(new THREE.ConeGeometry(0.2, 0.3, 4).rotateX(Math.PI / 2).scale(0.12, 1, 1), SCALES, 0, 0.2, -0.42);
  put(new THREE.ConeGeometry(0.06, 0.14, 4).scale(0.15, 1, 1.8), SCALES, 0, 0.4, 0.04);
  for (const s of [-1, 1]) put(new THREE.SphereGeometry(0.022, 6, 4), EYE, s * 0.058, 0.245, 0.36);
  return g;
}
