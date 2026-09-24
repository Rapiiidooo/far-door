// Throwaway: prove the fragments float free. Splits every mesh into connected pieces (shared
// vertex positions), joins pieces that touch (closest vertex-to-triangle distance under TOUCH),
// then reports each group and the clearance from every group to the rest.
// usage: node gaps.mjs <asset.js> [...]
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/game/vendor/three.module.js';
import path from 'path';

const TOUCH = 0.02;
for (const file of process.argv.slice(2)) {
  const g = (await import(path.resolve(file) + '?t=' + Date.now())).default(THREE);
  g.updateMatrixWorld(true);
  // triangles in world space
  const tris = [];
  g.traverse((n) => {
    if (!n.isMesh) return;
    const p = n.geometry.attributes.position, idx = n.geometry.index;
    const get = (i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld);
    const count = idx ? idx.count : p.count;
    for (let t = 0; t < count; t += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => get(idx ? idx.getX(t + k) : t + k));
      const tr = new THREE.Triangle(a, b, c);
      if (tr.getArea() > 1e-9) tris.push(tr);
    }
  });
  // union-find over triangles by shared (rounded) vertex positions
  const parent = tris.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const key = (v) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
  const seen = new Map();
  tris.forEach((t, i) => { for (const v of [t.a, t.b, t.c]) { const k = key(v); if (seen.has(k)) join(i, seen.get(k)); else seen.set(k, i); } });
  let comps = new Map();
  tris.forEach((t, i) => { const r = find(i); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(t); });
  comps = [...comps.values()].map((ts) => {
    const box = new THREE.Box3();
    for (const t of ts) box.expandByPoint(t.a).expandByPoint(t.b).expandByPoint(t.c);
    return { ts, box };
  });
  const cp = new THREE.Vector3();
  const dist = (A, B) => {
    const ea = A.box.clone().expandByScalar(0.5);
    if (!ea.intersectsBox(B.box)) return Infinity;
    let d = Infinity;
    for (const [X, Y] of [[A, B], [B, A]]) {
      for (const t of X.ts) for (const v of [t.a, t.b, t.c]) {
        if (!Y.box.clone().expandByScalar(0.5).containsPoint(v)) continue;
        for (const u of Y.ts) { u.closestPointToPoint(v, cp); d = Math.min(d, cp.distanceTo(v)); }
      }
    }
    return d;
  };
  // join touching pieces into groups
  const gp = comps.map((_, i) => i);
  const gf = (i) => (gp[i] === i ? i : (gp[i] = gf(gp[i])));
  for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) {
    if (gf(i) === gf(j)) continue;
    if (dist(comps[i], comps[j]) < TOUCH) gp[gf(i)] = gf(j);
  }
  const groups = new Map();
  comps.forEach((c, i) => { const r = gf(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c); });
  const G = [...groups.values()].map((cs) => ({ cs, box: cs.reduce((b, c) => b.union(c.box), new THREE.Box3()) }));
  console.log(path.basename(file), `${comps.length} pieces in ${G.length} groups`);
  const r2 = (x) => Math.round(x * 100) / 100;
  for (const A of G) {
    let clear = Infinity;
    for (const B of G) if (A !== B) for (const a of A.cs) for (const b of B.cs) clear = Math.min(clear, dist(a, b));
    const s = A.box.getSize(new THREE.Vector3()), c = A.box.getCenter(new THREE.Vector3());
    console.log(`  group ${s.x.toFixed(2)} x ${s.y.toFixed(2)} x ${s.z.toFixed(2)} at y ${r2(A.box.min.y)}..${r2(A.box.max.y)}, centre xz ${r2(c.x)},${r2(c.z)}; clearance to the rest ${clear === Infinity ? '> 0.5' : r2(clear)} m`);
  }
}
