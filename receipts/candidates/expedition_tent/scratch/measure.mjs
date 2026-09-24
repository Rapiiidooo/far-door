// Throwaway: build an asset in Node with the game's three and print where its parts
// ended up after the placement shift. usage: node measure.mjs <asset.js>
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';
const file = process.argv[2];
const mod = await import(file);
const g = mod.default(THREE);
g.updateMatrixWorld(true);
const r3 = (x) => Math.round(x * 1000) / 1000;
const all = new THREE.Box3(), v = new THREE.Vector3();
const boxOf = (o) => {
  const b = new THREE.Box3();
  o.updateMatrixWorld(true);
  o.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  return b;
};
all.copy(boxOf(g));
let tris = 0;
g.traverse((n) => { if (n.isMesh) tris += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; });
console.log('bounds min', [all.min.x, all.min.y, all.min.z].map(r3), 'max', [all.max.x, all.max.y, all.max.z].map(r3), 'tris', tris);
console.log('shift of first child', [g.children[0].position.x, g.children[0].position.y, g.children[0].position.z].map(r3));
g.children.forEach((c, i) => {
  if (c.isGroup) {
    const b = boxOf(c);
    console.log(`group ${i}`, 'min', [b.min.x, b.min.z].map(r3), 'max', [b.max.x, b.max.z].map(r3), 'top', r3(b.max.y));
  }
});
