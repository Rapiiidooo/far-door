// Throwaway: build an asset in Node and report where named reference points land after placement.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
const [file] = process.argv.slice(2);
const g = (await import(file)).default(THREE);
g.updateMatrixWorld(true);
const box = new THREE.Box3(), v = new THREE.Vector3();
g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
  for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld)); });
// the first child is the lowest base tier / plinth in both assets: report its own centre
const first = g.children[0]; const fb = new THREE.Box3().setFromObject(first);
console.log('bbox', box.min.toArray().map((x) => x.toFixed(3)), box.max.toArray().map((x) => x.toFixed(3)));
console.log('first child centre', fb.getCenter(new THREE.Vector3()).toArray().map((x) => x.toFixed(3)));
