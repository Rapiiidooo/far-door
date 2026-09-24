// stamp_plate, arm A: primitives.
// Stacked open cylinders and cones make the two chamfered tiers of the night-basalt
// edge, flat rings their ledges, and a disc the field floor 3 cm below the deck.
// The chalk rim is the same kit (walls, chamfer cones, a ring for its top); the
// inward-facing walls are cylinders turned inside out. Each tick is two boxes: a
// stamp-ochre bar across the rim that clips down over its outer wall, standing
// 12 mm proud so it catches the light. The inlay is a flattened six-sided torus
// half sunk in the deck, a glass bead ring of dormant crystal, its own mesh.
// 1.8 m across, 0.14 m tall; the field is 1.3 m across with its floor 0.07 m up.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials --------------------------------------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const NIGHT = M(0x2a2830, 'stone', 0.88);
  const CHALK = M(0xc9c2d8, 'plaster', 0.8);
  const OCHRE = M(0xd9a441, 'plaster', 0.72);
  // Dormant crystal with its own material, so the game can light it by raising
  // emissiveIntensity. Unnamed and just under opaque so the loader's procedural
  // surfaces leave it alone.
  const CRYSTAL = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 0,
    roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  // ---- merging: one mesh per material ---------------------------------------------
  // The loader's surfaces stretch u by a mesh's width and v by its height, and on
  // a plate 0.14 m tall the height clamps. So every face is projected at one scale
  // (metres over the widest side), which keeps the stone within 2:1 when textured.
  const planarUv = (pos, n) => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const s = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;
    const uv = new Float32Array(n * 2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      a.fromArray(pos, t * 3); b.fromArray(pos, t * 3 + 3); c.fromArray(pos, t * 3 + 6);
      const f = b.sub(a).cross(c.sub(a));
      const ax = Math.abs(f.x), ay = Math.abs(f.y), az = Math.abs(f.z);
      for (let k = t; k < t + 3; k++) {
        const x = pos[k * 3] - lo[0], y = pos[k * 3 + 1] - lo[1], z = pos[k * 3 + 2] - lo[2];
        const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
        uv[k * 2] = u / s; uv[k * 2 + 1] = v / s;
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
    out.setAttribute('uv', planarUv(pos, n));
    return out;
  };
  const PARTS = new Map();
  const put = (mat, geo) => { if (!PARTS.has(mat)) PARTS.set(mat, []); PARTS.get(mat).push(geo); return geo; };

  // ---- primitives -------------------------------------------------------------------
  const SEG = 64;
  // turn a primitive inside out: reversed winding, reversed normals
  const inward = (geo) => {
    const idx = geo.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    const nr = geo.attributes.normal;
    for (let k = 0; k < nr.count; k++) nr.setXYZ(k, -nr.getX(k), -nr.getY(k), -nr.getZ(k));
    return geo;
  };
  // an open wall or cone between two heights; inside = faces towards the axis
  const wall = (mat, rBot, rTop, y0, y1, inside = false) => {
    const geo = new THREE.CylinderGeometry(rTop, rBot, y1 - y0, SEG, 1, true);
    put(mat, (inside ? inward(geo) : geo).translate(0, (y0 + y1) / 2, 0));
  };
  // a flat ring or disc facing up (or down)
  const ring = (mat, r0, r1, y, up = true) => {
    const geo = r0 > 0 ? new THREE.RingGeometry(r0, r1, SEG, 1) : new THREE.CircleGeometry(r1, SEG);
    geo.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
    put(mat, geo.translate(0, y, 0));
  };

  // ---- layout ------------------------------------------------------------------------
  const R = 0.9, DECK = 0.1, FIELD_R = 0.65, FIELD_Y = 0.07;
  const RIM_O = 0.82, RIM_I = 0.7, RIM_T = 0.128, CH = 0.015;  // rim 0.12 m wide
  const TICK_T = 0.14;                                          // ticks stand 12 mm proud

  // basalt: lower tier, upper tier, the deck inside the rim, the recess and field
  wall(NIGHT, R, R, 0, 0.034);
  wall(NIGHT, R, R - 0.016, 0.034, 0.05);
  ring(NIGHT, 0.858, R - 0.016, 0.05);
  wall(NIGHT, 0.858, 0.858, 0.05, 0.086);
  wall(NIGHT, 0.858, 0.844, 0.086, DECK);
  ring(NIGHT, RIM_O - 0.002, 0.844, DECK);
  ring(NIGHT, FIELD_R, RIM_I + 0.002, DECK);
  wall(NIGHT, FIELD_R, FIELD_R, FIELD_Y, DECK, true);
  ring(NIGHT, 0, FIELD_R + 0.001, FIELD_Y);
  ring(NIGHT, 0, R, 0, false);

  // chalk rim: outer wall, chamfer, top, chamfer, inner wall
  wall(CHALK, RIM_O, RIM_O, DECK, RIM_T - CH);
  wall(CHALK, RIM_O, RIM_O - CH, RIM_T - CH, RIM_T);
  ring(CHALK, RIM_I + CH, RIM_O - CH, RIM_T);
  wall(CHALK, RIM_I, RIM_I + CH, RIM_T - CH, RIM_T, true);
  wall(CHALK, RIM_I, RIM_I, DECK, RIM_T - CH, true);

  // eight ticks: a bar across the rim and a clip down its outer wall, one on +Z
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const bar = new THREE.BoxGeometry(0.075, TICK_T - RIM_T, RIM_O + 0.014 - RIM_I);
    bar.translate(0, (RIM_T + TICK_T) / 2, (RIM_O + 0.014 + RIM_I) / 2);
    const clip = new THREE.BoxGeometry(0.075, RIM_T - DECK, 0.014);
    clip.translate(0, (DECK + RIM_T) / 2, RIM_O + 0.007);
    for (const geo of [bar, clip]) put(OCHRE, geo.rotateY(a));
  }

  // the inlay: a six-sided torus, flattened, its lower half below the deck
  const bead = new THREE.TorusGeometry(0.6775, 0.0175, 6, 48);
  bead.rotateX(-Math.PI / 2);
  bead.scale(1, 0.55, 1);
  const inlay = new THREE.Mesh(merge([bead]), CRYSTAL);
  inlay.name = 'inlay';
  inlay.position.y = DECK - 0.002;
  g.add(inlay);

  for (const [mat, geos] of PARTS) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---------
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

  const at = (x, y, z) => [+(x - c.x).toFixed(3), +(y - box.min.y).toFixed(3), +(z - c.z).toFixed(3)];
  g.userData.parts = { inlay };
  g.userData.field = { center: at(0, FIELD_Y, 0), size: 2 * FIELD_R };   // top of the field floor, faces +Y
  return g;
}
