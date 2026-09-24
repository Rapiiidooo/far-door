// Throwaway: NaN normals, degenerate triangles and signed volume per baked mesh.
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
const here = path.dirname(new URL(import.meta.url).pathname);
const g = (await import(pathToFileURL(path.join(here, '../hero_explorer_c.js')).href)).default(THREE);
g.updateMatrixWorld(true);
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
let bad = 0;
g.traverse((n) => {
  if (!n.isMesh) return;
  const p = n.geometry.attributes.position, nr = n.geometry.attributes.normal, idx = n.geometry.index;
  let nan = 0, degen = 0, vol = 0;
  for (let i = 0; i < nr.array.length; i++) if (!Number.isFinite(nr.array[i])) nan++;
  for (let t = 0; t < idx.count; t += 3) {
    a.fromBufferAttribute(p, idx.getX(t)); b.fromBufferAttribute(p, idx.getX(t + 1)); c.fromBufferAttribute(p, idx.getX(t + 2));
    const cr = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (cr.length() < 1e-10) degen++;
    vol += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  const tag = `${n.parent.name} #${n.material.color.getHexString()}${n.material.side === THREE.DoubleSide ? ' (open shell)' : ''}`;
  if (nan || vol <= 0) bad++;
  console.log(tag.padEnd(34), 'nan', nan, 'degenerate', degen, 'volume', (vol * 1e6).toFixed(0), 'cm3');
});
console.log(bad ? `${bad} suspicious meshes` : 'all closed meshes have positive volume and finite normals');
