// Throwaway: triangles per mesh (grouped by geometry type and material colour) for an asset module.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
const file = process.argv[2];
const g = (await import(new URL(file, 'file://' + process.cwd() + '/').href)).default(THREE);
const rows = new Map(); let total = 0;
g.traverse((o) => {
  if (!o.isMesh) return;
  const geo = o.geometry;
  const t = (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
  const k = geo.type + ' #' + o.material.color.getHexString();
  rows.set(k, (rows.get(k) || 0) + t); total += t;
});
for (const [k, t] of [...rows].sort((a, b) => b[1] - a[1])) console.log(String(Math.round(t)).padStart(6), k);
console.log(String(Math.round(total)).padStart(6), 'TOTAL', JSON.stringify(g.userData));
