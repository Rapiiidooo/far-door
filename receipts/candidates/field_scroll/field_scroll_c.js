// field_scroll, arm C: a second reading.
// The brief's 0.5 m read as the length of the roll rather than of the whole piece: a wide map
// rolled along X, tied round its middle, with 0.3 m of its free edge unrolled towards +Z. Built as
// separate parts rather than one sweep. The roll is a spiral of three and a half turns whose inner
// turns have slid along the axis, as an old loose roll does, so its right end steps out and its
// left end steps in. The unrolled sheet is a hand-built grid cockled into low waves, its free edge
// a little skewed and curling tighter at the left corner than at the right. The ink is draped
// over the waves. The cord's knot sits on the upper front and its two frayed ends lie on the sheet.
// Front faces +Z: the map reads upright from the front, with the roll along its top edge.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const PARCH = mat(0xe6d3ae, 'fabric', { roughness: 0.86, side: THREE.DoubleSide });
  const INK = mat(0x4b2e1e, 'fabric', { roughness: 0.8 });
  const CORD = mat(0xb49a6a, 'fabric', { roughness: 0.93 });

  // --- triangle soup with explicit normals; each triangle is wound to agree with its normals -----
  const soup = () => {
    const pos = [], nor = [], uv = [];
    const e1 = V(0, 0, 0), e2 = V(0, 0, 0), fn = V(0, 0, 0), mn = V(0, 0, 0);
    const tri = (a, b, c) => {
      e1.subVectors(b.p, a.p); e2.subVectors(c.p, a.p); fn.crossVectors(e1, e2);
      mn.copy(a.n).add(b.n).add(c.n);
      if (fn.dot(mn) < 0) [b, c] = [c, b];
      for (const q of [a, b, c]) { pos.push(q.p.x, q.p.y, q.p.z); nor.push(q.n.x, q.n.y, q.n.z); uv.push(q.u[0], q.u[1]); }
    };
    const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
    const geo = () => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      return geom;
    };
    return { tri, quad, geo };
  };
  const vx = (p, n, u) => ({ p, n, u: u || [p.x + p.z, p.y] });

  const T = 0.0035;                 // thickness of the sheet
  const P = 0.009, NT = 3.6;        // radial pitch per turn and number of turns
  const RC = 0.045 + P / 2 - T / 2; // centreline radius of the outer turn where it leaves the roll
  const CY = RC + T / 2;            // height of the roll's axis: the outer turn touches the ground
  const L = 0.5;                    // length of the roll, which is the width of the sheet
  const TEL = 0.022;                // how far the innermost turn has slid towards +X

  // --- the roll: a spiral in (z, y), swept along X, each turn slid a little further ----------------
  const sList = [0], SMAX = 2 * Math.PI * NT;
  for (;;) {
    const s = sList[sList.length - 1], r = RC - (P * s) / (2 * Math.PI);
    const ds = Math.min((2 * Math.PI) / 9, Math.max((2 * Math.PI) / 15, 0.02 / r));
    if (SMAX - s < 1.4 * ds) { sList.push(SMAX); break; }
    sList.push(s + ds);
  }
  sList.reverse();                  // innermost edge first; the last point is where the sheet leaves
  const prof = sList.map((s) => {
    const r = RC - (P * s) / (2 * Math.PI), al = 1.5 * Math.PI - s;
    return [r * Math.cos(al), CY + r * Math.sin(al)];
  });
  const slide = sList.map((s) => (TEL * s) / SMAX);
  const n = prof.length;
  const tan = prof.map((_, i) => {
    const a = prof[Math.max(0, i - 1)], b = prof[Math.min(n - 1, i + 1)];
    const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy);
    return [dz / l, dy / l];
  });
  const nrm = tan.map(([tz, ty]) => [-ty, tz]);   // towards the axis: the inked face
  const off = (i, x, d) => V(x, prof[i][1] + nrm[i][1] * d, prof[i][0] + nrm[i][0] * d);
  const N3 = (i, s) => V(0, s * nrm[i][1], s * nrm[i][0]);
  {
    const S = soup();
    for (let i = 0; i < n - 1; i++) {
      const j = i + 1, xi = [-L / 2 + slide[i], L / 2 + slide[i]], xj = [-L / 2 + slide[j], L / 2 + slide[j]];
      for (const s of [1, -1]) {
        const d = (s * T) / 2;
        S.quad(vx(off(i, xi[0], d), N3(i, s)), vx(off(j, xj[0], d), N3(j, s)), vx(off(j, xj[1], d), N3(j, s)), vx(off(i, xi[1], d), N3(i, s)));
      }
      for (const e of [0, 1]) {
        const nx = V(e ? 1 : -1, 0, 0);
        S.quad(vx(off(i, xi[e], T / 2), nx), vx(off(j, xj[e], T / 2), nx), vx(off(j, xj[e], -T / 2), nx), vx(off(i, xi[e], -T / 2), nx));
      }
    }
    // the innermost cut edge; the outer end runs on into the sheet
    const nt = V(0, -tan[0][1], -tan[0][0]), x0 = -L / 2 + slide[0], x1 = L / 2 + slide[0];
    S.quad(vx(off(0, x0, T / 2), nt), vx(off(0, x0, -T / 2), nt), vx(off(0, x1, -T / 2), nt), vx(off(0, x1, T / 2), nt));
    g.add(new THREE.Mesh(S.geo(), PARCH));
  }
  {
    // a dark fan inside each end, behind the deepest step, so the gaps between turns read as shadow
    const S = soup(), first = Math.max(0, sList.findIndex((s) => s <= 2 * Math.PI * 1.15) - 1), last = n - 1;
    for (const x of [-L / 2 + TEL + 0.004, L / 2 - 0.004]) {
      const nx = V(Math.sign(x), 0, 0), c = V(x, CY, 0);
      for (let i = first; i < last; i++) S.tri(vx(c, nx), vx(off(i, x, T / 2 + 0.0004), nx), vx(off(i + 1, x, T / 2 + 0.0004), nx));
    }
    g.add(new THREE.Mesh(S.geo(), INK));
  }

  // --- the unrolled sheet: a grid across X (u) and out from the roll (v) --------------------------
  const NU = 6, NF = 5, NCU = 9, K = NF + NCU;
  const runOf = (u) => 0.25 + 0.022 * (u - 0.5);       // flat run, a little longer on the right
  const curlR = (u) => 0.019 + 0.013 * u;              // the curl is tighter on the left...
  const curlA = (u) => (1.5 - 0.36 * u) * Math.PI;     // ...and turns further there
  // low cockling waves, zero where the sheet leaves the roll and where it starts to curl
  const lift = (x, z) => {
    const u = x / L + 0.5, w = Math.min(1, Math.max(0, z / runOf(u)));
    return 0.016 * w * (1 - w) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 1.4 * u + 0.8));
  };
  const grid = [];   // grid[k][iu] = { t: inked face, b: underside }
  for (let k = 0; k <= K; k++) {
    const row = [];
    for (let iu = 0; iu <= NU; iu++) {
      const u = iu / NU, x = -L / 2 + u * L;
      if (k <= NF) {
        const z = (k / NF) * runOf(u), y = lift(x, z);
        row.push({ t: V(x, y + T, z), b: V(x, y, z) });
      } else {
        const R0 = curlR(u), b = (curlA(u) * (k - NF)) / NCU, rc = R0 * (1 - (0.3 * b) / (2 * Math.PI)), al = -Math.PI / 2 + b;
        const cz = runOf(u), cy = T / 2 + R0, dz = Math.cos(al), dy = Math.sin(al);
        row.push({ t: V(x, cy + (rc - T / 2) * dy, cz + (rc - T / 2) * dz), b: V(x, cy + (rc + T / 2) * dy, cz + (rc + T / 2) * dz) });
      }
    }
    grid.push(row);
  }
  const gn = (k, iu) => {
    const du = grid[k][Math.min(NU, iu + 1)].t.clone().sub(grid[k][Math.max(0, iu - 1)].t);
    const dv = grid[Math.min(K, k + 1)][iu].t.clone().sub(grid[Math.max(0, k - 1)][iu].t);
    return dv.cross(du).normalize();   // up on the flat, into the curl
  };
  {
    const S = soup(), N = grid.map((row, k) => row.map((_, iu) => gn(k, iu)));
    const neg = (v) => v.clone().negate();
    for (let k = 0; k < K; k++) {
      for (let iu = 0; iu < NU; iu++) {
        const a = [k, iu], b = [k, iu + 1], c = [k + 1, iu + 1], d = [k + 1, iu];
        S.quad(...[a, b, c, d].map(([kk, ii]) => vx(grid[kk][ii].t, N[kk][ii])));
        // the underside only where it can be seen: under and outside the curl
        if (k >= NF) S.quad(...[a, b, c, d].map(([kk, ii]) => vx(grid[kk][ii].b, neg(N[kk][ii]))));
      }
      for (const iu of [0, NU]) {
        const nx = V(iu ? 1 : -1, 0, 0);
        S.quad(vx(grid[k][iu].t, nx), vx(grid[k + 1][iu].t, nx), vx(grid[k + 1][iu].b, nx), vx(grid[k][iu].b, nx));
      }
    }
    for (let iu = 0; iu < NU; iu++) {
      const f = grid[K][iu].t.clone().sub(grid[K - 1][iu].t).normalize();
      S.quad(vx(grid[K][iu].t, f), vx(grid[K][iu + 1].t, f), vx(grid[K][iu + 1].b, f), vx(grid[K][iu].b, f));
    }
    g.add(new THREE.Mesh(S.geo(), PARCH));
  }

  // --- the map: ink swept as a raised bead, draped over the waves, "up" towards the roll ----------
  const HI = 0.0017, WB = 0.0092, WT = 0.0052;
  const onSheet = (x, z) => T + lift(x, z) + 0.0004;
  {
    const S = soup();
    const faceOut = (a, b, c, ref) => {
      const f = V(0, 0, 0).subVectors(b, a).cross(V(0, 0, 0).subVectors(c, a)).normalize();
      return f.dot(a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(ref)) < 0 ? f.negate() : f;
    };
    // split long strokes so they can follow the waves
    const fine = (pts, closed) => {
      const out = [];
      const m = closed ? pts.length : pts.length - 1;
      for (let k = 0; k < m; k++) {
        const [ax, az] = pts[k], [bx, bz] = pts[(k + 1) % pts.length];
        const cuts = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.034));
        for (let c = 0; c < cuts; c++) out.push([ax + ((bx - ax) * c) / cuts, az + ((bz - az) * c) / cuts]);
      }
      if (!closed) out.push(pts[pts.length - 1]);
      return out;
    };
    const bead = (raw, { closed = false, raise = 0 } = {}) => {
      const pts = fine(raw, closed), m = pts.length, segs = closed ? m : m - 1, dirs = [];
      for (let k = 0; k < segs; k++) {
        const [ax, az] = pts[k], [bx, bz] = pts[(k + 1) % m], l = Math.hypot(bx - ax, bz - az);
        dirs.push([(bx - ax) / l, (bz - az) / l]);
      }
      const ring = (k) => {
        const a = dirs[closed ? (k - 1 + segs) % segs : Math.max(0, k - 1)], b = dirs[closed ? k % segs : Math.min(segs - 1, k)];
        let tx = a[0] + b[0], tz = a[1] + b[1];
        const l = Math.hypot(tx, tz); tx /= l; tz /= l;
        const sc = 1 / Math.max(0.6, tx * b[0] + tz * b[1]);
        const sx = -tz * sc, sz = tx * sc, [x, z] = pts[k];
        const at = (o, h) => V(x + sx * o, onSheet(x + sx * o, z + sz * o) + h + raise, z + sz * o);
        return [at(-WB / 2, 0), at(-WT / 2, HI), at(WT / 2, HI), at(WB / 2, 0)];
      };
      const rings = pts.map((_, k) => ring(k));
      for (let k = 0; k < segs; k++) {
        const r0 = rings[k], r1 = rings[(k + 1) % m];
        const ref = r0[0].clone().add(r0[3]).add(r1[0]).add(r1[3]).multiplyScalar(0.25);
        for (let e = 0; e < 3; e++) {
          const f = faceOut(r0[e], r0[e + 1], r1[e + 1], ref);
          S.quad(vx(r0[e], f), vx(r0[e + 1], f), vx(r1[e + 1], f), vx(r1[e], f));
        }
      }
      if (!closed) {
        for (const [k, s] of [[0, -1], [m - 1, 1]]) {
          const d = dirs[k ? segs - 1 : 0], f = V(s * d[0], 0, s * d[1]), r = rings[k];
          S.quad(vx(r[0], f), vx(r[1], f), vx(r[2], f), vx(r[3], f));
        }
      }
    };
    // a river down the left third
    const river = [];
    for (let i = 0; i <= 7; i++) {
      const u = i / 7;
      river.push([-0.2 + 0.075 * u + 0.022 * Math.sin(u * Math.PI * 2.4), 0.062 + 0.168 * u]);
    }
    bead(river);
    // three peaks, top right
    for (const [px, pz, s] of [[0.118, 0.078, 1], [0.16, 0.068, 1.2], [0.203, 0.08, 0.9]]) {
      bead([[px - 0.017 * s, pz + 0.028 * s], [px, pz], [px + 0.017 * s, pz + 0.028 * s]]);
    }
    // the circle, as a closed bead
    const circle = [];
    for (let i = 0; i < 14; i++) circle.push([0.135 + 0.025 * Math.cos((i / 14) * Math.PI * 2), 0.165 + 0.025 * Math.sin((i / 14) * Math.PI * 2)]);
    bead(circle, { closed: true });
    // a dashed trail from the circle to the cross
    const trail = [[0.105, 0.178], [0.066, 0.2], [0.024, 0.205], [-0.012, 0.196]];
    for (let i = 0; i < trail.length - 1; i++) {
      const [ax, az] = trail[i], [bx, bz] = trail[i + 1];
      bead([[ax + (bx - ax) * 0.18, az + (bz - az) * 0.18], [ax + (bx - ax) * 0.74, az + (bz - az) * 0.74]]);
    }
    // the cross; one stroke rides a hair above the other where they meet
    bead([[-0.056, 0.176], [-0.02, 0.212]]);
    bead([[-0.056, 0.212], [-0.02, 0.176]], { raise: 0.0003 });
    g.add(new THREE.Mesh(S.geo(), INK));
  }

  // --- the cord: two turns round the middle, a knot on the upper front, ends lying on the sheet ----
  const RCD = 0.0048, SIDES = 5;
  const C = soup();
  const tube = (pts) => {
    const m = pts.length;
    const tg = pts.map((_, i) => pts[Math.min(m - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize());
    const nn = Math.abs(tg[0].y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0), rings = [];
    for (let i = 0; i < m; i++) {
      nn.addScaledVector(tg[i], -nn.dot(tg[i])).normalize();   // parallel transport: no twist
      const bb = V(0, 0, 0).crossVectors(tg[i], nn), ring = [];
      for (let k = 0; k < SIDES; k++) {
        const a = (k / SIDES) * Math.PI * 2, dv = nn.clone().multiplyScalar(Math.cos(a)).addScaledVector(bb, Math.sin(a));
        ring.push(vx(pts[i].clone().addScaledVector(dv, RCD), dv, [i * 0.02, k / SIDES]));
      }
      rings.push(ring);
    }
    for (let i = 0; i < m - 1; i++) {
      for (let k = 0; k < SIDES; k++) C.quad(rings[i][k], rings[i][(k + 1) % SIDES], rings[i + 1][(k + 1) % SIDES], rings[i + 1][k]);
    }
    for (const [i, s] of [[0, -1], [m - 1, 1]]) {
      const nt = tg[i].clone().multiplyScalar(s);
      for (let k = 1; k < SIDES - 1; k++) C.tri(vx(rings[i][0].p, nt), vx(rings[i][k].p, nt), vx(rings[i][k + 1].p, nt));
    }
  };
  // the roll's outer face at angle al: the outer turn shrinks by a pitch on its way round
  const rollOut = (al) => {
    const s = (((1.5 * Math.PI - al) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return RC - (P * s) / (2 * Math.PI) + T / 2;
  };
  const onRoll = (x, al, lift0) => {
    const r = rollOut(al) + RCD + lift0;
    return V(x, Math.max(CY + r * Math.sin(al), RCD + 0.0003), r * Math.cos(al));
  };
  const AK = (62 / 180) * Math.PI;
  {
    const pts = [], NW = 22;
    for (let i = 0; i <= NW; i++) pts.push(onRoll(-0.0072 + (0.0144 * i) / NW, AK + (4 * Math.PI * i) / NW, 0.0018));
    tube(pts);
  }
  const lay = (x, z) => V(x, onSheet(x, z) + RCD - 0.0006, z);
  const ends = [
    [V(0.006, 0, 0).add(onRoll(0, AK, 0.0035)), V(0.012, 0.0692, 0.0487), V(0.02, 0.0325, 0.0523), lay(0.032, 0.078), lay(0.052, 0.108), lay(0.074, 0.128)],
    [V(-0.006, 0, 0).add(onRoll(0, AK, 0.0035)), V(-0.01, 0.0698, 0.0492), V(-0.018, 0.033, 0.0535), lay(-0.03, 0.082), lay(-0.056, 0.104), lay(-0.079, 0.119)],
  ];
  for (const ctrl of ends) {
    const pts = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal').getPoints(7);
    for (const p of pts) if (p.z > 0.06) p.y = Math.max(p.y, onSheet(p.x, p.z) + RCD - 0.0006);
    tube(pts);
    // the frayed tip: three fibres splaying out over the sheet
    const b = pts[pts.length - 1], dir = b.clone().sub(pts[pts.length - 2]).setY(0).normalize();
    for (const turn of [-0.42, 0, 0.42]) {
      const f = dir.clone().applyAxisAngle(UP, turn), cone = new THREE.Mesh(new THREE.ConeGeometry(0.0024, 0.024, 4), CORD);
      const a0 = b.clone().addScaledVector(dir, -0.003), a1 = b.clone().addScaledVector(f, 0.021);
      a1.y = onSheet(a1.x, a1.z) + 0.0024;
      cone.position.copy(a0).add(a1).multiplyScalar(0.5);
      cone.quaternion.setFromUnitVectors(UP, a1.clone().sub(a0).normalize());
      g.add(cone);
    }
  }
  g.add(new THREE.Mesh(C.geo(), CORD));
  {
    // the knot: a lathed bead lying across the two turns
    const v2 = (x, y) => new THREE.Vector2(x, y);
    const knot = new THREE.Mesh(new THREE.LatheGeometry([v2(0.0004, -0.012), v2(0.0062, -0.0095), v2(0.0092, -0.004),
      v2(0.0092, 0.004), v2(0.0062, 0.0095), v2(0.0004, 0.012)], 6), CORD);
    knot.position.copy(onRoll(0, AK, 0.0042));
    knot.rotation.set(-AK, 0, Math.PI / 2, 'YXZ');   // axis along X, local Z squashed radially
    knot.scale.set(1, 1, 0.8);
    g.add(knot);
  }

  // --- placement: base on y = 0, centred on x and z -----------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((nd) => {
    const p = nd.isMesh && nd.geometry.attributes.position; if (!p) return;
    const add = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (nd.isInstancedMesh) { for (let c = 0; c < nd.count; c++) { nd.getMatrixAt(c, im); add(m.multiplyMatrices(nd.matrixWorld, im)); } return; }
    add(nd.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
