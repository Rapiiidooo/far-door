/**
 * forest_deer, candidate A: assembled from primitives.
 *
 * A stag of the wild forest, 2.3 m to the antler tips and 2.1 m from nose to
 * tail, built from scaled spheres, tapered cylinders and one-segment cones:
 * overlapping ellipsoids for chest, barrel, withers and haunch, with a paler
 * belly and rump patch pushed through from inside; a tapered neck, a pitched
 * skull and muzzle, leaf ears with pale insides; antlers as chains of tapered
 * rods with cone tines, dotted with spore-lime buds as one emissive mesh.
 *
 * Front +Z, up +Y, the stag's left is +X. Every joint is a Group at its pivot
 * with zero rotation at rest, its parts baked into one mesh per material: legs
 * at the shoulders (1.0 m) and hips (1.02 m), head and neck at the base of the
 * neck (1.15 m, inside the chest). A positive rotation.x swings a leg backwards
 * and lowers the head towards the ground.
 */
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const Q = (x = 0, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  const along = (d) => new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());

  // ---- palette (far-door/docs/style-lock.md) ---------------------------------
  const M = (color, name, roughness, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
  const fur = M(0x5a4030, 'fabric', 0.9); // bark umber coat
  const pale = M(0xb49a6a, 'fabric', 0.92); // belly, rump patch, chin, inner ears
  const dark = M(0x3a3531, 'fabric', 0.62); // hooves, nose, eyes
  const horn = M(0xe6d3ae, 'stone', 0.75); // antlers
  // Fern green under a spore-lime glow, so the buds still read if the game dims them.
  const bud = M(0x7da04a, 'foliage', 0.5, { emissive: 0xc3f25a, emissiveIntensity: 1.3 });

  // ---- skeleton: pivots in metres at rest, before the placement shift ---------
  const PIV = {
    body: V(0, 0, 0),
    frontLeft: V(0.13, 1.0, 0.34),
    frontRight: V(-0.13, 1.0, 0.34),
    backLeft: V(0.13, 1.02, -0.56),
    backRight: V(-0.13, 1.02, -0.56),
    head: V(0, 1.15, 0.4),
  };

  // Parts are written in rest-pose model coordinates and stored relative to
  // their joint's pivot, one bucket per joint and material.
  const buckets = new Map();
  const put = (joint, geo, material, pos, quat, scale) => {
    const m = new THREE.Matrix4().compose(pos, quat || new THREE.Quaternion(), scale || V(1, 1, 1));
    const out = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
    const p = PIV[joint];
    out.translate(-p.x, -p.y, -p.z);
    if (!buckets.has(joint)) buckets.set(joint, new Map());
    const byMat = buckets.get(joint);
    if (!byMat.has(material)) byMat.set(material, []);
    byMat.get(material).push(out);
  };
  const SPH_B = new THREE.SphereGeometry(1, 16, 10);
  const SPH_L = new THREE.SphereGeometry(1, 12, 8);
  const SPH_M = new THREE.SphereGeometry(1, 10, 7);
  const SPH_S = new THREE.SphereGeometry(1, 8, 5);
  const SPH_XS = new THREE.SphereGeometry(1, 6, 4);
  const blob = (joint, material, c, r, q = null, geo = SPH_L) => put(joint, geo, material, c, q, r);
  const ball = (joint, material, c, r, geo = SPH_S) => put(joint, geo, material, c, null, V(r, r, r));
  // tapered rod from a (radius r0) to b (radius r1); sx and sz squash its section
  const rod = (joint, material, a, b, r0, r1, seg = 8, sx = 1, sz = 1) => {
    const d = b.clone().sub(a);
    const geo = new THREE.CylinderGeometry(r1, r0, d.length(), seg, 1, true);
    put(joint, geo, material, a.clone().add(b).multiplyScalar(0.5), along(d), V(sx, 1, sz));
  };
  // one-segment cone with its base at a and its tip at b
  const cone = (joint, material, a, b, r, seg = 7) => {
    const d = b.clone().sub(a);
    const geo = new THREE.ConeGeometry(r, d.length(), seg, 1, true);
    put(joint, geo, material, a.clone().add(b).multiplyScalar(0.5), along(d));
  };

  // ---- torso ----------------------------------------------------------------------
  // One long barrel carries the silhouette; chest, haunch and withers only swell it.
  // The pale belly and rump patch are scaled copies of the barrel and haunch pushed
  // down and back: two such ellipsoids meet in a plane, so each boundary is clean.
  const BARREL = [V(0, 1.04, -0.13), V(0.19, 0.235, 0.68)];
  const HAUNCH = [V(0, 1.08, -0.57), V(0.182, 0.2, 0.27)];
  blob('body', fur, BARREL[0], BARREL[1], null, SPH_B); // barrel
  blob('body', fur, V(0, 1.0, 0.28), V(0.178, 0.225, 0.29)); // deep chest
  blob('body', fur, HAUNCH[0], HAUNCH[1]); // haunch
  blob('body', fur, V(0, 1.2, 0.25), V(0.11, 0.09, 0.22), null, SPH_M); // withers
  blob('body', pale, V(0, 0.97, -0.13), BARREL[1].clone().multiplyScalar(0.85), null, SPH_B); // belly, cut at 0.9 m
  blob('body', pale, V(0, 1.08, -0.684), HAUNCH[1].clone().multiplyScalar(0.7)); // rump patch, cut at the back
  blob('body', fur, V(0, 1.16, -0.855), V(0.042, 0.08, 0.03), Q(0.25, 0, 0), SPH_M); // tail, over the patch

  // ---- legs -------------------------------------------------------------------------
  const hoof = (j, at) => {
    const geo = new THREE.CylinderGeometry(0.03, 0.042, 0.07, 8, 1, false);
    put(j, geo, dark, V(at.x, 0.035, at.z), null, V(0.95, 1, 1.25));
  };
  const frontLeg = (j, s) => {
    const x = 0.13 * s;
    blob(j, fur, V(x, 0.9, 0.33), V(0.075, 0.2, 0.12), null, SPH_M); // upper arm, inside the chest
    rod(j, fur, V(x, 0.8, 0.3), V(x, 0.43, 0.332), 0.058, 0.036); // forearm
    blob(j, fur, V(x, 0.43, 0.333), V(0.04, 0.045, 0.043), null, SPH_S); // knee
    rod(j, fur, V(x, 0.43, 0.334), V(x, 0.125, 0.343), 0.03, 0.026); // cannon
    blob(j, fur, V(x, 0.12, 0.345), V(0.033, 0.036, 0.038), null, SPH_S); // fetlock
    rod(j, fur, V(x, 0.12, 0.346), V(x, 0.066, 0.37), 0.029, 0.031); // pastern
    hoof(j, V(x, 0, 0.375));
  };
  const backLeg = (j, s) => {
    const x = 0.13 * s;
    blob(j, fur, V(x, 0.9, -0.54), V(0.085, 0.25, 0.15), Q(-0.3, 0, 0), SPH_M); // ham, inside the haunch
    rod(j, fur, V(x, 0.76, -0.475), V(x, 0.46, -0.64), 0.062, 0.042); // gaskin, stifle to hock
    blob(j, fur, V(x, 0.46, -0.64), V(0.04, 0.047, 0.05), null, SPH_S); // hock
    cone(j, fur, V(x, 0.465, -0.65), V(x, 0.49, -0.69), 0.026); // point of the hock
    rod(j, fur, V(x, 0.46, -0.636), V(x, 0.125, -0.595), 0.032, 0.026); // cannon
    blob(j, fur, V(x, 0.12, -0.593), V(0.033, 0.036, 0.038), null, SPH_S); // fetlock
    rod(j, fur, V(x, 0.12, -0.592), V(x, 0.066, -0.568), 0.029, 0.031); // pastern
    hoof(j, V(x, 0, -0.563));
  };
  frontLeg('frontLeft', 1);
  frontLeg('frontRight', -1);
  backLeg('backLeft', 1);
  backLeg('backRight', -1);

  // ---- head and neck ------------------------------------------------------------
  const H = 'head';
  blob(H, fur, V(0, 1.17, 0.43), V(0.135, 0.19, 0.17)); // neck root, inside the chest
  rod(H, fur, V(0, 1.2, 0.46), V(0, 1.64, 0.72), 0.12, 0.074, 10, 1, 1.3); // neck
  blob(H, fur, V(0, 1.38, 0.66), V(0.085, 0.2, 0.075), Q(0.53, 0, 0), SPH_M); // throat mane
  blob(H, fur, V(0, 1.66, 0.73), V(0.078, 0.088, 0.095), null, SPH_S); // poll
  blob(H, fur, V(0, 1.74, 0.79), V(0.09, 0.095, 0.135), Q(0.35, 0, 0)); // skull, pitched nose-down
  rod(H, fur, V(0, 1.73, 0.86), V(0, 1.625, 1.1), 0.066, 0.04, 10, 0.85, 1); // muzzle
  blob(H, dark, V(0, 1.618, 1.108), V(0.036, 0.03, 0.028), null, SPH_S); // nose
  blob(H, pale, V(0, 1.605, 1.03), V(0.036, 0.026, 0.06), Q(0.4, 0, 0), SPH_S); // chin
  for (const s of [1, -1]) {
    ball(H, dark, V(0.077 * s, 1.765, 0.87), 0.018, SPH_XS); // eye
    // a large leaf ear, splayed out and leaning back, its pale inside facing forward
    const q = Q(-0.3, 0, -1.1 * s);
    const dir = V(0, 1, 0).applyQuaternion(q), face = V(0, 0, 1).applyQuaternion(q);
    const c = V(0.065 * s, 1.785, 0.68).addScaledVector(dir, 0.11);
    blob(H, fur, c, V(0.05, 0.12, 0.018), q, SPH_S);
    blob(H, pale, c.clone().addScaledVector(face, 0.009).addScaledVector(dir, 0.01), V(0.036, 0.095, 0.012), q, SPH_S);
  }

  // ---- antlers: a beam of tapered rods, cone tines, buds at the tips --------------
  // The beam sweeps out and back, then turns up into a crown; tines reach forward.
  const buds = [];
  for (const s of [1, -1]) {
    const P = (x, y, z) => V(x * s, y, z);
    const beam = [P(0.06, 1.82, 0.75), P(0.18, 1.9, 0.67), P(0.33, 2.0, 0.58), P(0.45, 2.11, 0.52), P(0.52, 2.2, 0.51), P(0.52, 2.26, 0.55)];
    const rad = [0.034, 0.03, 0.027, 0.024, 0.021, 0.018];
    for (let i = 0; i < beam.length - 1; i++) rod(H, horn, beam[i], beam[i + 1], rad[i], rad[i + 1], 7);
    for (let i = 1; i < beam.length; i++) ball(H, horn, beam[i], rad[i], SPH_XS);
    // the burr, a thick ring where the antler leaves the skull
    rod(H, horn, P(0.055, 1.81, 0.752), P(0.068, 1.835, 0.745), 0.045, 0.045, 8);
    // each tine is a polyline from the beam, a rod then a cone, curling up at the end
    const tines = [
      [[P(0.08, 1.845, 0.745), P(0.13, 1.86, 0.87), P(0.17, 1.91, 0.965)], 0.024], // brow, over the face
      [[P(0.18, 1.9, 0.675), P(0.22, 1.93, 0.79), P(0.26, 1.99, 0.875)], 0.021], // bez
      [[P(0.4, 2.065, 0.545), P(0.44, 2.1, 0.65), P(0.48, 2.17, 0.735)], 0.019], // trez
      [[beam[5], P(0.6, 2.31, 0.63)], 0.017], // crown
      [[beam[5], P(0.51, 2.32, 0.42)], 0.017],
      [[beam[5], P(0.44, 2.31, 0.63)], 0.016],
    ];
    for (const [pts, r] of tines) {
      if (pts.length === 3) {
        rod(H, horn, pts[0], pts[1], r, r * 0.8, 6);
        ball(H, horn, pts[1], r * 0.8, SPH_XS); // closes the bend between rod and cone
      }
      cone(H, horn, pts[pts.length - 2], pts[pts.length - 1], pts.length === 3 ? r * 0.8 : r);
    }
    // buds sit on the tips of the brow, trez and two crown tines, and on the beam
    for (const i of [0, 2, 3, 4]) buds.push([tines[i][0][tines[i][0].length - 1], 0.024]);
    buds.push([beam[2].clone().add(P(0.01, 0.006, 0.024)), 0.022]);
  }
  for (const [c, r] of buds) ball(H, bud, c, r, SPH_XS);

  // ---- bake each joint into one mesh per material -------------------------------
  const merge = (geos) => {
    let n = 0;
    for (const q of geos) n += q.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const q of geos) {
      pos.set(q.attributes.position.array, o * 3);
      nor.set(q.attributes.normal.array, o * 3);
      if (q.attributes.uv) uv.set(q.attributes.uv.array, o * 2);
      o += q.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  const J = {};
  let glow = null;
  for (const [joint, byMat] of buckets) {
    let parent = g;
    if (joint !== 'body') {
      parent = new THREE.Group();
      parent.name = joint;
      parent.position.copy(PIV[joint]);
      g.add(parent);
      J[joint] = parent;
    }
    for (const [material, geos] of byMat) {
      const mesh = new THREE.Mesh(merge(geos), material);
      parent.add(mesh);
      if (material === bud) {
        mesh.name = 'glow';
        glow = mesh;
      }
    }
  }
  for (const geo of [SPH_B, SPH_L, SPH_M, SPH_S, SPH_XS]) geo.dispose();

  // ---- placement: base at y = 0, centred on x and z, measured on vertices -------
  // Shifts the root's children only, so every pivot keeps its place on the body.
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) {
      for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m4.multiplyMatrices(n.matrixWorld, im)); }
      return;
    }
    add(n.matrixWorld);
  });
  const ctr = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= box.min.y; o.position.z -= ctr.z; });
  g.updateMatrixWorld(true);

  g.userData.parts = {
    frontLeft: J.frontLeft, frontRight: J.frontRight,
    backLeft: J.backLeft, backRight: J.backRight,
    head: J.head, glow,
  };
  return g;
}
