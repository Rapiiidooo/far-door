// Throwaway: where does a rotated thigh (first-pass lathe, pivot y 0.92) reach, per x slice?
// Prints, for thigh x = -1.0 (forward) and +0.6 (back), the extreme z of the thigh surface at a few heights.
const piv = 0.92, R = [[0.07, 0.5], [0.074, 0.55], [0.083, 0.7], [0.089, 0.83], [0.087, 0.9], [0.06, 0.945]];
const rAt = (y) => { for (let i = 0; i < R.length - 1; i++) { const [r0, y0] = R[i], [r1, y1] = R[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0; };
const pts = [];
for (let y = 0.5; y <= 0.945; y += 0.004) for (let a = 0; a < 64; a++) { const r = rAt(y), t = a / 64 * Math.PI * 2; pts.push([0.1 + r * Math.sin(t), y, r * Math.cos(t)]); }
for (let a = 0; a < 64; a++) for (let b = 0; b <= 16; b++) { const t = a / 64 * Math.PI * 2, p = b / 16 * Math.PI / 2; const r = 0.084; pts.push([0.1 + r * Math.cos(p) * Math.sin(t), piv + r * Math.sin(p), r * Math.cos(p) * Math.cos(t)]); pts.push([0.1 + r * Math.cos(p) * Math.sin(t), piv - r * Math.sin(p), r * Math.cos(p) * Math.cos(t)]); }
for (const th of [-1.0, 0.6]) {
  const c = Math.cos(th), s = Math.sin(th);
  const rot = pts.map(([x, y, z]) => { const dy = y - piv; return [x, piv + dy * c - z * s, dy * s + z * c]; });
  console.log('thigh x =', th);
  for (const xs of [0.02, 0.06, 0.1, 0.14, 0.18]) {
    const row = [];
    for (const ys of [0.86, 0.9, 0.94, 0.97]) {
      let zmax = -1, zmin = 1;
      for (const [x, y, z] of rot) if (Math.abs(x - xs) < 0.006 && Math.abs(y - ys) < 0.006) { zmax = Math.max(zmax, z); zmin = Math.min(zmin, z); }
      row.push(`y${ys}: ${zmax > -1 ? (th < 0 ? zmax : zmin).toFixed(3) : '  -  '}`);
    }
    console.log(`  x ${xs}`, row.join('  '));
  }
}
