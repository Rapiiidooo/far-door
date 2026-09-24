// Throwaway: builds each candidate in Node with the game's vendored three.js and
// prints what a level needs: triangles, the declared parts (a separate mesh with a
// material of its own), the plain data, and whether the loader's re-origin
// (Box3.setFromObject on the built group) would move anything.
// usage: node inspect.mjs <asset.js>...
import path from 'path';
import { pathToFileURL } from 'url';
const THREE = await import(pathToFileURL('/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js').href);
for (const f of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(path.resolve(f)).href);
  const g = mod.default(THREE);
  let tris = 0, meshes = 0;
  const mats = new Set();
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    mats.add(o.material);
    const geo = o.geometry;
    tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  });
  const box = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const parts = {};
  for (const [k, node] of Object.entries(g.userData.parts || {})) {
    const shared = [];
    g.traverse((o) => { if (o.isMesh && o !== node && o.material === node.material) shared.push(o.name || '?'); });
    const nb = new THREE.Box3().setFromObject(node);
    parts[k] = {
      name: node.name, isMesh: node.isMesh, tris: node.geometry.attributes.position.count / 3,
      material: { color: '#' + node.material.color.getHexString(), emissive: '#' + node.material.emissive.getHexString(),
        emissiveIntensity: node.material.emissiveIntensity, name: node.material.name || '(unnamed)' },
      sharesMaterialWith: shared, position: node.position.toArray().map((x) => +x.toFixed(4)),
      box: [nb.min.toArray().map((x) => +x.toFixed(3)), nb.max.toArray().map((x) => +x.toFixed(3))],
    };
  }
  const plain = Object.fromEntries(Object.entries(g.userData).filter(([k]) => k !== 'parts'));
  console.log(path.basename(f), JSON.stringify({
    tris, meshes, materials: mats.size,
    size: size.toArray().map((x) => +x.toFixed(4)),
    loaderShift: [-ctr.x, -box.min.y, -ctr.z].map((x) => +x.toFixed(5)),
    materialNames: [...mats].map((m) => m.name || '(unnamed)'),
    parts, plain,
  }));
}
