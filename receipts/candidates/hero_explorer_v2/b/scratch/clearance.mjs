// Throwaway: numeric clearance checks for the skirt, by pose. node clearance.mjs <asset.js>
import * as THREE from 'three';
import path from 'path';
import { pathToFileURL } from 'url';
const url = pathToFileURL(path.resolve(process.argv[2])).href;
const DEG = Math.PI / 180;
// surfaces as authored (world rest frame, before the placement shift)
const lerpTab = (tab, y) => { if (y <= tab[0][0]) return tab[0][1]; for (let i = 0; i < tab.length - 1; i++) { const [y0, r0] = tab[i], [y1, r1] = tab[i + 1]; if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return tab[tab.length - 1][1]; };
const BELT = [[0.966, 0.176], [0.971, 0.187], [0.984, 0.19], [1.036, 0.19], [1.048, 0.187], [1.053, 0.176]];
const TORSO = [[0.972, 0.166], [1.06, 0.168], [1.15, 0.177], [1.25, 0.19], [1.32, 0.201], [1.37, 0.213], [1.405, 0.218], [1.435, 0.212], [1.46, 0.199], [1.48, 0.185], [1.495, 0.17], [1.508, 0.148], [1.52, 0.11], [1.53, 0.06], [1.534, 0]];
const SKIRT = [[0.846, 0.212], [0.862, 0.21], [0.884, 0.206], [0.91, 0.201], [0.935, 0.196], [0.96, 0.19], [0.985, 0.184]];
const band = (y, a, b) => Math.min(1, Math.max(0, (y - a) / (b - a)));
const torsoN = (y) => 2.25 + 0.55 * band(y, 1.15, 1.34) - 0.55 * band(y, 1.445, 1.48);
const flare = (y) => 0.13 + 0.07 * Math.pow(Math.min(1, Math.max(0, (0.985 - y) / 0.139)), 1.2);
const inSE = (x, z, a, b, n) => Math.abs(x / a) ** n + Math.abs(z / b) ** n;   // <= 1 inside
const run = async (name, pose) => {
  const g = (await import(url + '?' + name)).default(THREE);
  const shift = new THREE.Vector3();
  // undo the placement shift so the authored formulas apply
  g.children[0].getWorldPosition(shift); shift.sub(new THREE.Vector3(0, 0.95, 0));
  const J = g.userData.joints;
  for (const [k, r] of Object.entries(pose)) J[k].rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);
  g.updateMatrixWorld(true);
  const verts = (jn, hex) => { const out = []; J[jn].children.forEach((m) => { if (!m.isMesh || m.material.color.getHex() !== hex) return; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).sub(shift)); }); return out; };
  const res = [];
  for (const side of ['left', 'right']) {
    // 1. flap vertices: inside belt band -> must be inside the belt; above the belt -> inside the torso
    let out = 0, worst = 0, n = 0;
    for (const v of verts(side + 'UpperLeg', 0x2d3656)) {
      n++;
      if (v.y >= 0.968 && v.y <= 1.05) { const a = lerpTab(BELT, v.y), k = inSE(v.x, v.z, a, a * 0.713, 3); if (k > 1.0) { out++; worst = Math.max(worst, k); } }
      else if (v.y > 1.05) { const r = lerpTab(TORSO, v.y), k = inSE(v.x, v.z, r, r * 0.62, torsoN(v.y)); if (k > 1.0) { out++; worst = Math.max(worst, k); } }
    }
    res.push(`${side} flap: ${out}/${n} vertices escape belt or torso (worst ${worst.toFixed(3)})`);
    // 2. thigh vertices vs the fixed skirt, at bearings the fixed skirt covers
    let cut = 0, deep = 0, m = 0;
    for (const v of verts(side + 'UpperLeg', 0xcdbf9f)) {
      if (v.y < 0.846 || v.y > 0.985) continue;
      const phi = Math.atan2(v.x, v.z);
      if (Math.abs(phi) < 72 * DEG) continue;
      m++;
      const a = lerpTab(SKIRT, v.y), b = Math.cos(phi) >= 0 ? a * 0.72 : flare(v.y);
      const k = inSE(v.x, v.z, a, b, 3);
      if (k > 0.985) { cut++; deep = Math.max(deep, k); }
    }
    res.push(`${side} thigh: ${cut}/${m} vertices at or beyond the fixed skirt (worst ${deep.toFixed(3)})`);
  }
  console.log(name, '\n  ' + res.join('\n  '));
};
await run('rest', {});
await run('fwd60-back35', { leftUpperLeg: [-1.05], rightUpperLeg: [0.61] });
await run('back35-fwd60', { leftUpperLeg: [0.61], rightUpperLeg: [-1.05] });
await run('run', { leftUpperLeg: [-1.0, 0, 0.02], leftLowerLeg: [1.2], rightUpperLeg: [0.6, 0, -0.02], rightLowerLeg: [0.3] });
await run('abducted', { leftUpperLeg: [-0.5, 0, 0.1], rightUpperLeg: [0.3, 0, -0.1] });
await run('game roll', { leftUpperLeg: [-1.9], rightUpperLeg: [-1.8], leftLowerLeg: [2.2], rightLowerLeg: [2.1] });
await run('game climb', { leftUpperLeg: [-1.6], rightUpperLeg: [0.35], leftLowerLeg: [2.1], rightLowerLeg: [0.9] });
await run('game vault', { leftUpperLeg: [-1.35], rightUpperLeg: [-1.1], leftLowerLeg: [1.7], rightLowerLeg: [1.5] });
await run('game landing', { leftUpperLeg: [-0.75], rightUpperLeg: [-0.55], leftLowerLeg: [1.3], rightLowerLeg: [1.15] });
await run('game brace', { leftUpperLeg: [-1.05, 0, 0.05], rightUpperLeg: [0.9, 0, -0.05] });
