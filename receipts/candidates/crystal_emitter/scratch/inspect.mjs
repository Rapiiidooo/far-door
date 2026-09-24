// Throwaway: numbers for an asset module under node three 0.186.
// usage: node inspect.mjs <asset.js>...
// Prints triangles per material, vertex bounds, the loader's setFromObject box
// (must match, or the loader re-origins the asset and shifts every plain point),
// parts and plain data, and for an emitter the clearance crystal to everything else.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import path from 'path';

const tri = new THREE.Triangle(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
const v = new THREE.Vector3(), q = new THREE.Vector3();

function worldTris(mesh) {
  const geo = mesh.geometry, p = geo.attributes.position, idx = geo.index;
  const n = idx ? idx.count : p.count, out = [];
  for (let i = 0; i < n; i += 3) {
    const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
    out.push([ia, ib, ic].map((k) => new THREE.Vector3().fromBufferAttribute(p, k).applyMatrix4(mesh.matrixWorld)));
  }
  return out;
}

for (const f of process.argv.slice(2)) {
  const mod = await import(path.resolve(f));
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const rows = new Map();
  let total = 0, meshes = 0;
  const box = new THREE.Box3();
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const geo = o.geometry;
    const t = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    const m = o.material;
    const k = `#${m.color.getHexString()} ${m.name || '(unnamed)'}${m.emissive && m.emissiveIntensity ? ' glow ' + m.emissive.getHexString() + '@' + m.emissiveIntensity : ''}${m.transparent ? ' a=' + m.opacity : ''}`;
    rows.set(k, (rows.get(k) || 0) + t);
    total += t;
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
    if (!o.rotation.equals(new THREE.Euler()) || !o.scale.equals(new THREE.Vector3(1, 1, 1))) console.log('  note: mesh with rotation/scale', o.name);
  });
  const loose = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  console.log(`\n== ${path.basename(f)}  ${Math.round(total)} tris, ${meshes} meshes`);
  for (const [k, t] of [...rows].sort((x, y) => y[1] - x[1])) console.log(String(Math.round(t)).padStart(7), k);
  const r3 = (x) => +x.toFixed(3);
  console.log('  size', [size.x, size.y, size.z].map(r3), 'min.y', r3(box.min.y), 'centre xz', r3(ctr.x), r3(ctr.z));
  const d = Math.max(...['min', 'max'].flatMap((s) => ['x', 'y', 'z'].map((ax) => Math.abs(loose[s][ax] - box[s][ax]))));
  console.log('  loader box differs by', r3(d), 'm');
  const ud = g.userData;
  for (const [key, val] of Object.entries(ud)) {
    if (val && typeof val === 'object' && !Array.isArray(val) && Object.values(val).some((x) => x && x.isObject3D)) {
      for (const [sub, node] of Object.entries(val)) {
        let n = 0; const bb = new THREE.Box3();
        node.traverse((o) => { if (o.isMesh) { n++; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)); } });
        const s = bb.getSize(new THREE.Vector3()), cc = bb.getCenter(new THREE.Vector3());
        console.log(`  ${key}.${sub}: ${node.type} ${n} mesh(es), size ${[s.x, s.y, s.z].map(r3)}, centre ${[cc.x, cc.y, cc.z].map(r3)}, y ${r3(bb.min.y)}..${r3(bb.max.y)}`);
      }
    } else console.log(`  ${key}:`, JSON.stringify(val));
  }
  // clearance: crystal triangles against every other mesh's vertices
  const crystal = ud.parts && ud.parts.crystal;
  if (crystal) {
    const ctris = [];
    crystal.traverse((o) => { if (o.isMesh) ctris.push(...worldTris(o)); });
    let best = Infinity, who = '';
    g.traverse((o) => {
      if (!o.isMesh) return;
      let inside = false; crystal.traverse((x) => { if (x === o) inside = true; });
      if (inside) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        for (const [x, y, z] of ctris) {
          tri.set(x, y, z); tri.closestPointToPoint(v, q);
          const dd = q.distanceTo(v);
          if (dd < best) { best = dd; who = `#${o.material.color.getHexString()} at ${[v.x, v.y, v.z].map(r3)}`; }
        }
      }
    });
    console.log('  crystal clearance', r3(best), 'm, nearest', who);
  }
}
