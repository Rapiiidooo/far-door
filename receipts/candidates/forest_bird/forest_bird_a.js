// forest_bird, arm A: primitives.
// A plump gliding bird 0.7 m across the wings. The body is an ellipsoid with a
// stamp-ochre breast ellipsoid pushed through its lower front; the round head
// carries a hooked beak of three cones and two bead eyes. Each wing is a half
// ellipsoid arm and a swept ellipsoid hand in fern green, with five flattened
// ellipsoid primaries fanned into fingers and a row of scalloped secondaries in
// moss green. The forked tail is a short fan, a thin cylinder sector, under
// two long flattened-cone streamers growing from a small rump.
//
// Front +Z, up +Y, the bird's left is +X. Each wing is a Group at its shoulder,
// inside the body, with zero rotation at rest and the wing spread level; its
// geometry starts at the pivot so nothing swings out of the far side of the
// body. rotation.z = +a raises the left wing, rotation.z = -a the right one.
// Parts are baked into one mesh per material per joint.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---- palette (far-door/docs/style-lock.md) --------------------------------
  // Every material is double-sided: the wing's half ellipsoid is open at the
  // root, and the game's surface pass shares one clone per colour and roughness
  // whatever the side, so mixing sides on one colour would be a lottery.
  const M = (color, roughness, name) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, side: THREE.DoubleSide });
    m.name = name;
    return m;
  };
  const FERN = M(0x7da04a, 0.8, 'fabric'); // body, head, wing coverts
  const MOSS = M(0x4f7a3a, 0.84, 'fabric'); // flight feathers, tail
  const OCHRE = M(0xd9a441, 0.78, 'fabric'); // breast
  const BASALT = M(0x3a3531, 0.45, 'stone'); // beak, eyes

  // ---- joints ------------------------------------------------------------------
  // The shoulder sits inside the body so the root chord of the wing stays
  // buried at every flap angle and the joint never opens a gap.
  const SHOULDER = V(0.03, 0.024, 0.02);
  const body = g;
  const leftWing = new THREE.Group();
  leftWing.name = 'leftWing';
  leftWing.position.copy(SHOULDER);
  const rightWing = new THREE.Group();
  rightWing.name = 'rightWing';
  rightWing.position.set(-SHOULDER.x, SHOULDER.y, SHOULDER.z);
  g.add(leftWing, rightWing);

  // ---- geometry buckets, baked per joint and material at the end ---------------
  const buckets = new Map();
  const add = (joint, mat, geo) => {
    if (!buckets.has(joint)) buckets.set(joint, new Map());
    const byMat = buckets.get(joint);
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
  };
  const place = (geo, pos, rot, scl) =>
    geo.applyMatrix4(new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), scl));

  // Ellipsoid of semi-axes s centred at c, turned by rot (radians).
  const ellipsoid = (joint, mat, c, s, rot = [0, 0, 0], w = 10, h = 7) =>
    add(joint, mat, place(new THREE.SphereGeometry(1, w, h), c, rot, s));

  // A flattened cone from a to b, w wide and t thick, lying flat across `up`,
  // with a ridge down its middle that catches the light. One height segment:
  // r169 drops half the faces of a cone with more.
  const blade = (joint, mat, a, b, w, t, up = V(0, 1, 0), radial = 4) => {
    const d = b.clone().sub(a);
    const len = d.length();
    d.normalize();
    const side = new THREE.Vector3().crossVectors(up, d).normalize();
    const nrm = new THREE.Vector3().crossVectors(side, d).normalize();
    const geo = new THREE.ConeGeometry(0.5, 1, radial, 1).translate(0, 0.5, 0).scale(w, len, t);
    add(joint, mat, geo.applyMatrix4(new THREE.Matrix4().makeBasis(side, d, nrm).setPosition(a)));
  };

  // ---- body -----------------------------------------------------------------------
  ellipsoid(body, FERN, V(0, 0, 0), V(0.066, 0.06, 0.125), [0, 0, 0], 12, 8);
  // The breast ellipsoid bulges through the lower front of the body, so the
  // ochre reads under the head from the front and along the belly from below.
  ellipsoid(body, OCHRE, V(0, -0.013, 0.05), V(0.059, 0.053, 0.086), [0, 0, 0], 10, 6);
  // A short rump that the tail blades grow from.
  ellipsoid(body, FERN, V(0, 0.008, -0.118), V(0.036, 0.018, 0.055), [0.12, 0, 0], 8, 4);

  // ---- head, beak and eyes ---------------------------------------------------------
  const HEAD = V(0, 0.034, 0.13);
  const HR = 0.05;
  ellipsoid(body, FERN, HEAD, V(HR, HR * 0.96, HR), [0, 0, 0], 10, 7);
  // Upper mandible, its hooked tip, and a shorter lower mandible.
  blade(body, BASALT, V(0, 0.031, 0.168), V(0, 0.024, 0.214), 0.03, 0.026, V(0, 1, 0), 6);
  blade(body, BASALT, V(0, 0.03, 0.2), V(0, -0.002, 0.216), 0.018, 0.016, V(0, 0, -1), 5);
  blade(body, BASALT, V(0, 0.012, 0.168), V(0, 0.008, 0.194), 0.02, 0.014, V(0, 1, 0), 5);
  for (const s of [1, -1]) {
    const dir = V(0.72 * s, 0.34, 0.6).normalize();
    ellipsoid(body, BASALT, HEAD.clone().addScaledVector(dir, HR - 0.004), V(0.0095, 0.0095, 0.0095), [0, 0, 0], 6, 4);
  }

  // ---- tail: a short fan under two broad outer blades, so the tip is a deep fork ----
  // The fan is a thin sector of a cylinder opening backwards from the rump.
  const FAN = 0.5;
  add(body, MOSS, place(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 6, 1, false, Math.PI - FAN, 2 * FAN),
    V(0, 0.006, -0.095), [0.05, 0, 0], V(1, 1, 1)));
  for (const s of [1, -1]) {
    blade(body, MOSS, V(0.02 * s, 0.011, -0.095), V(0.08 * s, -0.004, -0.33), 0.076, 0.011);
  }

  // ---- left wing, in the shoulder's frame: x outward, z forward --------------------
  // The tips reach x = 0.32 from a shoulder 0.03 off the centre line: 0.7 m across.
  // Arm: the dome of a half ellipsoid points outward, so the full root chord sits
  // at the pivot and tapers towards the wrist.
  add(leftWing, FERN, place(new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2),
    V(0, 0, -0.005), [0, 0, 0], V(0.18, 0.011, 0.075)));
  // Hand, swept back a little.
  ellipsoid(leftWing, FERN, V(0.172, 0.001, -0.005), V(0.1, 0.009, 0.054), [0, 0.14, 0], 8, 6);
  // Five rounded primaries fanned from straight out to swept back 35 degrees,
  // spread so the tips separate into fingers.
  for (const [x, z, deg] of [[0.272, 0.018, 0], [0.27, 0, -8], [0.262, -0.019, -17], [0.25, -0.036, -26], [0.235, -0.051, -35]]) {
    ellipsoid(leftWing, MOSS, V(x, -0.001, z), V(0.05, 0.006, 0.016), [0, (-deg * Math.PI) / 180, 0], 6, 3);
  }
  // Secondaries: flat scallops that show behind the arm's trailing edge.
  for (const [x, z] of [[0.032, -0.074], [0.073, -0.069], [0.114, -0.06], [0.153, -0.049], [0.188, -0.052]]) {
    ellipsoid(leftWing, MOSS, V(x, -0.002, z), V(0.027, 0.006, 0.03), [0, 0, 0], 8, 3);
  }

  // ---- right wing: the left one reflected ------------------------------------------
  // A reflection turns every triangle inside out, and a double-sided material
  // then lights it from behind, so two corners of each triangle are swapped back.
  const mirrorX = (geo) => {
    const q = geo.clone();
    const attrs = [q.attributes.position, q.attributes.normal, q.attributes.uv];
    for (let i = 0; i < attrs[0].count; i++) {
      attrs[0].setX(i, -attrs[0].getX(i));
      attrs[1].setX(i, -attrs[1].getX(i));
    }
    for (const a of attrs) {
      const arr = a.array, k = a.itemSize;
      for (let t = 0; t < a.count; t += 3) {
        for (let c = 0; c < k; c++) {
          const tmp = arr[(t + 1) * k + c];
          arr[(t + 1) * k + c] = arr[(t + 2) * k + c];
          arr[(t + 2) * k + c] = tmp;
        }
      }
    }
    return q;
  };
  for (const [mat, geos] of buckets.get(leftWing)) for (const geo of geos) add(rightWing, mat, mirrorX(geo));

  // ---- bake: one mesh per material per joint ------------------------------------------
  const merge = (geos) => {
    let n = 0;
    for (const q of geos) n += q.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const q of geos) {
      pos.set(q.attributes.position.array, o * 3);
      nor.set(q.attributes.normal.array, o * 3);
      uv.set(q.attributes.uv.array, o * 2);
      o += q.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  for (const [joint, byMat] of buckets) for (const [mat, geos] of byMat) joint.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z, measured on vertices -----------
  // The shift moves the root's children, wing Groups included, so the pivots
  // travel with the body and stay at the shoulders.
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  g.updateMatrixWorld(true);

  g.userData.parts = { leftWing, rightWing };
  return g;
}
