// fern_cluster, candidate B (profiles): ten fronds, each one ExtrudeGeometry of a rhombus
// section swept along its own arching centreline (a Catmull-Rom path that rises from the
// crown and curls out and down). The sweep is then reshaped layer by layer: a thick
// diamond stalk for the stipe, then a blade folded like a shallow roof whose half-width
// follows a lanceolate outline and alternates between tooth and notch, every tooth edge
// pushed forward along the path so the teeth lean towards the tip. Triangles below a
// frond's colour line go to one moss green mesh, the rest to one fern green mesh. The two
// fiddleheads are tubes swept up a stalk and round a logarithmic spiral that thins as it
// winds in; the crown is a lathed mound of bark. 1.2 m across, 0.8 m tall.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, side: THREE.DoubleSide });
    m.name = name;
    return m;
  };
  const MOSS = mat(0x4f7a3a, 0.85, 'foliage');
  const FERN = mat(0x7da04a, 0.8, 'foliage');
  const BARK = mat(0x5a4030, 0.95, 'timber');

  let seed = 71;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // Widest a third of the way up the blade, the lowest pinnae shorter, a point at the tip.
  const outline = (v) => (v < 0.33 ? 0.42 + 0.58 * Math.sin((v / 0.33) * (Math.PI / 2)) : Math.pow((1 - v) / 0.67, 0.8));

  // The swept section is a tiny rhombus: x across the blade (the path's normal), y along
  // the binormal, which on these paths points to the underside. Its corners are read back
  // after the sweep and moved to the real width, fold and thickness of their layer.
  const E = 1e-3;
  const section = new THREE.Shape([new THREE.Vector2(-E, 0), new THREE.Vector2(0, -E), new THREE.Vector2(E, 0), new THREE.Vector2(0, E)]);

  const moss = { pos: [], uv: [] }, fern = { pos: [], uv: [] };

  // t runs from 0 (inner, young, upright) to 1 (outer, old, spreading low). The frond's
  // angle above the horizontal falls from th0 to th1 along its length, slowly at first.
  const frond = (az, t, scale) => {
    const th0 = (86 - 26 * t) * D, th1 = (-50 - 24 * t) * D, pw = 2.4 - t;
    const L = (1.12 - 0.44 * t) * (1 + 0.06 * Math.max(0, 1 - 2.5 * t)) * scale;
    const theta = (u) => th0 - (th0 - th1) * Math.pow(u, pw);
    const drift = jit(0.07);
    const pts = [];
    let r = 0.04, y = 0.036 - 0.01 * t;
    const n = 36;
    for (let i = 0; i <= n; i++) {
      if (i) {
        const th = theta((i - 0.5) / n);
        r += (Math.cos(th) * L) / n;
        y += (Math.sin(th) * L) / n;
      }
      if (i % 3 === 0) pts.push(V(drift * (i / n) ** 2, y, r));
    }
    const path = new THREE.CatmullRomCurve3(pts);
    const NS = 5, NP = 11, S = NS + 2 * NP + 1;
    const geo = new THREE.ExtrudeGeometry(section, { steps: S, bevelEnabled: false, extrudePath: path });
    // the same points and frames the extrusion used
    const P = path.getSpacedPoints(S);
    const F = path.computeFrenetFrames(S, false);
    const step = path.getLength() / S;
    const W = 0.13 * L;
    const layers = [];
    for (let s = 0; s <= S; s++) {
      const u = s / S, th = 0.008 * (1 - 0.7 * u);
      if (s <= NS) layers.push({ w: 0.011 - 0.002 * (s / NS), th, fold: 0, fwd: 0 });
      else if (s === S) layers.push({ w: 0.002, th: 0.0015, fold: 0, fwd: 0 });
      else {
        const env = W * outline((s - NS) / (S - NS)) * (1 + jit(0.05));
        const tooth = (s - NS) % 2 === 1;
        layers.push({ w: tooth ? env : 0.17 * env + 0.007, th, fold: 0.22, fwd: tooth ? 0.75 * step : 0 });
      }
    }
    const split = NS + Math.round((S - NS) * (0.45 + 0.2 * t));
    const rot = new THREE.Matrix4().makeRotationY(az);
    const pos = geo.attributes.position, a = V(0, 0, 0), o = V(0, 0, 0);
    for (let f = 0; f < pos.count; f += 3) {
      const tri = [];
      let smin = S;
      for (let k = 0; k < 3; k++) {
        a.fromBufferAttribute(pos, f + k);
        let s = 0, best = Infinity;
        for (let i = 0; i <= S; i++) { const d = a.distanceToSquared(P[i]); if (d < best) { best = d; s = i; } }
        o.subVectors(a, P[s]);
        const x = o.dot(F.normals[s]) / E, yb = o.dot(F.binormals[s]) / E, l = layers[s];
        const q = P[s].clone();
        let across = 0;
        if (Math.abs(x) > 0.5) {
          across = Math.sign(x) * l.w;
          q.addScaledVector(F.normals[s], across).addScaledVector(F.binormals[s], l.fold * l.w).addScaledVector(F.tangents[s], l.fwd);
        } else {
          q.addScaledVector(F.binormals[s], Math.sign(yb) * l.th);
        }
        tri.push([q.applyMatrix4(rot), 0.5 + across / 0.3, s / S]);
        smin = Math.min(smin, s);
      }
      const bin = smin < split ? moss : fern;
      for (const [q, uu, vv] of tri) { bin.pos.push(q.x, q.y, q.z); bin.uv.push(uu, vv); }
    }
    geo.dispose();
  };

  const tiers = [0, 0.7, 0.35, 1, 0.2, 0.85, 0.5, 0.95, 0.1, 0.6];
  for (let k = 0; k < tiers.length; k++) frond((k / tiers.length) * Math.PI * 2 + 0.2 + jit(0.12), tiers[k], 1 + jit(0.04));

  const sheet = (b, m) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, m));
  };
  sheet(moss, MOSS);
  sheet(fern, FERN);

  // --- fiddleheads: a tube up a leaning stalk, then a tube round a logarithmic spiral in
  // the stalk's own vertical plane, curling over the top and winding in, thinning as it goes
  const taper = (geo, curve, tubular, radial, r0, r1) => {
    const p = geo.attributes.position, c = V(0, 0, 0), q = V(0, 0, 0);
    for (let i = 0; i <= tubular; i++) {
      curve.getPointAt(i / tubular, c);
      const k = (r0 + (r1 - r0) * (i / tubular)) / r0;
      for (let j = 0; j <= radial; j++) {
        const idx = i * (radial + 1) + j;
        q.fromBufferAttribute(p, idx).sub(c).multiplyScalar(k).add(c);
        p.setXYZ(idx, q.x, q.y, q.z);
      }
    }
    geo.computeVertexNormals();
    return geo;
  };
  const fiddlehead = (az, H, R0, lean) => {
    const rot = new THREE.Matrix4().makeRotationY(az);
    const top = V(0, H, lean);
    const stalk = new THREE.CatmullRomCurve3([V(0, 0.03, 0.012), V(0, H * 0.55, lean * 0.55), top]);
    const sg = new THREE.TubeGeometry(stalk, 5, 0.012, 5, false).applyMatrix4(rot);
    g.add(new THREE.Mesh(sg, MOSS));
    const k = 0.3, turns = 2.35 * Math.PI, cp = [];
    for (let i = 0; i <= 28; i++) {
      const phi = (i / 28) * turns, rho = R0 * Math.exp(-k * phi);
      cp.push(V(0, H + rho * Math.sin(phi), lean + R0 - rho * Math.cos(phi)));
    }
    const coil = new THREE.CatmullRomCurve3(cp);
    const cg = taper(new THREE.TubeGeometry(coil, 20, 0.022, 5, false), coil, 20, 5, 0.022, 0.009).applyMatrix4(rot);
    g.add(new THREE.Mesh(cg, FERN));
    // a round bud closes the eye of the coil
    const end = coil.getPointAt(1).applyMatrix4(rot);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 4), FERN);
    bud.position.copy(end);
    g.add(bud);
  };
  fiddlehead(1.3, 0.42, 0.052, 0.04);
  fiddlehead(4.2, 0.34, 0.046, 0.035);

  // --- the crown: a lathed mound of bark the stipes rise out of
  const mound = [[0.115, 0], [0.09, 0.013], [0.062, 0.03], [0.032, 0.043], [0.001, 0.048]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(mound, 9), BARK));

  // --- the six lines -------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
