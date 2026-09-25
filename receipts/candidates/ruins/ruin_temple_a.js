// ruin_temple, candidate A: primitives, vertex edits.
// The domed temple at the heart of the drowned city, now ruined: the same
// round island of three chipped steps; a ring of sixteen columns, half of
// them broken off at different jagged heights, with fallen drums on the
// steps; the round sanctum with a wide breach on its front where its wall
// collapsed, rubble spilling from the gap; the copper dome broken open in a
// wide jagged gash showing its hollow inside; the lantern fallen and cracked
// on the steps; and one crystal still glowing on a plinth inside the
// sanctum, seen through the breach. Coral crusts patch the lower courses.
// The crystal is userData.parts.glow.
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
  const glow = new THREE.Group();
  g.add(glow);
  g.userData.parts = { glow };
  const put = (geo, m, x, y, z, parent = g) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rnd = rng(5150);

  const STONE = mat(0xcfc6b4, 0.85, 'stone', { flatShading: true });
  const ALGAE = mat(0x8f9a86, 0.9, 'stone', { flatShading: true });
  const COPPER = mat(0x5e9e8e, 0.55, 'metal', { flatShading: true });
  const CRYSTAL = mat(0xa8f8ff, 0.25, 'glass', { emissive: 0x52eeff, emissiveIntensity: 2.6 });
  const CORAL_A = mat(0xff7a8a, 0.7, 'coral', { flatShading: true });
  const CORAL_B = mat(0xf59a55, 0.7, 'coral', { flatShading: true });

  // A smooth deterministic 0..spread noise around a full circle, keyed by
  // the (x,z) angle so any two vertices that share a direction agree.
  const angJag = (seed, n, spread) => {
    const r = rng(seed);
    const c = Array.from({ length: n }, () => r());
    return (x, z) => {
      let a = Math.atan2(x, z);
      if (a < 0) a += Math.PI * 2;
      const f = (a / (Math.PI * 2)) * n;
      const i0 = Math.floor(f) % n, i1 = (i0 + 1) % n, fr = f - Math.floor(f);
      return (c[i0] * (1 - fr) + c[i1] * fr) * spread;
    };
  };
  // Move the topmost ring of a geometry (built centred at y=0) down by
  // fn(x,z); works for a closed cylinder because the cap's rim shares (x,z)
  // with the wall's top ring and both move together.
  const breakTop = (geo, fn) => {
    geo.computeBoundingBox();
    const maxY = geo.boundingBox.max.y;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > maxY - 1e-3) pos.setY(i, maxY - fn(x, z));
    }
    pos.needsUpdate = true;
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  };
  const orient = (mesh, dir) => {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  };
  const coral = (x, y, z, n, spread = 0.4) => {
    for (let i = 0; i < n; i++) {
      const r = 0.14 + rnd() * 0.16;
      const o = put(new THREE.IcosahedronGeometry(r, 0), i % 2 ? CORAL_A : CORAL_B,
        x + (rnd() - 0.5) * spread, y + (rnd() - 0.5) * spread * 0.4, z + (rnd() - 0.5) * spread);
      o.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    }
  };

  // ---- the island of three steps, chipped at the edges -------------------
  for (const [r, h, m] of [[24, 3, ALGAE], [20, 6, ALGAE], [16, 9, STONE]]) {
    const geo = new THREE.CylinderGeometry(r, r + 0.8, h, 64);
    const chip = angJag(r * 7 + 3, 24, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > h / 2 - 0.35) {
        const bite = Math.max(0, chip(x, z) - 0.55) * 1.6;
        const s = 1 - bite / r;
        pos.setX(i, x * s); pos.setZ(i, z * s);
      }
    }
    pos.needsUpdate = true;
    put(geo, m, 0, h / 2, 0);
  }

  // ---- the ring of sixteen columns, half broken at jagged heights --------
  const colState = [];
  for (let i = 0; i < 16; i++) {
    const broken = i % 2 === 1;
    const h = broken ? 2.6 + rnd() * 4.4 : 10.7 + rnd() * 0.5;
    colState.push({ broken, h });
  }
  colState.forEach(({ broken, h }, i) => {
    const a = (i / 16) * Math.PI * 2;
    const geo = new THREE.CylinderGeometry(0.78, 0.95, h, 12, 1, false);
    const j = angJag(900 + i, 6, broken ? 1.1 : 0.28);
    breakTop(geo, (x, z) => h / 2 - Math.max(0, j(x, z) - 0.25 * (broken ? 1.1 : 0.28)));
    const x = Math.sin(a) * 13, z = Math.cos(a) * 13;
    const o = put(geo, STONE, x, 9 + h / 2, z);
    if (broken && rnd() < 0.45) {
      o.rotation.x = (rnd() - 0.5) * 0.09;
      o.rotation.z = (rnd() - 0.5) * 0.09;
    }
  });
  // a few fallen drums scattered on the steps
  const stepDrums = [
    [14.5, 4.4, 1.8, 0.55, 0.55, 0.08],
    [-17.5, 8.5, 1.6, 0.5, -1.2, -0.05],
    [11.2, -12.5, 2.0, 0.6, 2.4, 0.06],
    [-9.8, -15.6, 1.7, 0.55, -2.0, -0.07],
    [21.5, 3.0, 1.5, 0.5, 1.0, 0.05],
    [-22.0, -3.5, 1.6, 0.52, -0.6, -0.06],
  ];
  const groundYAt = (x, z) => {
    const r = Math.hypot(x, z);
    return r < 16 ? 9 : r < 20 ? 6 : r < 24 ? 3 : 0;
  };
  for (const [x, z, len, rr, a, tilt] of stepDrums) {
    const geo = new THREE.CylinderGeometry(rr, rr * 1.05, len, 12);
    const o = put(geo, STONE, x, groundYAt(x, z) + rr, z);
    orient(o, new THREE.Vector3(Math.sin(a), tilt, Math.cos(a)));
  }

  // ---- the round sanctum, a wide breach on the front (+Z) -----------------
  const SANC_R = 8.5, SANC_H = 11, SANC_Y0 = 9;
  const GAP = 1.5; // radians, centred on +Z (theta = 0)
  const sancGeo = new THREE.CylinderGeometry(SANC_R, SANC_R, SANC_H, 40, 1, true, GAP / 2, Math.PI * 2 - GAP);
  const sJag = angJag(4242, 24, 1.3);
  breakTop(sancGeo, (x, z) => SANC_H / 2 - Math.max(0, sJag(x, z) - 0.35));
  put(sancGeo, STONE, 0, SANC_Y0 + SANC_H / 2, 0);
  // small broken-wall shards clinging to the two cut edges, so the breach
  // reads as torn rather than sawn (a thin shell looks like a flat fin if
  // its own edge is deformed, so the roughness is added as separate chips)
  for (let i = 0; i < 7; i++) {
    const edge = i % 2 ? GAP / 2 : -GAP / 2;
    const a = edge + (rnd() - 0.5) * 0.3;
    const y = SANC_Y0 + 1 + rnd() * (SANC_H - 2.5);
    const s = 0.35 + rnd() * 0.4;
    const f = put(new THREE.BoxGeometry(s, s * (0.8 + rnd() * 0.6), s * 0.4),
      i % 2 ? STONE : ALGAE, Math.sin(a) * SANC_R, y, Math.cos(a) * SANC_R);
    f.rotation.y = a;
    f.rotation.x = (rnd() - 0.5) * 0.5;
  }
  // rubble spilling from the breach, onto the top step platform
  for (let i = 0; i < 9; i++) {
    const t = (i / 8 - 0.5) * GAP * 1.7;
    const rr = SANC_R + 0.6 + rnd() * 2.6;
    const x = Math.sin(t) * rr, z = Math.cos(t) * rr;
    const s = 0.5 + rnd() * 0.7;
    const b = put(new THREE.BoxGeometry(s, s * (0.6 + rnd() * 0.5), s * (0.8 + rnd() * 0.4)),
      i % 3 ? STONE : ALGAE, x, 9 + s * 0.35, z);
    b.rotation.set(rnd() * 0.6 - 0.3, rnd() * Math.PI, rnd() * 0.6 - 0.3);
  }

  // ---- the crystal, glowing on a plinth inside the sanctum ----------------
  put(new THREE.CylinderGeometry(1.1, 1.3, 1.0, 16), STONE, 0, 9.5, 0);
  put(new THREE.OctahedronGeometry(1, 0).scale(1.3, 2.8, 1.3), CRYSTAL, 0, 12.6, 0, glow);

  // ---- the entablature, still mostly intact ------------------------------
  put(new THREE.CylinderGeometry(14.2, 14.2, 1.8, 64), STONE, 0, 20.9, 0);

  // ---- the copper dome, a jagged gash toward the front ---------------------
  // Offset from dead-centre-front so a head-on view reads as an asymmetric
  // tear rather than a symmetric split.
  const DOME_R = 13.4, DOME_Y = 21.8, DGAP = 1.4, DCEN = Math.PI / 2 - 0.35;
  const domeGeo = new THREE.SphereGeometry(DOME_R, 40, 14, DCEN + DGAP / 2, Math.PI * 2 - DGAP, 0, Math.PI / 2);
  {
    // only a light roughening right at the boundary -- a thin shell reads as
    // a flat fin if pushed far from its own surface, so most of the torn
    // look comes from the small shard fragments scattered along the gash.
    const pos = domeGeo.attributes.position;
    const edges = [DCEN + DGAP / 2, DCEN - DGAP / 2 + Math.PI * 2];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let a = Math.atan2(z, -x); if (a < 0) a += Math.PI * 2; // matches SphereGeometry's own phi
      for (const e of edges) {
        const em = e % (Math.PI * 2);
        const d = Math.min(Math.abs(a - em), Math.PI * 2 - Math.abs(a - em));
        if (d < 0.08 && y > 0.6) {
          const k = 1 - d / 0.08;
          pos.setY(i, y - k * rnd() * 0.35);
        }
      }
    }
    pos.needsUpdate = true;
    domeGeo.computeBoundingBox();
  }
  put(domeGeo, COPPER, 0, DOME_Y, 0);
  // torn copper shards along the gash, inside and out
  for (let i = 0; i < 9; i++) {
    const t = DCEN + (rnd() - 0.5) * (DGAP + 0.35);
    const rr = DOME_R * (0.5 + rnd() * 0.46);
    const yy = DOME_Y + Math.sqrt(Math.max(0, DOME_R * DOME_R - rr * rr)) * (0.25 + rnd() * 0.55);
    const s = 0.55 + rnd() * 0.65;
    const f = put(new THREE.BoxGeometry(s, s * 0.22, s * 0.65), COPPER,
      Math.sin(t) * rr, yy, Math.cos(t) * rr);
    f.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
  }
  // a couple of fallen dome-shell fragments (curved shell hinted by a
  // shallow box), resting on the entablature and the top step
  const shellChunk = (x, y, z, s, rx, rz) => {
    const o = put(new THREE.BoxGeometry(s, s * 0.22, s * 0.75), COPPER, x, y, z);
    o.rotation.set(rx, rnd() * Math.PI, rz);
    return o;
  };
  shellChunk(4.0, 21.9, 3.5, 2.6, 0.15, 0.3);
  shellChunk(-6.5, 21.9, -1.0, 2.2, -0.1, -0.2);
  shellChunk(7.0, 9.6, 13.5, 1.9, 1.1, 0.3);
  shellChunk(-12.0, 9.6, 10.0, 2.1, 1.2, -0.25);

  // ---- the lantern, fallen and cracked on the steps ------------------------
  {
    const lant = new THREE.Group();
    put(new THREE.CylinderGeometry(2.2, 2.6, 4, 16), COPPER, 0, 2, 0, lant);
    put(new THREE.ConeGeometry(2.55, 6, 16), COPPER, 0.15, 4 + 3, 0.1, lant);
    lant.position.set(-4.5, 9 + 2.55, 16.5);
    orient(lant, new THREE.Vector3(0.25, 0.12, 0.96));
    g.add(lant);
  }

  // ---- coral crust patches -------------------------------------------------
  coral(23.5, 1.0, 6.0, 4);
  coral(-20.0, 1.0, -10.0, 4);
  coral(9.0, 9.4, 10.0, 3, 0.5);
  coral(-6.0, 3.6, 18.5, 3, 0.5);
  coral(15.0, 6.4, -14.0, 3, 0.5);
  coral(0, 9.4, 12.5, 3, 0.6);

  return g;
}
