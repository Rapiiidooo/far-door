// field_radio, candidate B: built from profiles. The case is its front outline, a rectangle
// with its four long edges chamfered and the front opening cut out, extruded back to front
// with bevelled rims; the corner plates are L sections extruded along those edges; the
// speaker grille is a bronze disc with seven slots cut through it; the lid, cleats, straps,
// stays, handle and headset band are all extruded outlines. Every round part (bezels,
// dial faces, fluted knobs, jack, hinges, valves, coil, earpieces, the telescopic antenna)
// is turned from a profile by a small lathe whose normals stay crisp along the profile.
// The cable is a tube swept through a spiral on the ground. Same reading as A: an upright
// set with the back cover swung up behind it on strap hinges, over the open compartment.
// Front faces +Z. The case is 0.5 m wide; the whole piece 0.92 x 1.06 x 0.61 m.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  // Values stay distinct per material: the loader merges by value, not by name.
  const TIMBER = mat(0x8a6a48, 'timber', { roughness: 0.88 });
  const PANEL = mat(0x4b2e1e, 'timber', { roughness: 0.95 });
  const BRONZE = mat(0x9a6a35, 'metal', { roughness: 0.45, metalness: 0.6 });
  const LEATHER = mat(0x4b2e1e, 'fabric', { roughness: 0.72 });
  const PARCH = mat(0xe6d3ae, 'fabric', { roughness: 0.85 });
  const ROPE = mat(0xb49a6a, 'fabric', { roughness: 0.92 });
  const RED = mat(0xc2412d, 'metal', { roughness: 0.5, metalness: 0.15 });

  const add = (geo, m, parent = g) => { const me = new THREE.Mesh(geo, m); parent.add(me); return me; };
  const UP = V(0, 1, 0), FWD = V(0, 0, 1), RIGHT = V(1, 0, 0);

  // --- profile tools ------------------------------------------------------------------------------
  const shapeOf = (pts, holes = []) => {
    const s = new THREE.Shape(pts.map(([x, y]) => V2(x, y)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => V2(x, y))));
    return s;
  };
  // a w x h rectangle centred on (cx, cy), its corners cut at 45 degrees by c
  const cham = (w, h, c = 0, cx = 0, cy = 0) => {
    const X = w / 2, Y = h / 2;
    const p = c > 0
      ? [[-X + c, -Y], [X - c, -Y], [X, -Y + c], [X, Y - c], [X - c, Y], [-X + c, Y], [-X, Y - c], [-X, -Y + c]]
      : [[-X, -Y], [X, -Y], [X, Y], [-X, Y]];
    return p.map(([x, y]) => [x + cx, y + cy]);
  };
  // Extrude an outline along +Z from z = 0 to z = depth. A bevel grows the outline outward by
  // its size and the depth by twice its thickness, so callers that bevel pass an outline
  // already shrunk by it (and holes already grown by it); depth is the finished depth.
  const ext = (pts, depth, bevel = 0, holes = []) => {
    const geo = new THREE.ExtrudeGeometry(shapeOf(pts, holes), {
      depth: depth - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 1, curveSegments: 1,
    });
    geo.translate(0, 0, bevel);
    return geo;
  };
  const grow = (c, b) => c - b * (2 - Math.SQRT2);      // chamfer to draw so a bevel of b ends at c
  // Turn a profile [[r, y], ...] about +Y. Normals are set per profile segment, so a step in
  // the profile stays a crisp edge, and smooth around the axis unless facets is set.
  const turn = (prof, seg, facets = false) => {
    const pos = [], nor = [], uv = [];
    let run = 0;
    for (let i = 0; i < prof.length - 1; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      const len = Math.hypot(r1 - r0, y1 - y0);
      const nr = (y1 - y0) / len, ny = -(r1 - r0) / len;
      for (let k = 0; k < seg; k++) {
        const t0 = (k / seg) * Math.PI * 2, t1 = ((k + 1) / seg) * Math.PI * 2, tm = (t0 + t1) / 2;
        const P = (r, y, t) => [r * Math.sin(t), y, r * Math.cos(t)];
        const N = (t) => { const u = facets ? tm : t; return [nr * Math.sin(u), ny, nr * Math.cos(u)]; };
        const a = P(r0, y0, t0), b = P(r0, y0, t1), c = P(r1, y1, t1), d = P(r1, y1, t0);
        const ua = [k / seg, run], ub = [(k + 1) / seg, run], uc = [(k + 1) / seg, run + len], ud = [k / seg, run + len];
        if (r0 > 1e-6) { pos.push(...a, ...b, ...c); nor.push(...N(t0), ...N(t1), ...N(t1)); uv.push(...ua, ...ub, ...uc); }
        if (r1 > 1e-6) { pos.push(...a, ...c, ...d); nor.push(...N(t0), ...N(t1), ...N(t0)); uv.push(...ua, ...uc, ...ud); }
      }
      run += len;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return geo;
  };
  // put a part with its local +Y along dir, its origin at p
  const place = (geo, m, p, dir = UP, parent = g) => {
    const me = add(geo, m, parent);
    me.position.copy(p);
    me.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    return me;
  };
  // put a flat extruded part: its local +X along ax, its extrusion (+Z) along nz
  const orient = (geo, m, p, ax, nz, parent = g) => {
    const me = add(geo, m, parent);
    const z = nz.clone().normalize(), x = ax.clone().addScaledVector(z, -ax.dot(z)).normalize(), y = z.clone().cross(x);
    me.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    me.position.copy(p);
    return me;
  };

  // --- the case ------------------------------------------------------------------------------------
  const W = 0.5, H = 0.34, D = 0.28, T = 0.018, C = 0.016, RUN = 0.022, B = 0.004;
  const yB = RUN, yT = RUN + H, yM = (yB + yT) / 2, ZB = -D / 2;
  const opening = cham(W - 2 * T + 2 * B, H - 2 * T + 2 * B, 0, 0, yM);
  add(ext(cham(W - 2 * B, H - 2 * B, grow(C, B), 0, yM), D, B, [opening]), TIMBER).position.z = -D / 2;
  const PF = D / 2 - 0.012;                                   // face of the front panel
  add(ext(cham(W - 2 * T, H - 2 * T, 0, 0, yM), 0.012), PANEL).position.z = PF - 0.012;
  add(ext(cham(W - 2 * T, H - 2 * T, 0, 0, yM), 0.01), PANEL).position.z = -0.025;
  for (const s of [-1, 1]) {
    add(ext(cham(0.05 - 0.006, RUN - 0.006, 0, s * 0.17, RUN / 2), D + 0.012, 0.003), TIMBER).position.z = -(D + 0.012) / 2;
    // side cleat with bevelled ends, seen edge-on from the front: extruded along Z
    add(ext(cham(0.012 - 0.004, 0.032 - 0.004, 0, s * (W / 2 + 0.006), yM - 0.03), 0.19, 0.002), TIMBER).position.z = -0.095;
  }
  // corner plates: an L section hugging each chamfered long edge, at the front and at the back
  const P = 0.05, PT = 0.004, LEG = 0.036, k = PT * (Math.SQRT2 - 1);
  const capL = [[0, -C - LEG], [0, -C], [-C, 0], [-C - LEG, 0], [-C - LEG, PT], [-C + k, PT], [PT, -C + k], [PT, -C - LEG]];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const ye = sy > 0 ? yT : yB;
    const cap = add(ext(capL.map(([u, v]) => [sx * (W / 2 + u), ye + sy * v]), P + PT), BRONZE);
    cap.position.z = sz > 0 ? D / 2 - P : -D / 2 - PT;
  }

  // --- the front panel -----------------------------------------------------------------------------
  // speaker grille: a bronze disc with seven slots cut through it, a turned bezel over its rim
  const GX = -0.112, GY = yM + 0.004, GR = 0.082;
  const disc = [];
  for (let i = 0; i < 16; i++) disc.push([GX + GR * Math.cos((i / 16) * Math.PI * 2), GY + GR * Math.sin((i / 16) * Math.PI * 2)]);
  const slots = [];
  for (let i = -3; i <= 3; i++) {
    const y = i * 0.0205, half = Math.sqrt((GR - 0.013) ** 2 - (Math.abs(y) + 0.0045) ** 2);
    slots.push(cham(2 * half, 0.009, 0, GX, GY + y));
  }
  add(ext(disc, 0.004, 0, slots), BRONZE).position.z = PF;
  place(turn([[GR + 0.009, 0], [GR + 0.009, 0.005], [GR - 0.005, 0.009]], 16), BRONZE, V(GX, GY, PF), FWD);
  // two dials: turned bezel, flat parchment face, an inked scale arc, a vermilion needle
  for (const [x, y, ang] of [[0.05, 0.252, 0.7], [0.163, 0.252, -0.45]]) {
    place(turn([[0.047, 0], [0.047, 0.005], [0.043, 0.009], [0.039, 0.007]], 14), BRONZE, V(x, y, PF), FWD);
    place(turn([[0.041, 0.004], [0, 0.004]], 14), PARCH, V(x, y, PF), FWD);
    const arc = [];
    for (let i = 0; i <= 4; i++) { const a = Math.PI * (0.1 + 0.2 * i); arc.push([x + 0.032 * Math.cos(a), y + 0.032 * Math.sin(a)]); }
    for (let i = 4; i >= 0; i--) { const a = Math.PI * (0.1 + 0.2 * i); arc.push([x + 0.028 * Math.cos(a), y + 0.028 * Math.sin(a)]); }
    add(ext(arc, 0.001), LEATHER).position.z = PF + 0.004;
    const needle = add(ext([[-0.003, -0.007], [0.003, -0.007], [0.0008, 0.03], [-0.0008, 0.03]], 0.002), RED);
    needle.position.set(x, y, PF + 0.005);
    needle.rotation.z = ang;
  }
  // three fluted knobs in a row, each with a pointer line on its cap
  const KY = 0.132;
  for (const x of [0.045, 0.107, 0.169]) {
    place(turn([[0.025, 0], [0.025, 0.004], [0.017, 0.006], [0.016, 0.025], [0, 0.028]], 8, true), BRONZE, V(x, KY, PF), FWD);
    add(ext(cham(0.004, 0.012, 0, x, KY + 0.006), 0.002), PARCH).position.z = PF + 0.027;
  }
  // the jack and the headset plug in it
  const JX = 0.19, JY = 0.07;
  place(turn([[0.013, 0], [0.013, 0.003], [0.009, 0.004], [0.0085, 0.03]], 8), BRONZE, V(JX, JY, PF), FWD);
  place(turn([[0.0105, 0], [0.0105, 0.018], [0.007, 0.024], [0, 0.024]], 6), LEATHER, V(JX, JY, PF + 0.018), FWD);

  // --- the handle: the strap's side view, an arch, extruded to its width; two slotted brackets -----
  const arch = [], NA = 8;
  for (let i = 0; i <= NA; i++) { const a = (Math.PI * i) / NA; arch.push([0.079 * Math.cos(a), 0.05 * Math.sin(a)]); }
  for (let i = NA; i >= 0; i--) { const a = (Math.PI * i) / NA; arch.push([0.071 * Math.cos(a), 0.042 * Math.sin(a)]); }
  add(ext(arch, 0.03), LEATHER).position.set(0, yT + 0.008, -0.015);
  for (const s of [-1, 1]) {
    const br = [[-0.014, 0], [0.014, 0], [0.014, 0.012], [0.008, 0.02], [-0.008, 0.02], [-0.014, 0.012]];
    const slot = [[-0.0075, 0.005], [0.0075, 0.005], [0.0075, 0.013], [-0.0075, 0.013]];
    add(ext(br.map(([x, y]) => [x + s * 0.075, y + yT]), 0.038, 0, [slot.map(([x, y]) => [x + s * 0.075, y + yT])]), BRONZE).position.z = -0.019;
  }

  // --- the back cover: swung up past upright on two strap hinges, held by stays -----------------
  const LL = H - 0.004, LT = 0.026, LB = 0.003;
  const lid = new THREE.Group();
  lid.position.set(0, yT, ZB);
  lid.rotation.x = THREE.MathUtils.degToRad(160);
  g.add(lid);
  add(ext(cham(W - 2 * LB, LL - 2 * LB, grow(C, LB), 0, -LL / 2), LT, LB), TIMBER, lid).position.z = -LT;
  // outside (local -z, facing forward once open): tapering strap hinges, corner plates, a hasp
  for (const s of [-1, 1]) {
    add(ext([[-0.018, 0.004], [0.018, 0.004], [0.012, -0.2], [0, -0.228], [-0.012, -0.2]].map(([x, y]) => [x + s * 0.14, y]), 0.003), BRONZE, lid).position.z = -LT - 0.003;
    const corner = [[W / 2, -LL + 0.062], [W / 2, -LL + C], [W / 2 - C, -LL], [W / 2 - 0.062, -LL]].map(([x, y]) => [s * x, y]);
    add(ext(corner, 0.003), BRONZE, lid).position.z = -LT - 0.003;
    add(ext(corner, 0.003), BRONZE, lid).position.z = 0;
  }
  add(ext(cham(0.032, 0.05, 0.008, 0, -LL + 0.03), 0.004), BRONZE, lid).position.z = -LT - 0.004;
  // inside (local +z, facing back once open): a pasted wiring chart, one inked circuit on it
  add(ext(cham(0.34 - 0.002, 0.23 - 0.002, 0, 0, -LL / 2 - 0.01), 0.003, 0.001), PARCH, lid);
  const inkPath = [[-0.13, -0.24], [-0.13, -0.09], [0.13, -0.09], [0.13, -0.24], [0.07, -0.24], [0.055, -0.222],
    [0.035, -0.258], [0.015, -0.222], [0, -0.24], [-0.07, -0.24]];
  const inkL = [], inkR = [];
  for (let i = 0; i < inkPath.length; i++) {
    const p = V2(...inkPath[i]);
    const dIn = i > 0 ? p.clone().sub(V2(...inkPath[i - 1])).normalize() : null;
    const dOut = i < inkPath.length - 1 ? V2(...inkPath[i + 1]).sub(p).normalize() : null;
    const nIn = dIn && V2(-dIn.y, dIn.x), nOut = dOut && V2(-dOut.y, dOut.x);
    const n = nIn && nOut ? nIn.clone().add(nOut).normalize() : (nIn || nOut);
    const miter = nIn && nOut ? 0.0018 / Math.max(0.35, n.dot(nIn)) : 0.0018;
    inkL.push([p.x + n.x * miter, p.y + n.y * miter]);
    inkR.unshift([p.x - n.x * miter, p.y - n.y * miter]);
  }
  add(ext([...inkL, ...inkR], 0.001), LEATHER, lid).position.z = 0.003;
  for (const s of [-1, 1]) {
    place(turn([[0, 0], [0.007, 0], [0.009, 0.004], [0.009, 0.076], [0.007, 0.08], [0, 0.08]], 6), BRONZE, V(s * 0.14 - 0.04, yT + 0.003, ZB - 0.003), RIGHT);
  }
  lid.updateMatrix();
  for (const s of [-1, 1]) {
    // a flat bar with cut ends, from the case side up to the cover's edge
    const a = V(s * (W / 2 + 0.004), yT - 0.07, ZB + 0.065);
    const b = V(s * W / 2, -0.17, -LT / 2).applyMatrix4(lid.matrix);
    const L = a.distanceTo(b);
    const bar = [[-0.006, 0], [0, -0.005], [L, -0.005], [L + 0.006, 0], [L, 0.005], [0, 0.005]];
    orient(ext(bar, 0.004), BRONZE, a, b.clone().sub(a), V(s, 0, 0));
  }

  // --- the open compartment: battery and coil under a bronze chassis with three valves ----------
  add(ext(cham(W - 2 * T, 0.008, 0, 0, 0.205), 0.112), BRONZE).position.z = -0.137;
  add(ext(cham(0.2, 0.13, 0.012, -0.115, yB + T + 0.065), 0.095), LEATHER).position.z = -0.1225;
  add(ext(cham(0.204, 0.03, 0.004, -0.115, yB + T + 0.08), 0.099), RED).position.z = -0.1245;
  add(ext(cham(0.07, 0.065, 0.01, 0.13, 0.209 + 0.0325), 0.07), BRONZE).position.z = -0.12;
  for (const x of [-0.16, -0.085, -0.01]) {
    place(turn([[0.02, 0], [0.02, 0.014], [0.015, 0.017]], 5), BRONZE, V(x, 0.209, -0.085));
    place(turn([[0.015, 0.017], [0.016, 0.06], [0.01, 0.076], [0, 0.08]], 5), PARCH, V(x, 0.209, -0.085));
  }
  const coilAt = V(0.05, 0.12, -0.08);
  place(turn([[0, 0], [0.045, 0], [0.045, 0.008], [0.036, 0.008]], 6), BRONZE, coilAt, RIGHT);
  place(turn([[0.036, 0.008], [0.036, 0.122]], 6), ROPE, coilAt, RIGHT);
  place(turn([[0.036, 0.122], [0.045, 0.122], [0.045, 0.13], [0, 0.13]], 6), BRONZE, coilAt, RIGHT);

  // --- the antenna: a turned base and ball, then one turned telescope of three sections ---------
  const A0 = V(-0.17, yT, -0.06);
  place(turn([[0.026, 0], [0.026, 0.004], [0.013, 0.012], [0.017, 0.022], [0.011, 0.034], [0, 0.036]], 6), BRONZE, A0);
  const dir = V(-0.36, 1, -0.14).normalize();
  place(turn([[0.0125, 0], [0.0125, 0.03], [0.0095, 0.03], [0.0095, 0.26], [0.0125, 0.262], [0.0125, 0.285],
    [0.007, 0.285], [0.007, 0.49], [0.0095, 0.492], [0.0095, 0.51], [0.005, 0.51], [0.005, 0.695], [0.011, 0.7],
    [0.009, 0.712], [0, 0.716]], 6), BRONZE, A0.clone().add(V(0, 0.024, 0)), dir);

  // --- the headset, set down on its side: the cups stand on their rims, facing each other, and the
  // band runs between their backs as a flat U
  const hs = new THREE.Group();
  hs.position.set(0.43, 0, 0.13);
  hs.rotation.y = -0.75;
  g.add(hs);
  const HR = 0.07, CY = 0.035;
  const band = [];
  for (let i = 0; i <= 10; i++) { const a = Math.PI * (-0.04 + 1.08 * i / 10); band.push([(HR + 0.002) * Math.cos(a), (HR + 0.002) * Math.sin(a)]); }
  for (let i = 10; i >= 0; i--) { const a = Math.PI * (-0.04 + 1.08 * i / 10); band.push([(HR - 0.002) * Math.cos(a), (HR - 0.002) * Math.sin(a)]); }
  const bandMesh = add(ext(band, 0.018), BRONZE, hs);
  bandMesh.rotation.x = Math.PI / 2;               // the U lies flat, its bow towards +Z
  bandMesh.position.set(0, CY + 0.009, 0);
  for (const s of [-1, 1]) {
    // cup and pad turned about the local axis pointing at the other earpiece
    const at = V(s * (HR + 0.004), CY, -0.004);
    const inward = V(-s, 0, 0);
    place(turn([[0, -0.006], [0.012, -0.004], [0.028, 0], [0.034, 0.012], [0.034, 0.02]], 8), BRONZE, at, inward, hs);
    place(turn([[0.031, 0.02], [0.031, 0.028], [0.017, 0.031], [0, 0.028]], 8), LEATHER, at, inward, hs);
  }

  // --- the cable: a tube from the plug, down to the ground, a spiral of two loops, to a cup -------
  hs.updateMatrix();
  const cupBack = V(-(HR + 0.004), CY, -0.004).applyMatrix4(hs.matrix);
  const cc = V(0.27, 0, 0.3), CR = 0.0055;
  const pts = [V(JX, JY, PF + 0.042), V(JX + 0.004, 0.052, PF + 0.062), V(JX + 0.016, 0.02, PF + 0.082)];
  const a0 = 1.25 * Math.PI, sweep = 4.4 * Math.PI, NS = 16, ae = a0 + sweep;
  for (let i = 0; i <= NS; i++) {
    const a = a0 + (i / NS) * sweep, r = 0.052 - 0.013 * (i / NS);
    pts.push(V(cc.x + r * Math.cos(a), CR, cc.z + r * Math.sin(a)));
  }
  // out of the middle of the coil, over its outer turn, and across to the cup's back
  const back = V(-Math.cos(hs.rotation.y), 0, Math.sin(hs.rotation.y));
  pts.push(V(cc.x + 0.058 * Math.cos(ae), 2.8 * CR, cc.z + 0.058 * Math.sin(ae)),
    V(cc.x + 0.085 * Math.cos(ae), CR, cc.z + 0.085 * Math.sin(ae)),
    cupBack.clone().addScaledVector(back, 0.035).setY(CR * 1.5), cupBack);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, CR, 4, false), LEATHER);

  // --- placement: base on y = 0, centred on x and z ------------------------------------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const ctr = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= bb.min.y; o.position.z -= ctr.z; });
  return g;
}
