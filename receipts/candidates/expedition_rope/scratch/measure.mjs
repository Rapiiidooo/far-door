// Throwaway: build candidates in Node with the game's three (r186) and print what the
// verifier cannot: exact bounds, triangles per material, userData, and whether every
// mesh carries an identity transform (so the loader's Box3 re-origin is exact).
// usage: node measure.mjs <asset.js> [...]
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';
import path from 'path';

const r3 = (x) => Math.round(x * 1000) / 1000;
for (const file of process.argv.slice(2)) {
  const mod = await import(path.resolve(file) + '?t=' + Date.now());
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0, rotated = 0;
  const perMat = new Map();
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const p = n.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
    const t = (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    tris += t;
    const k = `${n.material.name}#${n.material.color.getHexString()}`;
    perMat.set(k, (perMat.get(k) || 0) + t);
    const q = new THREE.Quaternion(), s = new THREE.Vector3(), pp = new THREE.Vector3();
    n.matrixWorld.decompose(pp, q, s);
    if (Math.abs(q.w) < 0.99999 || Math.abs(s.x - 1) + Math.abs(s.y - 1) + Math.abs(s.z - 1) > 1e-6) rotated++;
    if (!n.geometry.attributes.uv) console.log('  no uv on', n.material.name);
    if (!n.geometry.attributes.normal) console.log('  no normal on', n.material.name);
  });
  const loader = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  console.log(path.basename(file));
  console.log('  size', [size.x, size.y, size.z].map(r3), 'min y', r3(box.min.y), 'centre xz', [r3(c.x), r3(c.z)]);
  console.log('  loader box min', [loader.min.x, loader.min.y, loader.min.z].map(r3), 'max', [loader.max.x, loader.max.y, loader.max.z].map(r3));
  console.log('  tris', tris, 'meshes', meshes, 'rotated/scaled meshes', rotated);
  console.log('  per material', Object.fromEntries([...perMat].map(([k, t]) => [k, t])));
  console.log('  userData', JSON.stringify(g.userData));
}
