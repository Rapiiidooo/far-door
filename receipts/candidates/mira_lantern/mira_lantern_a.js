// mira_lantern, arm A: assembled from primitives.
// A round stepped foot of three cylinders; a square body of four box posts and
// two rings of box rails, flush outside, with four thin box panes set 9 mm behind
// them; a cylinder dish with a torus lip, a cylinder candle stub with a wax drip,
// and a wick. A round collar covers the body's corners and carries the roof: two
// open frustums with a band of twelve gores between them, whose gaps are the
// piercings, over a soot cone; a chimney, a cone hat and a knob. The wire bail is
// two cylinder legs from bosses on the collar and a half torus over the top.
// The flame is a hemisphere under a cone, its own mesh, origin at the wick.
// About 0.24 x 0.45 x 0.22 m.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials ------------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const BRONZE = M(0x9a6a35, 'metal', 0.5, 0.6);
  // soot on the inside of the roof, seen through its piercings, and the wick
  const SOOT = M(0x4b2e1e, 'metal', 0.9);
  const WAX = M(0xe6d3ae, 'plaster', 0.75);
  // Translucent so the candle and flame show through. Unnamed and under 0.95
  // opacity so the loader's surfaces leave them flat; no depth write, so a pane
  // drawn first never cuts the flame out.
  const PANE = new THREE.MeshStandardMaterial({
    color: 0xe6d3ae, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false,
  });
  // Lantern amber is emission only: a black base so the sun adds nothing and the
  // flame shows its own colour from every side. Its own material so the game can
  // light, dim or hide it; unnamed and just under opaque so surfaces skip it.
  const FLAME = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: 0xffb24a, emissiveIntensity: 1.2,
    roughness: 1, metalness: 0, transparent: true, opacity: 0.94,
  });

  // ---- helpers ----------------------------------------------------------------------
  const buckets = new Map();
  const put = (mat, geo) => { if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(geo); return geo; };
  // rotations are baked into the geometry, so every mesh keeps an identity rotation
  // and the loader's box re-origin measures exactly what the verifier does
  const at = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    if (rx || ry || rz) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)));
    return geo.translate(x, y, z);
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

  // ---- the round foot: wide enough at the top for the body's corners (0.102) -------------
  put(BRONZE, at(new THREE.CylinderGeometry(0.113, 0.113, 0.009, 28), 0, 0.0045));      // band, 0 .. 0.009
  put(BRONZE, at(new THREE.CylinderGeometry(0.105, 0.109, 0.025, 28), 0, 0.0215));      // skirt, .. 0.034
  put(BRONZE, at(new THREE.TorusGeometry(0.105, 0.0035, 4, 28), 0, 0.034, 0, Math.PI / 2));  // rolled rim

  // ---- the body: posts, rails and panes -----------------------------------------------
  const HW = 0.072;                  // half width at the posts' outer faces
  const Y0 = 0.034, Y1 = 0.232;      // body bottom and top
  const PS = 0.014;                  // post section
  const RH = 0.018, RT = 0.008;      // rail height and thickness
  const SPAN = 2 * (HW - PS);        // clear width between posts, 0.116
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) put(BRONZE, at(new THREE.BoxGeometry(PS, Y1 - Y0, PS), sx * (HW - PS / 2), (Y0 + Y1) / 2, sz * (HW - PS / 2)));
  }
  for (const y of [Y0 + RH / 2, Y1 - RH / 2]) {
    for (const s of [-1, 1]) {
      put(BRONZE, at(new THREE.BoxGeometry(SPAN, RH, RT), 0, y, s * (HW - RT / 2)));
      put(BRONZE, at(new THREE.BoxGeometry(RT, RH, SPAN), s * (HW - RT / 2), y, 0));
    }
  }
  // panes just behind the rails, their edges buried in the posts
  const PT = 0.004, PD = HW - RT - 0.001 - PT / 2;   // pane centre plane, 0.061
  const PW = SPAN + 0.002, PH = Y1 - Y0 - 2 * RH + 0.012;
  for (const s of [-1, 1]) {
    put(PANE, at(new THREE.BoxGeometry(PW, PH, PT), 0, (Y0 + Y1) / 2, s * PD));
    put(PANE, at(new THREE.BoxGeometry(PT, PH, PW), s * PD, (Y0 + Y1) / 2, 0));
  }

  // ---- inside: dish, candle stub, wick ---------------------------------------------------
  put(BRONZE, at(new THREE.CylinderGeometry(0.034, 0.029, 0.007, 16), 0, Y0 + 0.0035));
  put(BRONZE, at(new THREE.TorusGeometry(0.033, 0.0028, 4, 16), 0, Y0 + 0.007, 0, Math.PI / 2));
  const CY0 = Y0 + 0.007, CY1 = CY0 + 0.05;                                             // 0.041 .. 0.091
  put(WAX, at(new THREE.CylinderGeometry(0.0158, 0.0166, CY1 - CY0, 12), 0, (CY0 + CY1) / 2));
  put(WAX, at(new THREE.SphereGeometry(0.0055, 6, 4).scale(1, 2.2, 0.8), 0.0148, CY1 - 0.017, 0.004));   // a drip
  put(WAX, at(new THREE.SphereGeometry(0.009, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 1), 0.021, CY0, -0.005));
  put(SOOT, at(new THREE.CylinderGeometry(0.0016, 0.0018, 0.011, 4), 0, CY1 + 0.004));

  // ---- the flame: its own mesh, origin at its root on the wick ---------------------------
  const FR = 0.0105, FH = 0.032;     // bulb radius, and the tip's height above the bulb's centre
  const flame = new THREE.Mesh(merge([
    new THREE.SphereGeometry(FR, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, FR, 0),
    new THREE.ConeGeometry(FR, FH, 10, 1, true).translate(0, FR + FH / 2, 0),
  ]), FLAME);
  flame.name = 'flame';
  flame.position.set(0, CY1 + 0.002, 0);
  g.add(flame);

  // ---- collar and pierced roof -------------------------------------------------------------
  put(BRONZE, at(new THREE.CylinderGeometry(0.104, 0.107, 0.012, 28), 0, Y1 + 0.006));   // covers the corners
  const RY = Y1 + 0.012;                                                                  // roof foot, 0.244
  put(BRONZE, at(new THREE.CylinderGeometry(0.076, 0.1, 0.024, 28, 1, true), 0, RY + 0.012));
  const GORES = 12, GW = ((Math.PI * 2) / GORES) * 0.6;                                     // 40% of the band is open
  for (let k = 0; k < GORES; k++) {
    put(BRONZE, at(new THREE.CylinderGeometry(0.046, 0.076, 0.03, 2, 1, true, (k * Math.PI * 2) / GORES - GW / 2, GW), 0, RY + 0.039));
  }
  put(BRONZE, at(new THREE.CylinderGeometry(0.022, 0.046, 0.024, 20, 1, true), 0, RY + 0.066));
  put(SOOT, at(new THREE.ConeGeometry(0.094, 0.094, 24, 1), 0, RY + 0.047));              // soot behind the gaps
  put(BRONZE, at(new THREE.CylinderGeometry(0.017, 0.02, 0.018, 12), 0, RY + 0.087));      // chimney, 0.322 .. 0.34
  put(BRONZE, at(new THREE.CylinderGeometry(0.006, 0.03, 0.014, 12), 0, RY + 0.103));      // hat
  put(BRONZE, at(new THREE.SphereGeometry(0.007, 8, 5), 0, RY + 0.113));

  // ---- the wire bail, raised: legs from two bosses, a half torus over the top ---------------
  const BX = 0.116, BR = 0.005, BY0 = Y1 + 0.006, BY1 = 0.445 - BX;
  for (const s of [-1, 1]) {
    put(BRONZE, at(new THREE.CylinderGeometry(0.0075, 0.0075, 0.016, 8), s * 0.11, BY0, 0, 0, 0, Math.PI / 2));
    put(BRONZE, at(new THREE.CylinderGeometry(BR, BR, BY1 - BY0, 6, 1, true), s * BX, (BY0 + BY1) / 2));
  }
  put(BRONZE, at(new THREE.TorusGeometry(BX, BR, 6, 22, Math.PI), 0, BY1));

  for (const [mat, geos] of buckets) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const add = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); add(m.multiplyMatrices(n.matrixWorld, im)); } return; }
    add(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  // the flame's centre, where a point light belongs, measured after the shift
  const r3 = (x) => Math.round(x * 1000) / 1000;
  g.userData.parts = { flame };
  g.userData.light = [r3(flame.position.x), r3(flame.position.y + 0.016), r3(flame.position.z)];
  return g;
}
