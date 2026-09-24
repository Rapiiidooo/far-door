// Throwaway: node scratch/collide.mjs <asset.js> — for each pose, how far skirt, belt, satchel
// and hand vertices sink into the thigh tubes (the leg geometry is a tapered tube hip->knee
// of radius 0.088->0.07 plus a 0.086 ball at the hip), and whether hands reach the shins.
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
import { POSES, apply } from './poses.mjs';
const file = pathToFileURL(path.resolve(process.argv[2])).href;
const v = new THREE.Vector3(), inv = new THREE.Matrix4();
// depth of point p (world) inside the thigh of joint j; <= 0 means outside
const thighDepth = (j, p) => {
  inv.copy(j.matrixWorld).invert();
  const q = p.clone().applyMatrix4(inv);
  const t = -q.y, rr = Math.hypot(q.x, q.z);
  let d = 0.086 - q.length();
  if (t >= 0 && t <= 0.42) d = Math.max(d, 0.088 - (0.018 * t) / 0.42 - rr);
  return d;
};
for (const [name, pose] of Object.entries({ rest: {}, ...POSES })) {
  const g = (await import(file + '?p=' + name)).default(THREE);
  apply(g, pose);
  const J = g.userData.joints;
  const worst = {};
  const test = (label, mesh) => {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      for (const leg of ['leftUpperLeg', 'rightUpperLeg']) {
        const d = thighDepth(J[leg], v);
        const key = `${label}>${leg.replace('UpperLeg', 'Thigh')}`;
        if (d > (worst[key]?.d ?? 0.002)) worst[key] = { d, at: v.toArray().map((x) => +x.toFixed(3)) };
      }
    }
  };
  for (const m of J.hips.children) {
    if (!m.isMesh || m.material.color.getHex() === 0xcdbf9f) continue;
    test(m.material.side === THREE.DoubleSide ? 'skirt' : 'hips#' + m.material.color.getHexString(), m);
  }
  for (const h of ['leftHand', 'rightHand']) for (const m of J[h].children) if (m.isMesh) test(h, m);
  const rows = Object.entries(worst).map(([k, w]) => `${k} ${(w.d * 100).toFixed(1)}cm @${w.at}`);
  console.log(name.padEnd(13), rows.length ? rows.join(' | ') : 'clear');
}
