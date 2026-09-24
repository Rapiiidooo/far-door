// confiscation_bin, arm A: primitives.
// A hollow basalt chest of boxes on a stepped foot, wrapped by aged-bronze straps and a
// rim band, with box corner caps, a hasp and knuckle hinges. The lid is propped about
// 60 degrees open by the rolled map, which stands in the heap and meets its underside.
// The junk is built from spheres, cylinders and tori: a boot on its side with its toe
// over the front rim, a dented kettle, a canvas hat, a rope tangle with a loop hanging
// over the right rim, and a stamp-ochre tag on a stick.
// Chest 1.2 x 0.8 x 0.8 m closed; about 1.4 m tall with the lid propped.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const BASALT = M(0x3a3531, 'stone', 0.84);
  const BRONZE = M(0x9a6a35, 'metal', 0.5, 0.6);
  const CHALK = M(0xc9c2d8, 'plaster', 0.82);
  const OCHRE = M(0xd9a441, 'fabric', 0.8);
  const LEATHER = M(0x4b2e1e, 'fabric', 0.86);
  const CANVAS = M(0xcdbf9f, 'fabric', 0.92);
  const PAPER = M(0xe6d3ae, 'fabric', 0.9);
  const ROPE = M(0xb49a6a, 'fabric', 0.95);
  const TIMBER = M(0x8a6a48, 'timber', 0.86);
  const HEAP = M(0x2b2420, 'fabric', 0.95);             // the shadowed heap under the junk

  // ---- merging: one mesh per material per moving group --------------------------
  // UVs are projected from each face's dominant axis over the merged mesh's box, so
  // the loader's surfaces keep one texel density across big and small parts.
  const boxUv = (pos, n) => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const su = Math.max(hi[0] - lo[0], hi[2] - lo[2]) || 1, sv = hi[1] - lo[1] || 1;
    const uv = new Float32Array(n * 2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      a.fromArray(pos, t * 3); b.fromArray(pos, t * 3 + 3); c.fromArray(pos, t * 3 + 6);
      const f = b.sub(a).cross(c.sub(a));
      const ax = Math.abs(f.x), ay = Math.abs(f.y), az = Math.abs(f.z);
      for (let k = t; k < t + 3; k++) {
        const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
        const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
        uv[k * 2] = u / su; uv[k * 2 + 1] = v / sv;
      }
    }
    return new THREE.BufferAttribute(uv, 2);
  };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', boxUv(pos, n));
    return out;
  };
  const STATIC = new Map(), LID = new Map();
  const put = (mat, geo, bucket = STATIC) => { if (!bucket.has(mat)) bucket.set(mat, []); bucket.get(mat).push(geo); return geo; };
  const flush = (bucket, parent) => { for (const [mat, geos] of bucket) parent.add(new THREE.Mesh(merge(geos), mat)); };

  // ---- primitive helpers ----------------------------------------------------------
  const box = (mat, x0, y0, z0, x1, y1, z1, bucket = STATIC) =>
    put(mat, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), bucket);
  // pose a finished part: rotate (x, y, z order, radians) then move
  const pose = (geo, rx, ry, rz, x, y, z) => {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)));
    return geo.translate(x, y, z);
  };
  // a small assembly: parts built round a local origin, then posed together
  const assembly = (parts, rx, ry, rz, x, y, z, bucket = STATIC) => {
    for (const [mat, geo] of parts) put(mat, pose(geo, rx, ry, rz, x, y, z), bucket);
  };

  // ---- the chest ---------------------------------------------------------------------
  const X = 0.58, Z = 0.38, T = 0.06, RIM = 0.645;
  box(BASALT, -0.59, 0, -0.39, 0.59, 0.06, 0.39);                         // stepped foot
  box(BASALT, -X, 0.06, Z - T, X, RIM, Z);                                 // front
  box(BASALT, -X, 0.06, -Z, X, RIM, -Z + T);                               // back
  box(BASALT, -X, 0.06, -Z + T, -X + T, RIM, Z - T);                       // sides
  box(BASALT, X - T, 0.06, -Z + T, X, RIM, Z - T);
  box(BASALT, -X + T, 0.06, -Z + T, X - T, 0.14, Z - T);                   // floor
  // bronze: a rim band, straps at x = +-0.3 front and back and at mid-depth on the ends
  box(BRONZE, -0.592, RIM - 0.06, Z - 0.008, 0.592, RIM + 0.002, Z + 0.012);
  box(BRONZE, -0.592, RIM - 0.06, -Z - 0.012, 0.592, RIM + 0.002, -Z + 0.008);
  for (const s of [-1, 1]) box(BRONZE, Math.min(s * (X - 0.008), s * (X + 0.012)), RIM - 0.06, -Z - 0.012, Math.max(s * (X - 0.008), s * (X + 0.012)), RIM + 0.002, Z + 0.012);
  for (const s of [-1, 1]) {
    box(BRONZE, s * 0.3 - 0.03, 0.06, Z, s * 0.3 + 0.03, RIM - 0.06, Z + 0.01);
    box(BRONZE, s * 0.3 - 0.03, 0.06, -Z - 0.01, s * 0.3 + 0.03, RIM - 0.06, -Z);
    box(BRONZE, Math.min(s * X, s * (X + 0.01)), 0.06, -0.03, Math.max(s * X, s * (X + 0.01)), RIM - 0.06, 0.03);
  }
  // a mid band round all four faces, and rivets down every strap
  box(BRONZE, -0.59, 0.3, Z, 0.59, 0.345, Z + 0.01);
  box(BRONZE, -0.59, 0.3, -Z - 0.01, 0.59, 0.345, -Z);
  for (const s of [-1, 1]) box(BRONZE, Math.min(s * X, s * (X + 0.01)), 0.3, -Z - 0.01, Math.max(s * X, s * (X + 0.01)), 0.345, Z + 0.01);
  const rivet = (x, y, z, face) => {
    const r = new THREE.SphereGeometry(0.012, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2);
    if (face === 'z') r.rotateX(Math.PI / 2); else if (face === '-z') r.rotateX(-Math.PI / 2);
    else if (face === 'x') r.rotateZ(-Math.PI / 2); else r.rotateZ(Math.PI / 2);
    put(BRONZE, r.translate(x, y, z));
  };
  for (const s of [-1, 1]) for (const y of [0.13, 0.22, 0.42, 0.51]) {
    rivet(s * 0.3, y, Z + 0.01, 'z');
    rivet(s * 0.3, y, -Z - 0.01, '-z');
    rivet(s * (X + 0.01), y, 0, s > 0 ? 'x' : '-x');
  }
  // corner caps, top and bottom
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [y0, y1] of [[0, 0.12], [RIM - 0.1, RIM + 0.004]]) {
    const xa = sx * 0.5, xb = sx * 0.6, za = sz * 0.3, zb = sz * 0.4;
    box(BRONZE, Math.min(xa, xb), y0, Math.min(za, zb), Math.max(xa, xb), y1, Math.max(za, zb));
  }
  // hasp staple on the front and the body's hinge knuckles and leaves on the back
  const staple = new THREE.TorusGeometry(0.03, 0.008, 4, 12);
  put(BRONZE, staple.translate(0, RIM - 0.1, Z + 0.016));
  box(BRONZE, -0.045, RIM - 0.13, Z + 0.01, 0.045, RIM - 0.06, Z + 0.018);
  const HZ = -0.39;                                                        // hinge axis z, at y = RIM
  for (const s of [-1, 1]) {
    put(BRONZE, new THREE.CylinderGeometry(0.022, 0.022, 0.07, 12).rotateZ(Math.PI / 2).translate(s * 0.3, RIM, HZ));
    box(BRONZE, s * 0.3 - 0.035, RIM - 0.11, -Z - 0.018, s * 0.3 + 0.035, RIM - 0.01, -Z - 0.01);
  }

  // ---- the lid: built closed round the hinge axis, then propped 60 degrees open ------
  // In the lid's frame z runs forward from the hinge and y up from the rim.
  const lid = new THREE.Group();
  lid.name = 'lid';
  lid.position.set(0, RIM, HZ);
  const LB = LID;
  box(BASALT, -0.59, 0, -0.01, 0.59, 0.12, 0.79, LB);                      // slab
  box(BASALT, -0.5, 0.12, 0.07, 0.5, 0.155, 0.71, LB);                     // raised panel
  box(BRONZE, -0.592, 0, 0.782, 0.592, 0.05, 0.802, LB);                   // lid band, front
  for (const s of [-1, 1]) {
    box(BRONZE, Math.min(s * 0.584, s * 0.602), 0, -0.012, Math.max(s * 0.584, s * 0.602), 0.05, 0.802, LB);
    // straps over the top, across the raised panel and down the front edge
    box(BRONZE, s * 0.3 - 0.03, 0.12, -0.012, s * 0.3 + 0.03, 0.127, 0.07, LB);
    box(BRONZE, s * 0.3 - 0.03, 0.155, 0.07, s * 0.3 + 0.03, 0.162, 0.71, LB);
    box(BRONZE, s * 0.3 - 0.03, 0.12, 0.71, s * 0.3 + 0.03, 0.127, 0.802, LB);
    box(BRONZE, s * 0.3 - 0.03, 0.05, 0.79, s * 0.3 + 0.03, 0.127, 0.8, LB);
    // corner caps, front and back
    box(BRONZE, Math.min(s * 0.5, s * 0.6), -0.004, 0.7, Math.max(s * 0.5, s * 0.6), 0.132, 0.804, LB);
    box(BRONZE, Math.min(s * 0.5, s * 0.6), -0.004, -0.016, Math.max(s * 0.5, s * 0.6), 0.132, 0.09, LB);
    // hinge knuckles either side of the body's, and their leaves on the lid's back
    for (const k of [-1, 1]) put(BRONZE, new THREE.CylinderGeometry(0.022, 0.022, 0.07, 12).rotateZ(Math.PI / 2).translate(s * 0.3 + k * 0.075, 0, 0), LB);
    box(BRONZE, s * 0.3 - 0.11, 0.02, -0.018, s * 0.3 + 0.11, 0.1, -0.01, LB);
  }
  box(BRONZE, -0.04, -0.09, 0.8, 0.04, 0.08, 0.812, LB);                    // hasp tongue
  // a bronze medallion with a chalk disc on the raised panel
  put(BRONZE, new THREE.CylinderGeometry(0.13, 0.14, 0.02, 32).translate(0, 0.165, 0.39), LB);
  put(CHALK, new THREE.CylinderGeometry(0.085, 0.085, 0.012, 28).translate(0, 0.178, 0.39), LB);
  put(BRONZE, new THREE.CylinderGeometry(0.045, 0.045, 0.008, 20).translate(0, 0.186, 0.39), LB);
  for (const s of [-1, 1]) for (const z of [0.16, 0.3, 0.48, 0.62]) {
    put(BRONZE, new THREE.SphereGeometry(0.012, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2).translate(s * 0.3, 0.162, z), LB);
  }
  // underside: a bronze frame and a chalk seal with an ochre disc
  for (const [x0, z0, x1, z1] of [[-0.5, 0.07, 0.5, 0.11], [-0.5, 0.67, 0.5, 0.71], [-0.5, 0.11, -0.46, 0.67], [0.46, 0.11, 0.5, 0.67]]) {
    box(BRONZE, x0, -0.008, z0, x1, 0, z1, LB);
  }
  put(CHALK, new THREE.CylinderGeometry(0.15, 0.15, 0.01, 32).translate(0, -0.005, 0.39), LB);
  put(OCHRE, new THREE.CylinderGeometry(0.075, 0.075, 0.006, 24).translate(-0.03, -0.012, 0.37), LB);
  put(BRONZE, new THREE.TorusGeometry(0.15, 0.012, 4, 24).rotateX(Math.PI / 2).translate(0, -0.006, 0.39), LB);
  const OPEN = (60 * Math.PI) / 180;
  for (const geos of LB.values()) for (const geo of geos) geo.rotateX(-OPEN);
  flush(LB, lid);
  g.add(lid);

  // ---- the heap ----------------------------------------------------------------------
  // a mound of straps and cloth fills the chest to just under the rim
  put(HEAP, new THREE.SphereGeometry(0.3, 16, 8).scale(1.68, 0.32, 1.02).translate(0, 0.62, 0));
  put(CANVAS, new THREE.SphereGeometry(0.2, 12, 8).scale(1.2, 0.5, 1).translate(0.22, 0.66, -0.12));

  // the rolled map stands in the heap, leaning back 25 degrees, its top end inside the
  // propped lid's underside
  const MB = new THREE.Vector3(0.22, 0.66, 0.14), PHI = (25 * Math.PI) / 180;
  const dir = new THREE.Vector3(0, Math.cos(PHI), -Math.sin(PHI));
  const nrm = new THREE.Vector3(0, -Math.cos(OPEN), Math.sin(OPEN));     // the underside's normal
  const hinge = new THREE.Vector3(0, RIM, HZ);
  const LM = (-0.03 - MB.clone().sub(hinge).dot(nrm)) / dir.dot(nrm);
  {
    const parts = [
      [PAPER, new THREE.CylinderGeometry(0.045, 0.045, LM, 18).translate(0, LM / 2, 0)],
      [CANVAS, new THREE.CylinderGeometry(0.03, 0.03, 0.006, 14).translate(0, LM + 0.001, 0)],
    ];
    for (const t of [0.3, 0.72]) parts.push([ROPE, new THREE.TorusGeometry(0.047, 0.007, 4, 12).rotateX(Math.PI / 2).translate(0, LM * t, 0)]);
    assembly(parts, -PHI, 0, 0, MB.x, MB.y, MB.z);
  }

  // a boot lying on its side, toe over the front rim
  {
    const parts = [
      [LEATHER, new THREE.BoxGeometry(0.105, 0.035, 0.29).translate(0, 0.0175, 0.06)],
      [LEATHER, new THREE.BoxGeometry(0.095, 0.085, 0.2).translate(0, 0.077, 0.07)],
      [LEATHER, new THREE.SphereGeometry(0.052, 12, 8).scale(0.92, 0.85, 1).translate(0, 0.075, 0.165)],
      [LEATHER, new THREE.CylinderGeometry(0.06, 0.066, 0.26, 16).translate(0, 0.165, -0.03)],
      [LEATHER, new THREE.TorusGeometry(0.063, 0.013, 5, 14).rotateX(Math.PI / 2).translate(0, 0.295, -0.03)],
      [ROPE, new THREE.BoxGeometry(0.1, 0.012, 0.012).translate(0, 0.123, 0.06)],
      [ROPE, new THREE.BoxGeometry(0.1, 0.012, 0.012).translate(0, 0.123, 0.11)],
    ];
    assembly(parts, 0.22, 0.3, Math.PI / 2, -0.1, 0.735, 0.21);
  }

  // a dented kettle tipped towards the front right corner
  {
    const body = new THREE.SphereGeometry(0.12, 18, 12).scale(1, 0.78, 1).translate(0, 0.094, 0);
    const p = body.attributes.position, v = new THREE.Vector3(), dent = new THREE.Vector3(0.09, 0.15, -0.05);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = v.distanceTo(dent);
      if (d < 0.07) { const k = (0.07 - d) * 0.55; v.x -= k * 0.9; v.y -= k * 0.4; p.setXYZ(i, v.x, v.y, v.z); }
    }
    body.computeVertexNormals();
    const spout = new THREE.CylinderGeometry(0.015, 0.028, 0.13, 10).translate(0, 0.065, 0);
    spout.rotateX(Math.PI / 4);
    const parts = [
      [BRONZE, body],
      [BRONZE, new THREE.CylinderGeometry(0.085, 0.08, 0.016, 20).translate(0, 0.008, 0)],
      [BRONZE, new THREE.CylinderGeometry(0.052, 0.058, 0.02, 18).translate(0, 0.19, 0)],
      [BRONZE, new THREE.SphereGeometry(0.018, 8, 6).translate(0, 0.207, 0)],
      [BRONZE, spout.translate(0, 0.07, 0.09)],
      [BRONZE, new THREE.TorusGeometry(0.085, 0.011, 5, 12, Math.PI).rotateY(Math.PI / 2).translate(0, 0.175, 0)],
    ];
    assembly(parts, 0.42, -0.35, -0.2, 0.3, 0.665, 0.16);
  }

  // a canvas hat perched on the back left of the heap
  {
    const parts = [
      [CANVAS, new THREE.CylinderGeometry(0.2, 0.2, 0.012, 28).translate(0, 0.006, 0)],
      [CANVAS, new THREE.CylinderGeometry(0.092, 0.11, 0.115, 20).translate(0, 0.0695, 0)],
      [LEATHER, new THREE.CylinderGeometry(0.1125, 0.1125, 0.028, 20).translate(0, 0.026, 0)],
      [CANVAS, new THREE.TorusGeometry(0.2, 0.009, 4, 24).rotateX(Math.PI / 2).translate(0, 0.012, 0)],
    ];
    assembly(parts, -0.28, 0.4, 0.22, -0.27, 0.715, -0.1);
  }

  // a tangle of rope in the middle and a loop hanging over the right rim
  {
    const loops = [[0.1, 0.4, 1.1, 0.3, 0.1, 0.75, -0.02], [0.12, -0.9, 0.3, 1.2, 0.02, 0.74, -0.1], [0.09, 1.5, -0.6, 0.2, 0.16, 0.76, 0.02], [0.08, 0.2, 2.2, -1.1, 0.06, 0.8, -0.05]];
    for (const [r, rx, ry, rz, x, y, z] of loops) put(ROPE, pose(new THREE.TorusGeometry(r, 0.017, 5, 16), rx, ry, rz, x, y, z));
    const hang = new THREE.TorusGeometry(0.11, 0.017, 5, 12, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2);
    put(ROPE, hang.translate(0.61, 0.655, 0.06));
    for (const dz of [-0.11, 0.11]) {
      const piece = new THREE.CylinderGeometry(0.017, 0.017, 0.2, 8).rotateZ(Math.PI / 2 - 0.25);
      put(ROPE, piece.translate(0.52, 0.68, 0.06 + dz));
    }
  }

  // a stamp-ochre tag on a stick, stuck into the heap
  {
    const parts = [
      [TIMBER, new THREE.CylinderGeometry(0.009, 0.011, 0.5, 8).translate(0, 0.25, 0)],
      [TIMBER, new THREE.SphereGeometry(0.014, 8, 6).translate(0, 0.5, 0)],
      [OCHRE, new THREE.BoxGeometry(0.16, 0.1, 0.007).translate(0.09, 0.42, 0)],
      [TIMBER, new THREE.CylinderGeometry(0.014, 0.014, 0.009, 10).rotateX(Math.PI / 2).translate(0.15, 0.42, 0)],
    ];
    assembly(parts, 0.12, 0.5, -0.1, -0.03, 0.62, 0.06);
  }

  flush(STATIC, g);

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });

  g.userData.joints = { lid };
  return g;
}
