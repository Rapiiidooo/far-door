// Node-side check of the candidates against the game's three (r186): triangles, meshes,
// vertex bounds, per-material stats, NaNs, userData, and which fabric or frost vertices
// sit inside the stone (ray parity against each stone mesh). Usage: node check.mjs <module.js>... [--noclash]
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import { pathToFileURL } from 'url';
import path from 'path';

for (const f of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
  const mod = await import(pathToFileURL(path.resolve(f)).href + '?t=' + Date.now());
  const t0 = performance.now();
  const g = mod.default(THREE);
  const ms = performance.now() - t0;
  g.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0, nan = 0;
  const mats = new Map(), boxes = new Map();
  const stones = [], probes = [];
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const geo = n.geometry, p = geo.attributes.position;
    tris += (geo.index ? geo.index.count : p.count) / 3;
    const m = n.material;
    const key = `${m.name || '?'}#${m.color.getHexString()}${m.side === THREE.DoubleSide ? ' 2s' : ''}${m.flatShading ? ' flat' : ''}`;
    mats.set(key, (mats.get(key) || 0) + (geo.index ? geo.index.count : p.count) / 3);
    const mb = boxes.get(key) || new THREE.Box3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (!Number.isFinite(v.x + v.y + v.z)) nan++;
      v.applyMatrix4(n.matrixWorld);
      box.expandByPoint(v);
      mb.expandByPoint(v);
    }
    boxes.set(key, mb);
    if (!geo.attributes.uv) console.log(`   (no uv on a ${m.name} mesh)`);
    if (m.name === 'stone') stones.push(n); else probes.push(n);
  });
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  console.log(`${path.basename(f)}: ${tris} tris, ${meshes} meshes, ${s.x.toFixed(3)} x ${s.y.toFixed(3)} x ${s.z.toFixed(3)} m, ` +
    `min.y ${box.min.y.toFixed(4)}, centre ${c.x.toFixed(3)}, ${c.z.toFixed(3)}, built in ${ms.toFixed(1)} ms${nan ? `, NaN ${nan}` : ''}`);
  for (const [k, t] of mats) {
    const b = boxes.get(k);
    console.log(`   ${k}: ${t} tris, y ${b.min.y.toFixed(3)}..${b.max.y.toFixed(3)}, x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)}, z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
  }
  const ud = JSON.stringify(g.userData, (k, val) => (val && val.isObject3D ? `<${val.type} ${val.name || ''}>` : val));
  if (ud !== '{}') console.log('   userData', ud);

  if (!process.argv.includes('--noclash')) {
    for (const st of stones) { st.material = st.material.clone(); st.material.side = THREE.DoubleSide; }
    const rc = new THREE.Raycaster();
    const dirs = [new THREE.Vector3(1, 0.013, 0.007).normalize(), new THREE.Vector3(-0.01, 0.017, 1).normalize(), new THREE.Vector3(0.011, 1, 0.013).normalize()];
    const inside = (p) => stones.some((st) => dirs.every((d) => { rc.set(p, d); return rc.intersectObject(st, false).length % 2 === 1; }));
    const byMat = new Map();
    for (const n of probes) {
      const pos = n.geometry.attributes.position, hits = [];
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld);
        if (inside(v)) hits.push(v.clone());
      }
      const k = n.material.name + '#' + n.material.color.getHexString();
      const acc = byMat.get(k) || { n: 0, total: 0, pts: [] };
      acc.n += hits.length; acc.total += pos.count; acc.pts.push(...hits);
      byMat.set(k, acc);
    }
    // depth: how far below the stone's surface each inside vertex sits, straight down from above
    const depth = (p) => {
      rc.set(new THREE.Vector3(p.x, 5, p.z), new THREE.Vector3(0, -1, 0));
      const hits = rc.intersectObjects(stones, false).map((h) => h.point.y).filter((y) => y >= p.y);
      return hits.length ? Math.min(...hits) - p.y : 0;
    };
    for (const [k, a] of byMat) {
      if (!a.n) { console.log(`   clash ${k}: clear (${a.total} vertices)`); continue; }
      const f3 = (p) => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`;
      const d = a.pts.map((p) => ({ p, d: depth(p) })).sort((x, y) => y.d - x.d);
      const over = (t) => d.filter((q) => q.d > t).length;
      console.log(`   clash ${k}: ${a.n}/${a.total} inside stone; deeper than 3 mm ${over(0.003)}, 6 mm ${over(0.006)}, 10 mm ${over(0.01)}; deepest ${d.slice(0, 3).map((q) => `${(q.d * 1000).toFixed(1)}mm at ${f3(q.p)}`).join(', ')}`);
    }
  }
}
