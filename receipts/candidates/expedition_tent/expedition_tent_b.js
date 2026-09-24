// expedition_tent, candidate B: profiles. The canvas is one cross-section, two
// sagging slopes with real thickness, extruded along the ridge and then lifted
// between the hem pegs so the hem scallops; seams, sod cloth and ridge band are
// slices of the same profile. Door flaps are pinched lathes gathered at a tie,
// poles and bedroll are lathes, pegs and stool legs are extruded side profiles,
// guy ropes are tubes that sag. 2.6 m long (z), 1.8 m wide, 1.6 m tall.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const UP = V(0, 1, 0), ZW = V(0, 0, 1);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  // Every fabric is double sided: the surface pass shares materials by colour,
  // so a single-sided twin would silently lose the inside of the canvas.
  // The canvas is the palette's rope khaki: explorer canvas turns blue-white in the
  // rig's shade, the reason game/main.js deepens the hero's canvas too. Ropes share it.
  const CANVAS = mat(0xb49a6a, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const GRIME = mat(0x8a6a48, 'fabric', { roughness: 0.97, side: THREE.DoubleSide });
  const BLANKET = mat(0x8a5433, 'fabric', { roughness: 0.95, side: THREE.DoubleSide });
  const LEATHER = mat(0x4b2e1e, 'fabric', { roughness: 0.7, side: THREE.DoubleSide });
  const TIMBER = mat(0x8a6a48, 'timber', { roughness: 0.9 });
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.5, metalness: 0.6 });

  const flat = (geo) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    o.computeVertexNormals();
    return o;
  };
  const add = (geo, m, p, q, parent = g) => {
    const me = new THREE.Mesh(flat(geo), m);
    if (p) me.position.copy(p);
    if (q) me.quaternion.copy(q);
    parent.add(me);
    return me;
  };
  const orient = (from, to) => new THREE.Quaternion().setFromUnitVectors(from, to.clone().normalize());
  // rows are [radius, fraction of the length from a to b]
  const latheAlong = (a, b, rows, m, seg = 6, parent = g) => {
    const d = b.clone().sub(a), L = d.length();
    const geo = new THREE.LatheGeometry(rows.map(([r, f]) => V2(r, f * L)), seg);
    return add(geo, m, a, orient(UP, d), parent);
  };
  const shape = (pts) => new THREE.Shape(pts.map(([x, y]) => V2(x, y)));
  const extrude = (pts, depth, o = {}) => new THREE.ExtrudeGeometry(Array.isArray(pts) ? shape(pts) : pts, { depth, bevelEnabled: false, ...o });

  // --- the canvas cross-section ----------------------------------------------------------
  const HW = 0.8, HA = 1.565, HL = 0.98, TH = 0.018, SAG = 0.045, N = 9;
  const EL = Math.hypot(HW, HA);
  // a point on slope s (+1 right, -1 left) at t (hem 0 .. apex 1), pushed `off` inward
  const slope = (s, t, off = 0) => {
    const k = SAG * Math.sin(Math.PI * t) + off;
    return [s * HW * (1 - t) - (s * HA / EL) * k, HA * t - (HW / EL) * k];
  };
  const ts = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  // a band following the outer surface from t0 to t1 on slope s, from off0 to off1
  const band = (s, t0, t1, off0, off1, n) => {
    const out = ts(t0, t1, n).map((t) => slope(s, t, off0));
    const inn = ts(t1, t0, n).map((t) => slope(s, t, off1));
    return [...out, ...inn].map(([x, y]) => [x, Math.max(0, y)]);
  };

  // hem pegs; between them the hem lifts in a shallow scallop
  const PEGZ = [-HL, -0.33, 0.33, HL];
  const scallop = (z) => {
    for (let k = 0; k < PEGZ.length - 1; k++) {
      if (z >= PEGZ[k] && z <= PEGZ[k + 1]) return 0.055 * Math.sin((Math.PI * (z - PEGZ[k])) / (PEGZ[k + 1] - PEGZ[k]));
    }
    return 0;
  };
  const drape = (geo) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const w = Math.max(0, 1 - y / 0.42) ** 2, lift = scallop(z) * w;
      if (lift <= 0) continue;
      const k = (lift * EL) / HA, s = Math.sign(x) || 1;
      p.setXYZ(i, x - (s * HW / EL) * k, y + lift, z);
    }
    return geo;
  };
  const alongRidge = (pts, z0, z1, steps) => {
    const geo = extrude(pts, z1 - z0, { steps });
    geo.translate(0, 0, z0);
    return drape(geo);
  };

  // a chevron band over the whole profile, `offOut` and `offIn` pushed inward; the
  // inner line stops short of the apex and closes on one point so it never crosses
  const chevron = (offOut, offIn, tMaxIn) => [
    ...ts(0, 1, N).map((t) => slope(-1, t, offOut)),
    ...ts(1, 0, N).slice(1).map((t) => slope(1, t, offOut)),
    ...ts(0, tMaxIn, N).map((t) => slope(1, t, offIn)),
    [0, HA - (offIn * EL) / HW],
    ...ts(tMaxIn, 0, N).map((t) => slope(-1, t, offIn)),
  ].map(([x, y]) => [x, Math.max(0, y)]);

  const shell = chevron(0, TH, 0.95);
  add(alongRidge(shell, -HL, HL, 18), CANVAS);
  // back gable, filling the inner outline
  const innerLine = shell.slice(2 * N + 1);
  add(alongRidge(innerLine, -HL, -HL + 0.016, 1), CANVAS);
  // sod cloth along the hem, a seam between the two canvas widths, the ridge band
  for (const s of [-1, 1]) {
    add(alongRidge(band(s, 0, 0.09, -0.005, 0.004, 3), -HL - 0.004, HL + 0.004, 18), GRIME);
    add(alongRidge(band(s, 0.545, 0.567, -0.005, 0.004, 1), -HL - 0.002, HL + 0.002, 4), GRIME);
  }
  const ridgeBand = [
    ...ts(0.93, 1, 2).map((t) => slope(-1, t, -0.006)),
    ...ts(1, 0.93, 2).slice(1).map((t) => slope(1, t, -0.006)),
    slope(1, 0.93, 0.004), slope(1, 0.965, 0.004), [0, HA - 0.006], slope(-1, 0.965, 0.004), slope(-1, 0.93, 0.004),
  ];
  add(alongRidge(ridgeBand, -HL - 0.004, HL + 0.004, 4), GRIME);
  // seams where the canvas panels are sewn, running hem to hem over the ridge
  for (const z of [-0.33, 0.33]) add(alongRidge(chevron(-0.005, 0.004, 0.98), z - 0.018, z + 0.018, 1), GRIME);

  // patches: irregular hand-cut pieces laid on the sagging slope
  const patch = (s, t, z, pts, m) => {
    const [px, py] = slope(s, t, -0.006);
    const [ax, ay] = slope(s, t - 0.01), [bx, by] = slope(s, t + 0.01);
    const up = V(bx - ax, by - ay, 0).normalize();
    const X = ZW.clone().multiplyScalar(-s), Z = X.clone().cross(up);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, up, Z));
    add(extrude(pts, 0.007), m, V(px, py, z), q);
  };
  patch(1, 0.5, -0.42, [[-0.24, -0.2], [0.2, -0.23], [0.25, 0.18], [0.02, 0.24], [-0.22, 0.2]], BLANKET);
  patch(-1, 0.37, 0.3, [[-0.18, -0.15], [0.17, -0.17], [0.19, 0.16], [-0.16, 0.19]], BLANKET);
  patch(-1, 0.7, -0.52, [[-0.1, -0.09], [0.11, -0.1], [0.1, 0.1], [-0.12, 0.08]], BLANKET);

  // --- frame: lathe-turned poles, an A lashed at each end, the ridge seated in the crotch --
  const XF = 0.74, YC = 1.41, RP = 0.036, ZA = HL + 0.07;
  const YR = YC + RP / Math.sin(Math.atan2(XF, YC));
  const pole = [[0, 0], [0.031, 0], [0.036, 0.04], [0.038, 0.5], [0.034, 0.93], [0.028, 0.985], [0, 1]];
  latheAlong(V(0, YR, -ZA - 0.08), V(0, YR, ZA + 0.08), pole, TIMBER, 7);
  for (const e of [-1, 1]) {
    for (const s of [-1, 1]) {
      const d = V(-s * XF, YC, 0).normalize();
      const z = e * ZA + s * RP;
      const foot = V(s * XF, 0, z).addScaledVector(d, (RP * Math.abs(d.x)) / d.y);
      latheAlong(foot, V(0, YC, z).addScaledVector(d, 0.16), pole, TIMBER, 6);
    }
    latheAlong(V(0, YC, e * ZA - 0.075), V(0, YC, e * ZA + 0.075),
      [[0, 0], [0.04, 0], [0.055, 0.2], [0.05, 0.5], [0.055, 0.8], [0.04, 1], [0, 1]], CANVAS, 7);
  }

  // --- front flaps, gathered at a tie on each side of the door ----------------------------
  for (const s of [-1, 1]) {
    const bot = V(s * (HW * (1 - 0.05 / HA) - 0.1), 0.05, HL + 0.03);
    const top = V(s * (HW * (1 - 1.42 / HA) - 0.02), 1.42, HL + 0.03);
    const TIE = 0.45;
    latheAlong(bot, top, [[0, 0], [0.1, 0], [0.11, 0.08], [0.085, 0.3], [0.04, TIE], [0.07, 0.6], [0.06, 0.8], [0.03, 0.95], [0, 1]], CANVAS, 7);
    const tie = bot.clone().lerp(top, TIE);
    add(new THREE.TorusGeometry(0.046, 0.014, 4, 10), LEATHER, tie, orient(ZW, top.clone().sub(bot)));
  }

  // --- guy ropes, slack, out to notched pegs -------------------------------------------------
  const PEG = [[-0.018, 0], [0.018, 0], [0.018, 0.1], [0.004, 0.112], [0.018, 0.124], [0.018, 0.165], [-0.018, 0.165]];
  // the notch faces the tent; returns the point where the rope sits in it
  const peg = (x, z, lean, out) => {
    out = out.clone().normalize();
    const dir = out.clone().multiplyScalar(Math.sin(lean)).addScaledVector(UP, Math.cos(lean));
    const X = out.clone().multiplyScalar(-Math.cos(lean)).addScaledVector(UP, Math.sin(lean));
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, dir, X.clone().cross(dir)));
    const geo = extrude(PEG, 0.03);
    geo.translate(0, 0, -0.015);
    const base = V(x, 0.018 * Math.sin(lean) + 0.0005, z);
    add(geo, TIMBER, base, q);
    return base.addScaledVector(dir, 0.112).addScaledVector(X, 0.012);
  };
  const rope = (a, b, sag, r = 0.011) => {
    const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
    add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 10, r, 4, false), CANVAS);
  };
  for (const e of [-1, 1]) for (const s of [-1, 1]) rope(V(s * 0.03, YC + 0.07, e * ZA), peg(s * 0.86, e * 1.26, 0.3, V(s * 0.86, 0, e * 1.26)), 0.05);
  for (const s of [-1, 1]) {
    for (const z of PEGZ) {
      const top = peg(s * (HW + 0.07), z, 0.25, V(s, 0, 0));
      rope(V(s * (HW - 0.012), 0.03, z), top, 0.008, 0.01);
    }
  }

  // --- bedroll across the floor: a lathe with spiral ends, strapped -------------------------
  const gs = shape([[-0.66, -0.9], [0.67, -0.88], [0.64, 0.86], [-0.65, 0.9]]);
  const sheet = extrude(gs, 0.01);
  sheet.rotateX(-Math.PI / 2);
  add(sheet, LEATHER, V(0, 0, -0.04));
  const BY = 0.01 + 0.112, BZ = -0.36, BL = 0.8;
  latheAlong(V(-BL / 2, BY, BZ), V(BL / 2, BY, BZ), [[0, 0.01], [0.1, 0], [0.112, 0.03], [0.115, 0.5], [0.112, 0.97], [0.1, 1], [0, 0.99]], BLANKET, 10);
  for (const f of [0.22, 0.78]) {
    latheAlong(V(-BL / 2 + f * BL - 0.02, BY, BZ), V(-BL / 2 + f * BL + 0.02, BY, BZ), [[0, 0], [0.12, 0], [0.122, 0.5], [0.12, 1], [0, 1]], LEATHER, 10);
  }
  const spiral = () => {
    const o = [], i = [], T = 2.6 * Math.PI * 2, b = 0.082 / T;
    for (let k = 0; k <= 34; k++) {
      const th = (k / 34) * T, r = 0.018 + b * th;
      o.push([(r + 0.006) * Math.cos(th), (r + 0.006) * Math.sin(th)]);
      i.push([(r - 0.006) * Math.cos(th), (r - 0.006) * Math.sin(th)]);
    }
    return [...o, ...i.reverse()];
  };
  for (const s of [-1, 1]) {
    const geo = extrude(spiral(), 0.008);
    add(geo, CANVAS, V(s * (BL / 2 - 0.004), BY, BZ), orient(ZW, V(s, 0, 0)));
  }

  // --- folded camp stool leaning on the right slope, beside the door --------------------------
  const stool = new THREE.Group();
  const slat = (w, l) => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, w / 2); sh.absarc(0, w / 2, w / 2, Math.PI, 2 * Math.PI, false);
    sh.lineTo(w / 2, l - w / 2); sh.absarc(0, l - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, w / 2);
    const geo = extrude(sh, 0.024, { curveSegments: 3 });
    geo.translate(0, -l / 2, -0.012);
    return geo;
  };
  const FA = 0.11;
  for (const [x, a] of [[-0.165, FA], [0.165, FA], [-0.125, -FA], [0.125, -FA]]) {
    add(slat(0.036, 0.54), TIMBER, V(x, 0.275, 0), null, stool).rotation.x = a;
  }
  const rz = 0.27 * Math.sin(FA);
  latheAlong(V(-0.185, 0.52, rz), V(0.185, 0.52, rz), [[0, 0], [0.017, 0], [0.02, 0.1], [0.02, 0.9], [0.017, 1], [0, 1]], TIMBER, 6, stool);
  latheAlong(V(-0.145, 0.52, -rz), V(0.145, 0.52, -rz), [[0, 0], [0.017, 0], [0.02, 0.1], [0.02, 0.9], [0.017, 1], [0, 1]], TIMBER, 6, stool);
  // the seat sling hangs in a U between the two rails, drawn across (z, y)
  const sling = extrude([[rz + 0.01, 0.52], [rz + 0.006, 0.4], [0, 0.335], [-rz - 0.006, 0.4], [-rz - 0.01, 0.52],
    [-rz + 0.002, 0.52], [-rz + 0.002, 0.405], [0, 0.35], [rz - 0.002, 0.405], [rz - 0.002, 0.52]], 0.25);
  sling.rotateY(Math.PI / 2);
  sling.translate(-0.125, 0, 0);
  add(sling, LEATHER, null, null, stool);
  for (const x of [-0.145, 0.145]) latheAlong(V(x, 0.275, -0.035), V(x, 0.275, 0.035), [[0, 0], [0.014, 0], [0.014, 1], [0, 1]], BRONZE, 6, stool);
  const LEAN = 0.58;
  const X1 = ZW.clone(), Y1 = V(-Math.sin(LEAN), Math.cos(LEAN), 0);
  stool.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X1, Y1, X1.clone().cross(Y1)));
  stool.position.set(0.92, 0.035 * Math.sin(LEAN), 0.62);
  g.add(stool);

  // --- placement: base on y = 0, centred on x and z -------------------------------------------
  const b3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) b3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = b3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= b3.min.y; o.position.z -= c.z; });
  return g;
}
