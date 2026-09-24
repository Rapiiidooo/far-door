// Throwaway: max horizontal radius of B's canvas head mesh (cap) per height band at the back.
import * as THREE from 'three';
import { pathToFileURL } from 'url';
import path from 'path';
const g = (await import(pathToFileURL(path.resolve('hero_explorer_b.js')).href)).default(THREE);
g.updateMatrixWorld(true);
const head = g.userData.joints.head, hp = head.getWorldPosition(new THREE.Vector3());
const v = new THREE.Vector3();
for (const m of head.children) {
  const hex = m.material.color.getHexString();
  if (!['cdbf9f', '4b2e1e'].includes(hex)) continue;
  const p = m.geometry.attributes.position, bands = {};
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
    if (v.z > -0.05 + hp.z) continue; // back half only
    const b = (Math.floor(v.y * 200) / 200).toFixed(3);
    const r = Math.hypot(v.x - hp.x, v.z - hp.z - 0.004);
    bands[b] = Math.max(bands[b] || 0, r);
  }
  console.log(hex, Object.entries(bands).filter(([y]) => y >= 1.58 && y <= 1.66).map(([y, r]) => `${y}:${r.toFixed(4)}`).join(' '));
}
