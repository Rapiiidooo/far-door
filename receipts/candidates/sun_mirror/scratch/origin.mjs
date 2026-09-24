// Throwaway: the offset assetlib applies on load (Box3.setFromObject, not precise) for a module.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
const g = (await import(new URL(process.argv[2], 'file://' + process.cwd() + '/').href)).default(THREE);
g.updateMatrixWorld(true);
const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3());
const f = (v) => v.toFixed(4);
console.log(process.argv[2].split('/').pop(), 'offset', f(-c.x), f(-b.min.y), f(-c.z), 'size', f(b.max.x - b.min.x), f(b.max.y - b.min.y), f(b.max.z - b.min.z), JSON.stringify(g.userData));
