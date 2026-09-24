// Throwaway: the skirt/satchel/hand check of collide.mjs on the game's own bigger poses (hero-anim.js).
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
import { apply } from './poses.mjs';
const GAME = {
  roll: { leftUpperLeg: [-1.9, 0, 0], rightUpperLeg: [-1.8, 0, 0], leftLowerLeg: [2.2, 0, 0], rightLowerLeg: [2.1, 0, 0], leftUpperArm: [-1.4, 0, 0.3], rightUpperArm: [-1.4, 0, -0.3], leftLowerArm: [-1.6, 0, 0], rightLowerArm: [-1.6, 0, 0], spine: [0.9, 0, 0] },
  climbKnee: { leftUpperLeg: [-1.6, 0, 0], leftLowerLeg: [2.1, 0, 0], rightUpperLeg: [0.35, 0, 0], rightLowerLeg: [0.9, 0, 0], spine: [0.75, 0, 0] },
  vault: { leftUpperLeg: [-1.35, 0, 0], rightUpperLeg: [-1.1, 0, 0], leftLowerLeg: [1.7, 0, 0], rightLowerLeg: [1.5, 0, 0], spine: [0.55, 0, 0] },
  airUp: { leftUpperLeg: [-1.15, 0, 0.04], leftLowerLeg: [1.45, 0, 0], rightUpperLeg: [0.35, 0, -0.04], rightLowerLeg: [0.55, 0, 0] },
  brace: { leftUpperLeg: [-0.6, 0, 0.05], rightUpperLeg: [0.45, 0, -0.05], leftUpperArm: [-1.45, 0, 0.05], rightUpperArm: [-1.45, 0, -0.05], leftLowerArm: [-0.5, 0, 0], rightLowerArm: [-0.5, 0, 0], spine: [0.45, 0, 0] },
};
const file = pathToFileURL(path.resolve(process.argv[2])).href;
const v = new THREE.Vector3(), inv = new THREE.Matrix4();
for (const [name, pose] of Object.entries(GAME)) {
  const g = (await import(file + '?p=' + name)).default(THREE);
  apply(g, pose);
  const J = g.userData.joints, worst = {};
  const test = (label, mesh) => {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      for (const leg of ['leftUpperLeg', 'rightUpperLeg']) {
        inv.copy(J[leg].matrixWorld).invert();
        const q = v.clone().applyMatrix4(inv), t = -q.y;
        let d = 0.086 - q.length();
        if (t >= 0 && t <= 0.42) d = Math.max(d, 0.088 - (0.018 * t) / 0.42 - Math.hypot(q.x, q.z));
        const key = `${label}>${leg.replace('UpperLeg', 'Thigh')}`;
        if (d > (worst[key] ?? 0.002)) worst[key] = d;
      }
    }
  };
  for (const m of J.hips.children) if (m.isMesh && m.material.color.getHex() !== 0xcdbf9f) test(m.material.side === THREE.DoubleSide ? 'skirt' : 'belt/satchel', m);
  for (const h of ['leftHand', 'rightHand']) for (const m of J[h].children) if (m.isMesh) test(h, m);
  console.log(name.padEnd(10), Object.entries(worst).map(([k, d]) => `${k} ${(d * 100).toFixed(1)}cm`).join(' | ') || 'clear');
}
