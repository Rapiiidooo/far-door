// Throwaway numeric check for candidate modules, shared by the booth, bin and post folders.
// usage: node measure.mjs <asset.js> [...] [--pose=joint:axis:degrees]
// Prints the vertex box, the loader's setFromObject box, triangles, meshes, materials,
// joint pivots, parts and plain userData. With --pose it rotates a joint and prints the
// box again plus the moved part's own box, to see what a lift or an opening sweeps.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import path from 'path';
import { pathToFileURL } from 'url';

const args = process.argv.slice(2);
const poses = args.filter((a) => a.startsWith('--pose=')).map((a) => a.slice(7).split(':'));
const f3 = (a) => a.toArray().map((x) => x.toFixed(3)).join(', ');

const vbox = (root) => {
  const box = new THREE.Box3(), v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  return box;
};

for (const file of args.filter((a) => !a.startsWith('--'))) {
  const mod = await import(pathToFileURL(path.resolve(file)).href + '?t=' + Date.now());
  const g = mod.default(THREE);
  const box = vbox(g);
  let tris = 0, meshes = 0, badNormals = 0, noUv = 0;
  const mats = new Map();
  const v = new THREE.Vector3();
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const p = n.geometry.attributes.position;
    tris += (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    const key = `${n.material.name || '(unnamed)'}#${n.material.color.getHexString()}${n.material.emissiveIntensity ? '*' : ''}`;
    mats.set(key, (mats.get(key) || 0) + 1);
    const nr = n.geometry.attributes.normal;
    for (let i = 0; i < nr.count; i++) { const l = v.fromBufferAttribute(nr, i).length(); if (!(l > 0.5 && l < 1.5)) badNormals++; }
    if (!n.geometry.attributes.uv) noUv++;
  });
  const lb = new THREE.Box3().setFromObject(g);
  console.log(`== ${path.basename(file)}  ${Math.round(tris)} tris  ${meshes} meshes  badNormals ${badNormals}  noUv ${noUv}`);
  console.log(`  size   [${f3(box.getSize(new THREE.Vector3()))}]  min [${f3(box.min)}]  max [${f3(box.max)}]`);
  console.log(`  loader min [${f3(lb.min)}]  max [${f3(lb.max)}]`);
  console.log(`  materials ${[...mats].map(([k, c]) => `${k} x${c}`).join('  ')}`);
  for (const key of ['joints', 'parts']) {
    for (const [k, node] of Object.entries(g.userData[key] || {})) {
      const w = node.getWorldPosition(new THREE.Vector3());
      const nb = vbox(node);
      console.log(`  ${key}.${k} ${node.type} "${node.name}" parent "${node.parent && node.parent.name}" at [${f3(w)}] rot ${node.rotation.toArray().slice(0, 3).map((x) => x.toFixed(3))} box [${f3(nb.min)}]..[${f3(nb.max)}]`);
    }
  }
  const plain = Object.fromEntries(Object.entries(g.userData).filter(([k]) => !['joints', 'parts'].includes(k)));
  console.log('  plain', JSON.stringify(plain));
  for (const [joint, axis, deg] of poses) {
    const j = g.userData.joints && g.userData.joints[joint];
    if (!j) { console.log(`  no joint ${joint}`); continue; }
    const rest = j.rotation[axis];
    j.rotation[axis] = rest + (+deg * Math.PI) / 180;
    const pb = vbox(g), jb = vbox(j);
    console.log(`  pose ${joint}.${axis} ${deg}deg: whole [${f3(pb.min)}]..[${f3(pb.max)}]  part [${f3(jb.min)}]..[${f3(jb.max)}]`);
    j.rotation[axis] = rest;
  }
}
