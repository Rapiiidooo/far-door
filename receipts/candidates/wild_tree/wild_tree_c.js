// wild_tree, arm C: a second reading, one strand per root.
// The bole is not a column but six strands, each a swept tube that rises from the foot of its
// own buttress root and winds a quarter turn round the others up to 7 m, where the strands
// part in pairs into three heavy twin limbs; each strand runs on into a pad of the crown. The
// buttresses are lofted: vertical slices along a line that curls over the ground in the sense
// of the twist, each slice a ridge with a flared foot, tallest where it meets its strand. The
// crown is three tiers of thick lobed pads (fern green tops, moss green undersides and rims)
// with gaps between the tiers where the limbs show. Moss on the roots and the foot of the
// strands is not added geometry: those faces are handed to the moss material, along the crest
// of four roots and up the strands under a wavy line. Vines are swept tubes with flattened
// octahedra for leaves.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = name;
    return m;
  };
  const BARK = mat(0x5a4030, 0.95, 'timber');
  const MOSS = mat(0x4f7a3a, 0.9, 'foliage');
  const FERN = mat(0x7da04a, 0.85, 'foliage');

  let seed = 770707;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const at = (deg, r, y) => V(Math.sin(deg * D) * r, y, Math.cos(deg * D) * r);

  const buckets = new Map();
  const add = (geo, m) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(o);
    return o;
  };
  const build = (P, N, U, idx) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    if (N) geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    if (idx) geo.setIndex(idx);
    return geo;
  };
  // hand every triangle to one of two materials by a test on its centre, face normal and uv
  const split = (geo, test, mA, mB) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    const p = o.attributes.position, n = o.attributes.normal, u = o.attributes.uv;
    const A = [[], [], []], B = [[], [], []];
    const a = V(0, 0, 0), b = V(0, 0, 0), c = V(0, 0, 0), e = V(0, 0, 0), f = V(0, 0, 0);
    for (let t = 0; t < p.count; t += 3) {
      a.fromBufferAttribute(p, t); b.fromBufferAttribute(p, t + 1); c.fromBufferAttribute(p, t + 2);
      const fn = e.subVectors(b, a).cross(f.subVectors(c, a)).normalize();
      const uv = [(u.getX(t) + u.getX(t + 1) + u.getX(t + 2)) / 3, (u.getY(t) + u.getY(t + 1) + u.getY(t + 2)) / 3];
      const dst = test(a.clone().add(b).add(c).multiplyScalar(1 / 3), fn, uv) ? A : B;
      for (let k = t; k < t + 3; k++) {
        dst[0].push(p.getX(k), p.getY(k), p.getZ(k));
        dst[1].push(n.getX(k), n.getY(k), n.getZ(k));
        dst[2].push(u.getX(k), u.getY(k));
      }
    }
    if (A[0].length) add(build(...A), mA);
    if (B[0].length) add(build(...B), mB);
  };
  // a tube along a curve whose radius follows rad(t)
  const sweep = (curve, rad, TS, RS) => {
    const tube = new THREE.TubeGeometry(curve, TS, 1, RS, false);
    const p = tube.attributes.position, c = new THREE.Vector3(), w = new THREE.Vector3();
    for (let i = 0; i <= TS; i++) {
      const t = i / TS, r = rad(t);
      curve.getPointAt(t, c);
      for (let j = 0; j <= RS; j++) {
        const k = i * (RS + 1) + j;
        w.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c);
        p.setXYZ(k, w.x, w.y, w.z);
      }
    }
    return tube;
  };
  const curve = (pts) => new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  // a curve through keyed points with a radius at each key, the radius following arc length
  const keyed = (keys) => {
    const c = curve(keys.map((k) => k[0])), L = c.getLengths(300), n = keys.length - 1;
    const us = keys.map((_, j) => L[Math.round((j / n) * 300)] / L[300]);
    const rad = (t) => {
      let j = 0;
      while (j < n - 1 && us[j + 1] < t) j++;
      const f = Math.min(1, Math.max(0, (t - us[j]) / (us[j + 1] - us[j])));
      return keys[j][1] + (keys[j + 1][1] - keys[j][1]) * f;
    };
    return { c, rad };
  };

  // ---- six strands, twisting up the bole and parting in pairs into three limbs ------------------
  const TW = 12;                                        // degrees of twist per metre
  const BASE = [0, 1, 2, 3, 4, 5].map((i) => -42 + 60 * i + rr(-5, 5));
  const azAt = (i, y) => BASE[i] + TW * y;
  const LIMB = [0, 1, 2].map((k) => (azAt(2 * k, 7.1) + azAt(2 * k + 1, 7.1)) / 2);

  // ---- the crown: [azimuth, distance out, height, radius, dome, underside] ------------------------
  // pads 0 to 5 take the strand ends (even strands the low tier, odd the middle); 6 to 9 sit on branches
  const PADS = [
    [LIMB[0] - 26, 4.75, 10.1, 2.45, 0.95, 0.6], [LIMB[0] + 24, 3.6, 12.3, 2.8, 1.2, 0.65],
    [LIMB[1] - 26, 4.8, 9.8, 2.2, 0.85, 0.55], [LIMB[1] + 24, 3.5, 12.0, 2.6, 1.05, 0.6],
    [LIMB[2] - 26, 4.7, 10.3, 2.4, 1.0, 0.6], [LIMB[2] + 24, 3.6, 12.5, 2.75, 1.15, 0.65],
    [LIMB[0] + 2, 1.55, 14.3, 2.35, 1.2, 0.6], [LIMB[1] + 2, 1.7, 14.0, 2.1, 1.0, 0.55],
    [LIMB[2] + 2, 1.5, 14.5, 2.25, 1.1, 0.55], [LIMB[0] + 60, 0.3, 15.0, 1.6, 0.85, 0.45],
  ];
  const padAt = (k) => at(PADS[k][0], PADS[k][1], PADS[k][2]);

  // moss climbs the strands to a wavy line, higher on some sides than others
  const mossLine = (x, z) => {
    const a = Math.atan2(x, z);
    return 0.9 + 1.3 * Math.max(0, Math.sin(2 * a + 1.3)) + 0.8 * Math.max(0, Math.sin(3 * a - 0.4)) + 0.2 * Math.sin(9 * a);
  };
  const strands = [];
  for (let i = 0; i < 6; i++) {
    const k = i >> 1, side = i % 2 ? 1 : -1, pad = PADS[i], lim = LIMB[k];
    const keys = [
      [at(azAt(i, 0), 0.55, 0), 0.33], [at(azAt(i, 1.5), 0.52, 1.5), 0.31], [at(azAt(i, 3.0), 0.51, 3.0), 0.3],
      [at(azAt(i, 4.5), 0.5, 4.5), 0.295], [at(azAt(i, 6.0), 0.52, 6.0), 0.29], [at(azAt(i, 7.1), 0.64, 7.1), 0.285],
      [at(lim + side * 11, 1.3, 8.3), 0.27], [at(lim + side * 7, 2.2, 9.1), 0.24],
    ];
    if (side < 0) keys.push([at(pad[0] + 6, 3.3, 9.55), 0.19], [at(pad[0], 4.1, 9.9), 0.12], [at(pad[0] - 3, 4.6, 10.05), 0.05]);
    else keys.push([at(pad[0] - 6, 2.75, 10.5), 0.2], [at(pad[0], 3.15, 11.4), 0.13], [at(pad[0] + 2, 3.4, 12.0), 0.05]);
    const s = keyed(keys);
    strands.push(s);
    split(sweep(s.c, s.rad, 40, 7), (c, n) => c.y < mossLine(c.x, c.z) && n.x * c.x + n.z * c.z > 0, MOSS, BARK);
  }
  // a core to close the middle of the bundle
  add(new THREE.CylinderGeometry(0.34, 0.4, 7.4, 8, 1, false).translate(0, 3.7, 0), BARK);
  add(new THREE.SphereGeometry(0.5, 8, 5).scale(1, 0.8, 1).translate(0, 7.3, 0), BARK);

  // branches from the twin limbs up into the top tier: [strand, where on it, pad]
  for (const [si, t, k] of [[1, 0.66, 6], [3, 0.66, 7], [5, 0.66, 8], [0, 0.62, 9]]) {
    const s = strands[si].c.getPointAt(t), e = padAt(k).add(V(0, -0.2, 0));
    const m = s.clone().lerp(e, 0.5).add(at(PADS[k][0], 0.3, 0));
    add(sweep(curve([s, m, e]), (u) => 0.2 - 0.14 * u, 10, 6), BARK);
  }

  // ---- buttress roots: lofted vertical slices, a ridge with a flared foot -------------------------
  const finLoft = (a0, H, L, curl) => {
    const NS = 13, K = 8, rows = [];
    for (let i = 0; i <= NS; i++) {
      const f = Math.pow(i / NS, 1.35), r = 0.42 + (L - 0.42) * f;
      rows.push({ f, c: at(a0 + curl * f * f + 4 * Math.sin(f * 5 + a0), r, 0) });
    }
    const P = [], U = [], idx = [];
    rows.forEach(({ f, c }, i) => {
      const t = rows[Math.min(NS, i + 1)].c.clone().sub(rows[Math.max(0, i - 1)].c).setY(0).normalize();
      const lat = V(t.z, 0, -t.x);
      const crest = 0.06 + H * Math.pow(1 - f, 2.2);
      const wF = 0.12 + 0.46 * (1 - f), wT = 0.05 + 0.14 * (1 - f);
      for (let k = 0; k <= K; k++) {
        const s = -1 + (2 * k) / K, psi = (s * Math.PI) / 2;
        const w = Math.sin(psi) * (wT + (wF - wT) * Math.pow(Math.abs(s), 3));
        const y = crest * Math.pow(Math.max(0, Math.cos(psi)), 0.55);
        const q = c.clone().addScaledVector(lat, w).setY(y);
        P.push(q.x, q.y, q.z); U.push(k / K, f);
      }
    });
    for (let i = 0; i < NS; i++) for (let k = 0; k < K; k++) {
      const a = i * (K + 1) + k, b = a + 1, c = a + K + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    // close the tip on a point just beyond the last slice
    const last = rows[NS].c, tip = last.clone().addScaledVector(last.clone().setY(0).normalize(), 0.14).setY(0.02);
    const pole = P.length / 3;
    P.push(tip.x, tip.y, tip.z); U.push(0.5, 1);
    for (let k = 0; k < K; k++) idx.push(NS * (K + 1) + k, pole, NS * (K + 1) + k + 1);
    const geo = build(P, null, U, idx);
    geo.computeVertexNormals();
    return geo;
  };
  BASE.forEach((a0, i) => {
    const fin = finLoft(a0, 2.8 + 0.25 * ((i * 7) % 3), 3.05 + 0.3 * (i % 2), 10);
    // moss along the crest of four of them, from near the bole to part way down
    const f0 = 0.08 + 0.08 * rnd(), f1 = 0.4 + 0.3 * rnd(), mossy = i % 3 !== 2;
    split(fin, (c, n, uv) => mossy && uv[1] > f0 && uv[1] < f1 && Math.abs(uv[0] - 0.5) < 0.36, MOSS, BARK);
  });

  // ---- the pads: a lobed lathe, fern green above the rim and moss green below it -------------------
  const PROF = [[0, 1], [0.42, 0.95], [0.74, 0.72], [0.93, 0.36], [1, 0], [0.9, -0.52], [0.52, -0.9], [0, -1]];
  const RIM = 4;                                       // bands above this profile point are the lit top
  for (const [deg, r, y, R, hT, hB] of PADS) {
    const S = 12, c = at(deg, r, y), f1 = rr(0, 6.28), f2 = rr(0, 6.28);
    const lobe = [], lift = [];
    for (let j = 0; j < S; j++) {
      const a = (j / S) * Math.PI * 2;
      lobe.push(1 + 0.12 * Math.sin(3 * a + f1) + 0.07 * Math.sin(5 * a + f2) + rr(-0.05, 0.05));
      lift.push(PROF.map(() => rr(-0.16, 0.16)));
    }
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(-0.07, 0.07), rr(0, 6.28), rr(-0.07, 0.07)));
    // the top poles and rim stay put; the rings between them heave, so the top is lumpy, not a cap
    const pt = (k, j) => {
      const [pr, ph] = PROF[k], jj = j % S, a = (jj / S) * Math.PI * 2;
      const heave = k === 0 || k === RIM || k === PROF.length - 1 ? 0 : lift[jj][k];
      const h = ph > 0 ? ph * hT + heave * hT : ph * hB + 0.5 * heave * hB;
      return V(Math.sin(a) * pr * R * lobe[jj], h, Math.cos(a) * pr * R * lobe[jj]).applyQuaternion(tilt).add(c);
    };
    const top = [[], [], []], bot = [[], [], []];
    const tri = (dst, p, q, s, v) => {
      const n = q.clone().sub(p).cross(s.clone().sub(p)).normalize();
      for (const w of [p, q, s]) { dst[0].push(w.x, w.y, w.z); dst[1].push(n.x, n.y, n.z); dst[2].push(v[0], v[1]); }
    };
    for (let k = 0; k < PROF.length - 1; k++) for (let j = 0; j < S; j++) {
      const dst = k < RIM ? top : bot, uv = [j / S, k / 7];
      const a = pt(k, j), b = pt(k, j + 1), cc = pt(k + 1, j), d = pt(k + 1, j + 1);
      if (k > 0) tri(dst, a, cc, b, uv);                  // the top pole has no upper triangle
      if (k < PROF.length - 2) tri(dst, b, cc, d, uv);    // nor the bottom pole a lower one
    }
    add(build(...top), FERN);
    add(build(...bot), MOSS);
  }

  // ---- vines: swept tubes hanging from the limbs, leaves of flattened octahedra --------------------
  [[0, 0.8], [2, 0.8], [4, 0.78], [3, 0.76]].forEach(([si, t], i) => {
    const top = strands[si].c.getPointAt(t), drop = 3.5 + 0.2 * i, sw = rr(0, 6.28);
    const pts = [top.clone().add(V(0, 0.15, 0))];
    for (let k = 1; k <= 5; k++) pts.push(top.clone().add(V(0.18 * Math.sin(k * 1.3 + sw), -drop * k / 5, 0.18 * Math.cos(k * 1.1 + sw))));
    const c = curve(pts);
    add(sweep(c, (u) => 0.1 - 0.04 * u, 18, 5), FERN);
    for (let k = 0; k < 8; k++) {
      const q = c.getPointAt(Math.min(1, 0.14 + 0.115 * k + rr(-0.03, 0.03))), a = k * 2.4 + sw;
      const dir = V(Math.cos(a), -1.2, Math.sin(a)).normalize();
      const leaf = new THREE.OctahedronGeometry(1, 0).scale(0.15, 0.32, 0.06).translate(0, 0.28, 0)
        .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir)).translate(q.x, q.y, q.z);
      leaf.computeVertexNormals();
      add(leaf, FERN);
    }
  });

  // ---- meshes: one per material; nothing below the ground ---------------------------------------------
  const merge = (geos) => {
    let n = 0;
    for (const x of geos) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of geos) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    for (let i = 1; i < pos.length; i += 3) if (pos[i] < 0) pos[i] = 0;
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  for (const [m, geos] of buckets) g.add(new THREE.Mesh(merge(geos), m));

  // ---- place: base on y = 0, centred on x and z ---------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
