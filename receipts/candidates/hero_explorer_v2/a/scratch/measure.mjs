// Throwaway: node scratch/measure.mjs <asset.js> — size, triangles per joint, pivots, grip, palms.
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';

for (const f of process.argv.slice(2)) {
  const g = (await import(pathToFileURL(path.resolve(f)).href + '?t=' + Date.now())).default(THREE);
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
    per[n.parent.name] = (per[n.parent.name] || 0) + t;
    for (let i = 0; i < p.count; i++) vb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  const f3 = (a) => a.toArray().map((x) => x.toFixed(3)).join(', ');
  const size = vb.getSize(new THREE.Vector3());
  console.log(`== ${path.basename(f)}  tris ${tris}  meshes ${meshes}  size ${f3(size)}`);
  console.log(`   box min ${f3(vb.min)} max ${f3(vb.max)}`);
  console.log('   tris per joint', JSON.stringify(per));
  for (const [k, j] of Object.entries(g.userData.joints)) {
    const w = j.getWorldPosition(new THREE.Vector3());
    console.log(`   ${k.padEnd(14)} parent ${String(j.parent && j.parent.name).padEnd(14)} world ${f3(w)} rot ${j.rotation.toArray().slice(0, 3).join(',')}`);
  }
  console.log('   grip', JSON.stringify(g.userData.grip), 'palms', JSON.stringify(g.userData.palms));
  // lowest fingertip at rest
  let low = Infinity;
  g.userData.joints.leftHand.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    for (let i = 0; i < p.count; i++) low = Math.min(low, v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).y);
  });
  console.log('   rest fingertips y', low.toFixed(3));
}
