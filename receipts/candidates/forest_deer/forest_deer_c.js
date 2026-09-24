/**
 * forest_deer, candidate C: a carved reading, cut from side silhouettes.
 *
 * A stag of the wild forest, 2.3 m to the antler tips and 2.1 m from nose to
 * tail, built the way a carver would block it out: every mass is an outline
 * drawn in the side plane and extruded across the body, its chamfered edge kept
 * inside the drawn line, so the silhouette is exactly the drawing and every
 * face is a flat facet. The part breakdown differs from a smooth build: the
 * shoulder and thigh masses belong to the legs and swing with them over a
 * slimmer core, the pale belly, rump patch and chin are narrower slabs showing
 * beneath the coat, and the antlers are broad flat strokes with a palm at the
 * crown, chunky enough to hold their shape at distance. Spore-lime buds are
 * faceted gems on the tine tips.
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
  const V2 = (x, y) => new THREE.Vector2(x, y);

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

  // Geometry is written in rest-pose model coordinates, then stored relative to
  // its joint's pivot, as non-indexed triangles in one bucket per joint and material.
  const buckets = new Map();
  const addGeo = (joint, material, geo, matrix = null) => {
    const q = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) q.applyMatrix4(matrix);
    const p = PIV[joint];
    q.translate(-p.x, -p.y, -p.z);
    if (!buckets.has(joint)) buckets.set(joint, new Map());
    const byMat = buckets.get(joint);
    if (!byMat.has(material)) byMat.set(material, []);
    byMat.get(material).push(q);
  };

  // A closed outline extruded to a slab 2 * half thick. The chamfer is cut inward
  // (bevelOffset = -bevel), so the slab never grows past the drawn outline, and the
  // slab is centred on its own plane before the matrix places it.
  const slab = (joint, material, pts, half, bevel, matrix, { smooth = true, segs = 1, curve = 2 } = {}) => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    if (smooth) shape.splineThru([...pts.slice(1), pts[0]].map(([x, y]) => V2(x, y)));
    else for (const [x, y] of pts.slice(1)) shape.lineTo(x, y);
    const t = Math.min(bevel * 1.2, half * 0.8);
    const depth = Math.max(0.002, 2 * (half - t));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: t, bevelSize: bevel, bevelOffset: -bevel,
      bevelSegments: segs, curveSegments: curve,
    });
    geo.translate(0, 0, -depth / 2);
    addGeo(joint, material, geo, matrix);
    geo.dispose();
  };
  // Side silhouettes are drawn as (z, y) and extruded across x, centred on x = xc.
  const SIDE = (xc = 0) => new THREE.Matrix4().makeBasis(V(0, 0, 1), V(0, 1, 0), V(-1, 0, 0)).setPosition(xc, 0, 0);
  // A plane through `at` with u along a and v towards b (b is squared to a first).
  const PLANE = (at, a, b) => {
    const u = a.clone().normalize();
    const v = b.clone().addScaledVector(u, -b.dot(u)).normalize();
    return new THREE.Matrix4().makeBasis(u, v, u.clone().cross(v)).setPosition(at);
  };
  // A stroke of a polyline [u, v, width] as a flat outline, ending in a point
  // wherever the width is zero.
  const stroke = (line) => {
    const L = [], R = [];
    line.forEach(([u, v, w], i) => {
      const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      const du = b[0] - a[0], dv = b[1] - a[1], n = Math.hypot(du, dv) || 1;
      const nu = -dv / n, nv = du / n;
      L.push([u + (nu * w) / 2, v + (nv * w) / 2]);
      if (w > 0) R.push([u - (nu * w) / 2, v - (nv * w) / 2]);
    });
    return [...L, ...R.reverse()];
  };

  // ---- torso core: the coat, then the pale belly and rump patch beneath it ------
  const TORSO = [
    [0.56, 1.02], [0.53, 1.16], [0.42, 1.27], [0.26, 1.315], [0.05, 1.285], [-0.2, 1.255], [-0.45, 1.265],
    [-0.62, 1.275], [-0.76, 1.225], [-0.84, 1.11], [-0.845, 0.99], [-0.77, 0.9], [-0.6, 0.87], [-0.42, 0.86],
    [-0.2, 0.83], [0.05, 0.8], [0.28, 0.79], [0.46, 0.85],
  ];
  slab('body', fur, TORSO, 0.18, 0.13, SIDE(), { segs: 3 });
  slab('body', pale, [[0.3, 0.8], [0.28, 0.768], [0.05, 0.777], [-0.2, 0.806], [-0.4, 0.838], [-0.47, 0.862],
    [-0.44, 0.93], [-0.2, 0.905], [0.05, 0.885], [0.28, 0.885]], 0.155, 0.05, SIDE(), { segs: 2 });
  slab('body', pale, [[-0.76, 1.2], [-0.84, 1.16], [-0.87, 1.04], [-0.83, 0.91], [-0.76, 0.92], [-0.73, 1.06]], 0.105, 0.055, SIDE(), { segs: 3 });
  slab('body', fur, [[-0.79, 1.225], [-0.855, 1.205], [-0.9, 1.12], [-0.895, 1.07], [-0.86, 1.1], [-0.83, 1.17]], 0.036, 0.014, SIDE());

  // ---- legs: a shoulder or thigh mass, a slim leg and a hoof, each its own slab ---
  const frontLeg = (j, s) => {
    const x = 0.13 * s;
    // shoulder and upper arm, which swing with the leg over the core
    slab(j, fur, [[0.3, 1.22], [0.41, 1.12], [0.47, 0.99], [0.43, 0.86], [0.33, 0.76], [0.24, 0.74], [0.2, 0.84],
      [0.2, 1.0], [0.24, 1.14]], 0.055, 0.035, SIDE(0.145 * s));
    // forearm, knee, cannon, fetlock and pastern as one straight-cut outline
    slab(j, fur, [[0.36, 0.86], [0.372, 0.7], [0.362, 0.52], [0.368, 0.455], [0.358, 0.4], [0.36, 0.2], [0.374, 0.13],
      [0.398, 0.072], [0.35, 0.068], [0.318, 0.118], [0.318, 0.2], [0.314, 0.4], [0.303, 0.455], [0.31, 0.52],
      [0.28, 0.7], [0.24, 0.8], [0.26, 0.88]], 0.03, 0.015, SIDE(x), { smooth: false });
    slab(j, dark, [[0.345, 0.078], [0.402, 0.074], [0.43, 0.0], [0.335, 0.0], [0.328, 0.04]], 0.033, 0.008, SIDE(x), { smooth: false });
  };
  const backLeg = (j, s) => {
    const x = 0.13 * s;
    // thigh and ham below the hip; the croup above it stays with the core
    slab(j, fur, [[-0.5, 1.1], [-0.42, 0.96], [-0.43, 0.8], [-0.48, 0.7], [-0.58, 0.64], [-0.68, 0.66], [-0.76, 0.76],
      [-0.82, 0.92], [-0.78, 1.06], [-0.66, 1.12]], 0.07, 0.045, SIDE(0.125 * s));
    // gaskin, hock, cannon, fetlock and pastern
    slab(j, fur, [[-0.48, 0.72], [-0.53, 0.6], [-0.595, 0.505], [-0.6, 0.42], [-0.585, 0.2], [-0.575, 0.13],
      [-0.55, 0.072], [-0.598, 0.068], [-0.622, 0.118], [-0.626, 0.2], [-0.64, 0.4], [-0.69, 0.47], [-0.683, 0.53],
      [-0.64, 0.62], [-0.6, 0.72]], 0.03, 0.015, SIDE(x), { smooth: false });
    slab(j, dark, [[-0.6, 0.078], [-0.545, 0.074], [-0.518, 0.0], [-0.615, 0.0], [-0.622, 0.04]], 0.033, 0.008, SIDE(x), { smooth: false });
  };
  frontLeg('frontLeft', 1);
  frontLeg('frontRight', -1);
  backLeg('backLeft', 1);
  backLeg('backRight', -1);

  // ---- neck and head --------------------------------------------------------------
  const H = 'head';
  slab(H, fur, [[0.3, 1.2], [0.45, 1.36], [0.56, 1.52], [0.63, 1.66], [0.66, 1.77], [0.74, 1.75], [0.8, 1.64],
    [0.75, 1.46], [0.67, 1.3], [0.61, 1.14], [0.5, 1.02], [0.36, 1.05]], 0.11, 0.07, SIDE(), { segs: 2 });
  slab(H, fur, [[0.64, 1.72], [0.7, 1.82], [0.8, 1.845], [0.9, 1.8], [0.96, 1.74], [0.94, 1.665], [0.84, 1.61],
    [0.72, 1.615]], 0.09, 0.05, SIDE(), { segs: 2 }); // skull
  slab(H, fur, [[0.88, 1.79], [1.0, 1.725], [1.1, 1.665], [1.135, 1.625], [1.12, 1.588], [1.04, 1.588], [0.92, 1.62],
    [0.86, 1.68]], 0.056, 0.025, SIDE(), { segs: 2 }); // muzzle
  slab(H, pale, [[0.9, 1.632], [1.04, 1.6], [1.1, 1.59], [1.092, 1.567], [1.0, 1.568], [0.88, 1.6]], 0.042, 0.01, SIDE()); // chin
  slab(H, dark, [[1.1, 1.668], [1.14, 1.645], [1.152, 1.608], [1.13, 1.59], [1.1, 1.61]], 0.048, 0.01, SIDE()); // nose
  for (const s of [1, -1]) {
    const eye = new THREE.OctahedronGeometry(0.02, 0);
    addGeo(H, dark, eye, new THREE.Matrix4().compose(V(0.088 * s, 1.765, 0.86), new THREE.Quaternion(), V(0.7, 1, 1.2)));
    eye.dispose();
    // ear: a leaf slab splayed out and leaning back, a thinner pale lining in front
    const dir = V(0.85 * s, 0.48, -0.22), face = V(0.1 * s, 0.25, 1);
    const leaf = [[0, 0], [0.045, 0.06], [0.05, 0.13], [0.028, 0.2], [0, 0.235], [-0.028, 0.2], [-0.05, 0.13], [-0.045, 0.06]];
    const ear = PLANE(V(0.07 * s, 1.79, 0.69), face.clone().cross(dir), dir); // u across the ear, v along it
    slab(H, fur, leaf, 0.012, 0.008, ear);
    const n = V(0, 0, 1).transformDirection(ear);
    const lining = ear.clone().setPosition(V(0.07 * s, 1.79, 0.69).addScaledVector(n, 0.011 * Math.sign(n.z)).addScaledVector(dir.clone().normalize(), 0.02));
    slab(H, pale, leaf.map(([u, v]) => [u * 0.72, v * 0.8]), 0.005, 0.004, lining);
  }

  // ---- antlers: broad flat strokes in a tilted plane, a palm at the crown ----------
  const buds = [];
  for (const s of [1, -1]) {
    // u climbs the beam (out, up and back), v points forward and out: the plate faces
    // half front, half side, so the rack stays broad from every quarter
    const plane = PLANE(V(0.055 * s, 1.81, 0.76), V(0.55 * s, 0.8, -0.2), V(0.7 * s, 0.15, 0.7));
    // tips stay 18 mm wide so the inward chamfer never crosses itself; a bud caps each
    const beam = [[0, 0, 0.075], [0.23, -0.03, 0.062], [0.42, -0.01, 0.055], [0.56, 0.04, 0.045], [0.62, 0.07, 0.018]];
    const tines = [
      [[0.04, 0.02, 0.05], [0.1, 0.14, 0.036], [0.16, 0.25, 0.018]], // brow
      [[0.14, 0.0, 0.046], [0.2, 0.12, 0.032], [0.25, 0.2, 0.018]], // bez
      [[0.34, -0.02, 0.042], [0.41, 0.1, 0.028], [0.46, 0.18, 0.018]], // trez
      [[0.51, 0.03, 0.04], [0.56, 0.13, 0.026], [0.59, 0.2, 0.018]], // crown, forward
      [[0.5, -0.02, 0.04], [0.56, -0.08, 0.024], [0.6, -0.11, 0.018]], // crown, back
    ];
    slab(H, horn, stroke(beam), 0.024, 0.007, plane, { smooth: false });
    for (const t of tines) slab(H, horn, stroke(t), 0.019, 0.006, plane, { smooth: false });
    // the palm fills the fork of the crown
    slab(H, horn, [[0.44, -0.03], [0.54, -0.07], [0.59, 0.0], [0.56, 0.11], [0.48, 0.06]], 0.017, 0.008, plane, { smooth: false });
    // the burr, a chunky collar round the foot of the beam
    const burr = plane.clone().multiply(new THREE.Matrix4().makeTranslation(0.03, 0, 0)).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    slab(H, horn, [[-0.036, -0.056], [0.036, -0.056], [0.042, 0.05], [-0.042, 0.05]], 0.018, 0.008, burr, { smooth: false });
    for (const [u, v] of [[0.16, 0.25], [0.46, 0.18], [0.59, 0.2], [0.6, -0.11], [0.62, 0.07]]) buds.push(V(u, v, 0).applyMatrix4(plane));
  }
  const gem = new THREE.IcosahedronGeometry(0.026, 0);
  for (const at of buds) addGeo(H, bud, gem, new THREE.Matrix4().makeTranslation(at.x, at.y, at.z));
  gem.dispose();

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
