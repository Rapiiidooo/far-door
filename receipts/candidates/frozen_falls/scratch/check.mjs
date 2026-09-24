// Scratch only: build each candidate with the game's own three.js (r186) and measure it.
//   node scratch/check.mjs
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
console.log('three', THREE.REVISION);
for (const n of ['a', 'b', 'c']) {
  const g = (await import(path.join(DIR, `frozen_falls_${n}.js`))).default(THREE);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, nan = 0, meshes = 0;
  const zs = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const p = o.geometry.attributes.position;
    tris += (o.geometry.index ? o.geometry.index.count : p.count) / 3;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      if (!Number.isFinite(v.x + v.y + v.z)) { nan++; continue; }
      box.expandByPoint(v);
      zs.push(v.z);
    }
  });
  const s = box.getSize(new THREE.Vector3());
  const back = box.min.z;
  // how many vertices lie on the back plane, and whether any part pokes behind it
  const onBack = zs.filter((z) => Math.abs(z - back) < 0.002).length;
  const mats = new Set();
  g.traverse((o) => o.isMesh && mats.add(`${o.material.color.getHexString()}${o.material.name ? ':' + o.material.name : ''}`));
  console.log(`${n}: ${tris} tris, ${meshes} meshes, size ${s.x.toFixed(3)} x ${s.y.toFixed(3)} x ${s.z.toFixed(3)}, ` +
    `min ${box.min.x.toFixed(3)},${box.min.y.toFixed(3)},${box.min.z.toFixed(3)} max ${box.max.x.toFixed(3)},${box.max.y.toFixed(3)},${box.max.z.toFixed(3)}, ` +
    `on back plane ${onBack}, NaN ${nan}, materials ${[...mats].join(' ')}, userData ${JSON.stringify(g.userData)}`);
}
