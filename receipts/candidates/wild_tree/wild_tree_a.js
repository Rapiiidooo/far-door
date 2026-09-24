// wild_tree, arm A: assembled from primitives.
// The bole is one tapered cylinder, faceted, swollen at the foot and turned about its own
// axis as it rises so its facets wind round it. Each of the five buttress roots is three half
// cones sharing a vertical plane, from a tall short blade against the bole to a long low run
// out to the tip, whose sloping edges add up to a concave crest; a surface root of two tapered
// cylinders carries on past the tip. Three heavy limbs leave the bole at about 8 m as tapered
// cylinders with knuckle spheres at the elbows, and thinner branches run on from the elbows
// into the crown. The crown is ten clumps, each a lumpy flattened icosahedron in moss green
// with two fern green lobes breaking through its top. Four vines are chains of thin cylinders
// with leaves of flattened four-sided cones. Moss is primitive too: squashed spheres lying on
// the ground between the roots and on three crests, and sleeves of open cylinder wrapped round
// the foot of the bole with a ragged top edge.
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

  let seed = 16016;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const at = (deg, r, y) => V(Math.sin(deg * D) * r, y, Math.cos(deg * D) * r);
  // a millimetre grid key for a vertex; toFixed would tell -0.000 from 0.000 and split a seam
  const key = (x, y, z) => `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;

  const buckets = new Map();
  // flat shaded: every face keeps its own normal
  const add = (geo, m) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    o.computeVertexNormals();
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(o);
  };
  // push each distinct vertex in or out along its radius, the same for every copy of it,
  // so a polyhedron turns lumpy without opening cracks
  const lumpy = (geo, amt) => {
    const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = key(p.getX(i), p.getY(i), p.getZ(i));
      if (!seen.has(k)) seen.set(k, 1 + (rnd() * 2 - 1) * amt);
      const s = seen.get(k);
      p.setXYZ(i, p.getX(i) * s, p.getY(i) * s, p.getZ(i) * s);
    }
    return geo;
  };
  const blob = (detail, sx, sy, sz, amt) => lumpy(new THREE.IcosahedronGeometry(1, detail), amt).scale(sx, sy, sz);
  // a tapered cylinder from p0 (radius r0) to p1 (radius r1)
  const rod = (p0, p1, r0, r1, seg) => {
    const d = p1.clone().sub(p0), len = d.length();
    const geo = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false).translate(0, len / 2, 0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
    return geo.translate(p0.x, p0.y, p0.z);
  };
  const knuckle = (p, r) => new THREE.SphereGeometry(r, 8, 6).translate(p.x, p.y, p.z);

  // ---- the bole ---------------------------------------------------------------------------
  const TOP = 8.6;                                    // where the bole hands over to the limbs
  const lean = (y) => { const s = y / TOP; return V(0.22 * s * s, 0, -0.14 * s * s); };
  const flare = (y) => 1 + 0.55 * Math.exp(-y / 1.1);
  const boleR = (y) => (0.86 - 0.24 * Math.pow(y / TOP, 2 / 3)) * flare(y);
  {
    const geo = new THREE.CylinderGeometry(0.62, 0.86, TOP, 10, 9, false).translate(0, TOP / 2, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const y = TOP * Math.pow(Math.max(0, p.getY(i)) / TOP, 1.5);  // rings crowd towards the foot, where it swells
      const a = 1.3 * (y / TOP);                        // about 75 degrees of twist up the bole
      const f = flare(y), c = Math.cos(a), s = Math.sin(a), l = lean(y);
      p.setXYZ(i, (x * c + z * s) * f + l.x, y, (-x * s + z * c) * f + l.z);
    }
    add(geo, BARK);
  }

  // ---- buttress roots: [azimuth, size, reach from the axis] --------------------------------------
  // each is three half cones in one vertical plane, tall and short, short and long, whose sloping
  // edges add up to a concave crest from about 3 m up the bole down to the ground
  const ROOTS = [[10, 1.0, 3.3], [84, 0.88, 3.0], [150, 1.06, 3.4], [219, 0.84, 3.1], [291, 0.95, 3.25]];
  const OFF = 0.45;                                   // the blades start inside the bole
  // half of a four-sided cone: apex over the axis end, a half ellipse on the ground, cut on z = 0
  const blade = (deg, H, L, t) => new THREE.ConeGeometry(1, 1, 4, 1, true, -Math.PI / 2, Math.PI)
    .translate(0, 0.5, 0).scale(t, H, L).translate(0, 0, OFF).rotateY(deg * D);
  const BLADES = (k, L) => [[4.3 * k, 1.55, 0.5, 0], [2.4 * k, 2.35, 0.42, 2], [1.3 * k, L - OFF, 0.34, 4]];
  const crest = (k, L, r) => Math.max(0, ...BLADES(k, L).map(([H, len]) => H * (1 - (r - OFF) / len)));
  for (const [deg, k, L] of ROOTS) {
    for (const [H, len, t, turn] of BLADES(k, L)) add(blade(deg + turn, H, len, t), BARK);
    // a surface root carries on past the tip, half sunk, bending away to one side; it starts
    // deep in the blades so its end cap stays hidden
    const a = at(deg + 4, L - 1.3, 0.03), b = at(deg + 8, L + 0.05, 0.02), c = at(deg + 15, L + 0.55, 0.01);
    add(rod(a, b, 0.2, 0.15, 6), BARK);
    add(new THREE.SphereGeometry(0.15, 6, 4).translate(b.x, b.y, b.z), BARK);
    add(rod(b, c, 0.15, 0.02, 6), BARK);
  }

  // ---- moss: mounds at the foot between the roots, sleeves on the bole, cushions on three crests ---
  const oval = (sx, sy, sz) => new THREE.SphereGeometry(1, 9, 6).scale(sx, sy, sz);
  // part of an open cylinder wrapped round the bole a few centimetres off the bark, its top edge ragged
  const sleeve = (deg, arc, y0, y1) => {
    const geo = new THREE.CylinderGeometry(boleR(y1) + 0.04, boleR(y0) + 0.05, y1 - y0, 6, 2, true, (deg - arc / 2) * D, arc * D);
    const p = geo.attributes.position, top = (y1 - y0) / 2, l = lean((y0 + y1) / 2);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), f = (y + top) / (2 * top);
      p.setY(i, y + (f > 0.99 ? rr(-0.35, 0.2) : f > 0.4 ? rr(-0.12, 0.12) : 0));
    }
    return geo.translate(l.x, (y0 + y1) / 2, l.z);
  };
  ROOTS.forEach(([deg, k, L], i) => {
    const gap = deg + (((ROOTS[(i + 1) % 5][0] - deg + 360) % 360) / 2) + rr(-5, 5);
    const m = at(gap, 1.3, -0.04);
    add(oval(1.0, 0.3, 0.7).rotateY(gap * D).translate(m.x, m.y, m.z), MOSS);
    if (i !== 3) add(sleeve(gap + rr(-8, 8), rr(60, 85), 0.25, rr(1.9, 2.9)), MOSS);
    if (i % 2 === 0) {
      const r = rr(1.55, 1.85), slope = Math.atan2(2.4 * k, 2.35);
      const c = at(deg + 2, r, crest(k, L, r) - 0.08);
      add(oval(0.3, 0.15, 0.5).rotateX(slope).rotateY(deg * D).translate(c.x, c.y, c.z), MOSS);
    }
  });

  // ---- the crown: [azimuth, distance out, height, radius, half height] -----------------------
  const CLUMPS = [
    [30, 4.4, 11.6, 2.7, 1.65], [152, 4.4, 11.3, 2.8, 1.7], [268, 4.5, 11.9, 2.7, 1.65],   // limb ends
    [92, 4.6, 10.5, 2.3, 1.35], [210, 4.7, 10.3, 2.25, 1.3], [330, 4.6, 10.7, 2.3, 1.35],  // low rim
    [62, 2.2, 13.4, 2.5, 1.5], [190, 2.3, 13.2, 2.5, 1.5], [305, 2.1, 13.6, 2.4, 1.45],    // upper
    [0, 0.3, 14.5, 2.3, 1.2],                                                              // top
  ];
  const centre = (k) => { const [deg, r, y] = CLUMPS[k]; return at(deg, r, y); };

  // ---- limbs: three from the fork, each feeding three clumps ---------------------------------
  // [azimuth, the clumps it feeds (its own end first)]
  const LIMBS = [[30, [0, 3, 6]], [152, [1, 4, 7]], [268, [2, 5, 8]]];
  const hangs = [];
  const fork = lean(TOP).setY(TOP);
  for (const [deg, feeds] of LIMBS) {
    const p0 = lean(TOP - 1).setY(TOP - 1).add(at(deg, 0.15, 0));
    const p1 = at(deg + rr(-4, 4), 2.5, 10.1).add(lean(TOP));      // the elbow
    add(rod(p0, p1, 0.5, 0.33, 8), BARK);
    add(knuckle(p1, 0.4), BARK);
    const tips = feeds.map((k, j) => {
      const tip = p1.clone().lerp(centre(k), 0.95);      // well inside its clump
      add(rod(p1, tip, j === 0 ? 0.33 : 0.22, j === 0 ? 0.14 : 0.09, 7), BARK);
      return tip;
    });
    hangs.push(p0.clone().lerp(p1, rr(0.78, 0.86)), p1.clone().lerp(tips[0], 0.3));
  }
  add(new THREE.SphereGeometry(0.66, 10, 7).scale(1, 0.8, 1).translate(fork.x, fork.y - 0.15, fork.z), BARK);
  // a thinner leader rises from the fork into the top clump
  add(rod(fork.clone().setY(TOP - 0.3), centre(9).setY(13.9), 0.3, 0.1, 7), BARK);

  for (const [deg, r, y, R, H] of CLUMPS) {
    const c = at(deg, r, y);
    add(blob(1, R * rr(0.92, 1.06), H, R * rr(0.92, 1.06), 0.14).rotateY(rr(0, 6.28)).translate(c.x, c.y, c.z), MOSS);
    // two fern green lobes break through the top, where the light falls
    for (let k = 0; k < 2; k++) {
      const s = R * rr(0.5, 0.6), q = c.clone().add(at(rr(0, 360), R * rr(0.2, 0.42), H * rr(0.3, 0.42)));
      add(blob(1, s, s * 0.62, s * rr(0.85, 1.05), 0.16).rotateY(rr(0, 6.28)).translate(q.x, q.y, q.z), FERN);
    }
  }

  // ---- vines: four chains of thin cylinders hanging from the limbs, leaves in pairs ---------------
  // a leaf is a four-sided cone pressed flat, its base on the vine and its point out and down
  const leaf = (p, deg, len) => {
    const dir = at(deg, 1, -0.9).normalize();
    return new THREE.ConeGeometry(0.15, len, 4).translate(0, len / 2, 0).scale(1, 1, 0.35)
      .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir)).translate(p.x, p.y, p.z);
  };
  [0, 2, 4, 3].forEach((h, i) => {
    let p = hangs[h].clone(), r = 0.1;
    const drop = 3.7 + 0.15 * i, n = 4;
    for (let k = 0; k < n; k++) {
      const q = p.clone().add(V(rr(-0.2, 0.2), -drop / n, rr(-0.2, 0.2)));
      add(rod(p, q, r, r * 0.86, 5), FERN);
      const a = rr(0, 360);
      add(leaf(p.clone().lerp(q, 0.6), a, 0.45), FERN);
      add(leaf(p.clone().lerp(q, 0.75), a + 150, 0.4), FERN);
      p = q; r *= 0.86;
    }
    for (const a of [0, 120, 240]) add(leaf(p, a + rr(-20, 20), 0.35).translate(0, 0.05, 0), FERN);
  });

  // ---- meshes: one per material; nothing below the ground ----------------------------------
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

  // ---- place: base on y = 0, centred on x and z ----------------------------------------------
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
