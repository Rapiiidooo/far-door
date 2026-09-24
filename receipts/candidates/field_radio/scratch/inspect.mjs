// Throwaway: builds each candidate in Node with the game's vendored three.js (r186) and
// prints triangles, meshes, vertex-measured size, base and centre offsets, triangles per
// material, and any mesh without a uv attribute or with non-finite positions.
// usage: node inspect.mjs <asset.js>...
import path from 'path';
import { pathToFileURL } from 'url';
const THREE = await import(pathToFileURL('/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js').href);
for (const f of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(path.resolve(f)).href + '?t=' + Date.now());
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  let tris = 0, meshes = 0;
  const perMat = new Map(), noUv = [], bad = [];
  const box = new THREE.Box3(), v = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const geo = o.geometry, p = geo.attributes.position;
    const t = (geo.index ? geo.index.count : p.count) / 3;
    tris += t;
    const k = `${o.material.name}#${o.material.color.getHexString()}/${o.material.roughness}`;
    perMat.set(k, (perMat.get(k) || 0) + t);
    if (!geo.attributes.uv) noUv.push(o.name || geo.type);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (!Number.isFinite(v.x + v.y + v.z)) { bad.push(o.name || geo.type); break; }
      box.expandByPoint(v.applyMatrix4(o.matrixWorld));
    }
  });
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  console.log(path.basename(f), JSON.stringify({
    tris, meshes, size: size.toArray().map((x) => +x.toFixed(3)),
    minY: +box.min.y.toFixed(4), centre: [+ctr.x.toFixed(4), +ctr.z.toFixed(4)],
    box: [box.min.toArray().map((x) => +x.toFixed(3)), box.max.toArray().map((x) => +x.toFixed(3))],
    userData: Object.keys(g.userData),
  }));
  for (const [k, t] of [...perMat].sort((a, b) => b[1] - a[1])) console.log('   ', String(t).padStart(5), k);
  if (noUv.length) console.log('    no uv:', noUv.join(', '));
  if (bad.length) console.log('    NON-FINITE:', bad.join(', '));
}
