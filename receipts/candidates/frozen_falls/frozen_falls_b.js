// frozen_falls, candidate B: profiles.
// One side profile is swept across the width as a single skin: the ice leaves the rock at
// the top, rolls over the brow of the lip, tucks in, steps out onto a ledge and swells into
// the bulge, draws in again, and runs out along the ground as the apron. The sweep fans out
// as it falls and rounds onto the rock at both edges, where the apron also sinks to the
// ground. Ten ridged ribs of uneven width and height flute it, scalloping the lip, swelling
// at their own heights and spreading into lobes on the apron; every inner grid point is
// nudged so the facets come out chunky and uneven, and the bulge sits higher on some ribs
// than on others. Each facet is coloured by where it lies: frost where the profile looks up
// (the lip and its brow, the ledge over the bulge, the foot), deep ice in the grooves and
// under the bulge, ice blue on the ribs. Twelve icicles are five-sided lathes under the
// brow, and one flat plate closes the back.
export default function (THREE) {
  const g = new THREE.Group();
  g.userData.mounts = 'back';

  const mat = (hex, rough) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, flatShading: true });
  // Ice has no recipe in the contract's list, so its materials stay unnamed; the game gives
  // ice its gloss and translucency at load.
  const ICE = mat(0xa9d2e3, 0.35);
  const DEEP = mat(0x5b9bbd, 0.4);
  const FROST = mat(0xe9f2f6, 0.85);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // --- triangles, bucketed per material --------------------------------------------------
  const buckets = new Map([[ICE, []], [DEEP, []], [FROST, []]]);
  const tri = (m, a, b, c) => buckets.get(m).push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const _e1 = V(0, 0, 0), _e2 = V(0, 0, 0), _n = V(0, 0, 0);
  const normalOf = (a, b, c) => _n.crossVectors(_e1.subVectors(b, a), _e2.subVectors(c, a)).normalize();

  // Built against a back plane at z = 0 (the cliff); the placement at the end recentres.
  // --- the side profile, (y, z) from the rock at the top to the front edge of the apron ---
  const PROFILE = [
    [7.85, 0], [7.88, 0.38], [7.78, 0.8], [7.5, 1.02], [7.15, 0.95], [6.85, 0.74], [6.25, 0.64],
    [5.45, 0.66], [5.15, 0.96], [4.65, 1.26], [3.9, 1.32], [3.1, 1.16], [2.4, 0.9], [1.5, 0.8],
    [0.95, 0.86], [0.68, 1.06], [0.55, 1.32], [0.42, 1.55], [0.22, 1.71], [0, 1.77],
  ];
  const curve = new THREE.CatmullRomCurve3(PROFILE.map(([y, z]) => V(0, y, z)), false, 'centripetal');
  const ROWS = 24;
  const P = curve.getSpacedPoints(ROWS);
  // outward normal of the profile at each row: +z down the curtain, +y on top of the lip
  const N = P.map((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(ROWS, i + 1)];
    const t = V(0, b.y - a.y, b.z - a.z).normalize();
    return V(0, t.z, -t.y);
  });

  // Half width by height: the curtain fans out as it falls, rounded at the top corners, and
  // the apron spreads wider still.
  const HW = [[8.1, 1.45], [7.85, 1.72], [7.2, 1.82], [5.5, 1.98], [3.8, 2.12], [1.5, 2.2], [0.7, 2.34], [0, 2.5]];
  const halfWidth = (y) => {
    for (let i = 0; i < HW.length - 1; i++) {
      const [y0, w0] = HW[i], [y1, w1] = HW[i + 1];
      if (y >= y1) return w1 + (w0 - w1) * smooth(y1, y0, y);
    }
    return HW[HW.length - 1][1];
  };
  // The ice thins towards its edges: flat across the middle, rounding onto the rock.
  const taper = (u) => Math.cbrt(Math.max(0, 1 - Math.abs(u) ** 3));
  // How much a row belongs to the apron: there the sides also sink to the ground.
  const apronness = (p) => 1 - smooth(0.75, 1.3, p.y);
  // The fall is not even across its width: the bulge swells more in places and the brow
  // juts further in others.
  const depthMod = (u, y) => 1
    + (0.08 * Math.sin(2.6 * u + 0.9) + 0.05 * Math.sin(5.3 * u + 2.0)) * Math.exp(-(((y - 4.1) / 1.3) ** 2))
    + 0.1 * Math.sin(3.7 * u + 0.4) * Math.exp(-(((y - 7.4) / 0.5) ** 2));
  // The bulge sits higher on some ribs than others, so its ledge of frost and its shadowed
  // underside run across the fall in a wave rather than a straight band.
  const lift = (u, y) => (0.32 * Math.sin(2.2 * u + 0.7) + 0.14 * Math.sin(5.1 * u + 2.3)) * smooth(1.4, 2.6, y) * (1 - smooth(5.9, 6.7, y));
  // -1..1, fixed per grid point, so every load builds the same ice
  const hash = (a, b, c) => { const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return (h - Math.floor(h)) * 2 - 1; };

  // --- the ribs --------------------------------------------------------------------------
  // Ten ribs of uneven width (in u, which runs -1..1 across the curtain) and uneven height,
  // each a ridged column like a crystal's prism: two broad faces meeting at a ridge, with a
  // steep, narrow groove wall either side. Each swells at its own height, a few fade out
  // before the foot, and the grooves between them wander a little as they fall.
  const WIDTHS = [0.14, 0.26, 0.11, 0.22, 0.3, 0.16, 0.24, 0.12, 0.28, 0.17];
  const sum = WIDTHS.reduce((a, b) => a + b, 0);
  const grooves = [-1];
  for (const w of WIDTHS) grooves.push(grooves[grooves.length - 1] + (2 * w) / sum);
  grooves[grooves.length - 1] = 1;
  // height (m), how fast and where it swells, and the height below which it fades out
  const RIBS = [
    { h: 0.2, f: 0.9, ph: 0.4, end: 2.8 }, { h: 0.38, f: 0.7, ph: 2.2, end: 0 },
    { h: 0.2, f: 1.1, ph: 4.1, end: 3.6 }, { h: 0.32, f: 0.6, ph: 1.0, end: 0 },
    { h: 0.44, f: 0.95, ph: 3.3, end: 0 }, { h: 0.24, f: 0.65, ph: 5.2, end: 1.6 },
    { h: 0.36, f: 1.05, ph: 0.9, end: 0 }, { h: 0.18, f: 0.75, ph: 2.9, end: 4.2 },
    { h: 0.4, f: 0.85, ph: 4.6, end: 0 }, { h: 0.22, f: 0.8, ph: 1.7, end: 2.2 },
  ];
  // u samples across a rib (the groove, one shoulder, the ridge, the other shoulder) and
  // how far the rib stands out there
  const FR = [0, 0.14, 0.5, 0.86], SEC = [0, 0.66, 1, 0.64];
  const cols = [];
  for (let i = 0; i < WIDTHS.length; i++) FR.forEach((f, k) => cols.push({ rib: i, f, sec: SEC[k] }));
  cols.push({ rib: WIDTHS.length - 1, f: 1, sec: 0 });
  const uAt = (c, y) => {
    const wob = (k) => (k === 0 || k === grooves.length - 1 ? 0 : 0.03 * Math.sin(y * 0.8 + k * 1.7));
    const a = grooves[c.rib] + wob(c.rib), b = grooves[c.rib + 1] + wob(c.rib + 1);
    return a + (b - a) * c.f;
  };
  // How strongly the ribs stand out: a little on top of the lip, where they scallop its
  // edge, full from the brow down, about half on the apron, where each rib becomes a lobe.
  const ribAmp = (p) => (0.3 + 0.7 * smooth(7.85, 7.6, p.y)) * (1 - 0.5 * apronness(p));
  const ribTall = (i, y) => {
    const r = RIBS[i];
    return r.h * (0.7 + 0.3 * Math.sin(y * r.f + r.ph)) * (r.end ? smooth(r.end - 0.7, r.end + 0.5, y) : 1);
  };
  const ribH = (c, y) => c.sec * ribTall(c.rib, y);

  // --- the swept skin --------------------------------------------------------------------
  // Every inner grid point is nudged a few centimetres, so the facets are chunky and uneven
  // rather than a regular grid; points on the rock and on the ground stay put.
  const grid = P.map((p, i) => cols.map((c, j) => {
    const u = uAt(c, p.y), t = taper(u);
    const inner = i > 0 && i < ROWS ? Math.sqrt(t) : 0;
    const r = ribH(c, p.y) * ribAmp(p) * Math.sqrt(t) + 0.05 * hash(i, j, 3) * inner;
    // no vertical nudge near the lip's top, which sets the height
    const y = p.y * (1 - apronness(p) * (1 - t ** 0.8)) + lift(u, p.y) + 0.1 * hash(i, j, 2) * inner * (p.y < 7.5 ? 1 : 0);
    const x = u * halfWidth(p.y) + 0.04 * hash(i, j, 1) * inner;
    // on top of the lip the profile's normal leans back a little: keep the ribs off the rock
    return V(x, i === ROWS ? 0 : Math.max(0, y + N[i].y * r), Math.max(0, p.z * t * depthMod(u, p.y) + N[i].z * r));
  }));
  for (let i = 0; i < ROWS; i++) {
    const apron = P[i].y < 0.75 && P[i].z > 1.0;
    // how the profile itself faces here: up on the lip, the ledge and the foot, down under
    // the brow and the bulge; the bands of frost and shadow follow it
    const up = (N[i].y + N[i + 1].y) / 2;
    for (let j = 0; j < cols.length - 1; j++) {
      const a = grid[i][j], b = grid[i][j + 1], c = grid[i + 1][j], d = grid[i + 1][j + 1];
      // the steep walls of each groove are deep ice, all the way down
      const inGroove = cols[j].f === 0 || cols[j + 1].f === 1 || cols[j + 1].f === 0;
      // the two triangles of a quad, wound to face out of the rock
      for (const [p0, p1, p2] of [[a, c, b], [b, c, d]]) {
        const n = normalOf(p0, p1, p2);
        let m = ICE;
        if (apron) {
          // frost on the lobes nearest the foot, where the spray settled
          if (!inGroove && n.y > 0.55 && (p0.z + p1.z + p2.z) / 3 < 1.45) m = FROST;
          else if (inGroove) m = DEEP;
        } else if (up > 0.72 || (!inGroove && (up > 0.42 || n.y > 0.6 || (P[i].y > 7.3 && up > 0.12)))) m = FROST;
        else if ((up < -0.22 && n.y < -0.15) || inGroove) m = DEEP;
        tri(m, p0, p1, p2);
      }
    }
  }

  // --- icicles: lathes of five facets ---------------------------------------------------
  // [x, top, z, length, radius], hanging from under the brow
  const ICICLES = [
    [-1.42, 7.08, 0.74, 0.7, 0.1], [-1.1, 7.08, 0.84, 1.35, 0.14], [-0.8, 7.08, 0.86, 0.55, 0.09],
    [-0.5, 7.08, 0.87, 1.7, 0.17], [-0.2, 7.08, 0.87, 0.8, 0.11], [0.12, 7.08, 0.87, 1.25, 0.15],
    [0.42, 7.08, 0.87, 0.5, 0.08], [0.72, 7.08, 0.86, 1.55, 0.16], [1.02, 7.08, 0.84, 0.65, 0.1],
    [1.34, 7.08, 0.78, 1.1, 0.13], [-1.62, 7.2, 0.5, 1.5, 0.15], [1.58, 7.2, 0.52, 1.25, 0.14],
  ];
  const A = V(0, 0, 0), B = V(0, 0, 0), C = V(0, 0, 0);
  for (const [x, top, z, len, r] of ICICLES) {
    const prof = [[0.001, -len], [0.36 * r, -0.62 * len], [0.78 * r, -0.26 * len], [r, 0], [0.001, 0.1]].map(([a, b]) => new THREE.Vector2(a, b));
    const q = new THREE.LatheGeometry(prof, 5, x * 3.1).toNonIndexed().attributes.position;
    const off = V(x, top, z);
    for (let i = 0; i < q.count; i += 3) {
      A.fromBufferAttribute(q, i).add(off); B.fromBufferAttribute(q, i + 1).add(off); C.fromBufferAttribute(q, i + 2).add(off);
      if (normalOf(A, B, C).lengthSq() < 0.5) continue;   // the lathe's poles collapse to slivers
      tri(ICE, A, B, C);
    }
  }

  for (const [m, arr] of buckets) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, m));
  }

  // --- the face on the rock --------------------------------------------------------------
  // One flat plate facing the cliff, over the skin's edge on the rock and the icicles at the
  // ends of the brow, so the back is a single plane.
  {
    const cover = (y) => {
      let w = 0;
      for (const [x, top, , len, r] of ICICLES) if (y <= top + 0.1 && y >= top - len) w = Math.max(w, Math.abs(x) + r + 0.02);
      return w;
    };
    // sampled up the height; the skin's edge lies on the rock at x = halfWidth(y) or inside it
    const right = [[2.51, 0]];
    for (let y = 0.1; y < 7.9; y += 0.25) right.push([Math.max(halfWidth(y), cover(y)) + 0.01, y]);
    const topY = Math.max(...grid.flat().map((q) => q.y));
    right.push([halfWidth(topY) + 0.01, topY]);
    const s = new THREE.Shape();
    const pts = right.concat(right.slice().reverse().map(([x, y]) => [-x, y]));
    s.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
    const plate = new THREE.ShapeGeometry(s);
    plate.rotateY(Math.PI);
    g.add(new THREE.Mesh(plate, DEEP));
  }

  // --- place: base on y = 0, centred on x and z ------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (m4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mm.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
