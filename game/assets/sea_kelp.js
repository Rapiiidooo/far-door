// sea_kelp, arm A: profiles.
// A frond of giant kelp a metre tall, rooted at y = 0: three ribbons crossed at sixty degrees,
// each a metre wide at the holdfast and narrowing to a third of that at the tip, in twenty
// segments so the game's vertex shader can sway it smoothly in the current. The game stretches it to 10 to 24 m.
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
  const KELP = mat(0x5b8a3c, 0.8, 'foliage', { side: THREE.DoubleSide, emissive: 0x0e2a10, emissiveIntensity: 0.6 });
  const ribbon = (turn) => {
    const geo = new THREE.PlaneGeometry(1, 1, 2, 20).translate(0, 0.5, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - 0.65 * p.getY(i)));
    geo.computeVertexNormals();
    return geo.rotateY(turn);
  };
  for (let i = 0; i < 3; i++) put(ribbon((i * Math.PI) / 3), KELP, 0, 0, 0);
  return g;
}
