// glyph_banner, candidate B (profiles): the cloth is its pleated cross-section swept
// down a billowing path with ExtrudeGeometry (one sweep per colour band), three
// narrower pleated strips swept on down fluttering paths for the tails; the device is
// the crescent and disc outlines extruded as a stiff appliqué, counterchanged across the
// seam; the pole with its collar is one lathe profile, the crossbar and its caps lathes,
// the finial an extruded disc, the cairn bevelled extrusions. 3.6 m tall, front +Z.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  const BONE = mat(0xe6d3ae, 0.92, 'fabric', { side: THREE.DoubleSide });
  const SIENNA_C = mat(0x8a5433, 0.94, 'fabric', { side: THREE.DoubleSide });
  const TIMBER = mat(0x8a6a48, 0.88, 'timber');
  const ROPE = mat(0xb49a6a, 0.95, 'fabric');
  const BRONZE = mat(0x9a6a35, 0.5, 'metal', { metalness: 0.6 });
  const SAND = mat(0xb57f4f, 0.92, 'stone', { flatShading: true }), SUN = mat(0xd4a373, 0.88, 'stone', { flatShading: true });
  const SIENNA = mat(0x8a5433, 0.95, 'stone', { flatShading: true });

  let seed = 19;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = (a) => (rnd() * 2 - 1) * a;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const add = (geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); return o; };
  const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));

  // --- the cloth. Along a path in the y-z plane the sweep's frame puts shape x on -X
  // (across the cloth, mirrored) and shape y on the binormal, about -Z; so a pleat
  // that bulges toward the viewer is a negative y.
  const W = 1.1, TOP = 3.1, LEN = 2.42, Z0 = 0.13, VS = 0.6, TH = 0.014;
  const centreAt = (v, dx = 0, flutter = 0, ph = 0) => V(0.4 * v * v + dx, TOP - v * LEN + 0.36 * v * v,
    Z0 + 0.46 * Math.sin(Math.PI * 0.5 * v) * v + flutter * Math.sin(v * 14 + ph));
  const pleat = (a) => 0.045 * Math.sin(Math.PI * 2 * ((0.5 - a / W) * 2.3) + 0.6);
  // a strip of the section between world x = x0 and x1 (x0 < x1), as a closed thin outline
  const strip = (x0, x1, n = 8) => {
    const top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      top.push([-x, -pleat(x) + TH / 2]);
      bot.push([-x, -pleat(x) - TH / 2]);
    }
    return v2([...top, ...bot.reverse()]);
  };
  const sweep = (pts, x0, x1, m, steps) => {
    const path = new THREE.CatmullRomCurve3(pts);
    return add(new THREE.ExtrudeGeometry(new THREE.Shape(strip(x0, x1)), { steps, bevelEnabled: false, extrudePath: path }), m);
  };
  const panel = Array.from({ length: 9 }, (_, i) => centreAt((VS * i) / 8));
  sweep(panel, -0.55, 0, BONE, 12);
  sweep(panel, 0, 0.55, SIENNA_C, 12);
  for (const [x0, x1, len, dx, ph] of [[-0.55, -0.2, 0.26, -0.1, 0.4], [-0.16, 0.16, 0.4, 0.04, 2.1], [0.2, 0.55, 0.2, 0.16, 3.9]]) {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const q = i / 5;
      return centreAt(VS + len * q, dx * q * q, 0.05 * q, ph);
    });
    if (x0 < 0 && x1 > 0) {
      sweep(pts, x0, 0, BONE, 6);
      sweep(pts, 0, x1, SIENNA_C, 6);
    } else {
      sweep(pts, x0, x1, x1 <= 0 ? BONE : SIENNA_C, 6);
    }
  }

  // --- the device, extruded outlines set just proud of the pleats, both faces
  const R0 = 0.3, R1 = 0.27, DY = 0.12, CY = -0.1;
  const hy = (R0 * R0 - R1 * R1 + DY * DY) / (2 * DY), hx = Math.sqrt(R0 * R0 - hy * hy);
  const aH = Math.atan2(hy, hx), bH = Math.atan2(hy - DY, hx);
  const crescent = [];
  for (let i = 0; i <= 18; i++) { const a = aH - ((Math.PI + 2 * aH) * i) / 18; crescent.push([R0 * Math.cos(a), CY + R0 * Math.sin(a)]); }
  for (let i = 1; i < 16; i++) { const a = Math.PI - bH + ((Math.PI + 2 * bH) * i) / 16; crescent.push([R1 * Math.cos(a), CY + DY + R1 * Math.sin(a)]); }
  const disc = Array.from({ length: 24 }, (_, i) => [0.13 * Math.cos((i / 24) * Math.PI * 2), CY + DY + 0.13 * Math.sin((i / 24) * Math.PI * 2)]);
  const clip = (poly, keepLeft) => {
    const out = [], inside = (p) => (keepLeft ? p[0] <= 0 : p[0] >= 0);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if (inside(a)) out.push(a);
      if (inside(a) !== inside(b)) { const t = a[0] / (a[0] - b[0]); out.push([0, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  };
  const c0 = centreAt(0.3), t0 = centreAt(0.31).sub(centreAt(0.29)).normalize();
  // the tangent runs down the cloth, so tangent x X faces the viewer
  const nrm = t0.clone().cross(V(1, 0, 0)).normalize();
  const upv = V(0, 0, 0).crossVectors(nrm, V(1, 0, 0));
  for (const side of [1, -1]) {
    for (const left of [true, false]) {
      for (const outline of [crescent, disc]) {
        const geo = new THREE.ExtrudeGeometry(new THREE.Shape(v2(clip(outline, left))), { depth: 0.02, bevelEnabled: false });
        const o = add(geo, left ? SIENNA_C : BONE);
        o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 0), upv, nrm));
        o.position.copy(c0).addScaledVector(nrm, side > 0 ? 0.05 : -0.07);
      }
    }
  }

  // --- pole and finial collar as one lathe, crossbar and caps, sleeve, rope, disc
  const lathe = (pts, n, m) => add(new THREE.LatheGeometry(v2(pts), n), m);
  lathe([[0, 0.05], [0.058, 0.05], [0.049, 3.4], [0.066, 3.4], [0.06, 3.46], [0.025, 3.46], [0.025, 3.49], [0, 3.49]], 8, TIMBER);
  const lay = (o, x, y, z) => { o.rotation.z = -Math.PI / 2; o.position.set(x, y, z); return o; };
  lay(lathe([[0, -0.66], [0.036, -0.66], [0.034, 0.66], [0, 0.66]], 8, TIMBER), 0, 3.195, 0.095);
  for (const x of [-0.67, 0.67]) lay(lathe([[0, -0.03], [0.045, -0.03], [0.045, 0.03], [0, 0.03]], 10, BRONZE), x, 3.195, 0.095);
  lay(lathe([[0.048, -0.285], [0.048, 0.285]], 10, BONE), -0.285, 3.15, 0.11);
  lay(lathe([[0.048, -0.285], [0.048, 0.285]], 10, SIENNA_C), 0.285, 3.15, 0.11);
  // rope turns: a small circle lathed round the crossing
  const turn = Array.from({ length: 7 }, (_, i) => [0.075 + 0.014 * Math.cos((i / 6) * Math.PI * 2), 0.014 * Math.sin((i / 6) * Math.PI * 2)]);
  for (let i = 0; i < 3; i++) {
    const r = lathe(turn, 12, ROPE);
    r.position.set(0, 3.13 + i * 0.045, 0.045);
    r.rotation.set(0.35, 0, 0.3);
  }
  const fin = add(new THREE.ExtrudeGeometry(new THREE.Shape().absarc(0, 0, 0.1, 0, Math.PI * 2, false), { depth: 0.036, bevelEnabled: false, curveSegments: 10 }), BRONZE);
  fin.position.set(0, 3.5, -0.022);

  // --- the cairn: irregular outlines extruded with a bevel that is drawn inset
  const stone = (x, y, z, rx, ry, rz, m) => {
    const bev = Math.min(rx, ry, rz) * 0.35;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + jit(0.3), r = 1 + jit(0.2);
      return [Math.cos(a) * (rx - bev) * r, Math.sin(a) * (rz - bev) * r];
    });
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(v2(pts)), { depth: Math.max(0.02, 2 * ry - 2 * bev), bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 1 });
    geo.rotateX(-Math.PI / 2).translate(0, bev - ry, 0);
    const o = add(geo, m);
    o.position.set(x, y, z);
    o.rotation.set(jit(0.25), rnd() * 6, jit(0.25));
  };
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + jit(0.2), r = 0.36 + jit(0.05);
    stone(Math.cos(a) * r, 0.13, Math.sin(a) * r, 0.2, 0.13, 0.16, [SAND, SIENNA, SAND, SUN][i % 4]);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.5 + jit(0.2), r = 0.17 + jit(0.03);
    stone(Math.cos(a) * r, 0.34, Math.sin(a) * r, 0.16, 0.11, 0.13, [SAND, SUN, SIENNA, SAND, SUN][i]);
  }
  stone(0.03, 0.5, -0.07, 0.12, 0.08, 0.1, SIENNA);

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
