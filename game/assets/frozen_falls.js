// frozen_falls, candidate A: primitives.
// A curtain of hexagonal columns, each a chain of one-segment frustums that follows the
// fall's profile: bending over the brow of the lip, tucked in under it, swelling out over
// the bulge, drawn in again and flaring into the apron; the two outer ones and one more
// hang free in points. Behind them a deep-ice body (a trapezoid slab, two half-ellipsoid
// swellings and a roll under the brow) fills the gaps, so the grooves between columns read
// dark, and three thinner deep-ice columns sit set back between the clear ones. Frost is
// flattened dodecahedra laid on each clear column's brow and on the upper slope of the
// bulge, a thin crust along the top and a band on the apron; icicles are cones hanging
// under the brow; the apron is a flattened quarter-ellipsoid with three low lobes along its
// front and a dark rim. One flat plate closes the back.
export default function (THREE) {
  const g = new THREE.Group();
  g.userData.mounts = 'back';

  const mat = (hex, rough) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, flatShading: true });
  // Ice has no recipe in the contract's list, so its materials stay unnamed; the game gives
  // ice its gloss and translucency at load.
  const ICE = mat(0xa9d2e3, 0.35);
  const DEEP = mat(0x5b9bbd, 0.4);
  const FROST = mat(0xe9f2f6, 0.85);

  const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);

  // Seeded, so every load builds the same fall.
  let seed = 1811;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  // Jitter keyed on position, for vertices a primitive duplicates per face: the copies of a
  // corner move together and the faces stay closed.
  const hj = (x, y, z, a) => {
    const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return ((h - Math.floor(h)) * 2 - 1) * a;
  };

  // Built against a back plane at z = 0 (the cliff); the placement at the end recentres.
  // The profile: how far the front of the curtain stands off the rock, by height. The ice
  // leaves the rock at the top, rolls over the brow of the lip at 7.4 m, tucks in under it,
  // swells over the bulge at about 4.2 m, draws in again and runs out into the apron.
  const PY = [7.78, 7.33, 6.9, 6.3, 5.45, 4.5, 3.7, 2.6, 1.55, 0.35];
  const PZ = [0.5, 1.04, 0.74, 0.52, 0.84, 1.38, 1.34, 0.96, 0.72, 0.95];
  const front = (y) => {
    if (y >= PY[0]) return PZ[0];
    for (let i = 0; i < PY.length - 1; i++) {
      if (y >= PY[i + 1]) {
        const t = (PY[i] - y) / (PY[i] - PY[i + 1]), s = t * t * (3 - 2 * t);
        return PZ[i] + (PZ[i + 1] - PZ[i]) * s;
      }
    }
    return PZ[PZ.length - 1];
  };
  // the curtain thins towards its edges
  const reach = (x) => 1 - 0.32 * (x / 2.3) ** 2;

  // A frustum from point a (radius ra) to point b (radius rb), one segment tall, closed.
  // Each piece runs a few centimetres past both knots so the chain has no cracks.
  const frustum = (a, b, ra, rb, m, sides = 6, spin = 0) => {
    const dir = V(0, 0, 0).subVectors(b, a);
    const len = dir.length();
    dir.normalize();
    const geo = new THREE.CylinderGeometry(rb, ra, len + 0.08, sides, 1, false, spin);
    const mesh = add(geo, m);
    mesh.quaternion.setFromUnitVectors(UP, dir);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    return mesh;
  };
  // A flattened dodecahedron laid on a slope: a chunky crust of frost. `tilt` turns its flat
  // side from facing up towards facing forward.
  const crust = (x, y, z, sx, sy, sz, tilt, m = FROST, rotY = 0) => {
    const mesh = add(new THREE.DodecahedronGeometry(1, 0), m);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(tilt, rotY, 0);   // spun about its own flat side, then tilted
    mesh.position.set(x, y, z);
    return mesh;
  };

  // --- the deep-ice body -----------------------------------------------------------------
  {
    // A slab with a flat back on the rock, narrower at the lip than at the foot.
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const top = p.getY(i) > 0;
      const hw = top ? 1.5 : 1.95;
      p.setXYZ(i, Math.sign(p.getX(i)) * hw, top ? 7.75 : 0, p.getZ(i) > 0 ? 0.36 : 0.01);   // just off the plate
    }
    geo.computeVertexNormals();
    add(geo, DEEP);
    // The swelling behind the bulge: half an ellipsoid, its open side flat on the rock.
    const b = add(new THREE.SphereGeometry(1, 14, 9, 0, Math.PI), DEEP);
    b.scale.set(1.95, 2.2, 1.08);
    b.position.set(0, 4.25, 0.012);   // its rim just off the plate, so the two never fight
    // A lower swelling where the columns gather into the apron.
    const f = add(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI, 0, Math.PI / 2), DEEP);
    f.scale.set(2.1, 2.0, 0.7);
    f.position.z = 0.012;
    // The face on the rock: one flat plate over the whole outline, facing the cliff, so the
    // back is a single plane that sits flush wherever the fall is set.
    const back = new THREE.PlaneGeometry(1, 1, 1, 7);
    const bp = back.attributes.position;
    const OUT = [[0, 2.5], [0.62, 2.5], [1.1, 2.3], [3.0, 2.28], [4.3, 2.16], [5.6, 1.98], [7.2, 1.84], [8.0, 1.72]];
    for (let i = 0; i < bp.count; i++) {
      const [y, hw] = OUT[Math.round((bp.getY(i) + 0.5) * 7)];
      bp.setXYZ(i, Math.sign(bp.getX(i)) * hw, y, 0);
    }
    back.rotateY(Math.PI);
    back.computeVertexNormals();
    add(back, DEEP);
    // Under the brow, in shadow.
    const u = new THREE.CylinderGeometry(0.34, 0.34, 3.1, 7, 1, false);
    u.rotateZ(Math.PI / 2);
    const um = add(u, DEEP);
    um.position.set(0, 7.2, 0.38);
  }

  // --- the columns -----------------------------------------------------------------------
  // x at the lip and at the foot (the curtain fans out), radius, how far down it reaches
  // (a free end gets a pointed tip), how far it stands out, and whether a corner or a face
  // looks forward. The thin deep-ice columns sit back in the grooves.
  const COLUMNS = [
    { xt: -1.56, xb: -2.16, r: 0.2, yb: 2.3, k: 0.7, spin: 0 },
    { xt: -1.28, xb: -1.74, r: 0.27, yb: 0.3, k: 0.82, spin: 0.52 },
    { xt: -1.02, xb: -1.37, r: 0.16, yb: 0.3, k: 0.72, spin: 0, m: DEEP },
    { xt: -0.76, xb: -1.0, r: 0.3, yb: 0.3, k: 0.94, spin: 0 },
    { xt: -0.4, xb: -0.5, r: 0.27, yb: 0.3, k: 0.99, spin: 0.52 },
    { xt: -0.1, xb: -0.1, r: 0.17, yb: 0.3, k: 0.84, spin: 0, m: DEEP },
    { xt: 0.2, xb: 0.28, r: 0.33, yb: 0.3, k: 1.04, spin: 0 },
    { xt: 0.57, xb: 0.76, r: 0.26, yb: 0.3, k: 0.97, spin: 0.52 },
    { xt: 0.86, xb: 1.18, r: 0.17, yb: 0.3, k: 0.8, spin: 0, m: DEEP },
    { xt: 1.12, xb: 1.52, r: 0.29, yb: 0.3, k: 0.87, spin: 0 },
    { xt: 1.39, xb: 1.86, r: 0.23, yb: 1.4, k: 0.76, spin: 0.52 },
    { xt: 1.6, xb: 2.16, r: 0.18, yb: 3.0, k: 0.66, spin: 0 },
  ];
  const Y_TOP = PY[0], Y_FOOT = 0.3;
  const brows = [];
  for (const c of COLUMNS) {
    const m = c.m || ICE;
    const xAt = (y) => c.xb + (c.xt - c.xb) * (Math.max(0, y - Y_FOOT) / (Y_TOP - Y_FOOT)) ** 1.2;
    // thicker over the bulge and at the foot, tapering towards a free end
    const rAt = (y) => {
      const swell = 1 + 0.2 * Math.exp(-(((y - 4.2) / 1.1) ** 2));
      if (c.yb > Y_FOOT) return c.r * swell * Math.max(0.55, Math.min(1, (y - c.yb) / 2.2 + 0.55));
      return c.r * (swell + 0.35 * Math.max(0, 1 - y / 1.2));
    };
    const pt = (y) => {
      const r = rAt(y), x = xAt(y);
      const z = Math.max(r + 0.02, front(y) * c.k * reach(x) + jit(0.035) - r);
      return { p: V(x + jit(0.025), y, z), r };
    };
    // knots at the profile's heights, each column's own a little higher or lower, so the
    // kinks do not line up across the curtain
    const ys = [Y_TOP];
    for (const y of PY.slice(1, -1)) if (y > c.yb + 0.3) ys.push(y + (y < 7 ? jit(0.2) : jit(0.04)));
    ys.push(Math.max(c.yb, Y_FOOT));
    const knots = ys.map(pt);
    for (let i = 1; i < knots.length; i++) frustum(knots[i].p, knots[i - 1].p, knots[i].r, knots[i - 1].r, m, 6, c.spin);
    const last = knots[knots.length - 1];
    if (c.yb > Y_FOOT) {
      // a hanging column ends in a pointed tip, one segment tall
      const len = 0.5 + last.r * 1.8;
      const tip = new THREE.ConeGeometry(last.r, len, 6, 1, false, c.spin);
      tip.rotateX(Math.PI);
      const t = add(tip, m);
      t.position.set(last.p.x, last.p.y - len / 2 + 0.03, last.p.z);
    }
    if (c.m) continue;
    brows.push(knots[1]);
    // Frost caps: on the brow, and on the upper slope of the bulge, each lying on the
    // column's front and tilted to it.
    const cap = (a, b, f, size) => {
      const t = Math.atan2(b.p.z - a.p.z, a.p.y - b.p.y);   // lean of the link, from vertical
      const q = a.p.clone().lerp(b.p, f), r = a.r + (b.r - a.r) * f;
      const n = V(0, Math.sin(t), Math.cos(t));             // up-and-forward face of the link
      crust(q.x, q.y + n.y * r * 0.72, q.z + n.z * r * 0.72, r * size, 0.1, r * 1.05, Math.PI / 2 - t, FROST, jit(0.35));
    };
    cap(knots[0], knots[1], 0.55, 1.5);
    const k5 = knots.findIndex((k) => k.p.y < 5.7);
    if (k5 > 0 && knots[k5 + 1]) cap(knots[k5], knots[k5 + 1], 0.2 + rnd() * 0.25, 1.55);
  }

  // --- the lip: a thin crust of frost where the ice leaves the rock -----------------------
  {
    const geo = new THREE.BoxGeometry(3.3, 0.22, 0.5, 9, 1, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = Math.abs(x) / 1.65;
      const zf = z > 0 ? 0.25 + hj(x, 1, 2, 0.06) - 0.12 * u * u : -0.25;
      const yf = y > 0 ? 0.11 - 0.08 * u * u + hj(x, 4, z, 0.025) : -0.11;
      p.setXYZ(i, x, yf, zf);
    }
    geo.computeVertexNormals();
    const cr = add(geo, FROST);
    cr.position.set(0, 7.74, 0.26);
  }
  // icicles hanging from under the brow between the columns, cones one segment tall
  for (let i = 0; i < brows.length - 1; i++) {
    const a = brows[i], b = brows[i + 1];
    const len = [0.75, 1.4, 0.55, 1.1, 1.6, 0.65, 1.0, 0.5][i % 8];
    const r = 0.08 + len * 0.06;
    const cone = new THREE.ConeGeometry(r, len, 6, 1, false, rnd());
    cone.rotateX(Math.PI);
    const t = add(cone, ICE);
    const x = (a.p.x + b.p.x) / 2;
    // just behind the brow's front, clear of the curtain tucked in below
    t.position.set(x, 7.22 - len / 2, 0.9 * reach(x));
  }

  // --- the apron -------------------------------------------------------------------------
  {
    const d = add(new THREE.SphereGeometry(1, 12, 4, 0, Math.PI, 0, Math.PI / 2), ICE);
    d.scale.set(2.5, 0.62, 1.72);
    // three low lobes along the front edge where the ice pooled and froze
    for (const [x, z, sx, sy, sz, ry] of [[-1.35, 1.2, 1.0, 0.3, 0.72, 0.3], [0.2, 1.42, 1.05, 0.32, 0.6, -0.1], [1.55, 1.18, 0.9, 0.28, 0.7, -0.35]]) {
      const l = add(new THREE.SphereGeometry(1, 9, 3, 0, Math.PI * 2, 0, Math.PI / 2), ICE);
      l.scale.set(sx, sy, sz);
      l.position.set(x, 0, z);
      l.rotation.y = ry;
    }
    // a dark rim at the ground, where the pooled ice is deepest
    const s = add(new THREE.CylinderGeometry(1, 1.03, 0.12, 14, 1, false, -Math.PI / 2, Math.PI), DEEP);
    s.scale.set(2.42, 1, 1.9);
    s.position.set(0, 0.06, 0);
    // frost where the spray settled, in a band behind the lobes
    for (const [x, z, sx, sz] of [[-1.3, 0.78, 0.62, 0.34], [-0.15, 0.95, 0.72, 0.36], [1.1, 0.85, 0.66, 0.34]]) {
      crust(x, 0.52, z, sx, 0.08, sz, 0.35, FROST, jit(0.4));
    }
  }

  // --- place: base on y = 0, centred on x and z ------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (m4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mm.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
