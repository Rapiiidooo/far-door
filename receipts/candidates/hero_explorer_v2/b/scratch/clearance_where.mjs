// Throwaway: where do flap vertices escape the belt/torso at a forward swing? node clearance_where.mjs <asset> <angle>
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
const [, , file, ang = '-1.05', abd = '0'] = process.argv;
const lerpTab = (tab, y) => { if (y <= tab[0][0]) return tab[0][1]; for (let i = 0; i < tab.length - 1; i++) { const [y0, r0] = tab[i], [y1, r1] = tab[i + 1]; if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return tab[tab.length - 1][1]; };
const BELT = [[0.966, 0.176], [0.971, 0.187], [0.984, 0.19], [1.036, 0.19], [1.048, 0.187], [1.053, 0.176]];
const TORSO = [[0.972, 0.166], [1.06, 0.168], [1.15, 0.177], [1.25, 0.19], [1.32, 0.201], [1.37, 0.213], [1.405, 0.218], [1.435, 0.212], [1.46, 0.199], [1.48, 0.185]];
const inSE = (x, z, a, b, n) => Math.abs(x / a) ** n + Math.abs(z / b) ** n;
const g = (await import(pathToFileURL(path.resolve(file)).href)).default(THREE);
const shift = new THREE.Vector3(); g.children[0].getWorldPosition(shift); shift.sub(new THREE.Vector3(0, 0.95, 0));
const J = g.userData.joints;
J.leftUpperLeg.rotation.set(+ang, 0, +abd);
g.updateMatrixWorld(true);
const restPos = [];
{ // rest positions for reference
  const g2 = (await import(pathToFileURL(path.resolve(file)).href + '?r')).default(THREE); g2.updateMatrixWorld(true);
  g2.userData.joints.leftUpperLeg.children.forEach((m) => { if (!m.isMesh || m.material.color.getHex() !== 0x2d3656) return; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) restPos.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).sub(shift)); });
}
let idx = 0;
J.leftUpperLeg.children.forEach((m) => {
  if (!m.isMesh || m.material.color.getHex() !== 0x2d3656) return;
  const p = m.geometry.attributes.position;
  for (let i = 0; i < p.count; i++, idx++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).sub(shift);
    let k = 0;
    if (v.y >= 0.968 && v.y <= 1.05) { const a = lerpTab(BELT, v.y); k = inSE(v.x, v.z, a, a * 0.713, 3); }
    else if (v.y > 1.05) { const r = lerpTab(TORSO, v.y); k = inSE(v.x, v.z, r, r * 0.62, 2.3); }
    if (k > 1) { const r0 = restPos[idx]; console.log(`posed ${v.toArray().map((c) => c.toFixed(3))}  k ${k.toFixed(3)}  rest ${r0.toArray().map((c) => c.toFixed(3))}`); }
  }
});
