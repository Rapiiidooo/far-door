// far_gate, arm B: extruded sections.
// The ring is a stack of extruded annuli (the gaps between the face bands are the
// incised channels), the medallions are extruded discs, the dais is its stepped
// cross-section swept across the full width (a walkway stepped front and back),
// and the buttresses are tall piers whose inner face follows the ring's outer
// circle up to its widest point. Every bevel is pulled back onto the drawn
// outline (bevelOffset) so the bevels are chamfers and the sizes stay true.
// 12 x 9 x 6 m. Ring 9 m across (radii 4.5 / 3.5, 1.1 m deep), centre 4.5 m up.
export default function (THREE) {
  const g = new THREE.Group();

  // ---- materials ------------------------------------------------------------
  const stone = (color, roughness = 0.9) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = 'stone';
    return m;
  };
  const basalt = stone(0x3a3531, 0.78);
  const bone = stone(0xe6d3ae, 0.82);
  const sand = stone(0xb57f4f);
  const sunlit = stone(0xd4a373, 0.86);
  const sienna = stone(0x8a5433, 0.94);
  // Dormant crystal, one material per lit part so each lights on its own (raise
  // emissiveIntensity). Unnamed and just under opaque so the loader's procedural
  // surfaces leave it alone rather than swapping in one shared textured copy.
  const crystal = () => new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 0,
    roughness: 0.28, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  // ---- static parts are merged per material at the end ----------------------
  const buckets = new Map();
  const add = (geo, mat) => {
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(geo);
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
      if (x.attributes.uv) uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };

  // ---- extrusion helpers ----------------------------------------------------
  // A bevel grows the outline outward by bevelSize and the depth by
  // 2 x bevelThickness; bevelOffset -bev and a shorter depth undo both.
  const extrude = (shape, z0, z1, bev, curveSegments = 1) => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: z1 - z0 - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev,
      bevelOffset: -bev, bevelSegments: 1, curveSegments,
    });
    geo.translate(0, 0, z0 + bev);
    return geo;
  };
  const poly = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  // outline in the front (x, y) plane, extruded along z
  const zprism = (pts, z0, z1, bev) => extrude(poly(pts), z0, z1, bev);
  // cross-section in the side (z, y) plane, extruded along x
  const xprism = (pts, x0, x1, bev) => {
    const geo = extrude(poly(pts.map(([z, y]) => [-z, y])), x0, x1, bev);
    geo.rotateY(Math.PI / 2);                 // local (u, v, w) -> world (w, v, -u)
    return geo;
  };

  const CY = 4.5;                             // ring centre height
  const RI = 3.5, RO = 4.5, RL = 4.4, FACE = 0.5, LIP = 0.55, FLOOR_Z = 0.43;
  const disc = (r0, r1) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r1, 0, Math.PI * 2, false);
    if (r0 > 0) { const h = new THREE.Path(); h.absarc(0, 0, r0, 0, Math.PI * 2, true); s.holes.push(h); }
    return s;
  };
  const annulus = (r0, r1, z0, z1, bev) => {
    const geo = extrude(disc(r0, r1), z0, z1, bev, 64);
    geo.translate(0, CY, 0);
    return geo;
  };

  // ---- ring -----------------------------------------------------------------
  const GROOVES = [3.775, 3.985, 4.195], HW = 0.045;
  add(annulus(RI, RL, -FLOOR_Z, FLOOR_Z, 0), basalt);           // core; its faces are the channel floors
  const edges = [RI, ...GROOVES.flatMap((c) => [c - HW, c + HW]), RL];
  for (let i = 0; i < edges.length; i += 2) {
    for (const s of [-1, 1]) {
      // face bands sink 3 cm into the core so their back chamfer stays buried
      const [z0, z1] = s > 0 ? [FLOOR_Z - 0.03, FACE] : [-FACE, -FLOOR_Z + 0.03];
      add(annulus(edges[i], edges[i + 1], z0, z1, i === 0 ? 0.03 : 0.015), basalt);
    }
  }
  add(annulus(RL, RO, -LIP, LIP, 0.03), bone);                  // bone lip, 5 cm proud of each face

  const grooves = new THREE.Group();
  grooves.name = 'grooves';
  GROOVES.forEach((c, i) => {
    const r0 = c - HW + 0.004, r1 = c + HW - 0.004;
    const geo = merge([annulus(r0, r1, FLOOR_Z, FLOOR_Z + 0.03, 0), annulus(r0, r1, -FLOOR_Z - 0.03, -FLOOR_Z, 0)]);
    geo.translate(0, -CY, 0);
    const m = new THREE.Mesh(geo, crystal());
    m.name = `groove${i + 1}`;
    grooves.add(m);
  });
  grooves.position.set(0, CY, 0);
  g.add(grooves);

  // medallions: crystal plugs through the ring, flush with both faces, with a
  // low boss; 12, 4 and 8 o'clock as seen from the front
  const RM = 3.95;
  const medallion = (name, deg) => {
    const m = new THREE.Mesh(merge([extrude(disc(0, 0.45), -0.512, 0.512, 0.012, 24),
      extrude(disc(0, 0.3), -0.528, 0.528, 0.012, 16)]), crystal());
    const a = (deg * Math.PI) / 180;
    m.position.set(RM * Math.cos(a), CY + RM * Math.sin(a), 0);
    m.name = name;
    g.add(m);
    return m;
  };
  const medallionTop = medallion('medallionTop', 90);
  const medallionRight = medallion('medallionRight', -30);
  const medallionLeft = medallion('medallionLeft', 210);

  // ---- dais: 12 x 6 x 1.0 m, stepped front and back, sheer carved ends -------
  const FLOOR = 1.02;                         // 2 cm above the tangent, see far_gate_a
  add(xprism([[-3, 0], [3, 0], [3, 0.14], [2.96, 0.18], [-2.96, 0.18], [-3, 0.14]], -6, 6, 0.04), sienna);
  add(xprism([[-2.97, 0.18], [2.97, 0.18], [2.97, 0.45], [2.92, 0.5], [2.0, 0.5], [2.0, 0.74],
    [-2.0, 0.74], [-2.0, 0.5], [-2.92, 0.5], [-2.97, 0.45]], -5.97, 5.97, 0.04), sand);
  add(xprism([[-1.96, 0.74], [1.96, 0.74], [1.96, 0.8], [-1.96, 0.8]], -5.93, 5.93, 0), basalt);
  add(xprism([[-2, 0.8], [2, 0.8], [2, FLOOR - 0.05], [1.95, FLOOR], [-1.95, FLOOR], [-2, FLOOR - 0.05]], -6, 6, 0.04), sunlit);
  // two deep grooves across each sheer end face
  for (const sx of [-1, 1]) {
    for (const y of [0.3, 0.62]) add(xprism([[-2.4 + (y > 0.5 ? 0.6 : 0), y], [2.4 - (y > 0.5 ? 0.6 : 0), y],
      [2.4 - (y > 0.5 ? 0.6 : 0), y + 0.06], [-2.4 + (y > 0.5 ? 0.6 : 0), y + 0.06]], sx * 5.97 - 0.02, sx * 5.97 + 0.02, 0), sienna);
  }

  // ---- buttresses: tall piers cradling the ring's lower quarter ---------------
  const RA = 4.48;                            // bites 2 cm into the lip so no hairline shows
  const arc = (yTop, yBot, n) => {
    const a0 = Math.asin(Math.min(1, (yTop - CY) / RA)), a1 = Math.asin((yBot - CY) / RA), out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([RA * Math.cos(a), CY + RA * Math.sin(a)]); }
    return out;
  };
  const inner = (yTop, yBot, n) => (yTop > CY ? [[RA, yTop], ...arc(CY, yBot, n)] : arc(yTop, yBot, n));
  const XO = 5.8, ZB = 1.2;
  for (const sx of [-1, 1]) {
    const m = (pts) => pts.map(([x, y]) => [sx * x, y]);
    add(zprism(m([[XO, FLOOR], [XO, 1.4], ...inner(1.4, FLOOR, 4)]), -ZB, ZB, 0.04), sienna);
    add(zprism(m([[XO - 0.03, 1.4], [XO - 0.03, 3.0], ...inner(3.0, 1.4, 12)]), -ZB + 0.03, ZB - 0.03, 0.05), sand);
    add(zprism(m([[XO - 0.09, 3.0], [XO - 0.09, 3.12], ...inner(3.12, 3.0, 1)]), -ZB + 0.09, ZB - 0.09, 0), sienna);
    add(zprism(m([[XO - 0.03, 3.12], [XO - 0.03, 4.6], ...inner(4.6, 3.12, 10)]), -ZB + 0.03, ZB - 0.03, 0.05), sand);
    add(zprism(m([[XO, 4.6], [XO, 4.92], [XO - 0.08, 5.0], [RA, 5.0], [RA, 4.6]]), -ZB, ZB, 0.05), sunlit);
    add(zprism(m([[5.45, 5.0], [5.45, 5.28], [5.38, 5.35], [RA, 5.35], [RA, 5.0]]), -0.92, 0.92, 0.05), sunlit);
    add(zprism(m([[5.1, 5.35], [5.1, 5.58], [5.03, 5.65], [RA, 5.65], [RA, 5.35]]), -0.66, 0.66, 0.05), sunlit);
  }

  for (const [mat, geos] of buckets) g.add(new THREE.Mesh(merge(geos), mat));

  // ---- placement: base at y = 0, centred on x and z (measured on vertices) ---
  const box = new THREE.Box3(), v = new THREE.Vector3(), mm = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(mm.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  g.userData.parts = { grooves, medallionTop, medallionLeft, medallionRight };
  g.userData.portal = { center: [+(0 - c.x).toFixed(3), +(CY - box.min.y).toFixed(3), +(0 - c.z).toFixed(3)], radius: RI };
  return g;
}
