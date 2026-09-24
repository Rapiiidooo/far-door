// Scratch: build each candidate in node and print what the verifier will measure,
// plus per-mesh triangles and bounds, so sizes can be tuned before rendering.
//   node scratch/measure.mjs glow_mushroom_a.js [...]
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import path from 'path';
import { pathToFileURL } from 'url';

const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
for (const f of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href + '?t=' + Date.now());
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0;
  const rows = [];
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const p = n.geometry.attributes.position;
    const t = (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    tris += t;
    const b = new THREE.Box3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld); b.expandByPoint(v); box.expandByPoint(v); }
    const hasUv = !!n.geometry.attributes.uv, hasN = !!n.geometry.attributes.normal;
    let bad = 0;
    for (const a of ['position', 'normal', 'uv']) {
      const arr = n.geometry.attributes[a]?.array || [];
      for (const x of arr) if (!Number.isFinite(x)) { bad++; break; }
    }
    rows.push(`  ${String(n.name || n.parent?.name || '-').padEnd(10)} #${n.material.color.getHexString()} ${n.material.name.padEnd(8)} ${String(t).padStart(5)} tris  y ${b.min.y.toFixed(3)}..${b.max.y.toFixed(3)}  x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)}  z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}${hasUv ? '' : '  NO UV'}${hasN ? '' : '  NO NORMAL'}${bad ? '  NON-FINITE' : ''}`);
  });
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  console.log(`${f}: ${tris} tris ${meshes} meshes  size ${s.x.toFixed(3)} x ${s.y.toFixed(3)} x ${s.z.toFixed(3)}  min.y ${box.min.y.toFixed(4)}  centre ${c.x.toFixed(3)}, ${c.z.toFixed(3)}`);
  rows.forEach((r) => console.log(r));
  const parts = g.userData.parts || {};
  for (const [k, o] of Object.entries(parts)) {
    let inTree = false;
    g.traverse((n) => { if (n === o) inTree = true; });
    let gm = 0;
    o.traverse((n) => { if (n.isMesh) gm++; });
    console.log(`  parts.${k}: ${o.type} name=${o.name} inTree=${inTree} meshes=${gm} emissive=${o.isMesh ? o.material.emissive.getHexString() : [...new Set(o.children.map((m) => m.material?.emissive?.getHexString()))].join(',')}`);
  }
  const extra = Object.keys(g.userData).filter((k) => k !== 'parts');
  if (extra.length) console.log('  userData also:', JSON.stringify(Object.fromEntries(extra.map((k) => [k, g.userData[k]]))));
}
