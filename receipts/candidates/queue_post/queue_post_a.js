// queue_post, arm A: profiles.
// Base, post and ball cup are revolved profiles: a stepped, grooved basalt base 0.35 m
// across, a slim aged-bronze post with a flared foot and a cup under the warden-chalk
// ball. Two bronze eyes face +x and -x. The stamp-ochre rope is a tube swept along a
// solved catenary from the +x eye, sagging 0.27 m over its span, and ends in a bronze
// ferrule and a swept J-hook whose crown sits where the next post's -x eye will be,
// 1.4 m along +x at post height. Lined up 1.4 m apart, each hook threads the next eye.
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

  // ---- profile tools --------------------------------------------------------------
  const fixNormals = (geo) => {
    const nr = geo.attributes.normal, v = new THREE.Vector3();
    for (let k = 0; k < nr.count; k++) { v.fromBufferAttribute(nr, k).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    return geo;
  };
  // [r, y] bottom to top along the outside; one lathe per edge keeps steps crisp
  const lathe = (mat, pts, segs, smooth = false) => {
    if (smooth) return put(mat, fixNormals(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs)));
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i][0] === 0 && pts[i + 1][0] === 0) continue;
      put(mat, fixNormals(new THREE.LatheGeometry([new THREE.Vector2(...pts[i]), new THREE.Vector2(...pts[i + 1])], segs)));
    }
  };

  // ---- the stanchion ----------------------------------------------------------------
  // base: two chamfered steps with an incised groove round the lower one
  lathe(BASALT, [[0.175, 0], [0.175, 0.012], [0.166, 0.016], [0.166, 0.024], [0.175, 0.028], [0.175, 0.038], [0.16, 0.052],
    [0.13, 0.052], [0.13, 0.064], [0.112, 0.078], [0.05, 0.078], [0.05, 0.084], [0, 0.084]], 18);
  // post: flared bronze foot, slim shaft, collar and a cup under the ball
  lathe(BRONZE, [[0.046, 0.078], [0.046, 0.09], [0.032, 0.104], [0.021, 0.128], [0.018, 0.2], [0.017, 0.84], [0.026, 0.848],
    [0.026, 0.862], [0.02, 0.868], [0.03, 0.876], [0.05, 0.892], [0.057, 0.905], [0.052, 0.909], [0, 0.89]], 10);
  // the warden-chalk ball, seated in the cup
  const ball = [];
  for (let k = 0; k <= 10; k++) { const t = -Math.PI / 2 + (Math.PI * k) / 10; ball.push([0.062 * Math.cos(t), 0.938 + 0.062 * Math.sin(t)]); }
  ball[0][0] = 0.001; ball[10][0] = 0.001;
  lathe(CHALK, ball, 14, true);
  // two bronze eyes on stems, rings facing +-x so a hook passes through them
  const EYE = 0.078, EY = 0.93;
  for (const s of [-1, 1]) {
    put(BRONZE, new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8).rotateZ(Math.PI / 2).translate(s * 0.056, EY, 0));
    put(BRONZE, new THREE.TorusGeometry(0.017, 0.006, 5, 10).rotateY(Math.PI / 2).translate(s * EYE, EY, 0));
  }

  // ---- the rope: a catenary from this post's +x eye towards the next post -------------
  const SPAN = 1.4;                                      // post to post
  const A0 = new THREE.Vector3(EYE + 0.02, EY - 0.03, 0);            // just below and past the +x eye
  const A1 = new THREE.Vector3(SPAN - EYE - 0.045, EY - 0.045, 0);   // the far ferrule, under the hook
  const SAG = 0.27, half = (A1.x - A0.x) / 2, xm = (A0.x + A1.x) / 2, yEnds = (A0.y + A1.y) / 2;
  let lo = 0.05, hi = 5;                                 // solve SAG = a (cosh(half / a) - 1) for a
  for (let i = 0; i < 60; i++) { const a = (lo + hi) / 2; if (a * (Math.cosh(half / a) - 1) > SAG) lo = a; else hi = a; }
  const ca = (lo + hi) / 2;
  const cat = (x) => yEnds - SAG + ca * (Math.cosh((x - xm) / ca) - 1) + ((A1.y - A0.y) * (x - xm)) / (A1.x - A0.x);
  const pts = [];
  for (let i = 0; i <= 24; i++) { const x = A0.x + ((A1.x - A0.x) * i) / 24; pts.push(new THREE.Vector3(x, cat(x), 0)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  put(OCHRE, new THREE.TubeGeometry(curve, 44, 0.021, 6, false));
  // bronze ferrules on both rope ends, laid along the rope
  const ferrule = (at, dir) => {
    const geo = new THREE.CylinderGeometry(0.027, 0.027, 0.055, 10);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)));
    return put(BRONZE, geo.translate(at.x, at.y, at.z));
  };
  const t0 = curve.getTangent(0), t1 = curve.getTangent(1);
  ferrule(A0.clone().addScaledVector(t0, 0.012), t0);
  ferrule(A1.clone().addScaledVector(t1, -0.012), t1);
  // a short link from the near ferrule up through the +x eye
  put(BRONZE, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A0.clone().addScaledVector(t0, -0.012), new THREE.Vector3(EYE + 0.01, EY - 0.012, 0), new THREE.Vector3(EYE, EY + 0.004, 0)]), 6, 0.006, 5));

  // ---- the hook: a J swept from the far ferrule, its crown on the next post's -x eye -----
  const NEXT = new THREE.Vector3(SPAN - EYE, EY, 0);     // where the next post's -x eye sits
  const J = [
    A1.clone().addScaledVector(t1, 0.012),
    new THREE.Vector3(NEXT.x - 0.024, NEXT.y - 0.035, 0),
    new THREE.Vector3(NEXT.x - 0.02, NEXT.y - 0.008, 0),
    new THREE.Vector3(NEXT.x, NEXT.y + 0.004, 0),
    new THREE.Vector3(NEXT.x + 0.02, NEXT.y - 0.008, 0),
    new THREE.Vector3(NEXT.x + 0.022, NEXT.y - 0.03, 0),
  ];
  put(BRONZE, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(J), 14, 0.0065, 5));
  put(BRONZE, new THREE.SphereGeometry(0.009, 6, 4).translate(J[5].x, J[5].y, 0));

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
