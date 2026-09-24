// Throwaway checks for the ice_casing candidates, in Node with the game's three.
// usage: node check.mjs <asset.js> [...]
// Reports bounds (vertex and loader), triangles and meshes per layer, the parts
// structure, and the clearance between the casing and the real glyph stela
// standing at the origin. The stela is described by bounding boxes; the boxes are
// first checked against every vertex of game/assets/glyph_stela.js.
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
import path from 'path';

const STELA_FILE = '/Users/rapido/perso/bittensor/404/far-door/game/assets/glyph_stela.js';

// [x0, x1, y0, y1, z0, z1]; the shaft tapers 0.5 -> 0.45 half width over 0.5..2.04
const BOXES = [
  [-0.65, 0.65, 0, 0.25, -0.34, 0.34],
  [-0.575, 0.575, 0.25, 0.5, -0.32, 0.32],
  ['shaft'],
  [-0.274, 0.274, 1.026, 1.574, 0.28, 0.337],   // bezel ring, as its bounding box
  [-0.42, 0.42, 2.04, 2.16, -0.26, 0.26],
  [-0.33, 0.33, 2.16, 2.27, -0.21, 0.21],
  [-0.25, 0.25, 2.27, 2.4, -0.16, 0.16],
];
const boxSd = (x, y, z, [x0, x1, y0, y1, z0, z1]) => {
  const qx = Math.max(x0 - x, x - x1), qy = Math.max(y0 - y, y - y1), qz = Math.max(z0 - z, z - z1);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
};
const sd = (x, y, z) => {
  let d = Infinity;
  for (const b of BOXES) {
    if (b[0] === 'shaft') {
      const yy = Math.min(Math.max(y, 0.5), 2.04);
      const hw = 0.5 - (0.05 * (yy - 0.5)) / 1.54;
      d = Math.min(d, boxSd(x, y, z, [-hw, hw, 0.5, 2.04, -0.3, 0.3]));
    } else d = Math.min(d, boxSd(x, y, z, b));
  }
  return d;
};

const f3 = (a) => a.map((x) => +x.toFixed(3)).join(', ');

// 1. the stela's own vertices must all lie inside the boxes
{
  const mod = await import(STELA_FILE);
  const s = mod.default(THREE);
  s.updateMatrixWorld(true);
  let worst = -Infinity, at = null, n = 0;
  const v = new THREE.Vector3();
  s.traverse((m) => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      const d = sd(v.x, v.y, v.z);
      n++;
      if (d > worst) { worst = d; at = v.toArray(); }
    }
  });
  const sb = new THREE.Box3().setFromObject(s);
  console.log(`stela: ${n} vertices, worst outside the boxes ${worst.toFixed(4)} m at [${f3(at)}]; box [${f3(sb.min.toArray())}]..[${f3(sb.max.toArray())}]`);
}

const STEP = 0.012;          // surface sampling step, metres
function clearance(mesh) {
  const p = mesh.geometry.attributes.position, idx = mesh.geometry.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let min = Infinity, at = null;
  const tri = idx ? idx.count / 3 : p.count / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(p, i0).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(p, i1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(p, i2).applyMatrix4(mesh.matrixWorld);
    const L = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
    const n = Math.max(1, Math.ceil(L / STEP));
    for (let u = 0; u <= n; u++) for (let w = 0; w <= n - u; w++) {
      const k = n - u - w;
      const x = (a.x * u + b.x * w + c.x * k) / n, y = (a.y * u + b.y * w + c.y * k) / n, z = (a.z * u + b.z * w + c.z * k) / n;
      const d = sd(x, y, z);
      if (d < min) { min = d; at = [x, y, z]; }
    }
  }
  return { min, at };
}

for (const file of process.argv.slice(2)) {
  const mod = await import(path.resolve(file) + '?t=' + Date.now());
  const t0 = performance.now();
  const g = mod.default(THREE);
  const ms = performance.now() - t0;
  g.updateMatrixWorld(true);
  console.log(`\n${path.basename(file)}  (built in ${ms.toFixed(0)} ms)`);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  let tris = 0, meshes = 0, badN = 0, rotated = 0;
  g.traverse((n) => {
    if (!n.isMesh) return;
    meshes++;
    const p = n.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(n.matrixWorld));
    tris += (n.geometry.index ? n.geometry.index.count : p.count) / 3;
    const nr = n.geometry.attributes.normal;
    for (let i = 0; i < nr.count; i++) { const l = v.fromBufferAttribute(nr, i).length(); if (!(l > 0.5 && l < 1.5)) badN++; }
    for (let o = n; o && o !== g; o = o.parent) if (o.rotation.x || o.rotation.y || o.rotation.z || o.scale.x !== 1 || o.scale.y !== 1 || o.scale.z !== 1) { rotated++; break; }
  });
  const lb = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  console.log(`  vertex box [${f3(box.min.toArray())}]..[${f3(box.max.toArray())}] size [${f3(size.toArray())}] centre x/z ${ctr.x.toFixed(4)} ${ctr.z.toFixed(4)}`);
  console.log(`  loader box [${f3(lb.min.toArray())}]..[${f3(lb.max.toArray())}]`);
  console.log(`  ${Math.round(tris)} tris, ${meshes} meshes, bad normals ${badN}, rotated/scaled nodes ${rotated}`);
  const parts = g.userData.parts || {};
  const seenMats = new Map();
  for (const key of ['outer', 'middle', 'inner']) {
    const part = parts[key];
    if (!part) { console.log(`  parts.${key}: MISSING`); continue; }
    let pt = 0, pm = 0, pmin = Infinity, pat = null, vol = 0;
    const cols = [];
    const pb = new THREE.Box3();
    part.traverse((n) => {
      if (!n.isMesh) return;
      pm++;
      pt += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3;
      cols.push(n.material.color.getHexString());
      if (seenMats.has(n.material.uuid) && seenMats.get(n.material.uuid) !== key) console.log(`  !! material shared between ${seenMats.get(n.material.uuid)} and ${key}`);
      seenMats.set(n.material.uuid, key);
      {
        // signed volume of the ring's closed pieces: negative means the faces point inward
        const p = n.geometry.attributes.position, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
        for (let i = 0; i < p.count; i += 3) { A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2); vol += A.dot(B.cross(C)) / 6; }
      }
      const c = clearance(n);
      if (c.min < pmin) { pmin = c.min; pat = c.at; }
      pb.expandByObject(n);
    });
    console.log(`  parts.${key.padEnd(6)} ${part.type}${part.parent === g ? ' child of g' : ' NOT a child of g'} pos [${f3(part.position.toArray())}] ${pm} meshes ${Math.round(pt)} tris colours ${cols.join(' ')}`);
    console.log(`         top ${pb.max.y.toFixed(3)} x ${pb.min.x.toFixed(3)}..${pb.max.x.toFixed(3)} z ${pb.min.z.toFixed(3)}..${pb.max.z.toFixed(3)}  clearance to stela ${pmin.toFixed(4)} m at [${f3(pat)}]  volume ${vol.toFixed(3)} m3`);
  }
  const other = Object.keys(g.userData).filter((k) => k !== 'parts');
  if (other.length) console.log(`  other userData: ${JSON.stringify(Object.fromEntries(other.map((k) => [k, g.userData[k]])))}`);
}
