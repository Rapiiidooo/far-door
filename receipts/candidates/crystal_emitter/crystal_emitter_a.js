// crystal_emitter, arm A: primitives.
// A square stepped pedestal of boxes: plinth, step, a shaft whose corner and
// centre pilasters leave two carved channels on every face, a lit strip at the
// floor of each, and a stepped capital with an incised band. On top, a bronze
// collar round a lit dish; three ribs, each an arc of a torus, spring from the
// collar and meet in a finial. The crystal is a hexagonal cylinder with a cone at
// each end, floating on the axis between them.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...o });
    if (name) m.name = name;
    return m;
  };
  const BASALT = mat(0x3a3531, 'stone', { roughness: 0.84 });
  const NIGHT = mat(0x2a2830, 'stone', { roughness: 0.92 });
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });
  // Lit parts keep the dormant-crystal body and carry the ancient light as
  // emission, so the game can dim or raise them. Unnamed and just under opaque,
  // so the loader's procedural surfaces leave them alone.
  const lit = (intensity, o = {}) => mat(0x1d5f63, null, {
    emissive: 0x39e3d0, emissiveIntensity: intensity, roughness: 0.3, metalness: 0.05,
    transparent: true, opacity: 0.94, ...o,
  });
  const CRYSTAL = lit(2.0, { roughness: 0.15, flatShading: true });
  const GLOW = lit(1.0);

  // ---- static parts are merged per material at the end ----------------------
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
  const box = (w, h, d, y0, m, x = 0, z = 0) => add(new THREE.BoxGeometry(w, h, d).translate(x, y0 + h / 2, z), m);
  const cyl = (rt, rb, h, y0, seg, m) => add(new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, y0 + h / 2, 0), m);

  // ---- pedestal: plinth and step, night basalt at the foot --------------------
  box(1.04, 0.16, 1.04, 0, NIGHT);
  box(0.96, 0.04, 0.96, 0.16, NIGHT);
  box(0.86, 0.15, 0.86, 0.2, BASALT);
  box(0.78, 0.03, 0.78, 0.35, BASALT);

  // ---- shaft: two carved channels on each face, a lit strip in each ----------
  const S0 = 0.38, S1 = 0.97, SW = 0.62, CORE = 0.54, BAND = 0.07;
  const C0 = S0 + BAND, C1 = S1 - BAND;              // the channels' span
  box(CORE, S1 - S0, CORE, S0, BASALT);
  box(SW, BAND, SW, S0, BASALT);                     // sill
  box(SW, BAND, SW, C1, BASALT);                     // lintel
  const hw = SW / 2, face = CORE / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.16, C1 - C0, 0.16, C0, BASALT, sx * (hw - 0.08), sz * (hw - 0.08));
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, ox = Math.sin(a), oz = Math.cos(a);   // face normal
    const tx = oz, tz = -ox;                                          // along the face
    const pil = new THREE.BoxGeometry(0.1, C1 - C0, hw - face);       // centre pilaster
    pil.rotateY(a).translate(ox * (face + hw) / 2, (C0 + C1) / 2, oz * (face + hw) / 2);
    add(pil, BASALT);
    for (const side of [-1, 1]) {
      const strip = new THREE.BoxGeometry(0.045, C1 - C0 - 0.04, 0.012);
      const u = side * 0.1;
      strip.rotateY(a).translate(ox * (face + 0.006) + tx * u, (C0 + C1) / 2, oz * (face + 0.006) + tz * u);
      add(strip, GLOW);
    }
  }

  // ---- capital: a step out, a slab with an incised band, a chamfer step ------
  box(0.7, 0.07, 0.7, S1, BASALT);
  box(0.8, 0.045, 0.8, 1.04, BASALT);
  box(0.76, 0.03, 0.76, 1.085, NIGHT);
  box(0.8, 0.045, 0.8, 1.115, BASALT);
  box(0.72, 0.04, 0.72, 1.16, BASALT);               // top at 1.2

  // ---- collar and the lit dish under the crystal -----------------------------
  cyl(0.3, 0.32, 0.05, 1.2, 28, BRONZE);
  cyl(0.2, 0.2, 0.014, 1.25, 28, GLOW);
  add(new THREE.TorusGeometry(0.205, 0.018, 6, 28).rotateX(Math.PI / 2).translate(0, 1.258, 0), BRONZE);

  // ---- three ribs: arcs of one circle through foot, belly and top ------------
  // (s, y): s is the distance out from the axis in the rib's own vertical plane
  const circle = ([x1, y1], [x2, y2], [x3, y3]) => {
    const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    const s1 = x1 * x1 + y1 * y1, s2 = x2 * x2 + y2 * y2, s3 = x3 * x3 + y3 * y3;
    const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / d;
    const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / d;
    return [cx, cy, Math.hypot(x1 - cx, y1 - cy)];
  };
  const FOOT = [0.24, 1.2], BELLY = [0.38, 1.6], TOP = [0.05, 2.02], TUBE = 0.032;
  const [cx, cy, R] = circle(FOOT, BELLY, TOP);
  const t0 = Math.atan2(FOOT[1] - cy, FOOT[0] - cx), t1 = Math.atan2(TOP[1] - cy, TOP[0] - cx);
  const tk = Math.asin((1.262 - cy) / R);            // where the rib leaves the collar
  // Ribs at 60, 180 and 300 degrees from +Z keep the front of the crystal clear.
  for (const deg of [60, 180, 300]) {
    const turn = (deg * Math.PI) / 180 - Math.PI / 2;   // local +x to azimuth deg from +Z
    const rib = new THREE.TorusGeometry(R, TUBE, 8, 22, t1 - t0);
    rib.rotateZ(t0).translate(cx, cy, 0).rotateY(turn);
    add(rib, BRONZE);
    add(new THREE.SphereGeometry(0.05, 12, 8).translate(cx + R * Math.cos(tk), 1.262, 0).rotateY(turn), BRONZE);
  }
  // finial: the rib ends are buried in the hub
  cyl(0.09, 0.075, 0.08, 1.98, 18, BRONZE);
  add(new THREE.SphereGeometry(0.042, 14, 8).translate(0, 2.058, 0), BRONZE);

  // ---- merge the static parts --------------------------------------------------
  let grooves = null;
  for (const [m, geos] of buckets) {
    const mesh = new THREE.Mesh(merge(geos), m);
    g.add(mesh);
    if (m === GLOW) grooves = mesh;
  }

  // ---- crystal: its own mesh, centred on its own origin so it can spin -------
  const CR = 0.135, BODY = 0.24, TIP = 0.18;
  const cg = merge([
    new THREE.CylinderGeometry(CR, CR, BODY, 6, 1, true),
    new THREE.ConeGeometry(CR, TIP, 6, 1, true).translate(0, (BODY + TIP) / 2, 0),
    new THREE.ConeGeometry(CR, TIP, 6, 1, true).rotateX(Math.PI).translate(0, -(BODY + TIP) / 2, 0),
  ]);
  const crystal = new THREE.Mesh(cg, CRYSTAL);
  crystal.name = 'crystal';
  crystal.position.set(0, 1.64, 0);
  g.add(crystal);

  // ---- place: base on y = 0, centred on x and z ----------------------------------
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });

  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.parts = { crystal, grooves };
  g.userData.beam = [r3(crystal.position.x), r3(crystal.position.y), r3(crystal.position.z)];
  return g;
}
