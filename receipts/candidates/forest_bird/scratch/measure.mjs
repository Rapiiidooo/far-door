// Throwaway: measure the candidates in Node (three r186 from far-door/node_modules):
// size, triangles, meshes, per-mesh bounds, and where the wing pivots and wing geometry sit.
// usage: node measure.mjs [forest_bird_a forest_bird_b ...]
import * as THREE from 'three';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['forest_bird_a', 'forest_bird_b', 'forest_bird_c'];
const f3 = (p) => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
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
for (const name of names) {
  const mod = await import(pathToFileURL(path.join(here, '..', `${name}.js`)).href + `?t=${Date.now()}`);
  const g = mod.default(THREE);
  const box = bounds(g);
  let tris = 0, meshes = 0;
  const per = [];
  const v = new THREE.Vector3();
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const p = n.geometry.attributes.position;
    const t = (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    tris += t;
    const b = new THREE.Box3();
    for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
    const bad = [...p.array].some((x) => !Number.isFinite(x)) || [...n.geometry.attributes.normal.array].some((x) => !Number.isFinite(x));
    per.push(`${(n.parent.name || 'root').padEnd(9)} ${n.material.name.padEnd(6)} #${n.material.color.getHexString()} side ${n.material.side} ${String(t).padStart(5)} tris  x ${b.min.x.toFixed(3)}..${b.max.x.toFixed(3)}  y ${b.min.y.toFixed(3)}..${b.max.y.toFixed(3)}  z ${b.min.z.toFixed(3)}..${b.max.z.toFixed(3)}${bad ? '  NaN!' : ''}${n.geometry.attributes.uv ? '' : '  no uv'}`);
  });
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  console.log(`${name}: ${tris} tris, ${meshes} meshes, ${s.x.toFixed(3)} x ${s.y.toFixed(3)} x ${s.z.toFixed(3)} m, min.y ${box.min.y.toFixed(4)}, centre ${c.x.toFixed(4)},${c.z.toFixed(4)}`);
  for (const l of per) console.log('   ' + l);
  const parts = g.userData.parts || {};
  console.log('   parts:', Object.entries(parts).map(([k, o]) => `${k}=<${o.type} ${o.name}> at ${f3(o.getWorldPosition(new THREE.Vector3()))}`).join('  '));
  // Local x range of each wing's geometry: it should start at the pivot and run outward only.
  for (const [k, o] of Object.entries(parts)) {
    const lb = new THREE.Box3();
    o.traverse((n) => {
      const p = n.isMesh && n.geometry.attributes.position;
      if (!p) return;
      for (let i = 0; i < p.count; i++) lb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrix));
    });
    console.log(`   ${k} local x ${lb.min.x.toFixed(3)}..${lb.max.x.toFixed(3)}  y ${lb.min.y.toFixed(3)}..${lb.max.y.toFixed(3)}  z ${lb.min.z.toFixed(3)}..${lb.max.z.toFixed(3)}`);
  }
  // Flapped: left +a / right -a raises both.
  for (const deg of [40, -40]) {
    const a = (deg * Math.PI) / 180;
    parts.leftWing.rotation.z = a;
    parts.rightWing.rotation.z = -a;
    const fb = bounds(g);
    const fs = fb.getSize(new THREE.Vector3());
    console.log(`   flap ${deg > 0 ? '+' : ''}${deg}: ${fs.x.toFixed(3)} x ${fs.y.toFixed(3)} x ${fs.z.toFixed(3)}  y ${fb.min.y.toFixed(3)}..${fb.max.y.toFixed(3)}  x ${fb.min.x.toFixed(3)}..${fb.max.x.toFixed(3)}`);
  }
  parts.leftWing.rotation.z = 0;
  parts.rightWing.rotation.z = 0;
}
