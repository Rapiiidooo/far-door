// Throwaway numeric check for candidate modules: vertex bounds, the loader's
// Box3.setFromObject bounds, triangles, meshes, lit parts and userData.
// usage: node check.mjs <asset.js> [...]
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import path from 'path';

for (const file of process.argv.slice(2)) {
  const mod = await import(path.resolve(file) + '?t=' + Date.now());
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0;
  const lit = [];
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const p = n.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
    tris += (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    if (n.material.emissive && n.material.emissive.getHex() === 0x39e3d0) lit.push(n);
    // bad normals are silent: check for NaN or zero length
    const nr = n.geometry.attributes.normal;
    let bad = 0;
    for (let i = 0; i < nr.count; i++) { const l = v.fromBufferAttribute(nr, i).length(); if (!(l > 0.5 && l < 1.5)) bad++; }
    if (bad) console.log(`  ${n.name || n.material.name || 'mesh'}: ${bad} bad normals`);
  });
  const loaderBox = new THREE.Box3().setFromObject(g);
  const f = (a) => a.toArray().map((x) => +x.toFixed(3)).join(', ');
  console.log(path.basename(file));
  console.log(`  vertex box  min [${f(box.min)}] max [${f(box.max)}] size [${f(box.getSize(new THREE.Vector3()))}]`);
  console.log(`  loader box  min [${f(loaderBox.min)}] max [${f(loaderBox.max)}]`);
  console.log(`  ${Math.round(tris)} tris, ${meshes} meshes, materials: ${[...new Set(g.children.filter((c) => c.isMesh).map((c) => c.material.name || '(unnamed)'))].join(' ')}`);
  for (const n of lit) {
    const b = new THREE.Box3().setFromObject(n);
    const wp = n.getWorldPosition(new THREE.Vector3());
    console.log(`  lit ${n.name.padEnd(16)} pos [${f(wp)}] box [${f(b.min)}]..[${f(b.max)}] opaque=${!n.material.transparent} op=${n.material.opacity}`);
  }
  const ud = {};
  for (const [k, val] of Object.entries(g.userData)) {
    if (val && val.isObject3D) ud[k] = `<${val.type} ${val.name}>`;
    else if (val && typeof val === 'object' && !Array.isArray(val) && Object.values(val).some((x) => x && x.isObject3D)) {
      ud[k] = Object.fromEntries(Object.entries(val).map(([s, x]) => [s, `<${x.type} ${x.name} @ ${f(x.getWorldPosition(new THREE.Vector3()))}>`]));
    } else ud[k] = val;
  }
  console.log('  userData', JSON.stringify(ud));
}
