// glow_mushroom, arm C: a second reading, a bouquet on a burl.
// The root knob is read as a gnarled burl on a thick surface root that arches
// out of the ground and dives back in, with two lesser roots; moss lies over the
// burl's crown and along the arch. The four mushrooms (1.4, 1.0, 0.6 and
// 0.35 m) grow as one clump: their stems are tubes swept from a shared pale
// foot, fanning out and turning back up. Each cap is a hand-built surface whose
// rim droops further on its outer side and waves, with a few raised warts. The
// gills under each cap are one pleated surface, valleys against the cap and
// ridges hanging to a scalloped edge below the rim. userData.parts.glow is a
// Group of the four gill meshes, one per mushroom, so each can pulse on its own.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials ----------------------------------------------------------------
  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
  const BARK = mat(0x5a4030, 0.9, 'timber');                                 // burl and roots
  const CAP = mat(0x5a4030, 0.6, 'foliage', { side: THREE.DoubleSide });    // a single skin
  const FLESH = mat(0xe6d3ae, 0.76, 'foliage');                             // foot, stems, warts
  const MOSS = mat(0x4f7a3a, 0.97, 'foliage');
  // Spore lime is emission only. The base colour is fern green, so the gills
  // still read as gills if the game dims the glow to nothing.
  const GILL = mat(0x7da04a, 0.55, 'foliage', { emissive: 0xc3f25a, emissiveIntensity: 1.15, side: THREE.DoubleSide });

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
  const TAU = Math.PI * 2;
  const rad = (d) => (d * Math.PI) / 180;
  const tilt = (az, lean) => new THREE.Vector3(Math.sin(rad(az)) * Math.sin(rad(lean)), Math.cos(rad(lean)), Math.cos(rad(az)) * Math.sin(rad(lean)));
  const qUp = (dir) => new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const onto = (geo, pos, quat) => geo.applyMatrix4(new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(1, 1, 1)));
  // smooth normals with coincident duplicates (seams, poles) averaged together
  const weldNormals = (geo) => {
    geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, sum = new Map();
    const key = (i) => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    for (let i = 0; i < p.count; i++) {
      const k = key(i), s = sum.get(k) || new THREE.Vector3();
      sum.set(k, s.add(new THREE.Vector3().fromBufferAttribute(n, i)));
    }
    for (let i = 0; i < p.count; i++) { const s = sum.get(key(i)).clone().normalize(); n.setXYZ(i, s.x, s.y, s.z); }
    return geo;
  };
  // an indexed grid over rows i and columns j; at(i, j) gives [x, y, z]. With a
  // pole, row 0 is one point and its strip is a fan. flip turns the faces over.
  const grid = (rows, cols, at, { pole = false, flip = false } = {}) => {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) { pos.push(...at(i, j)); uv.push(j / cols, i / rows); }
    const tri = (a, b, c) => (flip ? idx.push(a, c, b) : idx.push(a, b, c));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = i * (cols + 1) + j, b = a + cols + 1;
        if (!(pole && i === 0)) tri(a, b, a + 1);
        tri(b, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return weldNormals(geo);
  };
  // a tube along a curve whose radius follows r(t)
  const sweep = (curve, r, TS, RS) => {
    const tube = new THREE.TubeGeometry(curve, TS, 1, RS, false);
    const p = tube.attributes.position, c = new THREE.Vector3(), w = new THREE.Vector3();
    for (let i = 0; i <= TS; i++) {
      const t = i / TS;
      curve.getPointAt(t, c);
      for (let j = 0; j <= RS; j++) {
        const k = i * (RS + 1) + j;
        w.fromBufferAttribute(p, k).sub(c).multiplyScalar(r(t)).add(c);
        p.setXYZ(k, w.x, w.y, w.z);
      }
    }
    return tube;
  };
  // anything that would sink below the ground is pressed flat onto it
  const toGround = (geo) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
    return weldNormals(geo);
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---- the burl, the root it sits on, and the moss ---------------------------------
  const BC = V(0, 0.06, 0), BS = V(0.28, 0.175, 0.23);
  const bump = (d) => 1 + 0.09 * Math.sin(5.1 * d.x + 1.3) * Math.sin(4.3 * d.z + 0.4)
    + 0.06 * Math.sin(6.7 * d.y + 2.2 * d.x + 0.5) + 0.05 * Math.sin(3.1 * d.z - 4 * d.x);
  const burlAt = (d, extra = 0) => BC.clone().add(d.clone().multiply(BS).multiplyScalar(bump(d) + extra));
  {
    const geo = new THREE.SphereGeometry(1, 13, 7);
    const p = geo.attributes.position, d = V(0, 0, 0);
    for (let i = 0; i < p.count; i++) {
      const q = burlAt(d.fromBufferAttribute(p, i).normalize());
      p.setXYZ(i, q.x, q.y, q.z);
    }
    add(toGround(geo), BARK);
  }
  // the surface root the burl grew on: it breaks the ground on the left, runs half
  // sunk under the burl and goes back in on the right, thinning toward both ends
  const arch = new THREE.CatmullRomCurve3([
    V(-0.42, -0.085, 0.14), V(-0.33, 0.0, 0.11), V(-0.19, 0.04, 0.058), V(0, 0.055, 0),
    V(0.19, 0.04, -0.058), V(0.33, 0.0, -0.115), V(0.42, -0.085, -0.15),
  ], false, 'centripetal');
  const archR = (t) => 0.05 + 0.04 * Math.sin(Math.PI * t) ** 0.6;
  add(toGround(sweep(arch, archR, 16, 7)), BARK);
  // two short, thick lesser roots that sink gently back into the ground
  for (const pts of [[V(0.04, 0.045, 0.09), V(0.12, 0.03, 0.19), V(0.2, 0.004, 0.28), V(0.26, -0.05, 0.34)],
    [V(-0.05, 0.045, -0.09), V(-0.13, 0.028, -0.18), V(-0.2, 0.0, -0.26), V(-0.25, -0.05, -0.31)]]) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    add(toGround(sweep(curve, (t) => 0.06 - 0.024 * t, 8, 6)), BARK);
  }
  // moss over the crown: a ring on the burl 1.5 cm proud, its outer edge tucked
  // in and its inner edge under the pale foot the stems rise from
  {
    const ROWS = 4, COLS = 20, TH0 = 0.3;
    const edge = (phi) => 0.98 + 0.24 * Math.sin(3 * phi + 1) + 0.12 * Math.sin(7 * phi);
    add(grid(ROWS, COLS, (i, j) => {
      const phi = (j / COLS) * TAU, th = TH0 + (i / ROWS) * (edge(phi) - TH0);
      const d = V(Math.sin(th) * Math.sin(phi), Math.cos(th), Math.sin(th) * Math.cos(phi));
      return burlAt(d, i === ROWS ? -0.01 : 0.075).toArray();
    }), MOSS);
  }
  // moss along the top of the arch, either side of the burl
  for (const [t0, t1] of [[0.16, 0.38], [0.62, 0.84]]) {
    const ROWS = 6, COLS = 4, A = rad(78);
    const c = V(0, 0, 0), T = V(0, 0, 0), side = V(0, 0, 0), up = V(0, 0, 0);
    add(toGround(grid(ROWS, COLS, (i, j) => {
      const t = t0 + ((t1 - t0) * i) / ROWS, a = -A + (2 * A * j) / COLS;
      arch.getPointAt(t, c); arch.getTangentAt(t, T);
      side.crossVectors(T, UP).normalize(); up.crossVectors(side, T).normalize();
      const r = archR(t) + (j === 0 || j === COLS || i === 0 || i === ROWS ? -0.002 : 0.013);
      return c.clone().addScaledVector(up, Math.cos(a) * r).addScaledVector(side, Math.sin(a) * r).toArray();
    }, { flip: true })), MOSS);
  }

  // ---- the mushrooms -------------------------------------------------------------------
  // foot on the crown; azimuth (deg from +z toward +x) the stem fans out along;
  // how far out the cap ends up; the stem leaves the foot at lean l0 and arrives
  // at lean l1; the cap nods further; H is the top of the cap above the ground;
  // P is the number of gill pleats; warts on the cap
  const SHROOMS = [
    { x: -0.02, z: 0.0, az: 200, out: 0.1, l0: 18, l1: 5, nod: 3, H: 1.4, R: 0.36, fy: 0.9, rt: 0.04, cols: 20, P: 20, warts: 5, seed: 0.4 },
    { x: 0.05, z: -0.03, az: 112, out: 0.33, l0: 50, l1: 15, nod: 6, H: 1.0, R: 0.27, fy: 0.95, rt: 0.032, cols: 18, P: 16, warts: 4, seed: 1.9 },
    { x: -0.05, z: 0.04, az: 298, out: 0.29, l0: 60, l1: 22, nod: 8, H: 0.6, R: 0.18, fy: 1.05, rt: 0.025, cols: 14, P: 12, warts: 3, seed: 3.1 },
    { x: 0.04, z: 0.05, az: 34, out: 0.26, l0: 72, l1: 30, nod: 10, H: 0.35, R: 0.12, fy: 1.15, rt: 0.018, cols: 12, P: 10, warts: 2, seed: 4.6 },
  ];
  // the cap's rows, apex to lip and a band tucked under it: [rho, y] in R (y in R * fy)
  const ROWS = [[0, 0], [0.3, -0.035], [0.6, -0.12], [0.82, -0.25], [0.95, -0.4], [0.985, -0.5], [0.9, -0.535]];
  const JOIN = -0.2;   // where the stem ends inside the cap, in R * fy
  const glow = new THREE.Group();
  glow.name = 'glow';
  const foot = V(0, 0, 0);

  for (const s of SHROOMS) {
    const { R, fy, rt, cols, P } = s;
    const phiOut = rad(s.az);
    // 0 where the rim is level, 1 where it hangs lowest: lower on the outer side, wavy
    const droop = (phi) => 0.62 * (0.5 + 0.5 * Math.cos(phi - phiOut)) + 0.38 * (0.5 + 0.5 * Math.sin(5 * phi + s.seed));
    const capAt = (i, phi) => {
      const [r0, y0] = ROWS[i], d = droop(phi), w = Math.max(0, (r0 - 0.55) / 0.43) ** 2;
      const rho = (r0 - 0.07 * d * w) * R, y = (y0 - 0.2 * d * w) * R * fy;
      return [Math.sin(phi) * rho, y, Math.cos(phi) * rho];
    };
    const capGeo = grid(ROWS.length - 1, cols, (i, j) => capAt(i, (j / cols) * TAU), { pole: true });

    // warts: five-sided pyramids standing on the top
    const warts = [];
    for (let k = 0; k < s.warts; k++) {
      const f = 0.9 + (2.1 * (k + 0.5)) / s.warts, phi = k * 2.4 + s.seed, i0 = Math.floor(f), u = f - i0;
      const pt = (ff, ph) => {
        const i = Math.min(ROWS.length - 2, Math.floor(ff)), w = ff - i, a = capAt(i, ph), b = capAt(i + 1, ph);
        return V(a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w);
      };
      const p = pt(i0 + u, phi);
      const n = pt(i0 + u + 0.05, phi).sub(pt(i0 + u - 0.05, phi)).cross(pt(i0 + u, phi + 0.05).sub(pt(i0 + u, phi - 0.05))).normalize();
      if (n.y < 0) n.negate();
      const e1 = V(1, 0, 0).cross(n).normalize(), e2 = n.clone().cross(e1);
      const wr = R * (0.14 - 0.014 * k), top = p.clone().addScaledVector(n, wr * 0.42);
      const pos = [];
      for (let m = 0; m < 5; m++) {
        const a0 = (m / 5) * TAU + k, a1 = ((m + 1) / 5) * TAU + k;
        const r0 = p.clone().addScaledVector(n, -wr * 0.12).addScaledVector(e1, Math.cos(a0) * wr).addScaledVector(e2, Math.sin(a0) * wr);
        const r1 = p.clone().addScaledVector(n, -wr * 0.12).addScaledVector(e1, Math.cos(a1) * wr).addScaledVector(e2, Math.sin(a1) * wr);
        pos.push(...r0.toArray(), ...r1.toArray(), ...top.toArray());
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0.5), 2));
      geo.computeVertexNormals();
      warts.push(geo);
    }

    // gills: one pleated surface from the stem out to the rim; even columns are
    // valleys against the cap, odd columns ridges hanging below. At the rim the
    // valleys still drop a little below the lip, so a band shows even from above
    // and the ridges scallop its lower edge.
    const gillGeo = grid(3, 2 * P, (i, j) => {
      const phi = (j / (2 * P)) * TAU, f = i / 2;
      const under = capAt(ROWS.length - 1, phi), uRho = Math.hypot(under[0], under[2]);
      // the last ring turns the band's outer face back up under the lip
      if (i === 3) return [Math.sin(phi) * uRho * 0.998, under[1] + 0.006 * R, Math.cos(phi) * uRho * 0.998];
      const rimRho = uRho * 0.985, rimY = under[1] - 0.045 * R * fy;
      const rho = rt * 0.8 + (rimRho - rt * 0.8) * f;
      let y = -0.3 * R * fy + (rimY + 0.3 * R * fy) * f + 0.05 * R * fy * Math.sin(Math.PI * f);
      if (j % 2) y -= R * fy * (0.04 + 0.08 * Math.sin(Math.PI * Math.min(1, f * 1.2)) + 0.035 * f);
      return [Math.sin(phi) * rho, y, Math.cos(phi) * rho];
    });

    // stand the cap so its highest point, warts included, is exactly H
    const d0 = tilt(s.az, s.l0), d1 = tilt(s.az, s.l1), capAxis = tilt(s.az, s.l1 + s.nod), cq = qUp(capAxis);
    let top = -Infinity;
    const v = V(0, 0, 0);
    for (const geo of [capGeo, ...warts]) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) top = Math.max(top, v.fromBufferAttribute(p, i).applyQuaternion(cq).y);
    }
    const joinY = JOIN * R * fy;
    const P0 = V(s.x, 0.23, s.z);
    const P3 = V(s.x + Math.sin(phiOut) * s.out, s.H - top + capAxis.y * joinY, s.z + Math.cos(phiOut) * s.out);
    const span = P0.distanceTo(P3);
    const curve = new THREE.CubicBezierCurve3(P0, P0.clone().addScaledVector(d0, 0.42 * span), P3.clone().addScaledVector(d1, -0.36 * span), P3);
    const capO = P3.clone().addScaledVector(capAxis, -joinY);
    add(onto(capGeo, capO, cq), CAP);
    for (const geo of warts) add(onto(geo, capO, cq), FLESH);
    const gm = new THREE.Mesh(merge([onto(gillGeo, capO, cq)]), GILL);
    gm.name = `glow_${s.H}`;
    glow.add(gm);

    // the stem: thick where it leaves the shared foot, slim, a little flare at the cap
    const sm = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
    const len = curve.getLength();
    add(weldNormals(sweep(curve, (t) => rt * (1 + 1.1 * (1 - sm(0, 0.3, t)) + 0.16 * sm(0.9, 1, t)), Math.max(8, Math.round(len * 11)), s.H > 0.9 ? 8 : 7)), FLESH);
    foot.add(P0);
  }
  // the shared foot: a pale, squashed mound where the four stems fuse
  foot.multiplyScalar(1 / SHROOMS.length);
  add(new THREE.SphereGeometry(0.105, 12, 5, 0, TAU, 0, Math.PI / 2).scale(1.05, 0.5, 1).translate(foot.x, 0.24, foot.z), FLESH);

  // ---- meshes: one per material; the gills are their own group --------------------------
  for (const [m, geos] of buckets) g.add(new THREE.Mesh(merge(geos), m));
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
