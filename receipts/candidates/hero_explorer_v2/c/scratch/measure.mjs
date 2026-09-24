// Throwaway: node scratch/measure.mjs <asset.js>. Size, triangles per joint and
// material, joint pivots, grip and palms, and the loader's box next to the vertex box.
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';

const f = process.argv[2];
const mod = await import(pathToFileURL(path.resolve(f)).href + '?t=' + Date.now());
const g = mod.default(THREE);
g.updateMatrixWorld(true);
const vb = new THREE.Box3(), v = new THREE.Vector3();
let tris = 0, meshes = 0;
const per = {};
g.traverse((n) => {
  if (!n.isMesh) return;
  meshes++;
  const p = n.geometry.attributes.position;
  const t = (n.geometry.index ? n.geometry.index.count : p.count) / 3;
  tris += t;
  const k = n.parent.name + ' #' + n.material.color.getHexString();
  per[k] = (per[k] || 0) + t;
  for (let i = 0; i < p.count; i++) vb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
});
const lb = new THREE.Box3().setFromObject(g);
const f3 = (a) => a.toArray().map((x) => x.toFixed(4)).join(', ');
console.log(`tris ${tris}  meshes ${meshes}`);
console.log(`vertex box min ${f3(vb.min)}  max ${f3(vb.max)}  size ${f3(vb.getSize(new THREE.Vector3()))}`);
console.log(`loader box min ${f3(lb.min)}  max ${f3(lb.max)}`);
for (const [k, t] of Object.entries(per).sort((a, b) => b[1] - a[1])) console.log('  ', k.padEnd(26), t);
const J = g.userData.joints;
for (const [k, j] of Object.entries(J)) {
  const w = j.getWorldPosition(new THREE.Vector3());
  console.log(`  ${k.padEnd(14)} ${j.type} parent ${String(j.parent.name).padEnd(13)} world ${f3(w)} rot ${j.rotation.x},${j.rotation.y},${j.rotation.z}`);
}
console.log('grip', JSON.stringify(g.userData.grip), 'palms', JSON.stringify(g.userData.palms));
// rest fingertip height and the hand's inner extent
let low = Infinity, inner = Infinity;
J.leftHand.traverse((n) => {
  const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld); low = Math.min(low, v.y); inner = Math.min(inner, v.x); }
});
console.log(`left hand: lowest y ${low.toFixed(4)}, innermost x ${inner.toFixed(4)}`);
