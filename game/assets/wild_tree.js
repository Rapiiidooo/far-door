// wild_tree, arm B: built from profiles.
// The bole is a loft: rings of a five-lobed section, swollen at the foot, that turn about the
// axis as they rise, so the flutes wind up the trunk. Each buttress root is a side profile,
// tall against the bole and falling in a concave curve to the ground 3 m out, extruded to a
// bevelled plank that thins towards its tip, with a surface root swept on past the tip. Limbs,
// branches and vines are tubes swept along curves with a tapering radius; the vine leaves are
// extruded blades. The crown is eleven cushions turned on a lathe and pushed into lumps, fern
// green high up and moss green lower down. Moss is a collar lofted round the foot of the bole
// a few centimetres off the bark, with a wavy top edge, and a swept blanket along three root crests.
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

  let seed = 240926;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const at = (deg, r, y) => V(Math.sin(deg * D) * r, y, Math.cos(deg * D) * r);
  // a millimetre grid key for a vertex; toFixed would tell -0.000 from 0.000 and split a seam
  const key = (x, y, z) => `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;

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

  // ---- the bole: a lofted, five-lobed section that turns as it rises -------------------------
  const TOP = 8.8, TW = 0.12, PH = 14 * D;           // top, twist (rad per m), first flute at the foot
  const lean = (y) => { const s = Math.max(0, y) / TOP; return V(0.24 * s * s, 0, -0.16 * s * s); };
  const Rb = (y) => 0.6 + 0.2 * (1 - y / TOP) + 0.45 * Math.exp(-y / 0.6);
  const Ab = (y) => 0.07 + 0.2 * Math.exp(-y / 1.1);
  const YS = [0, 0.18, 0.42, 0.75, 1.15, 1.65, 2.3, 3.1, 4.0, 5.0, 6.0, 7.0, 7.9, 8.8];
  const RS = 20;
  {
    const pos = [], uvs = [], idx = [];
    const rows = YS.length + 1;                          // and a last row gathered to a point on top
    for (let i = 0; i < rows; i++) {
      const y = i < YS.length ? YS[i] : TOP + 0.3, l = lean(y);
      for (let j = 0; j <= RS; j++) {
        const th = (j / RS) * Math.PI * 2;
        const r = i < YS.length ? Rb(y) * (1 + Ab(y) * Math.cos(5 * (th - PH - TW * y))) : 0;
        pos.push(l.x + Math.sin(th) * r, y, l.z + Math.cos(th) * r);
        uvs.push(j / RS, y / TOP);
      }
    }
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < RS; j++) {
      const a = i * (RS + 1) + j, b = a + 1, c = a + RS + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    add(weld(geo), BARK);
  }

  // moss: a collar lofted round the foot of the bole, 4 cm off the bark, its top edge a wave
  {
    const NU = 40, NV = 4, P = [], U = [], idx = [];
    const rise = (th) => 0.35 + 1.0 * Math.max(0, Math.sin(2 * th + 0.8)) + 0.8 * Math.max(0, Math.sin(3 * th + 2.1)) + 0.15 * Math.sin(7 * th);
    for (let i = 0; i <= NV; i++) for (let j = 0; j <= NU; j++) {
      const th = (j / NU) * Math.PI * 2, y = (i / NV) * rise(th), l = lean(y);
      const r = Rb(y) * (1 + Ab(y) * Math.cos(5 * (th - PH - TW * y))) + 0.04;
      P.push(l.x + Math.sin(th) * r, y, l.z + Math.cos(th) * r);
      U.push(j / NU, i / NV);
    }
    for (let i = 0; i < NV; i++) for (let j = 0; j < NU; j++) {
      const a = i * (NU + 1) + j, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    geo.setIndex(idx);
    add(weld(geo), MOSS);
  }

  // ---- buttress roots: a side profile extruded to a plank ----------------------------------------
  // [azimuth, height against the bole, reach]; each sits on a flute, where it meets the bole
  const ROOTS = [[22, 4.0, 3.2], [95, 3.6, 3.0], [167, 4.2, 3.35], [237, 3.5, 3.05], [310, 3.9, 3.2]];
  const BEV = 0.07;                                    // the bevel grows the profile by this much all round
  ROOTS.forEach(([deg, H, L], i) => {
    const P0 = new THREE.Vector2(0.3, H - BEV), P1 = new THREE.Vector2(0.95, 0.6 * H);
    const P2 = new THREE.Vector2(1.5, 0.75), P3 = new THREE.Vector2(L - BEV, BEV + 0.02);
    const s = new THREE.Shape();
    s.moveTo(0.3, BEV);
    s.lineTo(P0.x, P0.y);
    s.bezierCurveTo(P1.x, P1.y, P2.x, P2.y, P3.x, P3.y);
    s.lineTo(0.3, BEV);
    const T = 0.36;
    const geo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: true, bevelThickness: 0.1, bevelSize: BEV, bevelSegments: 2, curveSegments: 12, steps: 1 });
    geo.translate(0, 0, -T / 2);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {                // thinner towards the tip
      const f = Math.min(1, Math.max(0, (p.getX(k) - 0.8) / (L - 0.8)));
      p.setZ(k, p.getZ(k) * (1 - 0.5 * f));
    }
    geo.computeVertexNormals();
    add(geo.rotateY(deg * D - Math.PI / 2), BARK);
    // a surface root swept on past the tip, bending away
    // it starts inside the plank, where the plank is thicker than the tube, so its open end never shows
    const tail = curve([at(deg, L - 1.15, 0.06), at(deg + 1, L - 0.3, 0.05), at(deg + 3, L + 0.25, 0.04), at(deg + 7, L + 0.65, 0.02)]);
    add(sweep(tail, (t) => 0.17 + 0.05 * Math.sin(Math.PI * t) - 0.12 * t, 14, 6), BARK);
    // moss along the crest of three of them
    if (i % 2 === 0) {
      const crest = new THREE.CubicBezierCurve(P0, P1, P2, P3);
      const pts = [];
      for (let k = 0; k <= 6; k++) { const q = crest.getPoint(0.3 + 0.075 * k); pts.push(at(deg, q.x, q.y + 0.02)); }
      add(sweep(curve(pts), (t) => 0.04 + 0.2 * Math.pow(Math.sin(Math.PI * t), 0.6), 12, 6), MOSS);
    }
  });

  // ---- the crown: [azimuth, distance out, height, radius, half height, fern?] -------------------
  const CLUMPS = [
    [34, 4.4, 11.5, 2.7, 1.6, 0], [156, 4.4, 11.2, 2.8, 1.6, 0], [272, 4.5, 11.7, 2.7, 1.6, 0],     // limb ends
    [96, 4.7, 10.6, 2.2, 1.3, 0], [214, 4.8, 10.4, 2.2, 1.3, 1], [334, 4.7, 10.8, 2.3, 1.35, 0],    // low rim
    [70, 2.4, 13.3, 2.5, 1.5, 1], [190, 2.5, 13.1, 2.5, 1.5, 1], [310, 2.3, 13.5, 2.4, 1.45, 1],    // upper
    [128, 3.0, 12.3, 2.0, 1.2, 1], [0, 0.4, 14.7, 2.3, 1.2, 1],                                     // between, top
  ];
  const centre = (k) => { const [deg, r, y] = CLUMPS[k]; return at(deg, r, y); };

  // ---- limbs and branches: swept tubes -------------------------------------------------------------
  // [azimuth, clumps fed (its own end first)]
  const LIMBS = [[34, [0, 3, 6, 10]], [156, [1, 4, 7, 9]], [272, [2, 5, 8]]];
  const limbCurves = LIMBS.map(([deg, feeds]) => {
    const c = curve([at(deg - 18, 0.05, 6.9), at(deg - 14, 0.6, 8.5), at(deg - 9, 1.5, 9.6), at(deg - 5, 2.5, 10.4),
      at(deg - 1, 3.4, 11.0), at(deg + 1, 3.9, 11.3)].map((q) => q.add(lean(TOP))));
    add(sweep(c, (t) => 0.52 - 0.36 * Math.pow(t, 0.85), 22, 8), BARK);
    feeds.slice(1).forEach((k, j) => {
      const s = c.getPointAt(0.42 + 0.1 * j), e = s.clone().lerp(centre(k), 0.82);
      const m = s.clone().lerp(e, 0.5).add(V(0, 0.35, 0));
      add(sweep(curve([s, m, e]), (t) => 0.21 - 0.14 * t, 8, 6), BARK);
    });
    return c;
  });

  // ---- clumps: cushions turned on a lathe, then pushed into lumps ---------------------------------
  const PROF = [[0, -0.62], [0.45, -0.66], [0.8, -0.44], [1, -0.02], [0.92, 0.42], [0.66, 0.76], [0.33, 0.95], [0, 1]];
  for (const [deg, r, y, R, H, fern] of CLUMPS) {
    const geo = new THREE.LatheGeometry(PROF.map(([a, b]) => new THREE.Vector2(a, b)), 11);
    const p = geo.attributes.position, seen = new Map(), f1 = rr(0, 6.28), f2 = rr(0, 6.28);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), yy = p.getY(i), z = p.getZ(i);
      const k = key(x, yy, z);
      if (!seen.has(k)) {
        const a = Math.atan2(x, z);
        const lob = 1 + 0.13 * Math.sin(3 * a + f1) + 0.07 * Math.sin(5 * a + f2) + rr(-0.06, 0.06);
        seen.set(k, [x * lob * R, (yy + rr(-0.07, 0.07)) * H, z * lob * R]);
      }
      const q = seen.get(k);
      p.setXYZ(i, q[0], q[1], q[2]);
    }
    const c = at(deg, r, y);
    add(weld(geo.rotateY(rr(0, 6.28)).translate(c.x, c.y, c.z)), fern ? FERN : MOSS);
  }

  // ---- vines: swept tubes hanging from the limbs, with extruded leaf blades ------------------------
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.17, 0.16, 0, 0.46);
  leafShape.quadraticCurveTo(-0.17, 0.16, 0, 0);
  const LEAF = new THREE.ExtrudeGeometry(leafShape, { depth: 0.035, bevelEnabled: false, curveSegments: 3 }).translate(0, 0, -0.0175).scale(1.35, 1.3, 1);
  [[0, 0.64], [1, 0.5], [1, 0.7], [2, 0.6]].forEach(([li, t], i) => {
    const top = limbCurves[li].getPointAt(t), drop = 3.4 + 0.2 * i, sw = rr(0, 6.28);
    const pts = [top.clone().add(V(0, 0.2, 0))];
    for (let k = 1; k <= 5; k++) pts.push(top.clone().add(V(0.2 * Math.sin(k * 1.3 + sw), -drop * k / 5, 0.2 * Math.cos(k * 1.1 + sw))));
    const c = curve(pts);
    add(sweep(c, (t2) => 0.1 - 0.04 * t2, 18, 5), FERN);
    for (let k = 0; k < 7; k++) {
      const q = c.getPointAt(Math.min(1, 0.16 + 0.135 * k + rr(-0.03, 0.03))), a = k * 2.4 + sw;
      const dir = V(Math.cos(a), -1.1, Math.sin(a)).normalize();
      const leaf = LEAF.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
      add(leaf.translate(q.x, q.y, q.z), FERN);
    }
  });

  // ---- meshes: one per material; nothing below the ground -------------------------------------------
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

  // ---- place: base on y = 0, centred on x and z -------------------------------------------------------
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
