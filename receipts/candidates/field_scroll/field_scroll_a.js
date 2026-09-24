// field_scroll, arm A: primitives.
// The first expedition's map, read as a papyrus roll 0.3 m long (the width of its sheet) lying
// across the back, with the free end of the sheet unrolled towards +Z and curling up at the front.
// About 0.5 m from the frayed cord ends behind the roll to the curl. The roll is a cylinder whose
// two ends carry a compass-drawn spiral of dark gaps (half rings on alternating centres); the
// sheet is a thin box and its curl eight short boxes bent round a shrinking radius; the map is
// raised leather-ink strips, a flattened torus for the circle and two crossed strips; the cord is
// two open torus wraps, a knot and two capped-cylinder ends hanging down the back of the roll.
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

  const put = (parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z);
    me.rotation.set(rx, ry, rz);
    parent.add(me);
    return me;
  };
  // a primitive stretched between two points, its local +Y along the segment
  const along = (geo, m, a, b) => {
    const me = new THREE.Mesh(geo, m);
    me.position.copy(a).add(b).multiplyScalar(0.5);
    me.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    g.add(me);
    return me;
  };

  const R = 0.045;   // roll radius: the rolled sheet is 0.09 m thick
  const W = 0.3;     // roll length along X, which is the width of the sheet
  const T = 0.0035;  // parchment thickness
  const LS = 0.34;   // flat run from the roll's contact line to the start of the curl
  const H = 0.0016;  // height of the raised ink

  // --- the roll: a cylinder along X, touching the ground at z = 0 ---------------------------------
  put(g, new THREE.CylinderGeometry(R, R, W, 18), PARCH, 0, R, 0, 0, 0, Math.PI / 2);

  // each end: a spiral of dark gaps drawn with a compass, half rings whose centres alternate
  // between two points d apart and whose radii grow by d every half turn, plus the hollow core
  const spiralEnd = (side) => {
    const e = new THREE.Group();
    e.position.set(side * (W / 2 + 0.0006), R, 0);
    e.rotation.y = side * Math.PI / 2;          // local +Z faces out of the roll
    g.add(e);
    const d = 0.004, w = 0.0028, r0 = 0.0045;
    for (let k = 0; k < 10; k++) {
      const r = r0 + k * d;
      const ring = new THREE.RingGeometry(r - w / 2, r + w / 2, 7, 1, (k % 2) * Math.PI, Math.PI);
      // mirrored between the ends, so each winds inwards the way the sheet leaves the roll
      put(e, ring, INK, (side * d) / 2 - (k % 2) * d * side, 0, 0);
    }
    put(e, new THREE.CircleGeometry(0.0042, 8), INK, 0, 0, 0.0002);
  };
  spiralEnd(1);
  spiralEnd(-1);

  // --- the sheet: flat on the ground from under the roll, then curling up at its free end ----------
  put(g, new THREE.BoxGeometry(W, T, LS), PARCH, 0, T / 2, LS / 2);
  {
    // centreline of the curl in the (z, y) plane: up at the front, then back over towards the roll
    const RC0 = 0.025, RCQ = 0.012, CA = 1.42 * Math.PI, N = 8;
    const pts = [];
    for (let j = 0; j <= N; j++) {
      const b = (CA * j) / N, rc = RC0 - (RCQ * b) / (2 * Math.PI), al = -Math.PI / 2 + b;
      pts.push([LS + rc * Math.cos(al), T / 2 + RC0 + rc * Math.sin(al)]);
    }
    for (let j = 0; j < N; j++) {
      const [z0, y0] = pts[j], [z1, y1] = pts[j + 1];
      const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
      // rotation.x = a turns local +Z to (0, -sin a, cos a); solve for the segment's direction
      put(g, new THREE.BoxGeometry(W, T, len + 0.0022), PARCH, 0, (y0 + y1) / 2, (z0 + z1) / 2, Math.atan2(-dy, dz), 0, 0);
    }
  }

  // --- the map: raised strokes of leather ink on the flat part, "up" towards the roll ---------------
  const stroke = (x0, z0, x1, z1, w = 0.008) => {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    put(g, new THREE.BoxGeometry(len + w * 0.7, H, w), INK, (x0 + x1) / 2, T + H / 2, (z0 + z1) / 2, 0, Math.atan2(-dz, dx), 0);
  };
  const line = (pts, w) => { for (let i = 0; i < pts.length - 1; i++) stroke(...pts[i], ...pts[i + 1], w); };
  // a river meandering down the left side of the sheet
  const river = [];
  for (let i = 0; i <= 9; i++) {
    const u = i / 9;
    river.push([-0.082 + 0.026 * Math.sin(u * Math.PI * 2.6 + 0.4) - 0.02 * u, 0.084 + 0.236 * u]);
  }
  line(river);
  // three peaks along the top right, each its own inverted V
  for (const [px, pz, s] of [[0.03, 0.08, 1], [0.071, 0.07, 1.2], [0.112, 0.083, 0.9]]) {
    line([[px - 0.017 * s, pz + 0.028 * s], [px, pz], [px + 0.017 * s, pz + 0.028 * s]], 0.0075);
  }
  // a dashed trail from the circle down to the cross
  const trail = [[0.05, 0.2], [0.028, 0.232], [0.02, 0.265], [0.03, 0.296]];
  for (let i = 0; i < trail.length - 1; i++) {
    const [ax, az] = trail[i], [bx, bz] = trail[i + 1];
    stroke(ax + (bx - ax) * 0.2, az + (bz - az) * 0.2, ax + (bx - ax) * 0.75, az + (bz - az) * 0.75, 0.007);
  }
  // the circle: a torus with a diamond section, pressed flat onto the sheet
  {
    const ring = put(g, new THREE.TorusGeometry(0.026, 0.0048, 4, 18), INK, 0.07, T + H, 0.168, -Math.PI / 2, 0, 0);
    ring.scale.z = 0.34;
  }
  // the cross, at the end of the trail
  for (const s of [-1, 1]) {
    const me = put(g, new THREE.BoxGeometry(0.056, H, 0.0095), INK, 0.055, T + H / 2, 0.3, 0, s * Math.PI / 4, 0);
    me.position.y += s > 0 ? 0.0002 : 0;
  }

  // --- the cord: two wraps round the middle of the roll, a knot on its upper back ------------------
  const RCD = 0.0048, RW = R + RCD;
  // the wraps stop where they meet the ground under the roll, so nothing sinks below y = 0
  const GAP = 2 * Math.acos((R - RCD - 0.0002) / RW);
  for (const x of [-0.0068, 0.0068]) {
    // spin in the torus plane first (Euler XYZ applies Z first), then turn its axis onto X
    put(g, new THREE.TorusGeometry(RW, RCD, 5, 15, 2 * Math.PI - GAP), CORD, x, R, 0, 0, Math.PI / 2, 1.5 * Math.PI + GAP / 2);
  }
  {
    // a lumpy knot: two squashed blobs where the wraps are tied off
    const k1 = put(g, new THREE.IcosahedronGeometry(0.0105, 0), CORD, 0.0035, 0.0915, -0.024, 0.4, 0.3, 0.2);
    k1.scale.set(1.35, 0.8, 1.05);
    const k2 = put(g, new THREE.IcosahedronGeometry(0.0085, 0), CORD, -0.006, 0.0905, -0.028, -0.3, 0.9, 0.5);
    k2.scale.set(1.2, 0.85, 1.0);
  }
  // the two loose ends: down the back of the roll, onto the ground, splayed apart, frayed
  const end = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = V(...pts[i]), b = V(...pts[i + 1]);
      const len = a.distanceTo(b);
      along(new THREE.CylinderGeometry(RCD, RCD, len + RCD, 5), CORD, a, b);
    }
    // the frayed tip: three fibres splaying out flat on the ground
    const a = V(...pts[pts.length - 2]), b = V(...pts[pts.length - 1]);
    const dir = b.clone().sub(a).normalize();
    for (const turn of [-0.42, 0, 0.42]) {
      const f = dir.clone().applyAxisAngle(UP, turn);
      along(new THREE.ConeGeometry(0.0024, 0.024, 4), CORD, b.clone().addScaledVector(dir, -0.003), b.clone().addScaledVector(f, 0.021));
    }
  };
  end([[0.005, 0.089, -0.028], [0.012, 0.07, -0.048], [0.02, 0.04, -0.057], [0.03, 0.0052, -0.067], [0.058, 0.0052, -0.104]]);
  end([[-0.006, 0.089, -0.029], [-0.011, 0.071, -0.049], [-0.017, 0.042, -0.058], [-0.027, 0.0052, -0.07], [-0.07, 0.0052, -0.096]]);

  // --- placement: base on y = 0, centred on x and z -----------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
