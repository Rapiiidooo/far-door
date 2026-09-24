/**
 * sun_disc, candidate B: turned and extruded profiles.
 *
 * A discus, not a dish: the body is one stepped profile turned round Y, one
 * lathe per segment so every step stays crisp, falling from a thick bezelled
 * hub through a basalt-inlaid tier and a bronze tier to the blade. The blade
 * is an extruded outline with twelve shallow V notches, its thickness then
 * tapered to a 6 mm edge; the rays are extruded fins whose crests slope down
 * across the tiers; the lens is a turned double dome; the grip strap under
 * the disc is an extruded sagging band with two rivets.
 *
 * Lies flat, faces up and down, 0.45 m across and 0.06 m thick at the hub;
 * the strap hangs a few millimetres below it, so the base (y = 0) is the strap.
 */
export default function (THREE) {
  const g = new THREE.Group();
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---- palette (far-door/docs/style-lock.md) ---------------------------------
  const M = (color, name, roughness, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = name;
    return m;
  };
  const bronze = M(0x9a6a35, 'metal', 0.42, 0.7);
  const basalt = M(0x3a3531, 'stone', 0.7);
  const leather = M(0x4b2e1e, 'fabric', 0.68);
  // Unnamed and just under opaque so the surface pass leaves it alone; the game
  // flares or dims it through emissiveIntensity.
  const glow = new THREE.MeshStandardMaterial({
    color: 0x1d5f63, emissive: 0x39e3d0, emissiveIntensity: 1.1,
    roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.94,
  });

  // ---- helpers ------------------------------------------------------------------
  const parts = new Map();
  const add = (geo, mat) => {
    const flat = geo.index ? geo.toNonIndexed() : geo;
    if (flat.attributes.uv) flat.deleteAttribute('uv');
    if (!parts.has(mat)) parts.set(mat, []);
    parts.get(mat).push(flat);
  };
  const concat = (geos) => {
    let n = 0;
    for (const q of geos) n += q.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const q of geos) {
      pos.set(q.attributes.position.array, o * 3);
      nor.set(q.attributes.normal.array, o * 3);
      o += q.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return out;
  };
  // [r, y] traced counter-clockwise round the cross-section, so the solid lies to
  // the left and LatheGeometry's normals face out. LatheGeometry leaves its last
  // normal unnormalised, so fix them all.
  const turn = (pts, segs) => {
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
    const nr = geo.attributes.normal, v = V3();
    for (let k = 0; k < nr.count; k++) { v.fromBufferAttribute(nr, k).normalize(); nr.setXYZ(k, v.x, v.y, v.z); }
    return geo;
  };
  const shape = (pts, holes = []) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    return s;
  };
  // mirror a flat-shaded geometry through y = 0 and turn its triangles back outwards
  const mirrorY = (geo) => {
    geo.scale(1, -1, 1);
    const p = geo.attributes.position, nrm = geo.attributes.normal;
    for (let t = 0; t < p.count; t += 3) {
      for (const at of [p, nrm]) {
        const x = at.getX(t + 1), y = at.getY(t + 1), z = at.getZ(t + 1);
        at.setXYZ(t + 1, at.getX(t + 2), at.getY(t + 2), at.getZ(t + 2));
        at.setXYZ(t + 2, x, y, z);
      }
    }
    return geo;
  };

  // ---- body: hub, basalt tier, bronze tier, one stepped profile ---------------
  const SEG = 32;
  const BODY = [[0.058, -0.024], [0.066, -0.03], [0.078, -0.03], [0.085, -0.024], [0.085, -0.021], [0.138, -0.021], [0.138, -0.014],
    [0.182, -0.014], [0.182, 0.014], [0.138, 0.014], [0.138, 0.021], [0.085, 0.021], [0.085, 0.024], [0.078, 0.03], [0.066, 0.03],
    [0.058, 0.024], [0.058, -0.024]];
  for (let i = 0; i < BODY.length - 1; i++) {
    const [a, b] = [BODY[i], BODY[i + 1]];
    add(turn([a, b], SEG), Math.abs(a[1]) === 0.021 && a[1] === b[1] ? basalt : bronze);
  }

  // ---- blade: twelve shallow V notches, thinned towards a 6 mm edge -----------
  {
    const out = [];
    for (let k = 0; k < 12; k++) {
      const s = (k * Math.PI) / 6, d = Math.PI / 180;
      out.push([0.207, s], [0.225, s + 4 * d], [0.225, s + 10 * d], [0.225, s + 15 * d], [0.225, s + 20 * d], [0.225, s + 26 * d]);
    }
    const hole = Array.from({ length: 36 }, (_, i) => [0.176, (-i * Math.PI * 2) / 36]);
    const xy = ([r, a]) => [r * Math.cos(a), r * Math.sin(a)];
    const geo = new THREE.ExtrudeGeometry(shape(out.map(xy), [hole.map(xy)]), { depth: 0.016, bevelEnabled: false });
    geo.translate(0, 0, -0.008).rotateX(Math.PI / 2);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const r = Math.hypot(p.getX(k), p.getZ(k)), t = Math.min(1, Math.max(0, (r - 0.182) / 0.043));
      p.setY(k, p.getY(k) * (1 - 0.625 * t));
    }
    geo.computeVertexNormals();
    add(geo, bronze);
  }

  // ---- rays: a fin over every tooth on each face, its crest falling outwards ---
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6 + Math.PI / 12;
    for (const up of [1, -1]) {
      const geo = new THREE.ExtrudeGeometry(shape([[0.083, 0.012], [0.184, 0.012], [0.184, 0.02], [0.083, 0.031]]), {
        depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.0025, bevelOffset: -0.0025, bevelSegments: 1,
      });
      geo.translate(0, 0, -0.003);
      geo.computeVertexNormals();
      if (up < 0) mirrorY(geo);
      geo.rotateY(-a);
      add(geo, bronze);
    }
  }

  // ---- lens: a turned double dome set through the centre ----------------------
  const lensGeo = turn([[0, -0.025], [0.03, -0.022], [0.048, -0.016], [0.058, -0.008], [0.058, 0.008], [0.048, 0.016], [0.03, 0.022], [0, 0.025]], 20);

  // ---- grip strap: a sagging leather band across the underside, riveted --------
  {
    const Z = -0.1, W = 0.04, T = 0.007;
    const mid = [[-0.118, -0.012], [-0.104, -0.02], [-0.07, -0.026], [0, -0.028], [0.07, -0.026], [0.104, -0.02], [0.118, -0.012]];
    const top = mid.map(([x, y]) => [x, y + T / 2]), bot = mid.map(([x, y]) => [x, y - T / 2]).reverse();
    const geo = new THREE.ExtrudeGeometry(shape([...top, ...bot]), { depth: W, bevelEnabled: false });
    geo.computeVertexNormals();
    geo.translate(0, 0, Z - W / 2);
    add(geo, leather);
    for (const x of [-0.11, 0.11]) {
      const rivet = turn([[0, -0.022], [0.009, -0.022], [0.011, -0.019], [0.008, -0.014], [0, -0.014]], 10);
      rivet.translate(x, 0, Z);
      add(rivet, bronze);
    }
  }

  // ---- merge per material, lens kept apart ------------------------------------
  const boxUV = (geo) => {
    geo.computeBoundingBox();
    const bb = geo.boundingBox, sz = bb.getSize(V3());
    const H = Math.max(sz.x, sz.z, 1e-6), VY = Math.max(sz.y, 1e-6);
    const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let t = 0; t < p.count; t += 3) {
      let ax = 0, ay = 0, az = 0;
      for (let k = 0; k < 3; k++) { ax += Math.abs(n.getX(t + k)); ay += Math.abs(n.getY(t + k)); az += Math.abs(n.getZ(t + k)); }
      for (let k = t; k < t + 3; k++) {
        const x = p.getX(k) - bb.min.x, y = p.getY(k) - bb.min.y, z = p.getZ(k) - bb.min.z;
        const [u, v] = ay >= ax && ay >= az ? [x / H, z / VY] : ax >= az ? [z / H, y / VY] : [x / H, y / VY];
        uv[k * 2] = u; uv[k * 2 + 1] = v;
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  };
  for (const [mat, geos] of parts) g.add(new THREE.Mesh(boxUV(concat(geos)), mat));
  const lens = new THREE.Mesh(boxUV(lensGeo.toNonIndexed()), glow);
  lens.name = 'lens';
  g.add(lens);

  // ---- placement: base at y = 0, centred on x and z, measured on vertices -----
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position;
    if (!p) return;
    const put = (mat) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat)); };
    if (n.isInstancedMesh) {
      for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); }
      return;
    }
    put(n.matrixWorld);
  });
  const ctr = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= ctr.x; o.position.y -= box.min.y; o.position.z -= ctr.z; });

  g.userData.parts = { lens };
  return g;
}
