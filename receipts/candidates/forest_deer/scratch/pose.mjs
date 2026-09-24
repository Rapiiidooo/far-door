// Scratch: copy candidates into scratch/posed/<name>_<pose>.js with a pose applied after the
// module's own placement, then re-ground and re-centre so the verifier frames the pose.
//   node scratch/pose.mjs forest_deer_a.js [...]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'posed');
fs.mkdirSync(OUT, { recursive: true });

// degrees about X at each pivot: positive swings a leg back and lowers the head
const POSES = {
  stride: { frontLeft: -25, frontRight: 25, backLeft: 25, backRight: -25 },
  reach: { frontLeft: 25, frontRight: -25, backLeft: -25, backRight: 25, head: 30 },
};
const REGROUND = `
  {
    const b = new THREE.Box3(), w = new THREE.Vector3();
    g.updateMatrixWorld(true);
    g.traverse((n) => { const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
      for (let i = 0; i < p.count; i++) b.expandByPoint(w.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld)); });
    const c = b.getCenter(new THREE.Vector3());
    g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= b.min.y; o.position.z -= c.z; });
    g.updateMatrixWorld(true);
  }
`;
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const tail = '  return g;\n}\n';
  if (!src.endsWith(tail)) throw new Error(`${f} does not end with "return g;"`);
  for (const [name, pose] of Object.entries(POSES)) {
    const set = Object.entries(pose).map(([k, d]) => `  g.userData.parts.${k}.rotation.x = ${d} * Math.PI / 180;`).join('\n');
    const out = src.slice(0, -tail.length) + `\n  // ---- scratch pose: ${name} ----\n${set}\n${REGROUND}` + tail;
    const dst = path.join(OUT, f.replace(/\.js$/, `_${name}.js`));
    fs.writeFileSync(dst, out);
    console.log('wrote', path.relative(DIR, dst));
  }
}
