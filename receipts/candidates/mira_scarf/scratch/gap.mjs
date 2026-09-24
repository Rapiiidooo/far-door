// For each knit course of candidate A over the stone: how far its underside sits above whatever is
// below it (stone or frost), at the centre line and at both edges. Usage: node gap.mjs
import * as THREE from '/Users/rapido/perso/bittensor/404/far-door/node_modules/three/build/three.module.js';
const mod = await import('../mira_scarf_a.js?' + Date.now());
const g = mod.default(THREE);
g.updateMatrixWorld(true);
const below = [], courses = [];
g.traverse((n) => {
  if (!n.isMesh) return;
  if (n.material.name === 'fabric' && n.geometry.parameters && n.geometry.parameters.radialSegments === 6) courses.push(n);
  else if (n.material.name !== 'fabric') below.push(n);
});
below.forEach((m) => { m.material = m.material.clone(); m.material.side = THREE.DoubleSide; });
const rc = new THREE.Raycaster();
const v = new THREE.Vector3();
for (const c of courses) {
  const p = c.geometry.attributes.position;
  // the course's underside at three points across: its lowest vertices near each end and the middle
  const pts = [];
  for (let i = 0; i < p.count; i++) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(c.matrixWorld).clone());
  const minY = Math.min(...pts.map((q) => q.y));
  if (minY < 0.15) continue;
  const lows = pts.filter((q) => q.y < minY + 0.012);
  const gaps = lows.map((q) => {
    rc.set(new THREE.Vector3(q.x, q.y + 0.0001, q.z), new THREE.Vector3(0, -1, 0));
    const h = rc.intersectObjects(below, false)[0];
    return h ? q.y - h.point.y : NaN;
  });
  const mn = Math.min(...gaps), mx = Math.max(...gaps);
  console.log(`course at x ${c.position.x.toFixed(3)} y ${c.position.y.toFixed(3)}: underside above support ${(mn * 1000).toFixed(1)}..${(mx * 1000).toFixed(1)} mm`);
}
