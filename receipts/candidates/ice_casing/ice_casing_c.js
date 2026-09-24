// ice_casing, arm C: a second reading, the ice as rinds that froze round the stone.
// Three shells follow the glyph stela's outline, 3 cm off it, each thicker and
// taller than the one inside it, and each is cracked into six to nine wedge
// shards. A shard is hand-built BufferGeometry: its inner and outer faces are
// rows of points where rays from the stela's axis meet the stela's outline
// grown by the clearance (and by the shell's thickness), rising to a shoulder
// at the crown and a pitched cap that runs over it to a broken point. The
// cracks open outward in a V that shows deep ice. Facets that face up are frost.
// 1.8 x 2.98 x 1.21 m, hollow round the 1.3 x 2.4 x 0.68 m stela at its centre.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- the stela it closes round (game/assets/glyph_stela.js) ---------------
  // Rows up its height: [y, half width, half depth] of the box each band of the
  // shell has to clear: the base tiers, the shaft with its lens bezel (mirrored
  // at the back, so the hollow is symmetric), the top of the shaft and the first
  // crown step. Above them the crown's top step is 0.5 x 0.32 m at 2.4 m.
  const ROWS = [[0, 0.65, 0.34], [0.28, 0.65, 0.34], [0.55, 0.575, 0.32], [1.0, 0.5, 0.337],
    [1.6, 0.484, 0.337], [2.08, 0.466, 0.3], [2.2, 0.42, 0.26]];
  const TOP = [2.4, 0.25, 0.16];
  const CLEAR = 0.03;
  // Distance along the ray at angle a (from +Z towards +X) to the outline of the
  // box [hx, hz] grown by r, corners rounded.
  const reach = (a, hx, hz, r) => {
    const dx = Math.abs(Math.sin(a)), dz = Math.abs(Math.cos(a));
    if (dx > 1e-9 && ((hx + r) / dx) * dz <= hz) return (hx + r) / dx;
    if (dz > 1e-9 && ((hz + r) / dz) * dx <= hx) return (hz + r) / dz;
    const b = dx * hx + dz * hz;
    return b + Math.sqrt(Math.max(0, b * b - hx * hx - hz * hz + r * r));
  };

  // ---- repeatable roughness: the same nudge for the same point ---------------
  const hash = (x, y, z, k) => {
    const s = Math.sin(Math.round(x * 1000) * 12.9898 + Math.round(y * 1000) * 78.233 + Math.round(z * 1000) * 37.719 + k * 11.13) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };

  // ---- one shard ---------------------------------------------------------------
  // The sector of a shell between two cracks at angles a0 and a1 (degrees),
  // off the stela by CLEAR + off, t thick. tip: [k, y]: its cap runs over the
  // crown to a point k past the centre, at height y; broken: the cap stops that
  // fraction of the way there and ends in a broken face. Returns triangles
  // tagged by the face they belong to.
  const deg = Math.PI / 180;
  // Seen from its axis, the stela's corners lie 55 to 63 degrees either side of
  // the front and back, lower on the shaft than on the base. A straight facet
  // across a corner cuts into it, so a shard that spans one has rays close
  // together through that range, and elsewhere no facet spans more than 30 degrees.
  const CORNERS = [55.5, 58, 60.5, 62.5].flatMap((c) => [c, 180 - c, 180 + c, 360 - c]);
  const shard = (s, seed) => {
    const { off, t } = s;
    const rays = [s.a0];
    const inside = CORNERS.flatMap((c) => [c - 360, c, c + 360]).filter((c) => c > s.a0 + 1.5 && c < s.a1 - 1.5).sort((x, y) => x - y);
    for (const stop of [...inside, s.a1]) {
      const from = rays[rays.length - 1], n = Math.max(1, Math.ceil((stop - from) / 30));
      for (let i = 1; i <= n; i++) rays.push(from + ((stop - from) * i) / n);
    }
    const U = rays.map((r) => (r - s.a0) / (s.a1 - s.a0));
    const ang = (u, outer) => {
      // the crack opens outward: 0.5 deg of gap at the inner face, 3.5 at the outer;
      // the rays inside the shard stay where they are
      const gp = (outer ? 3.5 : 0.5) * deg;
      const a = (s.a0 + (s.a1 - s.a0) * u) * deg;
      return u === 0 ? a + gp : u === 1 ? a - gp : a;
    };
    const rowsOf = (outer) => {
      const r = CLEAR + off + (outer ? t : 0);
      const rows = ROWS.map(([y, hx, hz], k) => U.map((u) => {
        const a = ang(u, outer), q = reach(a, hx, hz, r);
        const lift = outer && k === ROWS.length - 1 ? 0.35 * t : 0;
        return [q * Math.sin(a), y + lift, q * Math.cos(a)];
      }));
      // the brow over the crown's top step, then the point
      const brow = U.map((u) => {
        const a = ang(u, outer), q = reach(a, TOP[1], TOP[2], r);
        return [q * Math.sin(a), TOP[0] + r, q * Math.cos(a)];
      });
      rows.push(brow);
      return rows;
    };
    const inner = rowsOf(false), outer = rowsOf(true);
    // where the cap ends: the point past the centre, or a broken edge on the way
    const mid = ((s.a0 + s.a1) / 2) * deg;
    const tip = [-s.tip[0] * Math.sin(mid), s.tip[1], -s.tip[0] * Math.cos(mid)];
    const cut = (p) => (s.broken ? p.map((v, j) => v + (tip[j] - v) * s.broken) : tip);
    const ends = { inner: inner[inner.length - 1].map(cut), outer: outer[outer.length - 1].map(cut) };
    if (!s.broken) { ends.inner = [tip]; ends.outer = [tip]; }
    // roughen the outer face, bulging it between the cracks; the inner face stays
    // on its clearance
    const H = inner.length;
    outer.forEach((row, k) => row.forEach((p, j) => {
      const h = hash(p[0], p[1], p[2], seed), n = Math.hypot(p[0], p[2]) || 1;
      const push = h * 0.028 + (j > 0 && j < U.length - 1 ? 0.016 : 0);
      p[0] += (p[0] / n) * push; p[2] += (p[2] / n) * push;
      if (k > 0 && k < H - 1) p[1] += hash(p[0], p[1], p[2], seed + 1) * 0.04;
    }));
    const tris = [];
    const add = (tag, a, b, c, up) => tris.push([tag, a, b, c, up]);
    // a quad's two triangles take their frost from the quad's own normal, so a
    // roughened quad is frosted whole or not at all
    const quad = (tag, a, b, c, d) => {
      const e = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], f = [d[0] - b[0], d[1] - b[1], d[2] - b[2]];
      const n = [e[1] * f[2] - e[2] * f[1], e[2] * f[0] - e[0] * f[2], e[0] * f[1] - e[1] * f[0]];
      const up = n[1] / (Math.hypot(...n) || 1);
      add(tag, a, b, c, up); add(tag, a, c, d, up);
    };
    // outer and inner faces, band by band (inner wound the other way)
    for (let k = 0; k + 1 < H; k++) {
      for (let j = 0; j + 1 < U.length; j++) {
        quad('face', outer[k][j], outer[k][j + 1], outer[k + 1][j + 1], outer[k + 1][j]);
        quad('core', inner[k][j + 1], inner[k][j], inner[k + 1][j], inner[k + 1][j + 1]);
      }
      // the two crack faces
      quad('core', inner[k][0], outer[k][0], outer[k + 1][0], inner[k + 1][0]);
      quad('core', outer[k][U.length - 1], inner[k][U.length - 1], inner[k + 1][U.length - 1], outer[k + 1][U.length - 1]);
    }
    // the cap from the brow to the point, or to the broken edge and its face
    const bo = outer[H - 1], bi = inner[H - 1], eo = ends.outer, ei = ends.inner;
    if (!s.broken) {
      for (let j = 0; j + 1 < U.length; j++) { add('face', bo[j], bo[j + 1], tip); add('core', bi[j + 1], bi[j], tip); }
      add('core', bi[0], bo[0], tip);
      add('core', bo[U.length - 1], bi[U.length - 1], tip);
    } else {
      for (let j = 0; j + 1 < U.length; j++) {
        quad('face', bo[j], bo[j + 1], eo[j + 1], eo[j]);
        quad('core', bi[j + 1], bi[j], ei[j], ei[j + 1]);
        quad('core', eo[j], eo[j + 1], ei[j + 1], ei[j]);        // the broken face
      }
      quad('core', bi[0], bo[0], eo[0], ei[0]);
      quad('core', bo[U.length - 1], bi[U.length - 1], ei[U.length - 1], eo[U.length - 1]);
    }
    // the foot
    for (let j = 0; j + 1 < U.length; j++) quad('core', outer[0][j + 1], outer[0][j], inner[0][j], inner[0][j + 1]);
    return tris;
  };

  // ---- the three shells -----------------------------------------------------------
  // Crack angles run round from the front (0) towards +X, placed so the shards
  // are about as wide on the ends as on the faces; each shell's cracks fall
  // between the next shell's, so a crack always has ice behind it. Outer: the
  // thickest, nine shards whose points cross the centre and stand in a ragged
  // crown up to 3 m, two of them broken short. Middle: eight, points near 2.7 m.
  // Inner: deep ice, six, capped just over the crown.
  const ring = (cracks, spec) => cracks.map((a0, i) => ({ a0, a1: i + 1 < cracks.length ? cracks[i + 1] : cracks[0] + 360, ...spec(i) }));
  const SHELLS = {
    outer: ring([-30, 22, 64, 100, 136, 178, 222, 258, 296], (i) => ({
      off: 0.02, t: [0.18, 0.17, 0.18, 0.17, 0.18, 0.17, 0.18, 0.17, 0.18][i],
      tip: [[0.12, 2.98], [0.1, 2.82], [0.16, 2.9], [0.08, 2.74], [0.14, 2.94], [0.1, 2.8], [0.15, 2.88], [0.09, 2.76], [0.12, 2.86]][i],
      broken: [0, 0.55, 0, 0, 0, 0.6, 0, 0, 0][i],
      deep: i === 2 || i === 6,
    })),
    middle: ring([-6, 42, 82, 118, 160, 200, 240, 280], (i) => ({
      off: 0.015, t: 0.13,
      tip: [[0.08, 2.72], [0.06, 2.64], [0.09, 2.7], [0.05, 2.62], [0.08, 2.74], [0.06, 2.66], [0.07, 2.68], [0.06, 2.7]][i],
      broken: [0, 0, 0.5, 0, 0, 0, 0.45, 0][i],
      deep: i === 1 || i === 4,
    })),
    inner: ring([-15, 50, 110, 165, 230, 292], (i) => ({
      off: 0, t: 0.09,
      tip: [[0.03, 2.54], [0.02, 2.5], [0.03, 2.53], [0.02, 2.49], [0.03, 2.55], [0.02, 2.5]][i],
      broken: 0,
      deep: i !== 3,
    })),
  };

  // ---- build ------------------------------------------------------------------
  const pieces = [];
  for (const [ring, specs] of Object.entries(SHELLS)) {
    specs.forEach((s, n) => pieces.push({ ring, deep: s.deep, tris: shard(s, n * 13 + ring.length * 7) }));
  }
  // The loader centres an asset on its own bounds, so the stela ends up at the
  // centre of the casing's bounds. Where one side reaches further than the other,
  // slide the shard that bounds the short side out until they match. (Shards
  // share no points, so each can move alone.)
  for (const k of [0, 2]) {
    const pts = (q) => q.tris.flatMap(([, a, b, c]) => [a, b, c]);
    const lo = (q) => Math.min(...pts(q).map((p) => p[k])), hi = (q) => Math.max(...pts(q).map((p) => p[k]));
    const a = Math.min(...pieces.map(lo)), b = Math.max(...pieces.map(hi)), e = a + b;
    for (const q of pieces) {
      if ((e > 0 && lo(q) < a + 0.001) || (e < 0 && hi(q) > b - 0.001)) {
        for (const p of new Set(pts(q))) p[k] -= e;
      }
    }
  }
  // sort each shell's faces into ice, deep ice and frost
  const FROST = 0.42;                              // a facet this far up-facing is frost
  const COLOURS = { ice: [0xa9d2e3, 0.3], deep: [0x5b9bbd, 0.35], frost: [0xe9f2f6, 0.85] };
  const bins = {};
  for (const { ring, deep, tris } of pieces) {
    const b = (bins[ring] ||= { ice: [], deep: [], frost: [] });
    for (const [tag, a, p, c, up] of tris) {
      const ux = p[0] - a[0], uy = p[1] - a[1], uz = p[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
      if (l < 1e-9) continue;
      b[(up ?? ny / l) > FROST ? 'frost' : tag === 'core' || deep ? 'deep' : 'ice'].push(...a, ...p, ...c);
    }
  }
  const parts = {};
  for (const [name, rb] of Object.entries(bins)) {
    const grp = new THREE.Group();
    grp.name = name;
    for (const [key, arr] of Object.entries(rb)) {
      if (!arr.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      geo.computeVertexNormals();
      const [color, roughness] = COLOURS[key];
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
      mesh.name = `${name}_${key}`;
      grp.add(mesh);
    }
    g.add(grp);
    parts[name] = grp;
  }

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  // The three shells, outermost first: Groups of merged meshes (ice, deep ice,
  // frost), each origin on the ground at the centre, where the stela stands.
  g.userData.parts = { outer: parts.outer, middle: parts.middle, inner: parts.inner };
  return g;
}
