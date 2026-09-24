// Scratch: build each candidate in Node with the game's three (r186) and print its size,
// triangles per mesh, degenerate triangles, bad normals and the spread of the base.
// usage: node stats.mjs meadow_grass_a.js meadow_grass_b.js ...
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import path from 'path';
const DIR = '/Users/rapido/perso/bittensor/404/far-door/receipts/candidates/meadow_grass';
for (const f of process.argv.slice(2)) {
  const file = path.isAbsolute(f) ? f : path.join(DIR, f);
  const g = (await import(file + '?v=' + Date.now())).default(THREE);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, degen = 0, badN = 0, meshes = 0, base = 0;
  const lines = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const geo = o.geometry, p = geo.attributes.position, n = geo.attributes.normal;
    const idx = geo.index;
    const T = (idx ? idx.count : p.count) / 3;
    tris += T;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      box.expandByPoint(v);
      if (v.y < 0.002) base = Math.max(base, Math.hypot(v.x, v.z));
      if (n) { const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i)); if (!(Math.abs(l - 1) < 0.02)) badN++; }
    }
    for (let t = 0; t < T; t++) {
      const ia = idx ? idx.getX(3 * t) : 3 * t, ib = idx ? idx.getX(3 * t + 1) : 3 * t + 1, ic = idx ? idx.getX(3 * t + 2) : 3 * t + 2;
      a.fromBufferAttribute(p, ia); b.fromBufferAttribute(p, ib); c.fromBufferAttribute(p, ic);
      if (b.clone().sub(a).cross(c.clone().sub(a)).length() < 1e-9) degen++;
    }
    lines.push(`${o.name || '?'}:${o.material.name}/${o.material.color.getHexString()}/${o.material.side === THREE.DoubleSide ? 'double' : 'single'} ${T} tris`);
  });
  const s = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  console.log(`${path.basename(file)}: ${tris} tris, ${meshes} meshes, ${s.x.toFixed(3)} x ${s.y.toFixed(3)} x ${s.z.toFixed(3)} m, min y ${box.min.y.toFixed(4)}, centre ${ctr.x.toFixed(3)},${ctr.z.toFixed(3)}, base radius ${base.toFixed(3)}, degenerate ${degen}, bad normals ${badN}`);
  for (const l of lines) console.log('   ', l);
}
