// Throwaway: check that every face of the rib wedge points away from its centroid.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
const g = (await import(new URL(process.argv[2], 'file://' + process.cwd() + '/').href)).default(THREE);
let bad = 0, n = 0;
g.traverse((o) => {
  if (!o.isMesh || o.geometry.type !== 'BufferGeometry') return;
  const p = o.geometry.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) c.add(new THREE.Vector3().fromBufferAttribute(p, i));
  c.divideScalar(p.count);
  for (let i = 0; i < p.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, i + 1), d = new THREE.Vector3().fromBufferAttribute(p, i + 2);
    const nrm = b.clone().sub(a).cross(d.clone().sub(a));
    const mid = a.clone().add(b).add(d).divideScalar(3);
    n++; if (nrm.dot(mid.sub(c)) <= 0) bad++;
  }
});
console.log('faces', n, 'inward', bad);
