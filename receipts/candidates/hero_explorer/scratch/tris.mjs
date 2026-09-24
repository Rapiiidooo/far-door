// Throwaway: triangles per joint and material. node tris.mjs <asset.js>
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
const mod = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const g = mod.default(THREE);
const rows = [];
g.traverse((n) => {
  if (!n.isMesh) return;
  const t = (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3;
  rows.push([n.parent.name, '#' + n.material.color.getHexString(), t]);
});
rows.sort((a, b) => b[2] - a[2]);
for (const r of rows) console.log(r[0].padEnd(14), r[1], String(r[2]).padStart(6));
