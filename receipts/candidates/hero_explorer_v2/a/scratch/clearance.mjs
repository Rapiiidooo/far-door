// Throwaway: closest approach (cm) of each hand to its own thigh tube, per pose; negative = inside.
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
import { POSES, apply } from './poses.mjs';
const file = pathToFileURL(path.resolve(process.argv[2])).href;
const extra = { handflexmirror: { leftHand: [0.6, 0, -0.4], rightHand: [0.6, 0, -0.4] }, idle: { leftUpperArm: [0, 0, 0.05], rightUpperArm: [0, 0, -0.05], leftLowerArm: [-0.12, 0, 0], rightLowerArm: [-0.12, 0, 0] } };
const v = new THREE.Vector3(), inv = new THREE.Matrix4();
for (const [name, pose] of Object.entries({ rest: {}, ...extra, handflex: POSES.handflex, run: POSES.run, runmirror: POSES.runmirror })) {
  const g = (await import(file + '?p=' + name)).default(THREE);
  apply(g, pose);
  const J = g.userData.joints, out = [];
  for (const side of ['left', 'right']) {
    inv.copy(J[side + 'UpperLeg'].matrixWorld).invert();
    let best = Infinity;
    J[side + 'Hand'].traverse((m) => {
      if (!m.isMesh) return;
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const q = v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        const t = Math.min(0.42, Math.max(0, -q.y));
        const d = Math.hypot(q.x, q.z, -q.y - t) - (0.088 - (0.018 * t) / 0.42);
        best = Math.min(best, d);
      }
    });
    out.push(`${side} ${(best * 100).toFixed(1)}`);
  }
  console.log(name.padEnd(15), out.join('  '));
}
