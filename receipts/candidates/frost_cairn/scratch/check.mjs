// Quick node-side check of the candidates: triangles, meshes, vertex bounds, materials, NaNs.
// Usage: node check.mjs <module.js>...
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import { pathToFileURL } from 'url';
import path from 'path';

for (const f of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(path.resolve(f)).href + '?t=' + Date.now());
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0, nan = 0;
  const mats = new Map(), boxes = new Map();
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const geo = n.geometry, p = geo.attributes.position;
    tris += (geo.index ? geo.index.count : p.count) / 3;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (!Number.isFinite(v.x + v.y + v.z)) nan++;
      box.expandByPoint(v.applyMatrix4(n.matrixWorld));
    }
    const m = n.material;
    const key = `${m.name || '?'}#${m.color.getHexString()}${m.side === THREE.DoubleSide ? ' 2s' : ''}${m.emissive && m.emissive.getHex() ? ' em' : ''}`;
    mats.set(key, (mats.get(key) || 0) + (geo.index ? geo.index.count : p.count) / 3);
    const mb = boxes.get(key) || new THREE.Box3();
    for (let i = 0; i < p.count; i++) mb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
    boxes.set(key, mb);
  });
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  console.log(`${path.basename(f)}: ${tris} tris, ${meshes} meshes, size ${s.x.toFixed(3)} x ${s.y.toFixed(3)} x ${s.z.toFixed(3)}, ` +
    `min.y ${box.min.y.toFixed(3)}, centre ${c.x.toFixed(3)}, ${c.z.toFixed(3)}${nan ? `, NaN ${nan}` : ''}`);
  for (const [k, t] of mats) { const b = boxes.get(k); console.log(`   ${k}: ${t} tris, y ${(b.min.y - box.min.y).toFixed(3)}..${(b.max.y - box.min.y).toFixed(3)}, x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)}, z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`); }
  const ud = JSON.stringify(g.userData, (k, val) => (val && val.isObject3D ? `<${val.type} ${val.name || ''}>` : val));
  if (ud !== '{}') console.log('   userData', ud);
}
