// Throwaway: build a candidate in node with the game's vendored three.js and report its measurements.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';
const f = process.argv[2];
const mod = await import(f + '?t=' + Date.now());
const g = mod.default(THREE);
const box = new THREE.Box3(), v = new THREE.Vector3();
g.updateMatrixWorld(true);
let tris = 0, meshes = 0;
g.traverse((n) => { if (!n.isMesh) return; meshes++; const p = n.geometry.attributes.position; tris += (n.geometry.index ? n.geometry.index.count : p.count) / 3; for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld)); });
const s = box.getSize(new THREE.Vector3());
console.log('size', s.x.toFixed(3), s.y.toFixed(3), s.z.toFixed(3), 'min', box.min.x.toFixed(3), box.min.y.toFixed(3), box.min.z.toFixed(3), 'tris', tris, 'meshes', meshes);
const J = g.userData.joints || {};
for (const [k, j] of Object.entries(J)) { const w = new THREE.Vector3(); j.getWorldPosition(w); console.log(k.padEnd(9), j.name, w.toArray().map((x) => x.toFixed(3)).join(' ')); }
console.log('parts', Object.keys(g.userData.parts || {}).join(','));
