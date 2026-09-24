// Which cloth and timber vertices sit inside the stones? Point-in-mesh by ray parity against
// every stone mesh (each closed on its own). Usage: node clash.mjs <module.js>...
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import { pathToFileURL } from 'url';
import path from 'path';

for (const f of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(path.resolve(f)).href + '?t=' + Date.now());
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const stones = [], probes = [];
  g.traverse((n) => {
    if (!n.isMesh) return;
    if (n.material.name === 'stone') { n.material = n.material.clone(); n.material.side = THREE.DoubleSide; stones.push(n); }
    else if (n.material.name === 'fabric' || n.material.name === 'timber' || n.material.name === 'ground') probes.push(n);
  });
  const rc = new THREE.Raycaster();
  const dirs = [new THREE.Vector3(1, 0.013, 0.007).normalize(), new THREE.Vector3(-0.01, 0.017, 1).normalize()];
  const inside = (p) => stones.some((s) => dirs.every((d) => { rc.set(p, d); return rc.intersectObject(s, false).length % 2 === 1; }));
  for (const n of probes) {
    const pos = n.geometry.attributes.position, v = new THREE.Vector3(), hits = [];
    const seen = new Set();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld);
      const k = v.toArray().map((x) => x.toFixed(4)).join();
      if (seen.has(k)) continue;
      seen.add(k);
      if (inside(v)) hits.push(v.clone());
    }
    if (hits.length) {
      const ys = hits.map((h) => h.y);
      console.log(`${path.basename(f)} ${n.material.name}: ${hits.length}/${seen.size} vertices inside stone, y ${Math.min(...ys).toFixed(3)}..${Math.max(...ys).toFixed(3)}`);
    } else console.log(`${path.basename(f)} ${n.material.name}: clear (${seen.size} vertices)`);
  }
}
