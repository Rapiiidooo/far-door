import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
const g = (await import(process.argv[2])).default(THREE);
g.children.forEach((o, idx) => {
  const n = o.geometry.attributes.normal, p = o.geometry.attributes.position; if (!n) return;
  for (let i = 0; i < n.count; i++) if (Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) < 0.5)
    console.log(idx, o.geometry.type, o.material.color.getHexString(), p.count, [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(3)).join(','));
});
