// Scratch audit: node audit.mjs <asset.js> ... (not a gate)
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
const PALETTE = new Set(['d4a373', 'b57f4f', '8a5433', 'e6d3ae', '3a3531', '9a6a35', 'e0b56a', '39e3d0', '1d5f63', '2d3656', 'c2412d', 'cdbf9f', '4b2e1e', '9c6b4e', '2a2830', '8c7fa3']);
const NAMES = new Set(['plaster', 'stone', 'timber', 'tile', 'metal', 'fabric', 'foliage', 'ground']);
for (const f of process.argv.slice(2)) {
  const g = (await import(f)).default(THREE);
  let meshes = 0, tris = 0, nan = 0, zeroN = 0, noUV = 0, rotated = 0;
  const cols = new Set(), names = new Set();
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const geo = o.geometry, p = geo.attributes.position, n = geo.attributes.normal;
    tris += (geo.index ? geo.index.count : p.count) / 3;
    if (!geo.attributes.uv) noUV++;
    for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) nan++;
    if (n) for (let i = 0; i < n.count; i++) { const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i)); if (!Number.isFinite(l)) nan++; else if (l < 0.5) zeroN++; }
    if (o.rotation.x || o.rotation.y || o.rotation.z || o.scale.x !== 1 || o.scale.y !== 1 || o.scale.z !== 1) rotated++;
    cols.add(o.material.color.getHexString()); names.add(o.material.name);
  });
  const off = [...cols].filter((c) => !PALETTE.has(c)), badNames = [...names].filter((n) => !NAMES.has(n));
  console.log(f.split('/').pop(), { meshes, tris, nan, zeroNormalVerts: zeroN, noUV, rotatedOrScaled: rotated, colours: [...cols], offPalette: off, badNames, userData: g.userData });
}
