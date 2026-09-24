// Throwaway: report geometries with zero-length normals as they are built.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import path from 'path';
import { pathToFileURL } from 'url';
const T = { ...THREE };
const made = [];
for (const k of Object.keys(THREE).filter((k) => k.endsWith('Geometry') && k !== 'BufferGeometry')) {
  const Base = THREE[k];
  T[k] = class extends Base { constructor(...a) { super(...a); made.push([k, this, new Error().stack.split('\n')[2].trim()]); } };
}
const mod = await import(pathToFileURL(path.resolve(process.argv[2])).href);
mod.default(T);
const v = new THREE.Vector3();
for (const [k, geo, where] of made) {
  const nr = geo.attributes.normal; if (!nr) continue;
  let bad = 0; for (let i = 0; i < nr.count; i++) { const l = v.fromBufferAttribute(nr, i).length(); if (!(l > 0.5 && l < 1.5)) bad++; }
  if (bad) console.log(k, bad, where, geo.parameters && geo.parameters.points ? JSON.stringify(geo.parameters.points.map((p) => [+p.x.toFixed(3), +p.y.toFixed(3)])) : "");
}
