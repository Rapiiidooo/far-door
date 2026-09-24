// far_gate, arm C: assembled from primitives, read as masonry.
// The ring is concentric TorusGeometry bands whose tube vertices are moved onto
// rectangular or chamfered sections; the gaps between bands are the incised
// channels. The bone lip is a pair of rolled tori over a bone rim band. The
// medallions are cylinder plugs. The dais is stacked boxes with stepped edges,
// and each buttress is a stack of masonry courses stepping up the ring, every
// course's inner top corner resting on the ring's outer circle.
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
  const boxAt = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return b; };

  const CY = 4.5;                             // ring centre height
  const RI = 3.5, RO = 4.5, RL = 4.4, FACE = 0.5, FLOOR_Z = 0.43;

  // A TorusGeometry reshaped to the section [r0, r1] x [z0, z1]: each ring of
  // tube vertices moves onto one corner of a rectangle (4 tube segments) or of a
  // chamfered rectangle (8 segments; chIn toward the opening, chOut toward the
  // rim). The corners keep the tube's counter-clockwise order, so faces stay
  // outward. De-indexed for flat shading across the crisp corners.
  const band = (r0, r1, z0, z1, chIn = 0, chOut = 0, seg = 128) => {
    const eight = chIn > 0 || chOut > 0, rs = eight ? 8 : 4;
    const R = (r0 + r1) / 2, hw = (r1 - r0) / 2, zc = (z0 + z1) / 2, hd = (z1 - z0) / 2;
    const corners = eight
      ? [[hw, hd - chOut], [hw - chOut, hd], [-hw + chIn, hd], [-hw, hd - chIn],
        [-hw, -hd + chIn], [-hw + chIn, -hd], [hw - chOut, -hd], [hw, -hd + chOut]]
      : [[hw, hd], [-hw, hd], [-hw, -hd], [hw, -hd]];
    const geo = new THREE.TorusGeometry(R, 1, rs, seg);
    const p = geo.attributes.position;
    for (let j = 0; j <= rs; j++) {
      const [rho, zeta] = corners[j % rs];
      for (let i = 0; i <= seg; i++) {
        const u = (i / seg) * Math.PI * 2;
        p.setXYZ(j * (seg + 1) + i, (R + rho) * Math.cos(u), CY + (R + rho) * Math.sin(u), zc + zeta);
      }
    }
    const out = geo.toNonIndexed();
    out.computeVertexNormals();
    return out;
  };

  // ---- ring -----------------------------------------------------------------
  const GROOVES = [3.775, 3.985, 4.195], HW = 0.045;
  add(band(RI + 0.02, RL, -FLOOR_Z, FLOOR_Z), basalt);            // core; its faces are the channel floors
  const edges = [RI, ...GROOVES.flatMap((c) => [c - HW, c + HW]), RL];
  for (let i = 0; i < edges.length; i += 2) {
    add(band(edges[i], edges[i + 1], -FACE, FACE, i === 0 ? 0.06 : 0.012, 0.012), basalt);
  }
  // rolled bone lip: a rim band round the outside and a round roll on each face
  add(band(RL, RO, -0.47, 0.47), bone);
  for (const s of [-1, 1]) {
    const roll = new THREE.TorusGeometry(RO - 0.05, 0.05, 10, 128);
    roll.translate(0, CY, s * FACE);
    add(roll, bone);
  }

  const grooves = new THREE.Group();
  grooves.name = 'grooves';
  GROOVES.forEach((c, i) => {
    const r0 = c - HW + 0.004, r1 = c + HW - 0.004;
    const geo = merge([band(r0, r1, FLOOR_Z, FLOOR_Z + 0.03), band(r0, r1, -FLOOR_Z - 0.03, -FLOOR_Z)]);
    geo.translate(0, -CY, 0);
    const m = new THREE.Mesh(geo, crystal());
    m.name = `groove${i + 1}`;
    grooves.add(m);
  });
  grooves.position.set(0, CY, 0);
  g.add(grooves);

  // medallions: crystal cylinder plugs through the ring, flush with both faces,
  // with a low boss; 12, 4 and 8 o'clock as seen from the front
  const RM = 3.95;
  const medallion = (name, deg) => {
    const plug = new THREE.CylinderGeometry(0.45, 0.45, 1.024, 48);
    const boss = new THREE.CylinderGeometry(0.3, 0.3, 1.056, 40);
    plug.rotateX(Math.PI / 2);
    boss.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(merge([plug, boss]), crystal());
    const a = (deg * Math.PI) / 180;
    m.position.set(RM * Math.cos(a), CY + RM * Math.sin(a), 0);
    m.name = name;
    g.add(m);
    return m;
  };
  const medallionTop = medallion('medallionTop', 90);
  const medallionRight = medallion('medallionRight', -30);
  const medallionLeft = medallion('medallionLeft', 210);

  // ---- dais: 12 x 6 x 1.0 m, two tiers stepped on all four sides -------------
  const FLOOR = 1.02;                         // 2 cm above the tangent, see far_gate_a
  add(boxAt(12, 0.16, 6, 0, 0.08, 0), sienna);
  add(boxAt(11.9, 0.3, 5.9, 0, 0.31, 0), sand);
  add(boxAt(11.8, 0.04, 5.8, 0, 0.48, 0), sand);
  add(boxAt(10.6, 0.26, 3.9, 0, 0.63, 0), sand);
  add(boxAt(10.52, 0.06, 3.82, 0, 0.79, 0), basalt);
  add(boxAt(10.6, 0.16, 3.9, 0, 0.9, 0), sunlit);
  add(boxAt(10.5, FLOOR - 0.98, 3.8, 0, (0.98 + FLOOR) / 2, 0), sunlit);

  // ---- buttresses: masonry courses stepping up the ring ----------------------
  const RA = 4.48;
  const arcX = (y) => Math.sqrt(RA * RA - (CY - y) * (CY - y));
  const H = 0.34;
  for (let k = 0; k < 8; k++) {
    const yb = FLOOR + k * H, yt = yb + H, xi = arcX(yt);
    const xo = (k < 4 ? 5.3 : k < 6 ? 5.0 : 4.75) - (k % 2) * 0.02;   // alternate faces show the joints
    const zo = (k < 4 ? 1.25 : k < 6 ? 1.0 : 0.75) - (k % 2) * 0.02;
    const mat = k === 0 ? sienna : k < 6 ? sand : sunlit;
    for (const sx of [-1, 1]) add(boxAt(xo - xi, H, 2 * zo, sx * (xi + xo) / 2, (yb + yt) / 2, 0), mat);
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
