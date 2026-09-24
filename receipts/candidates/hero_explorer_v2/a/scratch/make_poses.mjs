// Throwaway: node scratch/make_poses.mjs <asset.js> <outdir> — posed copies for the verifier,
// the pose applied at the very end and the figure re-grounded, like the first pass did.
import fs from 'fs';
import path from 'path';
import { POSES, FIRST_PASS } from './poses.mjs';
const [src, outDir] = process.argv.slice(2);
const code = fs.readFileSync(src, 'utf8');
const tail = '  return g;\n}\n';
if (!code.endsWith(tail)) throw new Error('unexpected tail');
const REGROUND = `
  // re-ground after posing so the verifier measures the pose, not the rest frame
  {
    const b = new THREE.Box3(), w = new THREE.Vector3();
    g.updateMatrixWorld(true);
    g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
      for (let i = 0; i < p.count; i++) b.expandByPoint(w.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld)); });
    const c = b.getCenter(new THREE.Vector3());
    g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= b.min.y; o.position.z -= c.z; });
  }
`;
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv.slice(4);
const SET = process.env.FIRST_PASS ? FIRST_PASS : POSES;
for (const [name, pose] of Object.entries(SET)) {
  if (only.length && !only.includes(name)) continue;
  const lines = Object.entries(pose).map(([k, r]) => `  g.userData.joints.${k}.rotation.set(${r.join(', ')});`).join('\n');
  const out = code.slice(0, -tail.length) + `\n  // ---- scratch pose: ${name} ----\n${lines}\n${REGROUND}` + tail;
  fs.writeFileSync(path.join(outDir, `posed_${name}.js`), out);
}
console.log('wrote', fs.readdirSync(outDir).filter((f) => f.endsWith('.js')).join(' '));
