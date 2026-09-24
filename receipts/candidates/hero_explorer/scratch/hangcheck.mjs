// Throwaway: which part is highest in the hang pose, and where the soles sit.
import * as THREE from 'three';
import { pathToFileURL } from 'url';
import path from 'path';
const g = (await import(pathToFileURL(path.resolve('scratch/posed_hang.js')).href)).default(THREE);
g.updateMatrixWorld(true);
const v = new THREE.Vector3();
const rows = [];
g.traverse((n) => {
  if (!n.isMesh) return;
  const p = n.geometry.attributes.position; let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); }
  rows.push([n.parent.name, n.material.color.getHexString(), lo, hi]);
});
rows.sort((a, b) => b[3] - a[3]);
for (const r of rows.slice(0, 5)) console.log('top', r[0], r[1], r[3].toFixed(4));
rows.sort((a, b) => a[2] - b[2]);
for (const r of rows.slice(0, 3)) console.log('low', r[0], r[1], r[2].toFixed(4));
console.log('grip', g.userData.grip);
