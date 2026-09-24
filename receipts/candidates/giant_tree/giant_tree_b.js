// giant_tree, arm B: built from profiles.
// The bole is a loft of rings with eight flutes, one ridge over each buttress root; the ridges
// draw together in pairs as they rise, so by 30 m the section is a cross of four lobes and each
// lobe hands over to a limb. Three burls swell on it. The tall arched hollow at the foot, facing
// +Z between the two front roots, is cut into the same rings: under a pointed arch the rings
// step 2.6 m back, and the normals in there turn down so the hollow reads dark in any light.
// Each of the eight buttress roots is a loft of ridge sections, tall against the bole and falling
// in a concave crest to a low tip 12.6 to 14.3 m out, along a curve that bends in plan. Limbs,
// branches and a central leader are tubes swept along curves with a tapering radius. The crown
// is fifteen cushions turned on a lathe and pushed into lumps, each fern green on top and moss
// green underneath. Moss is a collar lofted round the foot of the bole and caps along five root
// crests. Twelve teardrop pods turned on a lathe hang on swept threads under the crown, in spore
// lime, as one mesh: userData.parts.glow.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
  const BARK = mat(0x5a4030, 0.95, 'timber');
  const MOSS = mat(0x4f7a3a, 0.9, 'foliage');
  const FERN = mat(0x7da04a, 0.85, 'foliage');
  // spore lime is emission only; the base is fern green, so a dimmed pod still reads as a pod
  const SPORE = mat(0x7da04a, 0.55, 'foliage', { emissive: 0xc3f25a, emissiveIntensity: 1.2 });

  let seed = 606060;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const at = (deg, r, y) => V(Math.sin(deg * D) * r, y, Math.cos(deg * D) * r);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  // a millimetre grid key for a vertex; toFixed would tell -0.000 from 0.000 and split a seam
  const key = (x, y, z) => `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;

  // ---- helpers ------------------------------------------------------------------------------------
  const buckets = new Map();
  const add = (geo, m) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(o);
    return o;
  };
  // smooth normals, with the seam and pole copies of a vertex averaged together
  const weld = (geo) => {
    geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, sum = new Map();
    const k3 = (i) => key(p.getX(i), p.getY(i), p.getZ(i));
    for (let i = 0; i < p.count; i++) {
      const k = k3(i), s = sum.get(k) || new THREE.Vector3();
      sum.set(k, s.add(new THREE.Vector3().fromBufferAttribute(n, i)));
    }
    for (let i = 0; i < p.count; i++) { const s = sum.get(k3(i)).clone().normalize(); n.setXYZ(i, s.x, s.y, s.z); }
    return geo;
  };
  // a surface through a grid of points, rows P[i], columns P[i][j]
  const sheet = (P) => {
    const rows = P.length, cols = P[0].length, pos = [], uv = [], idx = [];
    P.forEach((row, i) => row.forEach((q, j) => { pos.push(q.x, q.y, q.z); uv.push(j / (cols - 1), i / (rows - 1)); }));
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
  };
  const curve = (pts) => new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  // a tube along a curve whose radius follows rad(t)
  const sweep = (c, rad, TS, RS) => {
    const tube = new THREE.TubeGeometry(c, TS, 1, RS, false);
    const p = tube.attributes.position, q = new THREE.Vector3(), w = new THREE.Vector3();
    for (let i = 0; i <= TS; i++) {
      const r = rad(i / TS);
      c.getPointAt(i / TS, q);
      for (let j = 0; j <= RS; j++) {
        const k = i * (RS + 1) + j;
        w.fromBufferAttribute(p, k).sub(q).multiplyScalar(r).add(q);
        p.setXYZ(k, w.x, w.y, w.z);
      }
    }
    return weld(tube);
  };
  // hand the faces of a non-indexed geometry to one of two geometries by where their centre lies
  const split = (geo, pick) => {
    const p = geo.attributes.position, n = geo.attributes.normal, u = geo.attributes.uv;
    const out = [{ p: [], n: [], u: [] }, { p: [], n: [], u: [] }];
    for (let f = 0; f < p.count; f += 3) {
      const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
      const cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3, o = out[pick(cx, cy, cz) ? 0 : 1];
      for (let k = f; k < f + 3; k++) {
        o.p.push(p.getX(k), p.getY(k), p.getZ(k)); o.n.push(n.getX(k), n.getY(k), n.getZ(k)); o.u.push(u.getX(k), u.getY(k));
      }
    }
    return out.map(({ p: P, n: N, u: U }) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      return geo;
    });
  };

  // ---- layout ---------------------------------------------------------------------------------------
  // [azimuth, reach from the axis, height against the bole, bend and curl in plan (deg)]
  const ROOTS = [
    [41, 13.3, 10.4, -8, 6], [81, 12.6, 8.8, 7, -5], [121, 14.0, 11.0, -6, 7], [161, 12.9, 9.4, 9, -4],
    [200, 14.3, 10.2, -7, 5], [240, 12.7, 9.0, 8, -6], [280, 13.8, 10.8, -9, 4], [319, 13.2, 10.0, 7, -7],
  ];
  const LIMBS = [68, 158, 248, 338];                   // roots (0, 1) feed the first limb, and so on
  const SPLIT = 30;                                     // where the bole parts into its four limbs
  const ridgeAz = (i, y) => ROOTS[i][0] + wrap(LIMBS[i >> 1] - ROOTS[i][0]) * smooth(1, SPLIT, y);
  const lean = (y) => { const s = Math.max(0, y) / SPLIT; return V(0.8 * s * s, 0, -0.5 * s * s); };
  const Rb = (y) => 3.25 + 0.85 * Math.exp(-y / 14) + 0.45 * Math.exp(-y / 1.8) + 0.5 * smooth(21, SPLIT + 1, y);
  const BURLS = [[140, 15.5, 0.75], [255, 20.5, 0.8], [52, 12, 0.6]];    // [azimuth, height, swell]
  const boleR = (th, y) => {
    const sig = 12 + 9 * smooth(14, SPLIT, y);
    let ridges = 0;
    for (let i = 0; i < 8; i++) { const d = wrap(th - ridgeAz(i, y)) / sig; ridges += Math.exp(-d * d); }
    const amp = 0.17 - 0.05 * smooth(0, 14, y) + 0.2 * smooth(18, SPLIT, y);
    let r = Rb(y) * (1 + amp * (ridges - 0.4));
    for (const [a, h, s] of BURLS) { const u = wrap(th - a) / 15, w = (y - h) / 2.4; r += s * Math.exp(-u * u - w * w); }
    return r;
  };
  // the hollow: a lancet arch of half width AW springing at AS, its arcs of radius AR, cut AD deep
  const AW = 1.9, AS = 6.4, AD = 2.6, AR = 2.4 * AW, AH = Math.sqrt(AR * AR - (AR - AW) ** 2);
  const archW = (y) => (y <= AS ? AW : y >= AS + AH ? 0 : Math.sqrt(AR * AR - (y - AS) ** 2) - (AR - AW));
  const hollow = (x, y) => {
    const w = archW(y);
    if (w <= 0 || Math.abs(x) >= w) return 0;
    return AD * Math.sqrt(w / AW) * (1 - Math.pow(Math.abs(x) / w, 8));
  };
  const DARK = V(0, -1, -0.3).normalize();              // what the normals turn to inside the hollow

  // ---- the bole ---------------------------------------------------------------------------------------
  {
    const COLS = [];
    for (let k = 0; k < 18; k++) COLS.push(-36 + 4 * k);          // dense across the hollow
    for (let k = 0; k < 30; k++) COLS.push(36 + 9.6 * k);
    COLS.push(324);                                               // the seam, the same as -36
    const YS = [0, 0.5, 1.3, 2.4, 3.6, 4.9, AS, 7.2, 7.9, 8.5, 9.0, 9.45, 9.85, AS + AH, 10.9, 12.3, 14.5, 17, 19.5, 22, 24.5, 26.5, 28, 29.3];
    const lobe = (th) => Math.max(...LIMBS.map((a) => Math.exp(-((wrap(th - a) / 24) ** 2))));
    const P = [], deep = [];
    for (const y of YS) {
      const l = lean(y);
      P.push(COLS.map((th) => {
        const r = boleR(th, y), q = V(l.x + Math.sin(th * D) * r, y, l.z + Math.cos(th * D) * r);
        const d = Math.cos(th * D) > 0.5 ? hollow(Math.sin(th * D) * r, y) : 0;
        deep.push(d / AD);
        return q.setZ(q.z - d);
      }));
    }
    // the crotch: the lobes rise into the limbs, the middle dips into a shallow cup
    const l = lean(SPLIT);
    for (const [dy, lift, k] of [[1.2, 2.2, 0.88], [2.0, 1.6, 0.55]]) {
      P.push(COLS.map((th) => {
        const r = boleR(th, 29.3) * k, e = lobe(th);
        deep.push(0);
        return V(l.x + Math.sin(th * D) * r, 29.3 + dy + lift * e, l.z + Math.cos(th * D) * r);
      }));
    }
    P.push(COLS.map(() => { deep.push(0); return V(l.x, 31.2, l.z); }));
    const geo = weld(sheet(P));
    const n = geo.attributes.normal, w = new THREE.Vector3();
    for (let i = 0; i < n.count; i++) {
      if (!deep[i]) continue;
      const k = Math.pow(deep[i], 0.4);
      w.fromBufferAttribute(n, i).multiplyScalar(1 - k).addScaledVector(DARK, k).normalize();
      n.setXYZ(i, w.x, w.y, w.z);
    }
    add(geo, BARK);
    // a floor for the hollow, in shadow like its walls
    const floor = new THREE.CircleGeometry(4.0, 16).rotateX(-Math.PI / 2).translate(0, 0.02, 0).toNonIndexed();
    const fn = floor.attributes.position.count;
    floor.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: fn }, () => [DARK.x, DARK.y, DARK.z]).flat(), 3));
    add(floor, BARK);
  }

  // moss: a collar lofted round the back of the bole, clear of the hollow, 14 cm off the bark
  {
    const NU = 44, NV = 4, A0 = 30, A1 = 330;
    const rise = (th) => {
      const t = th * D;
      const h = 2.8 + 5.0 * Math.max(0, Math.sin(2 * t + 0.8)) + 4.0 * Math.max(0, Math.sin(3 * t + 2.1)) + 0.6 * Math.sin(7 * t);
      return 0.4 + h * smooth(A0, A0 + 22, th) * smooth(A1, A1 - 22, th);
    };
    const P = [];
    for (let i = 0; i <= NV; i++) {
      const row = [];
      for (let j = 0; j <= NU; j++) {
        const th = A0 + ((A1 - A0) * j) / NU, y = (i / NV) * rise(th), l = lean(y), r = boleR(th, y) + 0.14;
        row.push(V(l.x + Math.sin(th * D) * r, y, l.z + Math.cos(th * D) * r));
      }
      P.push(row);
    }
    add(weld(sheet(P)), MOSS);
  }

  // ---- buttress roots: ridge sections lofted along a curve that bends in plan -------------------------
  const S0 = 3.2, NS = 12;
  ROOTS.forEach(([az, L, H, bend, curl], i) => {
    const plan = (s) => { const a = az + bend * Math.sin(Math.PI * s) + curl * s * s * s, r = S0 + (L - S0) * s; return V(Math.sin(a * D) * r, 0, Math.cos(a * D) * r); };
    // the section at station k: feet on the ground, a crest h high; `fat` grows it for the moss
    const section = (k, fat = 0, lo = 0.7) => {
      const s = k / NS, c = plan(s), t = plan(Math.min(1, s + 0.01)).sub(plan(Math.max(0, s - 0.01))).normalize();
      const n = V(-t.z, 0, t.x), end = k === NS;
      const h = (end ? 0.05 : 0.6 + (H - 0.6) * Math.pow(1 - s, 1.8)) + fat;
      const wc = (end ? 0.05 : 0.85 * (1 - 0.6 * s) * (0.25 + 0.75 * smooth(0, 0.1, s))) + fat;
      const wb = end ? 0.08 : wc + 1.3 * smooth(0, 0.25, s) * (1 - 0.65 * s);
      const wm = wc * 1.12 + (wb - wc) * 0.3;
      const sec = [[-wb, 0], [-wm, 0.28], [-wc, lo], [-0.55 * wc, 0.93], [0, 1], [0.55 * wc, 0.93], [wc, lo], [wm, 0.28], [wb, 0]];
      return sec.map(([x, f]) => c.clone().addScaledVector(n, x).setY(f * h));
    };
    const P = [];
    for (let k = 0; k <= NS; k++) P.push(section(k));
    add(weld(sheet(P)), BARK);
    // moss capping the crest of five of them, its lower edge wavering
    if ([0, 2, 3, 5, 6].includes(i)) {
      const Q = [];
      for (let k = 2; k <= 9; k++) Q.push(section(k, 0.14, rr(0.74, 0.86)).slice(2, 7));
      add(weld(sheet(Q)), MOSS);
    }
  });

  // ---- the crown: [azimuth, distance out, height, radius, half height, where the fern starts] -------
  const CLUMPS = [
    [77, 15.2, 42.6, 7.2, 4.6, 0.25], [167, 15.0, 43.2, 7.0, 4.5, 0.25], [257, 15.3, 42.1, 7.4, 4.7, 0.25], [347, 15.1, 42.9, 7.0, 4.5, 0.25],
    [113, 14.5, 39.9, 6.0, 3.9, 0.35], [203, 14.7, 39.5, 6.3, 4.0, 0.35], [293, 14.4, 40.3, 6.0, 3.9, 0.35], [23, 14.6, 39.7, 6.1, 4.0, 0.35],
    [48, 8.5, 49.4, 7.2, 4.8, 0.05], [138, 8.8, 49.9, 6.6, 4.5, 0.05], [228, 8.2, 48.8, 6.9, 4.7, 0.05], [318, 8.6, 49.7, 6.5, 4.5, 0.05],
    [100, 6.5, 53.2, 6.0, 4.1, -0.1], [280, 6.8, 52.7, 6.2, 4.2, -0.1],
    [10, 1.2, 55.4, 7.6, 4.6, -0.25],
  ];
  const centre = (k) => { const [az, r, y] = CLUMPS[k]; return at(az, r, y).add(lean(SPLIT)); };

  // ---- limbs, branches and a leader: swept tubes --------------------------------------------------------
  const top = lean(SPLIT);
  const limbCurves = LIMBS.map((az, k) => {
    const c = curve([at(az, 0.8, 24.5), at(az, 2.9, 29.6), at(az + 3, 6.0, 34.0), at(az + 6, 9.6, 37.8),
      at(az + 8, 13.0, 40.9), at(az + 9, 14.6, 42.1)].map((q) => q.add(top)));
    add(sweep(c, (t) => 2.5 - 1.55 * Math.pow(t, 0.8), 18, 9), BARK);
    // a branch up into the upper ring, and one out to the rim between this limb and the next
    for (const [t0, to] of [[0.42, 8 + k], [0.62, 4 + k]]) {
      const s = c.getPointAt(t0), e = s.clone().lerp(centre(to), 0.84);
      const m = s.clone().lerp(e, 0.5).add(V(0, 1.2, 0));
      add(sweep(curve([s, m, e]), (t) => 1.25 - 0.7 * t, 8, 6), BARK);
    }
    return c;
  });
  add(sweep(curve([V(top.x, 27, top.z), V(top.x + 0.3, 38, top.z + 0.2), centre(14).setY(54)]), (t) => 1.9 - 1.3 * t, 10, 7), BARK);

  // ---- clumps: cushions turned on a lathe, pushed into lumps, fern green above a wavering line --------
  const PROF = [[0, -0.62], [0.45, -0.66], [0.8, -0.44], [1, -0.02], [0.92, 0.42], [0.66, 0.76], [0.33, 0.95], [0, 1]];
  CLUMPS.forEach(([, , , R, H, fern], k) => {
    const geo = new THREE.LatheGeometry(PROF.map(([a, b]) => new THREE.Vector2(a, b)), 12);
    const p = geo.attributes.position, seen = new Map(), f1 = rr(0, 6.28), f2 = rr(0, 6.28);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), yy = p.getY(i), z = p.getZ(i);
      const kk = key(x, yy, z);
      if (!seen.has(kk)) {
        const a = Math.atan2(x, z);
        const lob = 1 + 0.13 * Math.sin(3 * a + f1) + 0.07 * Math.sin(5 * a + f2) + rr(-0.06, 0.06);
        seen.set(kk, [x * lob * R, (yy + rr(-0.07, 0.07)) * H, z * lob * R]);
      }
      const q = seen.get(kk);
      p.setXYZ(i, q[0], q[1], q[2]);
    }
    const c = centre(k), f3 = rr(0, 6.28);
    weld(geo.rotateY(rr(0, 6.28)).translate(c.x, c.y, c.z));
    const [lit, shade] = split(geo.toNonIndexed(), (x, y, z) => (y - c.y) / H > fern + 0.14 * Math.sin(3 * Math.atan2(x - c.x, z - c.z) + f3));
    add(lit, FERN);
    add(shade, MOSS);
  });

  // ---- pods: lathed teardrops on swept threads, under the rim and along the limbs ---------------------
  const POD = [[0, -1], [0.34, -0.86], [0.56, -0.5], [0.62, -0.05], [0.52, 0.42], [0.3, 0.78], [0.12, 0.96], [0, 1]];
  const pods = [];
  const hang = (a, drop, k) => {
    const sw = rr(0, 6.28), e = a.clone().add(V(0.4 * Math.sin(sw), -drop, 0.4 * Math.cos(sw)));
    const m = a.clone().lerp(e, 0.5).add(V(0.3 * Math.cos(sw), 0, -0.3 * Math.sin(sw)));
    add(sweep(curve([a, m, e.clone().add(V(0, -0.35 * k, 0))]), (t) => 0.17 - 0.05 * t, 6, 4), FERN);
    const pod = new THREE.LatheGeometry(POD.map(([x, y]) => new THREE.Vector2(x * k, y * k)), 7);
    pods.push(weld(pod.rotateY(rr(0, 6.28)).translate(e.x, e.y - k, e.z)).toNonIndexed());
  };
  // under the four limb ends and the four rim clumps between them: [clump, azimuth nudge, drop, size]
  for (const [k, da, drop, s] of [[0, -6, 5.6, 1.25], [1, 5, 6.4, 1.15], [2, -4, 5.2, 1.3], [3, 6, 6.0, 1.2],
    [4, 4, 3.8, 1.1], [5, -5, 4.4, 1.25], [6, 5, 3.4, 1.15], [7, -4, 4.2, 1.35]]) {
    const [az, r, y, , H] = CLUMPS[k];
    hang(at(az + da, r - 1.2, y - 0.45 * H).add(lean(SPLIT)), drop, s);
  }
  // from the undersides of the limbs, nearer the bole
  [[0, 0.4, 3.0, 1.05], [1, 0.46, 3.4, 1.15], [2, 0.38, 2.7, 1.1], [3, 0.44, 3.2, 1.2]].forEach(([li, t, drop, s]) => {
    hang(limbCurves[li].getPointAt(t), drop, s);
  });

  // ---- meshes: one per material, and the pods on their own; nothing below the ground ------------------
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
  const glow = new THREE.Mesh(merge(pods), SPORE);
  glow.name = 'glow';
  g.add(glow);

  // ---- place: base on y = 0, centred on x and z --------------------------------------------------------
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

  g.userData.parts = { glow };
  return g;
}
