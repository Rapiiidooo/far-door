const D = Math.PI / 180;
const arch = (t0, t1, p, L, y0 = 0.04, n = 200) => {
  let r = 0, y = y0, peak = y0, peakU = 0;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, th = (t0 - (t0 - t1) * u ** p) * D;
    r += Math.cos(th) * L / n; y += Math.sin(th) * L / n;
    if (y > peak) { peak = y; peakU = (i + 1) / n; }
  }
  return { reach: +r.toFixed(3), tipY: +y.toFixed(3), peak: +peak.toFixed(3), peakU: +peakU.toFixed(2) };
};
const [a0, b0, p0, L0, a1, b1, p1, L1] = process.argv[2].split(',').map(Number);
for (const t of [0, 0.25, 0.5, 0.75, 1]) {
  const k = [a0 + (a1 - a0) * t, b0 + (b1 - b0) * t, p0 + (p1 - p0) * t, L0 + (L1 - L0) * t];
  console.log(t, k.map((x) => +x.toFixed(2)).join(','), JSON.stringify(arch(...k)));
}
