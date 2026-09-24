// Quick offline probe: bounds, triangles, meshes, NaNs and userData for each candidate.
// node scratch/probe.mjs [names...]   (run from the field_scroll folder)
import * as THREE from '../../../../node_modules/three/build/three.module.js';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['field_scroll_a', 'field_scroll_b', 'field_scroll_c'];
for (const n of names) {
  const url = pathToFileURL(path.join(HERE, '..', n + '.js')).href + '?t=' + Date.now();
  let g;
  try { g = (await import(url)).default(THREE); } catch (e) { console.log(n, 'FAILED', e.message); continue; }
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0, nan = 0;
  const perMat = {};
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const p = o.geometry.attributes.position;
    const t = (o.geometry.index ? o.geometry.index.count : p.count) / 3;
    tris += t;
    const key = o.material.name + ' #' + o.material.color.getHexString();
    perMat[key] = (perMat[key] || 0) + t;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (!Number.isFinite(v.x + v.y + v.z)) { nan++; continue; }
      box.expandByPoint(v.applyMatrix4(o.matrixWorld));
    }
  });
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  console.log(`${n}: ${tris} tris, ${meshes} meshes, size ${s.x.toFixed(3)} x ${s.y.toFixed(3)} x ${s.z.toFixed(3)}, ` +
    `min.y ${box.min.y.toFixed(4)}, centre ${c.x.toFixed(4)} ${c.z.toFixed(4)}${nan ? ', NaN vertices ' + nan : ''}`);
  console.log('   by material:', JSON.stringify(perMat));
  const ud = JSON.stringify(g.userData, (k, val) => (val && val.isObject3D ? `<${val.type}>` : val));
  if (ud !== '{}') console.log('   userData:', ud);
}
