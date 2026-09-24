// lumen_plant, arm B: sweeps and profiles.
// Five stalks are tubes swept along curves that bow outward and turn back up,
// tapering from a thick root to the pod, in a cascade of heights. Each ends in
// a calyx cup holding a bulbous lathed pod; smaller lathed buds sit on the
// stalks, leaning out. The knotted root mound is a lumpy lathed dome with
// tapering root tubes crossing over it and down onto the ground.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  // Stalks and roots are night basalt in colour, but waxy and soft, not stone.
  const STALK = new THREE.MeshStandardMaterial({ color: 0x2a2830, roughness: 0.55, metalness: 0 });
  STALK.name = 'foliage';
  // Lumen lilac is emission only: the pod skin is as dark as the stalks and the
  // light comes from inside, so the game can pulse or dim it and the hue holds
  // at full glow. Unnamed and under 0.95 opacity, so the loader's procedural
  // surfaces leave the translucent skin alone.
  const glow = (intensity) => new THREE.MeshStandardMaterial({
    color: 0x2a2830, emissive: 0xd98cff, emissiveIntensity: intensity,
    roughness: 0.35, metalness: 0, transparent: true, opacity: 0.88,
  });
  const POD = glow(2.4), BUD = glow(1.6);
  BUD.roughness = 0.4;   // a distinct material even if a loader merges by value

  // ---- helpers --------------------------------------------------------------------
  const buckets = new Map();
  const add = (geo, m) => {
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(geo);
    return geo;
  };
  const merge = (geos) => {
    const flat = geos.map((x) => (x.index ? x.toNonIndexed() : x));
    let n = 0;
    for (const x of flat) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of flat) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  // Profiles are [radius, height] from the bottom up, so faces look out.
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const UP = new THREE.Vector3(0, 1, 0);
  // stand a geometry built along +y on point p, pointing along dir
  const orient = (geo, p, dir) => geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())).translate(p.x, p.y, p.z);
  // a tube along a curve whose radius runs from r0 to r1
  const sweep = (curve, r0, r1, TS, RS) => {
    const tube = new THREE.TubeGeometry(curve, TS, 1, RS, false);
    const p = tube.attributes.position, c = new THREE.Vector3(), w = new THREE.Vector3();
    for (let i = 0; i <= TS; i++) {
      const t = i / TS, r = r0 + (r1 - r0) * Math.pow(t, 0.8);
      curve.getPointAt(t, c);
      for (let j = 0; j <= RS; j++) {
        const k = i * (RS + 1) + j;
        w.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c);
        p.setXYZ(k, w.x, w.y, w.z);
      }
    }
    return tube;   // the tube's own normals stay right under a gentle taper, and have no seam
  };
  // smooth normals with the seam and pole duplicates of a lathe averaged together
  const weldNormals = (geo) => {
    geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, sum = new Map();
    const key = (i) => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    for (let i = 0; i < p.count; i++) {
      const k = key(i), s = sum.get(k) || new THREE.Vector3();
      sum.set(k, s.add(new THREE.Vector3().fromBufferAttribute(n, i)));
    }
    for (let i = 0; i < p.count; i++) { const s = sum.get(key(i)).clone().normalize(); n.setXYZ(i, s.x, s.y, s.z); }
    return geo;
  };
  let seed = 4242;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const at = (deg, s, y) => { const a = (deg * Math.PI) / 180; return new THREE.Vector3(Math.sin(a) * s, y, Math.cos(a) * s); };

  // ---- the root mound: a lumpy dome, with seams kept welded while jittering ---
  {
    const geo = lathe([[0.001, 0], [0.27, 0], [0.265, 0.05], [0.23, 0.11], [0.17, 0.16], [0.09, 0.195], [0.001, 0.205]], 14);
    const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!seen.has(key)) {
        const k = Math.hypot(p.getX(i), p.getZ(i)) > 0.01 ? 0.9 + rnd() * 0.18 : 1;
        seen.set(key, [p.getX(i) * k, p.getY(i) > 0.001 ? p.getY(i) * (0.88 + rnd() * 0.24) : 0, p.getZ(i) * k]);
      }
      const [x, y, z] = seen.get(key);
      p.setXYZ(i, x, y, z);
    }
    add(weldNormals(geo), STALK);
  }
  // roots loop out of the mound and dive back into the ground beside it, crossing
  // one another, with a knot swelling at each crossing
  for (const [deg, turn, reach, r0] of [[15, 55, 0.42, 0.042], [95, -50, 0.4, 0.038], [170, 60, 0.44, 0.044], [240, -45, 0.39, 0.036], [305, 50, 0.42, 0.04]]) {
    const pts = [at(deg - turn * 0.5, 0.1, 0.17), at(deg - turn * 0.1, 0.22, 0.15), at(deg + turn * 0.25, 0.33, 0.1), at(deg + turn * 0.5, reach, 0.04), at(deg + turn * 0.62, reach + 0.02, 0.0)];
    add(sweep(new THREE.CatmullRomCurve3(pts), r0, r0 * 0.55, 12, 6), STALK);
    const knot = at(deg - turn * 0.1, 0.215, 0.155);
    add(weldNormals(new THREE.SphereGeometry(r0 * 1.3, 7, 4).scale(1.2, 0.8, 1.2)).translate(knot.x, knot.y, knot.z), STALK);
  }

  // ---- five stalks, a calyx and a pod on each, buds along them -------------------
  // [azimuth deg, pod base height, reach out, sway sideways, pod height, pod radius]
  const STALKS = [
    [200, 1.06, 0.17, 0.05, 0.235, 0.098],
    [85, 0.88, 0.33, -0.06, 0.21, 0.09],
    [322, 0.71, 0.38, 0.07, 0.195, 0.083],
    [30, 0.54, 0.34, -0.05, 0.18, 0.076],
    [140, 0.39, 0.41, 0.06, 0.17, 0.07],
  ];
  const pods = [], buds = [];
  STALKS.forEach(([deg, H, reach, sway, hp, rp], si) => {
    const a = (deg * Math.PI) / 180, out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const P = (s, y, w = 0) => out.clone().multiplyScalar(s).addScaledVector(side, w).setY(y);
    const curve = new THREE.CatmullRomCurve3([
      P(0.03, 0.1), P(0.1 + reach * 0.1, 0.1 + H * 0.28, sway * 0.4), P(reach * 0.72, 0.1 + H * 0.62, sway),
      P(reach * 0.93, H * 0.9, sway * 0.6), P(reach, H, sway * 0.4),
    ]);
    const r0 = 0.056 + H * 0.008, r1 = 0.031;
    add(sweep(curve, r0, r1, 20, 7), STALK);
    const tip = curve.getPointAt(1), dir = curve.getTangentAt(1);
    const k = rp / 0.08;   // a closed calyx cup, sized to its pod
    add(orient(lathe([[0.001, -0.03], [0.026, -0.022], [0.042 * k, 0.0], [0.05 * k, 0.02], [0.044 * k, 0.032], [0.001, 0.036]], 8), tip, dir), STALK);
    // a bulb: widest low, drawn out to a soft point
    pods.push(orient(lathe([[0.001, 0.004], [rp * 0.5, 0.018], [rp * 0.85, hp * 0.15], [rp, hp * 0.33], [rp * 0.97, hp * 0.5],
      [rp * 0.8, hp * 0.68], [rp * 0.5, hp * 0.84], [rp * 0.2, hp * 0.95], [0.001, hp]], 10), tip.clone().addScaledVector(dir, 0.012), dir));
    // buds lean out from the stalk, alternating sides, smaller towards the top
    const n = si < 3 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const t = 0.32 + (0.5 * k) / n, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
      const s0 = new THREE.Vector3().crossVectors(tan, UP);
      if (s0.lengthSq() < 1e-6) s0.set(1, 0, 0);
      s0.normalize().applyAxisAngle(tan, (k % 2 ? 1 : -1) * 1.2 + si);
      const r = r0 + (r1 - r0) * Math.pow(t, 0.8), sz = 1 - 0.25 * t;
      const d = tan.clone().multiplyScalar(0.55).addScaledVector(s0, 0.85).normalize();
      buds.push(orient(lathe([[0.001, 0], [0.025 * sz, 0.014], [0.034 * sz, 0.036 * sz], [0.025 * sz, 0.06 * sz], [0.001, 0.078 * sz]], 6), p.addScaledVector(s0, r * 0.6), d));
    }
  });

  // ---- meshes: stalks and roots merged; pods and buds their own meshes -----------
  // the roots dive into the ground: press what went below it onto it
  for (const [m, geos] of buckets) {
    const geo = merge(geos), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
    g.add(new THREE.Mesh(geo, m));
  }
  const podMesh = new THREE.Mesh(merge(pods), POD);
  podMesh.name = 'pods';
  const budMesh = new THREE.Mesh(merge(buds), BUD);
  budMesh.name = 'buds';
  g.add(podMesh, budMesh);

  // ---- place: base on y = 0, centred on x and z ----------------------------------
  const box3 = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box3.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box3.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box3.min.y; o.position.z -= c.z; });

  g.userData.parts = { pods: podMesh, buds: budMesh };
  return g;
}
