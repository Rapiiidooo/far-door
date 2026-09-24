// Loads each candidate with the game's own three.js (r186) and prints what the
// verifier cannot: triangle count per material, the flame part, the loader's
// re-origin offset and the light point.
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const THREE = await import(pathToFileURL(path.resolve(HERE, '../../../../game/vendor/three.module.js')).href);
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['mira_lantern_a', 'mira_lantern_b', 'mira_lantern_c'];

for (const name of names) {
  const mod = await import(pathToFileURL(path.resolve(HERE, '..', `${name}.js`)).href + `?t=${Date.now()}`);
  const g = mod.default(THREE);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0;
  const perMat = new Map();
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const p = n.geometry.attributes.position;
    const t = (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    tris += t;
    const key = `${n.material.name || '(unnamed)'} #${n.material.color.getHexString()}${n.material.transparent ? ` op${n.material.opacity}` : ''}`;
    perMat.set(key, (perMat.get(key) || 0) + t);
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
  });
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const loose = new THREE.Box3().setFromObject(g);
  const lc = loose.getCenter(new THREE.Vector3());
  const flame = g.userData.parts && g.userData.parts.flame;
  const f = (x) => x.toFixed(3);
  console.log(`\n${name}: ${tris} tris, ${meshes} meshes, ${f(size.x)} x ${f(size.y)} x ${f(size.z)} m`);
  console.log(`  vertex box min y ${f(box.min.y)}, centre x ${f(ctr.x)} z ${f(ctr.z)}; loader re-origin offset ${f(-lc.x)}, ${f(-loose.min.y)}, ${f(-lc.z)}`);
  for (const [k, t] of perMat) console.log(`  ${String(t).padStart(5)}  ${k}`);
  if (!flame) { console.log('  NO parts.flame'); continue; }
  const fb = new THREE.Box3().setFromObject(flame);
  console.log(`  flame: isMesh ${!!flame.isMesh}, direct child ${flame.parent === g}, emissive #${flame.material.emissive.getHexString()} x${flame.material.emissiveIntensity}, ` +
    `origin ${[flame.position.x, flame.position.y, flame.position.z].map(f).join(', ')}, spans y ${f(fb.min.y)}..${f(fb.max.y)}, ${f(fb.max.x - fb.min.x)} wide`);
  // JSON.stringify runs an Object3D's own toJSON before any replacer sees it
  const show = (val) => (val && val.isObject3D ? `<${val.type} ${val.name}>` : val && typeof val === 'object' && !Array.isArray(val)
    ? Object.fromEntries(Object.entries(val).map(([k, x]) => [k, show(x)])) : val);
  console.log(`  userData: ${JSON.stringify(show(g.userData))}`);
}
