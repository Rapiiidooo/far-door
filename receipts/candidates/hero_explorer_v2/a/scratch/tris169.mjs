// Throwaway: triangle count under three 0.169 (the release the verifier loads from its CDN).
// node scratch/tris169.mjs <three169.module.js> <asset.js>
import path from 'path';
import { pathToFileURL } from 'url';
const [lib, f] = process.argv.slice(2);
const THREE = await import(pathToFileURL(path.resolve(lib)).href);
const g = (await import(pathToFileURL(path.resolve(f)).href)).default(THREE);
let tris = 0;
g.traverse((n) => { if (n.isMesh) tris += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; });
console.log('three', THREE.REVISION, 'tris', tris);
