// Throwaway: triangles per geometry type, by patching the constructors before building.
// usage: node tris.mjs <asset.js>
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import path from 'path';
import { pathToFileURL } from 'url';
const counts = {};
const T = { ...THREE };
for (const k of Object.keys(THREE).filter((k) => k.endsWith('Geometry') && k !== 'BufferGeometry')) {
  const Base = THREE[k];
  T[k] = class extends Base {
    constructor(...a) {
      super(...a);
      const n = (this.index ? this.index.count : this.attributes.position.count) / 3;
      counts[k] = (counts[k] || 0) + n;
    }
  };
}
const mod = await import(pathToFileURL(path.resolve(process.argv[2])).href);
mod.default(T);
console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join('\n'));
