// glow_mushroom, arm A: assembled from primitives.
// Four mushrooms, 1.4, 1.0, 0.6 and 0.35 m tall, on a mossy root knob about
// 0.8 m across. A stem is two tapered cylinders on a squashed sphere bulb; a cap
// is a flattened sphere segment cut just past its equator, so the rim curls
// under, with squashed hemisphere spots. Under each cap the gills are an open
// cone whose edge shows as a band below the rim and a ring of long and short
// plane fins that fringe it; every gill piece is one spore lime mesh,
// userData.parts.glow. The knob is overlapping squashed hemispheres with half
// ellipsoid root flares, a flattened moss cushion and moss pads.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials ----------------------------------------------------------------
  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
  const BARK = mat(0x5a4030, 0.92, 'timber');                                // the root knob
  const CAP = mat(0x5a4030, 0.66, 'foliage', { side: THREE.DoubleSide });   // open underneath
  const FLESH = mat(0xe6d3ae, 0.8, 'foliage');                              // stems and spots
  const MOSS = mat(0x4f7a3a, 0.97, 'foliage');
  // Spore lime is emission only. The base colour is fern green, so the gills
  // still read as gills if the game dims the glow to nothing.
  const GILL = mat(0x7da04a, 0.6, 'foliage', { emissive: 0xc3f25a, emissiveIntensity: 1.15, side: THREE.DoubleSide });

  // ---- helpers --------------------------------------------------------------------
  const buckets = new Map();
  const add = (geo, m) => {
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(geo);
    return geo;
  };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  const UP = new THREE.Vector3(0, 1, 0);
  const ONE = new THREE.Vector3(1, 1, 1);
  const rad = (d) => (d * Math.PI) / 180;
  const tilt = (az, lean) => new THREE.Vector3(Math.sin(rad(az)) * Math.sin(rad(lean)), Math.cos(rad(lean)), Math.cos(rad(az)) * Math.sin(rad(lean)));
  const onto = (geo, pos, quat, scl = ONE) => geo.applyMatrix4(new THREE.Matrix4().compose(pos, quat, scl));
  const qUp = (dir) => new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());

  // ---- the root knob: squashed hemispheres, roots, moss pads ------------------------
  // [x, z, radius, height]; the flat undersides sit on y = 0
  const LUMPS = [
    [0, 0, 0.29, 0.17], [0.13, -0.09, 0.19, 0.19], [-0.13, 0.08, 0.17, 0.155],
    [0.08, 0.16, 0.13, 0.12], [-0.1, -0.15, 0.15, 0.13],
  ];
  for (const [x, z, r, h] of LUMPS) {
    add(new THREE.SphereGeometry(r, 11, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, h / r, 1).translate(x, 0, z), BARK);
  }
  const knobY = (x, z) => {
    let y = 0;
    for (const [cx, cz, r, h] of LUMPS) {
      const d2 = (x - cx) ** 2 + (z - cz) ** 2;
      if (d2 < r * r) y = Math.max(y, (h / r) * Math.sqrt(r * r - d2));
    }
    return y;
  };
  const knobNormal = (x, z) => {
    const e = 0.02;
    return new THREE.Vector3(knobY(x - e, z) - knobY(x + e, z), 2 * e, knobY(x, z - e) - knobY(x, z + e)).normalize();
  };
  // root flares: long half ellipsoids, thickest inside the knob, running out and
  // down to the ground; [azimuth, centre radius, half length, half width, height]
  for (const [az, at, len, w, h] of [[16, 0.17, 0.25, 0.07, 0.11], [86, 0.16, 0.24, 0.06, 0.09], [147, 0.17, 0.26, 0.068, 0.1],
    [208, 0.16, 0.25, 0.072, 0.11], [270, 0.15, 0.23, 0.058, 0.085], [328, 0.16, 0.24, 0.064, 0.095]]) {
    const geo = new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(w, h, len);
    add(geo.rotateY(rad(az)).translate(Math.sin(rad(az)) * at, 0, Math.cos(rad(az)) * at), BARK);
  }
  // moss: a cushion over the crown whose edge the lumps break up, and pads that
  // spill down between the roots
  add(new THREE.SphereGeometry(0.235, 12, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.3, 0.92).translate(0.01, 0.13, 0.0), MOSS);
  for (const [x, z, r] of [[-0.2, 0.05, 0.1], [0.22, -0.03, 0.09], [0.02, -0.23, 0.095], [0.15, 0.19, 0.08], [-0.12, -0.19, 0.08], [-0.1, 0.21, 0.07]]) {
    const n = knobNormal(x, z);
    const geo = new THREE.SphereGeometry(r, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.3, 0.8);
    add(onto(geo, new THREE.Vector3(x, knobY(x, z) - 0.02, z), qUp(n)), MOSS);
  }

  // ---- mushrooms --------------------------------------------------------------------
  // base x, z on the knob; lean azimuth (deg from +z toward +x) and angle; the cap
  // nods a little further; H is the top of the cap above the ground
  // K flattens the cap, TH is how far past its equator the rim curls under: the
  // big caps are broad and flat, the small ones rounder
  const SHROOMS = [
    { x: -0.07, z: -0.08, az: 215, lean: 7, nod: 3, H: 1.4, R: 0.36, K: 0.46, TH: 1.76, rt: 0.042, rb: 0.064, seg: 16, fins: 40, spots: 5 },
    { x: 0.16, z: -0.05, az: 108, lean: 15, nod: 5, H: 1.0, R: 0.27, K: 0.5, TH: 1.8, rt: 0.034, rb: 0.052, seg: 16, fins: 32, spots: 4 },
    { x: 0.09, z: 0.15, az: 22, lean: 24, nod: 8, H: 0.6, R: 0.18, K: 0.56, TH: 1.84, rt: 0.026, rb: 0.04, seg: 13, fins: 24, spots: 3 },
    { x: -0.17, z: 0.11, az: 305, lean: 30, nod: 9, H: 0.35, R: 0.12, K: 0.62, TH: 1.88, rt: 0.019, rb: 0.029, seg: 11, fins: 16, spots: 3 },
  ];
  const gills = [];
  for (const s of SHROOMS) {
    const { R, K, TH, seg } = s;
    const axis = tilt(s.az, s.lean), capAxis = tilt(s.az, s.lean + s.nod);
    const q = qUp(axis), cq = qUp(capAxis);
    const base = new THREE.Vector3(s.x, knobY(s.x, s.z) - 0.035, s.z);

    // the cap, in its own frame: equator centre at the origin
    const rimR = R * Math.sin(TH), rimY = K * R * Math.cos(TH);
    const apexY = 0.1 * R;                       // where the stem meets the gill cone
    // the cone's edge sits just inside the rim and a little below it, so a band
    // of gill shows under the rim even from above
    const coneR = rimR * 0.975, coneH = apexY - rimY + 0.07 * R;
    const capGeos = [], gillGeos = [];
    capGeos.push(new THREE.SphereGeometry(R, seg, 6, 0, Math.PI * 2, 0, TH).scale(1, K, 1));
    // a few paler spots, squashed hemispheres bedded into the curve
    for (let i = 0; i < s.spots; i++) {
      const t = 0.18 + (1.12 * (i + 0.5)) / s.spots, a = i * 2.4 + s.az * 0.05;
      const p = new THREE.Vector3(R * Math.sin(t) * Math.sin(a), K * R * Math.cos(t), R * Math.sin(t) * Math.cos(a));
      const n = new THREE.Vector3(Math.sin(t) * Math.sin(a), Math.cos(t) / K, Math.sin(t) * Math.cos(a)).normalize();
      const r = R * (0.15 - 0.018 * i);
      const geo = new THREE.SphereGeometry(r, 7, 2, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.38, 1);
      capGeos.push(onto(geo, p.addScaledVector(n, -0.2 * r), qUp(n)));
    }
    // gills: an open cone under the cap, apex up at the stem, and radial fins below
    // it, long and short in turn, whose outer ends fringe the band under the rim
    gillGeos.push(new THREE.ConeGeometry(coneR, coneH, seg * 2, 1, true).translate(0, apexY - coneH / 2, 0));
    const slope = Math.atan2(coneH, coneR), depth = 0.075 * R;
    const coneAt = (r) => apexY - (r / coneR) * coneH;
    for (let i = 0; i < s.fins; i++) {
      const r0 = (i % 2 ? 0.5 * coneR : s.rt + 0.006), r1 = 0.97 * coneR;
      const len = Math.hypot(r1 - r0, coneAt(r0) - coneAt(r1));
      const d = i % 2 ? depth * 0.8 : depth;
      const fin = new THREE.PlaneGeometry(len, d).translate(0, -d / 2, 0).rotateZ(-slope)
        .translate((r0 + r1) / 2, (coneAt(r0) + coneAt(r1)) / 2, 0)
        .rotateY((i / s.fins) * Math.PI * 2 + 0.13);
      gillGeos.push(fin);
    }

    // stand the cap so its highest point, spots included, is exactly H
    let top = -Infinity;
    const v = new THREE.Vector3();
    for (const geo of capGeos) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) top = Math.max(top, v.fromBufferAttribute(p, i).applyQuaternion(cq).y);
    }
    const L = (s.H - base.y + capAxis.y * apexY - top) / axis.y;   // stem length, base to cone apex
    const stemTop = base.clone().addScaledVector(axis, L);
    const capO = stemTop.clone().addScaledVector(capAxis, -apexY);
    capGeos.forEach((geo, i) => add(onto(geo, capO, cq), i ? FLESH : CAP));   // the dome, then its spots
    for (const geo of gillGeos) gills.push(onto(geo, capO, cq));

    // the stem: a flared foot and a long shaft, both open-ended, on a low, wide
    // bulb that sinks into the moss
    const foot = 0.28 * L, rMid = s.rt * 1.18;
    const stem = [
      new THREE.CylinderGeometry(rMid, s.rb, foot, 10, 1, true).translate(0, foot / 2, 0),
      new THREE.CylinderGeometry(s.rt, rMid, L - foot + 0.01, 10, 3, true).translate(0, foot + (L - foot) / 2 - 0.005, 0),
      new THREE.SphereGeometry(s.rb * 1.4, 10, 5).scale(1, 0.62, 1).translate(0, s.rb * 0.3, 0),
    ];
    for (const geo of stem) add(onto(geo, base, q), FLESH);
  }

  // ---- meshes: one per material; the gills are their own mesh -------------------------
  for (const [m, geos] of buckets) g.add(new THREE.Mesh(merge(geos), m));
  const glow = new THREE.Mesh(merge(gills), GILL);
  glow.name = 'glow';
  g.add(glow);

  // ---- place: base on y = 0, centred on x and z ---------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  g.userData.parts = { glow };
  return g;
}
