// Throwaway: bounding box of each child mesh of an asset after placement, in order.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';
const g = (await import(process.argv[2])).default(THREE);
g.updateMatrixWorld(true);
const v = new THREE.Vector3();
g.children.forEach((o, i) => {
  if (!o.isMesh) return;
  const b = new THREE.Box3(), p = o.geometry.attributes.position;
  for (let k = 0; k < p.count; k++) b.expandByPoint(v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld));
  console.log(String(i).padStart(2), o.material.color.getHexString(), 'x', b.min.x.toFixed(2), b.max.x.toFixed(2), ' y', b.min.y.toFixed(2), b.max.y.toFixed(2), ' z', b.min.z.toFixed(2), b.max.z.toFixed(2));
});
