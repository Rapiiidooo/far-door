// Throwaway: count hand vertices inside the thighs, shins or torso for each pose. node handhits.mjs <asset>
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
const url = pathToFileURL(path.resolve(process.argv[2])).href;
const lerp = (tab, y) => { if (y < tab[0][0] || y > tab[tab.length - 1][0]) return -1; for (let i = 0; i < tab.length - 1; i++) { const [y0, r0] = tab[i], [y1, r1] = tab[i + 1]; if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return -1; };
const THIGH = [[0.5, 0.07], [0.55, 0.074], [0.7, 0.083], [0.83, 0.089], [0.9, 0.087], [0.945, 0.06]];   // world y, radius (first pass)
const SHIN = [[0.1, 0.066], [0.3, 0.075], [0.345, 0.079], [0.4, 0.069], [0.5, 0.071]];
const TORSO = [[0.972, 0.166], [1.06, 0.168], [1.15, 0.177], [1.25, 0.19], [1.32, 0.201], [1.37, 0.213], [1.405, 0.218], [1.435, 0.212], [1.46, 0.199], [1.48, 0.185], [1.495, 0.17], [1.508, 0.148]];
const band = (y, a, b) => Math.min(1, Math.max(0, (y - a) / (b - a)));
const torsoN = (y) => 2.25 + 0.55 * band(y, 1.15, 1.34) - 0.55 * band(y, 1.445, 1.48);
const POSES = {
  rest: {}, flex: { leftHand: [0.6, 0, 0.4], rightHand: [0.6, 0, 0.4] }, flexm: { leftHand: [0.6, 0, -0.4], rightHand: [0.6, 0, -0.4] },
  run: { leftUpperArm: [0.6], leftLowerArm: [-1.4], rightUpperArm: [-0.7], rightLowerArm: [-0.4], leftUpperLeg: [-1.0], leftLowerLeg: [1.2], rightUpperLeg: [0.6], rightLowerLeg: [0.3] },
  runb: { rightUpperArm: [0.6], rightLowerArm: [-1.4], leftUpperArm: [-0.7], leftLowerArm: [-0.4], rightUpperLeg: [-1.0], rightLowerLeg: [1.2], leftUpperLeg: [0.6], leftLowerLeg: [0.3] },
  gamerun: { leftUpperArm: [0.7, 0, 0.14], leftLowerArm: [-1.48], rightUpperArm: [-0.7, 0, -0.14], rightLowerArm: [-1.48], leftUpperLeg: [-0.8, 0, 0.02], leftLowerLeg: [0.5], rightUpperLeg: [0.8, 0, -0.02], rightLowerLeg: [1.6] },
  elbow: { leftLowerArm: [-2.27], rightLowerArm: [-2.27] },
  idle: { leftUpperArm: [0, 0, 0.05], rightUpperArm: [0, 0, -0.05], leftLowerArm: [-0.12], rightLowerArm: [-0.12], leftUpperLeg: [0, 0, 0.1], rightUpperLeg: [0, 0, -0.1] },
  turn: { leftUpperArm: [-1.05, 0, 0.18], rightUpperArm: [-1.05, 0, -0.18], leftLowerArm: [-1.0], rightLowerArm: [-1.0], spine: [0.28] },
  roll: { leftUpperLeg: [-1.9], rightUpperLeg: [-1.8], leftLowerLeg: [2.2], rightLowerLeg: [2.1], leftUpperArm: [-1.4, 0, 0.3], rightUpperArm: [-1.4, 0, -0.3], leftLowerArm: [-1.6], rightLowerArm: [-1.6], spine: [0.9] },
};
for (const [name, pose] of Object.entries(POSES)) {
  const g = (await import(url + '?' + name)).default(THREE);
  const shift = new THREE.Vector3(); g.children[0].getWorldPosition(shift); shift.sub(new THREE.Vector3(0, 0.95, 0));
  const J = g.userData.joints;
  for (const [k, r] of Object.entries(pose)) J[k].rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);
  g.updateMatrixWorld(true);
  const inv = {}; for (const k of ['leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'spine']) inv[k] = J[k].matrixWorld.clone().invert();
  const rest = { leftUpperLeg: [0.1, 0.92], rightUpperLeg: [-0.1, 0.92], leftLowerLeg: [0.1, 0.5], rightLowerLeg: [-0.1, 0.5] };
  const hits = { thigh: 0, shin: 0, torso: 0 }; let total = 0;
  for (const h of ['leftHand', 'rightHand']) J[h].traverse((m) => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      total++;
      const w = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      for (const leg of ['leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg']) {
        const l = w.clone().applyMatrix4(inv[leg]);   // joint-local: axis is local Y through the pivot
        const y = l.y + rest[leg][1], r = lerp(leg.includes('Upper') ? THIGH : SHIN, y);
        if (r > 0 && Math.hypot(l.x, l.z) < r) hits[leg.includes('Upper') ? 'thigh' : 'shin']++;
      }
      const t = w.clone().applyMatrix4(inv.spine); const y = t.y + 1.05, r = lerp(TORSO, y);
      if (r > 0 && Math.abs(t.x / r) ** torsoN(y) + Math.abs(t.z / (0.62 * r)) ** torsoN(y) < 1) hits.torso++;
    }
  });
  console.log(name.padEnd(8), `hand vertices ${total}: inside thigh ${hits.thigh}, shin ${hits.shin}, torso ${hits.torso}`);
}
