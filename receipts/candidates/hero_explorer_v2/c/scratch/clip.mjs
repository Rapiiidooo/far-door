// Throwaway: node scratch/clip.mjs [pose ...]. Counts hand vertices inside a thigh,
// and thigh vertices that stand outside the jacket skirt, for named poses.
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
const POSES = {
  rest: {},
  idle: { leftUpperArm: [0, 0, 0.05], rightUpperArm: [0, 0, -0.05], leftUpperLeg: [0, 0, 0.105], rightUpperLeg: [0, 0, -0.105] },
  run: { leftUpperLeg: [-1.0], leftLowerLeg: [1.2], rightUpperLeg: [0.6], rightLowerLeg: [0.3],
    leftUpperArm: [0.6], leftLowerArm: [-1.4], rightUpperArm: [-0.7], rightLowerArm: [-0.4] },
  runm: { rightUpperLeg: [-1.0], rightLowerLeg: [1.2], leftUpperLeg: [0.6], leftLowerLeg: [0.3],
    rightUpperArm: [0.6], rightLowerArm: [-1.4], leftUpperArm: [-0.7], leftLowerArm: [-0.4] },
  flex: { leftHand: [0.6, 0, 0.4], rightHand: [0.6, 0, 0.4] },
  flexneg: { leftHand: [0.6, 0, -0.4], rightHand: [0.6, 0, -0.4] },
  thighs: { leftUpperLeg: [-1.047], rightUpperLeg: [0.611] },
  thighsm: { rightUpperLeg: [-1.047], leftUpperLeg: [0.611] },
};
const mod = await import(pathToFileURL(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../hero_explorer_c.js')).href);
// thigh prism rings from the module: [y, w, d, c] around x = +-0.1
const RINGS = [[0.5, 0.145, 0.145, 0.043], [0.62, 0.172, 0.166, 0.05], [0.82, 0.186, 0.18, 0.055], [0.935, 0.168, 0.168, 0.05]];
const insideThigh = (p) => { // p in the thigh's rest frame, relative to its axis
  if (p.y < RINGS[0][0] || p.y > RINGS[RINGS.length - 1][0]) return -1;
  let k = 0; while (p.y > RINGS[k + 1][0]) k++;
  const [y0, w0, d0, c0] = RINGS[k], [y1, w1, d1, c1] = RINGS[k + 1], f = (p.y - y0) / (y1 - y0);
  const w = w0 + (w1 - w0) * f, d = d0 + (d1 - d0) * f, c = c0 + (c1 - c0) * f;
  const ax = Math.abs(p.x), az = Math.abs(p.z);
  // positive depth = inside by that much
  return Math.min(w / 2 - ax, d / 2 - az, (w / 2 + d / 2 - c - ax - az) / Math.SQRT2);
};
const v = new THREE.Vector3(), ray = new THREE.Raycaster();
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(POSES)) {
  const g = mod.default(THREE);
  const J = g.userData.joints;
  for (const [k, r] of Object.entries(POSES[name])) J[k].rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);
  g.updateMatrixWorld(true);
  const verts = (j, filter = () => true) => { const out = []; j.traverse((n) => { if (!n.isMesh || !filter(n)) return;
    const p = n.geometry.attributes.position; for (let i = 0; i < p.count; i++) out.push(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld).clone()); }); return out; };
  let report = [];
  for (const [hand, s0] of [['leftHand', 1], ['rightHand', -1]]) {
    for (const [leg, s] of [['leftUpperLeg', 1], ['rightUpperLeg', -1]]) {
      const inv = new THREE.Matrix4().copy(J[leg].matrixWorld).invert();
      const legPivot = J[leg].getWorldPosition(new THREE.Vector3());
      let worst = -1, n = 0, near = Infinity;
      for (const p of verts(J[hand])) {
        // back to the leg's rest frame, then relative to its axis at x = +-0.1 (rest pivot y 0.92)
        const q = p.clone().applyMatrix4(inv); q.y += 0.92; // joint-local y 0 is the hip pivot at 0.92
        const depth = insideThigh(q);
        if (depth > 0) { n++; worst = Math.max(worst, depth); }
        else if (depth > -1 && q.y > 0.5 && q.y < 0.935) near = Math.min(near, -depth);
      }
      if (n) report.push(`${hand} in ${leg}: ${n} verts, ${(worst * 1000).toFixed(1)} mm deep`);
      else if (near < 0.05 && hand[0] === leg[0]) report.push(`${hand} ${(near * 1000).toFixed(0)} mm from ${leg}`);
    }
  }
  // thigh vertices outside the skirt: cast from the hips' vertical axis outward
  const skirt = J.hips.children.find((m) => m.isMesh && m.material.side === THREE.DoubleSide);
  for (const leg of ['leftUpperLeg', 'rightUpperLeg']) {
    let n = 0, worst = 0;
    for (const p of verts(J[leg])) {
      const hipsAxis = J.hips.localToWorld(new THREE.Vector3(0, p.y - J.hips.getWorldPosition(new THREE.Vector3()).y, -0.012));
      hipsAxis.y = p.y;
      const dir = p.clone().sub(hipsAxis); const dist = dir.length(); if (dist < 1e-6) continue; dir.normalize();
      ray.set(hipsAxis, dir); ray.far = dist;
      const hit = ray.intersectObject(skirt, false)[0];
      if (hit) { n++; worst = Math.max(worst, dist - hit.distance); if (process.env.WHERE) console.log("   ", leg, p.toArray().map((x) => x.toFixed(3)).join(","), "hit", hit.point.toArray().map((x) => x.toFixed(3)).join(",")); }
    }
    if (n) report.push(`${leg} outside skirt: ${n} verts, ${(worst * 1000).toFixed(1)} mm out`);
  }
  console.log(name.padEnd(8), report.length ? report.join(' | ') : 'clean');
}
