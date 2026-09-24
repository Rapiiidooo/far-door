// clay_urns, candidate B: profiles. Each urn is one lathe profile, foot to rolled lip
// with the incised rings cut into it as square channels, and a darker lathe for the
// inside of the mouth. The smallest is broken: every vertex above a jagged break line
// is pulled down onto it, so the lip becomes the fractured edge; its three shards are
// the same wall revolved through a narrow arc and capped. 0.5, 0.75 and 1.0 m tall.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  // Named plaster so the surface pass keeps fired clay smooth: by colour alone
  // terracotta classifies as timber and would grow wood grain.
  const CLAY = mat(0xa8603a, 'plaster', { roughness: 0.85 });
  const INSIDE = mat(0x8a5433, 'plaster', { roughness: 0.95, side: THREE.DoubleSide });
  const CHANNEL = mat(0x8a5433, 'plaster', { roughness: 0.9 });

  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const SEG = 16;

  // --- one urn -----------------------------------------------------------------------------------
  // ctrl: body control points (r, y) from the foot to the top of the neck; lip: rim roll
  const urn = ({ ctrl, H, lip, t = 0.02, grooves = [], inDepth, handles = [], broken = null }) => {
    const u = new THREE.Group();
    const spline = new THREE.SplineCurve(ctrl.map(([r, y]) => V2(r, y)));
    const samples = spline.getSpacedPoints(16);
    const R = (y) => {
      for (let i = 0; i < samples.length - 1; i++) {
        const a = samples[i], b = samples[i + 1];
        if (y >= a.y && y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / Math.max(1e-6, b.y - a.y);
      }
      return y < samples[0].y ? samples[0].x : samples[samples.length - 1].x;
    };
    // the outer wall, with square channels cut where the rings are
    const outer = [V2(0, 0), V2(ctrl[0][0], 0)];
    const cuts = grooves.flatMap((y) => [y - 0.009, y - 0.007, y + 0.007, y + 0.009]);
    const ys = [...samples.map((p) => p.y).filter((y) => y > 0 && !grooves.some((gy) => Math.abs(y - gy) < 0.012)), ...cuts].sort((a, b) => a - b);
    for (const y of ys) {
      const inCut = grooves.some((gy) => Math.abs(y - gy) < 0.0075);
      outer.push(V2(R(y) - (inCut ? 0.011 : 0), y));
    }
    const yn = samples[samples.length - 1].y, rn = R(yn);
    for (const [dr, dy] of lip) outer.push(V2(rn + dr, yn + dy));
    const top = outer[outer.length - 1];
    // inside of the mouth, down the neck to a floor nobody sees
    const inner = [top.clone()];
    for (let k = 0; k <= 5; k++) {
      const y = yn - ((yn - inDepth) * k) / 5;
      inner.push(V2(Math.max(0.01, R(y) - t), y));
    }
    inner.push(V2(0, inDepth));
    const geoOut = new THREE.LatheGeometry(outer, SEG), geoIn = new THREE.LatheGeometry(inner, SEG);
    if (broken) for (const geo of [geoOut, geoIn]) breakGeo(geo, broken, R, t);
    u.add(new THREE.Mesh(geoOut, CLAY), new THREE.Mesh(geoIn, INSIDE));
    // dark lines in the floor of each channel
    for (const y of grooves) {
      const r = R(y) - 0.011;
      if (broken && y > broken.floor) continue;
      u.add(new THREE.Mesh(new THREE.LatheGeometry([V2(r + 0.001, y - 0.007), V2(r + 0.001, y + 0.007)], SEG), CHANNEL));
    }
    // handles: tubes from neck to shoulder, ends sunk into the wall
    for (const { phi, pts, r = 0.019 } of handles) {
      const curve = new THREE.CatmullRomCurve3(pts.map(([dr, y, dphi = 0]) => {
        const rr = R(y) + dr, a = phi + dphi;
        return V(Math.sin(a) * rr, y, Math.cos(a) * rr);
      }));
      u.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, r, 5, false), CLAY));
    }
    u.userData.R = R;
    return u;
  };
  // pull every vertex above the jagged line down onto it, keeping its wall radius
  const breakGeo = (geo, { phi0, width, floor, jag }, R, t) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
      if (r < 1e-5) continue;
      const a = Math.atan2(x, z);
      let d = Math.abs(((a - phi0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) / width;
      if (d >= 1) continue;
      const k = Math.round((a + Math.PI) / ((2 * Math.PI) / SEG));
      const yb = floor + (1 - Math.cos(Math.PI * d)) * 0.5 * 0.22 + jag[k % jag.length];
      if (y <= yb) continue;
      const outerWall = r > R(yb) - t * 0.5;
      const rr = outerWall ? R(yb) : Math.max(0.01, R(yb) - t);
      p.setXYZ(i, (x / r) * rr, yb, (z / r) * rr);
    }
    geo.computeVertexNormals();
  };
  // a shard: a slice of wall revolved through a narrow arc, capped at both ends
  const shard = (R, y0, y1, t, dphi) => {
    const loop = [];
    for (let k = 0; k <= 3; k++) { const y = y0 + ((y1 - y0) * k) / 3; loop.push(V2(R(y), y)); }
    for (let k = 3; k >= 0; k--) { const y = y0 + ((y1 - y0) * k) / 3; loop.push(V2(R(y) - t, y)); }
    loop.push(loop[0].clone());
    const geo = new THREE.LatheGeometry(loop, 3, -dphi / 2, dphi);
    const s = new THREE.Group();
    s.add(new THREE.Mesh(geo, CLAY));
    const tris = THREE.ShapeUtils.triangulateShape(loop.slice(0, -1), []);
    for (const a of [-dphi / 2, dphi / 2]) {
      const pos = [];
      for (const tri of tris) for (const idx of tri) { const q = loop[idx]; pos.push(Math.sin(a) * q.x, q.y, Math.cos(a) * q.x); }
      const cap = new THREE.BufferGeometry();
      cap.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      cap.computeVertexNormals();
      s.add(new THREE.Mesh(cap, INSIDE));
    }
    // centre the piece on itself so it turns about its own middle
    const ym = (y0 + y1) / 2, rm = R(ym) - t / 2;
    s.children.forEach((m) => m.geometry.translate(0, -ym, -rm));
    return s;
  };

  // --- the three urns ---------------------------------------------------------------------------------
  const big = urn({
    H: 1.0, t: 0.022, inDepth: 0.72,
    ctrl: [[0.12, 0], [0.13, 0.03], [0.17, 0.12], [0.25, 0.28], [0.29, 0.46], [0.275, 0.62], [0.2, 0.76], [0.13, 0.84], [0.105, 0.9], [0.108, 0.95]],
    lip: [[0.02, 0.004], [0.036, 0.018], [0.036, 0.036], [0.018, 0.05], [-0.012, 0.05]],
    grooves: [0.58, 0.62, 0.66, 0.26],
    handles: [-1, 1].map((s) => ({ phi: (s * Math.PI) / 2, pts: [[-0.01, 0.905], [0.05, 0.915], [0.1, 0.88], [0.1, 0.8], [0.03, 0.735], [-0.012, 0.73]] })),
  });
  big.position.set(-0.26, 0, -0.16);
  big.rotation.y = 0.3;
  g.add(big);

  const mid = urn({
    H: 0.75, t: 0.02, inDepth: 0.52,
    ctrl: [[0.1, 0], [0.11, 0.025], [0.17, 0.12], [0.225, 0.3], [0.215, 0.44], [0.16, 0.56], [0.11, 0.62], [0.095, 0.66], [0.1, 0.7]],
    lip: [[0.018, 0.004], [0.03, 0.016], [0.028, 0.034], [0.012, 0.046], [-0.012, 0.046]],
    grooves: [0.4, 0.44, 0.2],
    handles: [-1, 1].map((s) => ({ phi: (s * Math.PI) / 2, r: 0.017, pts: [[-0.01, 0.5, -0.2], [0.04, 0.51, -0.12], [0.05, 0.505, 0], [0.04, 0.51, 0.12], [-0.01, 0.5, 0.2]] })),
  });
  mid.position.set(0.36, 0, -0.2);
  mid.rotation.y = -0.5;
  g.add(mid);

  const jag = Array.from({ length: SEG }, (_, k) => (k % 2 ? 1 : -1) * (0.018 + rnd() * 0.035));
  const smallDef = {
    H: 0.5, t: 0.017, inDepth: 0.06,
    ctrl: [[0.08, 0], [0.09, 0.02], [0.14, 0.1], [0.165, 0.2], [0.155, 0.3], [0.11, 0.39], [0.08, 0.43], [0.078, 0.46]],
    lip: [[0.014, 0.004], [0.022, 0.014], [0.02, 0.03], [0.008, 0.04], [-0.01, 0.04]],
    grooves: [0.25, 0.28],
    handles: [{ phi: Math.PI, r: 0.014, pts: [[-0.01, 0.44], [0.04, 0.445], [0.065, 0.41], [0.05, 0.35], [0.01, 0.33], [-0.01, 0.33]] }],
    broken: { phi0: 0.6, width: 1.5, floor: 0.19, jag },
  };
  const small = urn(smallDef);
  small.position.set(0.08, 0, 0.33);
  small.rotation.y = 0.25;
  g.add(small);
  // three shards of it, lying on their backs and sides nearby
  const R3 = small.userData.R;
  const shards = [[0.26, 0.4, 0.8, 0.34, 0.5, 1.9, -1.35], [0.3, 0.42, 0.62, 0.46, 0.3, -0.7, 1.4], [0.2, 0.3, 0.7, -0.08, 0.56, 2.6, -1.3]];
  for (const [y0, y1, dphi, x, z, yaw, lie] of shards) {
    const s = shard(R3, y0, y1, 0.017, dphi);
    // lie it down on its outer face, then lift it so its lowest point touches the ground
    s.rotation.set(lie, yaw, 0, 'YXZ');
    s.position.set(x, 0, z);
    g.add(s);
    s.updateMatrixWorld(true);
    let low = Infinity;
    s.traverse((n) => {
      const pa = n.isMesh && n.geometry.attributes.position; if (!pa) return;
      for (let i = 0; i < pa.count; i++) low = Math.min(low, V(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(n.matrixWorld).y);
    });
    s.position.y -= low;
  }

  // --- placement: base on y = 0, centred on x and z ------------------------------------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });
  return g;
}
