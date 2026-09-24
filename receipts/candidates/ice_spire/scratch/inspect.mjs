// Scratch, not a gate: builds each candidate in Node with the game's vendored three.js and
// prints triangles, meshes, size, materials, off-palette colours, bad normals, missing
// attributes and the loader's re-origin shift.
// usage: node inspect.mjs <asset.js>...
import path from 'path';
import { pathToFileURL } from 'url';
const THREE = await import(pathToFileURL('/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js').href);
const PALETTE = new Set(['e9f2f6', 'a9d2e3', '5b9bbd', '3d4654']);
const NAMES = new Set(['plaster', 'stone', 'timber', 'tile', 'metal', 'fabric', 'foliage', 'ground', '']);
for (const f of process.argv.slice(2)) {
  const mod = await import(pathToFileURL(path.resolve(f)).href + '?t=' + Date.now());
  const g = mod.default(THREE);
  let tris = 0, meshes = 0, nan = 0, zeroN = 0, missing = 0, below = 0;
  const mats = new Map();
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  g.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const geo = o.geometry, p = geo.attributes.position, n = geo.attributes.normal;
    const t = (geo.index ? geo.index.count : p.count) / 3;
    tris += t;
    if (!n || !geo.attributes.uv) missing++;
    for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) nan++;
    if (n) for (let i = 0; i < n.count; i++) { const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i)); if (!Number.isFinite(l)) nan++; else if (l < 0.5) zeroN++; }
    for (let i = 0; i < p.count; i++) if (v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).y < -1e-4) below++;
    const m = o.material;
    const key = m.uuid;
    if (!mats.has(key)) mats.set(key, { hex: m.color.getHexString(), name: m.name, rough: m.roughness, metal: m.metalness, side: m.side, flat: m.flatShading, tris: 0, meshes: 0 });
    mats.get(key).tris += t; mats.get(key).meshes++;
  });
  const box = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  const matList = [...mats.values()];
  console.log(path.basename(f), JSON.stringify({
    tris, meshes, materials: matList.length,
    size: size.toArray().map((x) => +x.toFixed(3)),
    minY: +box.min.y.toFixed(4), centre: [+ctr.x.toFixed(4), +ctr.z.toFixed(4)],
    nan, zeroNormalVerts: zeroN, meshesMissingNormalOrUv: missing, vertsBelowGround: below,
    offPalette: matList.filter((m) => !PALETTE.has(m.hex)).map((m) => m.hex),
    badNames: matList.filter((m) => !NAMES.has(m.name)).map((m) => m.name),
    userData: g.userData,
  }));
  for (const m of matList) console.log('   ', JSON.stringify(m));
}
