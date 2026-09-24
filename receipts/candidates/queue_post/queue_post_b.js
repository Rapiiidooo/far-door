// queue_post, arm B: primitives.
// Stacked cylinders and cone frustums make the basalt base (with a notch for a groove),
// the flared bronze foot, the slim post, a collar and the cup; a sphere is the
// warden-chalk ball; tori are the eyes. The stamp-ochre rope is one torus arc: a
// circular sag hung between the +x eye and a point 1.4 m along +x, with cylinder
// ferrules at both ends and a half-torus hook placed to thread the next post's -x eye.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const BASALT = M(0x3a3531, 'stone', 0.84);
  const BRONZE = M(0x9a6a35, 'metal', 0.45, 0.6);
  const CHALK = M(0xc9c2d8, 'plaster', 0.7);
  const OCHRE = M(0xd9a441, 'fabric', 0.9);

  // ---- merging: one mesh per material -------------------------------------------
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
  const PARTS = new Map();
  const put = (mat, geo) => { if (!PARTS.has(mat)) PARTS.set(mat, []); PARTS.get(mat).push(geo); return geo; };
  // an upright cylinder or frustum between two heights
  const col = (mat, rBot, rTop, y0, y1, segs) => put(mat, new THREE.CylinderGeometry(rTop, rBot, y1 - y0, segs).translate(0, (y0 + y1) / 2, 0));

  // ---- the stanchion ----------------------------------------------------------------
  col(BASALT, 0.175, 0.175, 0, 0.014, 18);
  col(BASALT, 0.165, 0.165, 0.014, 0.026, 18);        // the notch reads as a groove
  col(BASALT, 0.175, 0.175, 0.026, 0.04, 18);
  col(BASALT, 0.175, 0.13, 0.04, 0.052, 18);
  col(BASALT, 0.13, 0.13, 0.052, 0.064, 18);
  col(BASALT, 0.13, 0.11, 0.064, 0.078, 18);
  col(BRONZE, 0.046, 0.046, 0.078, 0.09, 10);
  col(BRONZE, 0.046, 0.021, 0.09, 0.128, 10);
  col(BRONZE, 0.019, 0.017, 0.128, 0.85, 8);
  col(BRONZE, 0.026, 0.026, 0.846, 0.866, 10);
  col(BRONZE, 0.028, 0.056, 0.866, 0.905, 10);
  put(CHALK, new THREE.SphereGeometry(0.062, 14, 9).translate(0, 0.938, 0));
  const EYE = 0.078, EY = 0.93;
  for (const s of [-1, 1]) {
    put(BRONZE, new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6).rotateZ(Math.PI / 2).translate(s * 0.056, EY, 0));
    put(BRONZE, new THREE.TorusGeometry(0.017, 0.006, 5, 10).rotateY(Math.PI / 2).translate(s * EYE, EY, 0));
  }

  // ---- the rope: a torus arc hanging between the two ferrules ---------------------------
  const SPAN = 1.4, SAG = 0.27, TUBE = 0.021;
  const x0 = EYE + 0.03, x1 = SPAN - EYE - 0.05, yEnd = EY - 0.04;
  const h = (x1 - x0) / 2, xm = (x0 + x1) / 2;
  const R = (h * h + SAG * SAG) / (2 * SAG), ARC = 2 * Math.asin(h / R);
  const rope = new THREE.TorusGeometry(R, TUBE, 6, 40, ARC);
  rope.rotateZ(-Math.PI / 2 - ARC / 2);               // centre the arc on straight down
  put(OCHRE, rope.translate(xm, yEnd - SAG + R, 0));
  // ferrules along the rope's ends, and a link up into the +x eye
  const end = (x, sign) => {
    const a = sign * (ARC / 2);                       // angle from straight down to this end
    const dir = new THREE.Vector3(Math.cos(a) * sign, Math.sin(Math.abs(a)), 0).normalize();
    const geo = new THREE.CylinderGeometry(0.027, 0.027, 0.055, 10);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)));
    return put(BRONZE, geo.translate(x, yEnd, 0));
  };
  end(x0, -1);
  end(x1, 1);
  put(BRONZE, new THREE.CylinderGeometry(0.006, 0.006, 0.05, 5).rotateZ(0.6).translate(EYE + 0.012, EY - 0.018, 0));

  // ---- the hook: a half ring, its crown inside the next post's -x eye -------------------
  const NX = SPAN - EYE;
  // the half ring rises straight out of the far ferrule's mouth
  put(BRONZE, new THREE.TorusGeometry(0.019, 0.0065, 5, 10, Math.PI).translate(NX - 0.001, EY - 0.0145, 0));
  put(BRONZE, new THREE.SphereGeometry(0.009, 6, 4).translate(NX + 0.018, EY - 0.0175, 0));

  for (const [mat, geos] of PARTS) g.add(new THREE.Mesh(merge(geos), mat));

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

  // Line posts up by putting the next post's `post` point on this one's `nextPost`.
  const at = (x, y, z) => [+(x - c.x).toFixed(3), +(y - bb.min.y).toFixed(3), +(z - c.z).toFixed(3)];
  g.userData.post = at(0, 0, 0);
  g.userData.nextPost = at(SPAN, 0, 0);
  return g;
}
