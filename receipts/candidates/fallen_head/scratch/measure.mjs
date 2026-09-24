// Throwaway: bounding boxes of an asset per material, after placement. usage: node measure.mjs <asset.js>
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';
const mod = await import(process.argv[2]);
const g = mod.default(THREE);
g.updateMatrixWorld(true);
const boxes = new Map(), v = new THREE.Vector3();
g.traverse((o) => {
  if (!o.isMesh) return;
  const key = (o.material.name || '?') + ' ' + o.material.color.getHexString();
  const b = boxes.get(key) || new THREE.Box3();
  const p = o.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
  boxes.set(key, b);
});
const all = new THREE.Box3();
for (const [k, b] of boxes) { all.union(b); console.log(k.padEnd(16), 'x', b.min.x.toFixed(2), b.max.x.toFixed(2), ' y', b.min.y.toFixed(2), b.max.y.toFixed(2), ' z', b.min.z.toFixed(2), b.max.z.toFixed(2)); }
console.log('all'.padEnd(16), 'x', all.min.x.toFixed(2), all.max.x.toFixed(2), ' y', all.min.y.toFixed(2), all.max.y.toFixed(2), ' z', all.min.z.toFixed(2), all.max.z.toFixed(2));
if (g.userData && Object.keys(g.userData).length) console.log('userData', JSON.stringify(g.userData, (k, val) => (val && val.isObject3D ? `<${val.type}>` : val)));
