// Throwaway check: node measure.mjs <asset.js> [...]
// Prints size, triangles, meshes, joint pivots, grip, and the loader's
// setFromObject box next to the vertex box (they must agree for {height}).
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';

for (const f of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(path.resolve(f)).href + '?t=' + Date.now());
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const vb = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0;
  const mats = new Set();
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    mats.add(n.material);
    const p = n.geometry.attributes.position;
    tris += (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    for (let i = 0; i < p.count; i++) vb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  const lb = new THREE.Box3().setFromObject(g);
  const f3 = (a) => a.toArray().map((x) => x.toFixed(4)).join(', ');
  console.log(`== ${path.basename(f)}  tris ${tris}  meshes ${meshes}  materials ${mats.size}`);
  console.log(`vertex box min ${f3(vb.min)}  max ${f3(vb.max)}`);
  console.log(`loader box min ${f3(lb.min)}  max ${f3(lb.max)}`);
  const J = g.userData.joints || {};
  for (const [k, j] of Object.entries(J)) {
    const w = j.getWorldPosition(new THREE.Vector3());
    const r = j.rotation;
    console.log(`  ${k.padEnd(14)} ${j.type.padEnd(6)} parent ${String(j.parent && j.parent.name).padEnd(14)} world ${f3(w)}  rot ${[r.x, r.y, r.z].join(',')}`);
  }
  console.log('  grip', JSON.stringify(g.userData.grip));
  // grip at a true vertical, for comparison
  for (const a of [-2.9, -Math.PI]) {
    J.leftUpperArm.rotation.x = a; J.rightUpperArm.rotation.x = a;
    g.updateMatrixWorld(true);
    let top = -Infinity;
    for (const k of ['leftLowerArm', 'rightLowerArm']) J[k].traverse((n) => {
      const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
      for (let i = 0; i < p.count; i++) top = Math.max(top, v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).y);
    });
    console.log(`  fingertips at upperArm.x = ${a.toFixed(3)}: ${top.toFixed(4)}`);
  }
  J.leftUpperArm.rotation.x = 0; J.rightUpperArm.rotation.x = 0;
  // rest fingertip height
  g.updateMatrixWorld(true);
  let low = Infinity;
  J.leftLowerArm.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    for (let i = 0; i < p.count; i++) low = Math.min(low, v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).y);
  });
  console.log(`  rest fingertips y ${low.toFixed(4)}`);
}
