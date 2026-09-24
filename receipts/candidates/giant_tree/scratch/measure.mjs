// Quick measure of the candidates in Node with the game's three (r186): size, triangles,
// meshes, materials, per-mesh bounds, NaNs, and what userData.parts points at.
import * as THREE from 'three';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['giant_tree_a', 'giant_tree_b', 'giant_tree_c'];
for (const name of names) {
  const mod = await import(pathToFileURL(path.join(here, '..', `${name}.js`)).href + `?t=${Date.now()}`);
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0;
  const per = [];
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const p = n.geometry.attributes.position;
    const t = (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    tris += t;
    const b = new THREE.Box3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld); box.expandByPoint(v); b.expandByPoint(v); }
    const bad = [...p.array].some((x) => !Number.isFinite(x)) || [...n.geometry.attributes.normal.array].some((x) => !Number.isFinite(x));
    const attrs = Object.keys(n.geometry.attributes).join(',');
    per.push(`${(n.name || '-').padEnd(6)} ${n.material.name.padEnd(8)} #${n.material.color.getHexString()} em#${n.material.emissive.getHexString()} ${String(t).padStart(5)} tris  y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)}  x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)}  z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)} [${attrs}] parent=${n.parent === g ? 'g' : n.parent?.type}${bad ? '  NaN!' : ''}`);
  });
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  console.log(`${name}: ${tris} tris, ${meshes} meshes, ${s.x.toFixed(2)} x ${s.y.toFixed(2)} x ${s.z.toFixed(2)} m, min.y ${box.min.y.toFixed(3)}, centre ${c.x.toFixed(2)},${c.z.toFixed(2)}`);
  for (const l of per) console.log('   ' + l);
  const show = (val) => (val && val.isObject3D ? `<${val.type} ${val.name} child=${g.children.includes(val)}>` : val && typeof val === 'object' ? Object.fromEntries(Object.entries(val).map(([k, x]) => [k, show(x)])) : val);
  if (Object.keys(g.userData).length) console.log('   userData:', JSON.stringify(show(g.userData)));
}
