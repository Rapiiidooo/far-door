// ice_spire, arm C: a second reading, hand-built as triangle soups.
// The crystals have a natural habit rather than a lathe's regular hexagon: an irregular
// six-sided section (corners alternately proud and shallow, their angles jittered), a
// skewed two-tier tip (six shoulder facets and six corner facets under a long point that
// leans back towards the cluster), and a frost crown whose ragged top climbs the corners.
// The mound is a broad faceted boulder with five smaller ones fused into its flanks.
// Every triangle takes its colour from the way it faces once placed: down-facing crystal
// faces deep ice, the most sky-facing tip facets glacier white, the rest ice blue, and
// rock facets that look almost straight up hold snow. One mesh per material.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (hex, rough, name) => {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
    if (name) m.name = name;
    return m;
  };
  // Ice has no recipe in the contract's list, so its materials stay unnamed; the game
  // gives ice its gloss and translucency at load.
  const ICE = mat(0xa9d2e3, 0.35);
  const DEEP = mat(0x5b9bbd, 0.4);
  const FROST = mat(0xe9f2f6, 0.85);
  const SLATE = mat(0x3d4654, 0.9, 'stone');

  let seed = 7331;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const D = Math.PI / 180, UP = new THREE.Vector3(0, 1, 0);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const dirOf = (az, tilt) => V(Math.sin(tilt * D) * Math.sin(az * D), Math.cos(tilt * D), Math.sin(tilt * D) * Math.cos(az * D));

  const soup = new Map([[ICE, []], [DEEP, []], [FROST, []], [SLATE, []]]);
  const tri = (m, a, b, c) => soup.get(m).push(a, b, c);
  const quad = (m, a, b, c, d) => { tri(m, a, b, c); tri(m, a, c, d); };
  const n0 = V(), e0 = V();
  const normalOf = (a, b, c) => n0.subVectors(b, a).cross(e0.subVectors(c, a)).normalize();

  // --- the mound: a heap of faceted boulders ---------------------------------------------
  // Each boulder is three staggered rings of jittered vertices under a peak, so its facets
  // are triangles pointing every way. A facet that looks almost straight up holds snow.
  const rockTris = [];
  const rockFace = (a, b, c) => {
    tri(normalOf(a, b, c).y > 0.8 ? FROST : SLATE, a, b, c);
    rockTris.push([a, b, c]);
  };
  const boulder = ({ x = 0, z = 0, R, h, n = 7, tiltAz = 0, tilt = 0, spin = 0 }) => {
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dirOf(tiltAz, tilt)), pos = V(x, 0, z);
    const w = (px, py, pz) => V(px, py, pz).applyQuaternion(q).add(pos);
    const ring = (rad, y, jr, jy, off) => {
      const out = [];
      for (let k = 0; k < n; k++) {
        const ang = spin + ((k + off + rr(-0.18, 0.18)) * 2 * Math.PI) / n, rd = rad * rr(1 - jr, 1);
        out.push(w(Math.sin(ang) * rd, y + rr(-jy, jy), Math.cos(ang) * rd));
      }
      return out;
    };
    // foot, a bulging shoulder half a step round, a shrunken crown ring, and the peak
    const b = ring(R * 0.94, 0, 0.08, 0, 0), m = ring(R, h * 0.45, 0.14, h * 0.08, 0.5);
    const t = ring(R * 0.58, h * 0.88, 0.18, h * 0.07, 1);
    const apex = w(rr(-0.12, 0.12) * R, h, rr(-0.12, 0.12) * R), foot = w(0, 0, 0);
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      rockFace(b[k], b[j], m[k]); rockFace(b[j], m[j], m[k]);
      rockFace(m[k], m[j], t[k]); rockFace(m[k], t[k], t[(k + n - 1) % n]);
      rockFace(t[k], t[j], apex);
      tri(SLATE, foot, b[j], b[k]);
    }
  };
  // the highest rock surface straight above (x, z), or 0 on open ground
  const rockTop = (x, z) => {
    let best = 0;
    for (const [a, b, c] of rockTris) {
      const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      if (Math.abs(d) < 1e-9) continue;
      const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d;
      const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d;
      if (u < 0 || v < 0 || u + v > 1) continue;
      best = Math.max(best, u * a.y + v * b.y + (1 - u - v) * c.y);
    }
    return best;
  };

  // a broad core, and five lumps fused into its flanks
  boulder({ R: 1.0, h: 0.62, n: 10, tiltAz: 250, tilt: 3, spin: 0.2 });
  for (const [az, d, R, h, tilt, n] of [
    [15, 0.86, 0.5, 0.4, 12, 7], [85, 0.87, 0.46, 0.33, 15, 6], [150, 0.85, 0.54, 0.44, 10, 7],
    [215, 0.88, 0.48, 0.36, 14, 7], [290, 0.86, 0.52, 0.39, 11, 6],
  ]) boulder({ x: Math.sin(az * D) * d, z: Math.cos(az * D) * d, R, h, n, tiltAz: az, tilt, spin: rr(0, 6.28) });

  // --- the crystals -----------------------------------------------------------------------
  const crystal = ({ bAz, bD, az, tilt, top, r, tipLen, taper = 0.9, skew = 0.3, sink = 0.3 }) => {
    const a = az * D, t = tilt * D;
    const dir = dirOf(az, tilt), q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const bx = Math.sin(bAz * D) * bD, bz = Math.cos(bAz * D) * bD;
    const base = V(bx, rockTop(bx, bz) - sink, bz);
    // the apex leans back towards the cluster by skew * r, which also lifts it
    const sx = -Math.sin(a) * skew * r, sz = -Math.cos(a) * skew * r;
    const len = (top - base.y - skew * r * Math.sin(t)) / Math.cos(t), shaft = len - tipLen;
    const corners = [];
    for (let k = 0; k < 6; k++) corners.push([a + (k * 60 + rr(-5, 5)) * D, r * (k % 2 ? 0.88 : 1.1) * rr(0.96, 1.04)]);
    const at = (k, s) => { const [th, rad] = corners[((k % 6) + 6) % 6], sc = 1 + ((taper - 1) * s) / shaft; return V(Math.sin(th) * rad * sc, s, Math.cos(th) * rad * sc); };
    const A = corners.map((_, k) => at(k, 0)), B = corners.map((_, k) => at(k, shaft));
    const apex = V(sx, len, sz), fM = 0.22, mM = 0.7;
    const M = B.map((b, k) => { const c = B[(k + 1) % 6]; return V(((b.x + c.x) / 2) * mM + sx * fM, shaft + tipLen * fM, ((b.z + c.z) / 2) * mM + sz * fM); });
    const W = (p) => p.clone().applyQuaternion(q).add(base);
    const face = (tip, a0, b0, c0) => {
      const [p, r0, s0] = [W(a0), W(b0), W(c0)], ny = normalOf(p, r0, s0).y;
      tri(ny < -0.1 ? DEEP : tip && ny > 0.7 ? FROST : ICE, p, r0, s0);
    };
    for (let k = 0; k < 6; k++) {
      const j = (k + 1) % 6;
      face(false, A[k], A[j], B[j]); face(false, A[k], B[j], B[k]);
      face(true, B[k], B[j], M[k]); face(true, B[j], M[j], M[k]);
      face(true, M[k], M[j], apex);
    }
    // frost crown: flared below, its top edge on the shaft, points climbing the corners
    let s = 0;
    while (s < shaft) { const p = W(V(0, s, 0)); if (p.y > rockTop(p.x, p.z) + 0.02) break; s += 0.01; }
    const cs = s + 0.16 + r * 0.25, T = [], Bt = [];
    for (let k = 0; k < 6; k++) {
      const j = (k + 1) % 6, up = rr(0.07, 0.17), dip = rr(0, 0.05);
      T.push(at(k, cs + up), at(k, cs - dip).lerp(at(j, cs - dip), 0.5));
      Bt.push(at(k, 0).multiplyScalar(1.34).setY(0), at(k, 0).lerp(at(j, 0), 0.5).multiplyScalar(1.36).setY(0));
    }
    for (let i = 0; i < 12; i++) { const j = (i + 1) % 12; quad(FROST, W(Bt[i]), W(Bt[j]), W(T[j]), W(T[i])); }
  };

  crystal({ bAz: 200, bD: 0.05, az: 80, tilt: 6, top: 4.0, r: 0.42, tipLen: 1.05, sink: 0.36 });
  crystal({ bAz: 112, bD: 0.42, az: 116, tilt: 20, top: 2.9, r: 0.31, tipLen: 0.78 });
  crystal({ bAz: 298, bD: 0.44, az: 294, tilt: 18, top: 2.7, r: 0.3, tipLen: 0.74 });
  crystal({ bAz: 205, bD: 0.58, az: 208, tilt: 38, top: 1.44, r: 0.28, tipLen: 0.52, taper: 0.94, sink: 0.22 });
  crystal({ bAz: 22, bD: 0.6, az: 26, tilt: 30, top: 1.38, r: 0.27, tipLen: 0.5, taper: 0.94, sink: 0.22 });

  // --- one flat-shaded mesh per material ----------------------------------------------------
  for (const [m, pts] of soup) {
    const P = [], U = [];
    for (let i = 0; i < pts.length; i += 3) {
      const nn = normalOf(pts[i], pts[i + 1], pts[i + 2]);
      const ax = Math.abs(nn.x), ay = Math.abs(nn.y), az = Math.abs(nn.z);
      for (const p of [pts[i], pts[i + 1], pts[i + 2]]) {
        P.push(p.x, Math.max(0, p.y), p.z);
        if (ay >= ax && ay >= az) U.push(p.x, p.z); else if (ax >= az) U.push(p.z, p.y); else U.push(p.x, p.y);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, m));
  }

  // --- place: base on y = 0, centred on x and z ---------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mm.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });
  return g;
}
