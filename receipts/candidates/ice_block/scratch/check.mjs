// Throwaway: what the four-sided sheet cannot show. The base seen from below, facets
// wound inwards (seen from outside with double-sided materials), degenerate triangles, and
// the triangle count per material colour.
//   node scratch/check.mjs ice_block_a.js ice_block_b.js ice_block_c.js
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';

for (const file of process.argv.slice(2)) {
  const g = (await import(new URL(file, 'file://' + process.cwd() + '/').href)).default(THREE);
  g.updateMatrixWorld(true);
  const meshes = [];
  const perColour = new Map();
  let degenerate = 0, total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes.push(o);
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    const n = (idx ? idx.count : pos.count) / 3;
    total += n;
    const k = '#' + o.material.color.getHexString();
    perColour.set(k, (perColour.get(k) || 0) + n);
    for (let t = 0; t < n; t++) {
      const i0 = idx ? idx.getX(3 * t) : 3 * t, i1 = idx ? idx.getX(3 * t + 1) : 3 * t + 1, i2 = idx ? idx.getX(3 * t + 2) : 3 * t + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      if (new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() < 1e-7) degenerate++;
    }
  });
  const box = new THREE.Box3().setFromObject(g);

  // Double-sided for the tests, so a facet wound the wrong way is still hit, from its back.
  meshes.forEach((m) => { m.material = m.material.clone(); m.material.side = THREE.DoubleSide; });
  const ray = new THREE.Raycaster();

  // The base from below: over the footprint inside the bevel, the first thing hit must be y = 0.
  let baseMin = Infinity, baseMax = -Infinity, baseMiss = 0, samples = 0;
  for (let x = -0.84; x <= 0.84; x += 0.06) {
    for (let z = -0.84; z <= 0.84; z += 0.06) {
      ray.set(new THREE.Vector3(x, -1, z), new THREE.Vector3(0, 1, 0));
      const hit = ray.intersectObjects(meshes, false)[0];
      samples++;
      if (!hit) { baseMiss++; continue; }
      baseMin = Math.min(baseMin, hit.point.y); baseMax = Math.max(baseMax, hit.point.y);
    }
  }

  // Inward-wound facets: rays from every side towards the middle; the first facet hit must face the ray.
  let inverted = 0, shots = 0;
  const mid = box.getCenter(new THREE.Vector3());
  const nm = new THREE.Matrix3();
  for (let i = 0; i < 4000; i++) {
    const d = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    if (d.y < -0.2) continue; // the base is checked above
    const target = mid.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6));
    ray.set(target.clone().addScaledVector(d, 5), d.clone().negate());
    const hit = ray.intersectObjects(meshes, false)[0];
    if (!hit) continue;
    shots++;
    nm.getNormalMatrix(hit.object.matrixWorld);
    const fn = hit.face.normal.clone().applyMatrix3(nm).normalize();
    if (fn.dot(ray.ray.direction) > 1e-3) inverted++;
  }

  console.log(`${file}: ${total} tris, ${meshes.length} meshes, box ${box.min.toArray().map((v) => v.toFixed(3))} .. ${box.max.toArray().map((v) => v.toFixed(3))}`);
  console.log(`  base from below: y ${baseMin.toFixed(4)} .. ${baseMax.toFixed(4)} over ${samples} points, ${baseMiss} misses`);
  console.log(`  facets seen from their back: ${inverted} of ${shots} hits; degenerate triangles: ${degenerate}`);
  console.log(`  per colour: ${[...perColour].map(([k, n]) => `${k} ${n}`).join(', ')}; userData ${JSON.stringify(g.userData)}`);
}
