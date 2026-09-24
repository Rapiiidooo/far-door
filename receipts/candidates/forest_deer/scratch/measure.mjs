// Scratch: build candidates in node with the game's three.js (r186) and report size, cost,
// pivots and what each joint does when swung.
//   node scratch/measure.mjs forest_deer_a.js [...]
import path from 'path';
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';

const DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const bounds = (root) => {
  const box = new THREE.Box3(), v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  return box;
};
const f3 = (a) => a.map((x) => x.toFixed(3)).join(' ');

for (const f of process.argv.slice(2)) {
  const mod = await import(path.resolve(DIR, f) + '?t=' + Date.now());
  const g = mod.default(THREE);
  const box = bounds(g);
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  let tris = 0, meshes = 0;
  const mats = new Map();
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    tris += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3;
    const m = n.material;
    mats.set(m.uuid, `${m.type} ${m.name || '-'} #${m.color.getHexString()}${m.emissive && m.emissive.getHex() ? ' emissive #' + m.emissive.getHexString() : ''}`);
  });
  console.log(`\n== ${f}`);
  console.log(`size ${f3(s.toArray())}  min.y ${box.min.y.toFixed(3)}  centre x/z ${c.x.toFixed(3)} ${c.z.toFixed(3)}  tris ${tris}  meshes ${meshes}`);
  for (const m of new Set(mats.values())) console.log('  mat', m);
  const P = g.userData.parts || {};
  for (const k of ['frontLeft', 'frontRight', 'backLeft', 'backRight', 'head', 'glow']) {
    const o = P[k];
    if (!o) { console.log(`  MISSING part ${k}`); continue; }
    const w = o.getWorldPosition(new THREE.Vector3());
    let tri = 0;
    o.traverse((n) => { if (n.isMesh) tri += n.geometry.attributes.position.count / 3; });
    console.log(`  ${k.padEnd(10)} ${o.type.padEnd(5)} name=${o.name || '-'} at ${f3(w.toArray())} rot ${f3([o.rotation.x, o.rotation.y, o.rotation.z])} tris ${tri}`);
  }
  // swing each leg and the head and see where its lowest point goes
  for (const k of ['frontLeft', 'frontRight', 'backLeft', 'backRight', 'head']) {
    const o = P[k];
    if (!o) continue;
    const out = [];
    for (const a of [-25, 25]) {
      o.rotation.x = (a * Math.PI) / 180;
      const b = bounds(o);
      out.push(`${a > 0 ? '+' : ''}${a}deg: y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
      o.rotation.x = 0;
    }
    console.log(`  swing ${k.padEnd(10)} ${out.join('   ')}`);
  }
  g.updateMatrixWorld(true);
}
