// Throwaway: world-space z range of each mesh, grouped by geometry type.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
const g = (await import(new URL(process.argv[2], 'file://' + process.cwd() + '/').href)).default(THREE);
g.updateMatrixWorld(true);
const v = new THREE.Vector3();
g.traverse((o) => {
  if (!o.isMesh) return;
  const b = new THREE.Box3(); const p = o.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
  if (b.max.y > 1.0) console.log(o.geometry.type.padEnd(16), '#' + o.material.color.getHexString(), 'z', b.min.z.toFixed(3), b.max.z.toFixed(3), 'y', b.min.y.toFixed(3), b.max.y.toFixed(3));
});
