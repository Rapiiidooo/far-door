// ruin_rings, candidate A: primitives (lathed arcs), vertex edits.
// The stonework of the drowned city, still 197 m across: the same three
// concentric ring walls, now broken into standing arcs of varying height
// with breaches between them, fallen blocks at their feet, and thin cyan
// lines of light surviving on some of the arcs. Four causeways still cross
// the old canals at the cardinal points, several with a collapsed span or a
// lone pier. The wall keeps a clear breach along +Z near x=0 on all three
// rings, the avenue the camera flies down. The rails are userData.parts.glow.
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
  const rnd = rng(7331);
  // settle a rotated mesh so its lowest point rests at y=~0, not wherever
  // its own centre happened to land after a tilt
  const groundFit = (mesh, sink = 0.03) => {
    mesh.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(mesh);
    mesh.position.y += -sink - box.min.y;
    return mesh;
  };

  const STONE = mat(0xcfc6b4, 0.85, 'stone', { flatShading: true });
  const ALGAE = mat(0x8f9a86, 0.9, 'stone', { flatShading: true });
  const RAIL = mat(0xa8f8ff, 0.3, 'glass', { emissive: 0x52eeff, emissiveIntensity: 2.6 });
  const CORAL_A = mat(0xff7a8a, 0.7, 'coral', { flatShading: true });
  const CORAL_B = mat(0xf59a55, 0.7, 'coral', { flatShading: true });

  const V2 = (x, y) => new THREE.Vector2(x, y);
  const coral = (x, z, n) => {
    for (let i = 0; i < n; i++) {
      const r = 0.16 + rnd() * 0.18;
      // every vertex of an icosahedron is exactly r from its centre, so
      // resting the centre at y=r guarantees the lowest vertex touches 0
      const o = put(new THREE.IcosahedronGeometry(r, 0), i % 2 ? CORAL_A : CORAL_B,
        x + (rnd() - 0.5) * 1.0, r, z + (rnd() - 0.5) * 1.0);
      o.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    }
  };
  const rubble = (x, z, n) => {
    for (let i = 0; i < n; i++) {
      const s = 0.7 + rnd() * 1.0;
      const b = put(new THREE.BoxGeometry(s, s * (0.55 + rnd() * 0.5), s * (0.7 + rnd() * 0.4)),
        rnd() < 0.4 ? ALGAE : STONE, x + (rnd() - 0.5) * 2, s * 0.4, z + (rnd() - 0.5) * 2);
      b.rotation.set(rnd() * 0.5 - 0.25, rnd() * Math.PI, rnd() * 0.5 - 0.25);
      groundFit(b);
    }
  };

  // ---- one broken ring wall: SEG blocks around the circle, some missing,
  // survivors at varying height with a jagged top, a breach forced at +Z ----
  const buildRing = (ri, ro, hNom, SEG, seed) => {
    const rn = rng(seed);
    const full = Math.PI * 2;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * full, a1 = ((i + 1) / SEG) * full;
      const cen = (a0 + a1) / 2;
      const d0 = Math.min(cen, full - cen);
      const forcedGap = d0 < (full / SEG) * 0.95;
      const missing = forcedGap || rn() < 0.16;
      if (missing) {
        if (!forcedGap && rn() < 0.55) {
          const t = a0 + (a1 - a0) * rn();
          const rr = ri + (ro - ri) * rn();
          const s = 1.1 + rn() * 1.1;
          const b = put(new THREE.BoxGeometry(s, s * 0.65, s * 0.8), rn() < 0.5 ? STONE : ALGAE,
            Math.sin(t) * rr, s * 0.4, Math.cos(t) * rr);
          b.rotation.set(rn() * 0.5 - 0.25, rn() * Math.PI, rn() * 0.5 - 0.25);
          groundFit(b);
        }
        continue;
      }
      const jf = 0.05;
      const phiStart = a0 + (a1 - a0) * jf, span = (a1 - a0) * (1 - 2 * jf);
      const hFrac = rn() < 0.3 ? 0.15 + rn() * 0.25 : 0.55 + rn() * 0.45;
      const h = Math.max(0.45, hNom * hFrac);
      const segs = Math.max(3, Math.round(span * 40));
      const prof = [V2(ri, 0), V2(ro, 0), V2(ro, h), V2(ri, h), V2(ri, 0)];
      const geo = new THREE.LatheGeometry(prof, segs, phiStart, span);
      // a jagged skyline: one random dip per angular step, shared by the
      // inner and outer edge so the walkway top does not tear diagonally
      const dips = Array.from({ length: segs + 1 }, () => rn());
      {
        const pos = geo.attributes.position;
        for (let k = 0; k < pos.count; k++) {
          const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
          if (y > h - 1e-3) {
            const a = Math.atan2(x, z);
            const t = Math.max(0, Math.min(1, (a - phiStart) / span));
            const idx = Math.round(t * segs);
            pos.setY(k, h - Math.max(0, dips[idx] - 0.12) * h * 0.55);
          }
        }
        pos.needsUpdate = true;
      }
      put(geo, rn() < 0.3 ? ALGAE : STONE, 0, 0, 0);
      // a thin surviving line of light, only on some arcs -- traced along
      // the same jagged top as the stone below it, so it never floats free
      if (rn() < 0.45) {
        const railR = rn() < 0.5 ? ri - 0.04 : ro + 0.04;
        const rprof = [V2(railR - 0.08, 0), V2(railR + 0.08, 0)];
        const railGeo = new THREE.LatheGeometry(rprof, segs, phiStart, span);
        const rp = railGeo.attributes.position;
        for (let k = 0; k < rp.count; k++) {
          const x = rp.getX(k), z = rp.getZ(k);
          const a = Math.atan2(x, z);
          const t = Math.max(0, Math.min(1, (a - phiStart) / span));
          const idx = Math.round(t * segs);
          rp.setY(k, h - Math.max(0, dips[idx] - 0.12) * h * 0.55 + 0.06);
        }
        rp.needsUpdate = true;
        put(railGeo, RAIL, 0, 0, 0, glow);
      }
      // a block or two fallen from this stretch, at its own foot
      if (rn() < 0.35) {
        const t = phiStart + span * rn();
        const rr = ri + (ro - ri) * rn();
        const s = 0.7 + rn() * 0.9;
        const b = put(new THREE.BoxGeometry(s, s * 0.6, s * 0.7), rn() < 0.5 ? STONE : ALGAE,
          Math.sin(t) * rr, s * 0.35, Math.cos(t) * rr);
        b.rotation.set(rn() * 0.4 - 0.2, rn() * Math.PI, rn() * 0.4 - 0.2);
        groundFit(b);
      }
    }
  };
  buildRing(32, 42, 5, 20, 111);
  buildRing(56, 68, 5.5, 26, 222);
  buildRing(86, 98, 6, 34, 333);

  // ---- four causeways over the canals, some spans collapsed --------------
  const jagEndX = (geo, halfLen, seed) => {
    const rn = rng(seed);
    const N = 5, dips = Array.from({ length: N + 1 }, () => rn());
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      if (z > halfLen - 1e-3) {
        const t = Math.max(0, Math.min(1, (x + 3) / 6));
        const idx = Math.round(t * N);
        pos.setZ(i, halfLen - Math.max(0, dips[idx] - 0.25) * halfLen * 0.9);
      }
    }
    pos.needsUpdate = true;
  };
  const pier = (px, pz, h) => put(new THREE.CylinderGeometry(0.8, 0.95, h, 12), STONE, px, h / 2, pz);
  for (let b = 0; b < 4; b++) {
    const a = (b * Math.PI) / 2, sa = Math.sin(a), ca = Math.cos(a);
    for (const [from, to] of [[24, 32], [42, 56], [68, 86]]) {
      const mid = (from + to) / 2, span = to - from + 1;
      const roll = rnd();
      if (roll < 0.55) {
        put(new THREE.BoxGeometry(6, 1.1, span), STONE, sa * mid, 4.95, ca * mid).rotation.y = a;
        for (const s of [-2.2, 2.2]) pier(sa * mid + ca * s, ca * mid - sa * s, 4.4);
      } else if (roll < 0.8) {
        const stubLen = span * (0.4 + rnd() * 0.25);
        const stubMid = from + stubLen / 2 - 0.5;
        const deckGeo = new THREE.BoxGeometry(6, 1.1, stubLen, 5, 1, 1);
        jagEndX(deckGeo, stubLen / 2, 900 + b * 3 + from);
        const deck = put(deckGeo, STONE, sa * stubMid, 4.95, ca * stubMid);
        deck.rotation.y = a;
        for (const s of [-2.2, 2.2]) pier(sa * (from + 0.6) + ca * s, ca * (from + 0.6) - sa * s, 4.4);
      } else {
        for (const s of [-2.2, 2.2]) pier(sa * mid + ca * s, ca * mid - sa * s, 4.2 + rnd() * 1.4);
        if (rnd() < 0.6) {
          const fb = put(new THREE.BoxGeometry(5.6, 1.0, 3.2), STONE, sa * (mid + 1.5), 0.5, ca * (mid + 1.5));
          fb.rotation.set(0.45 + rnd() * 0.3, a + (rnd() - 0.5) * 0.6, 0.08);
          groundFit(fb);
        }
      }
    }
  }

  // ---- coral crust and rubble scattered along the feet of the walls ------
  const spots = [
    [37, 0.4], [37, 2.1], [37, 3.9], [37, 5.3],
    [62, 1.1], [62, 2.6], [62, 4.4], [62, 5.6],
    [92, 0.7], [92, 2.2], [92, 3.6], [92, 5.0],
  ];
  for (const [r, ang] of spots) {
    const x = Math.sin(ang) * r, z = Math.cos(ang) * r;
    if (rnd() < 0.6) coral(x, z, 3);
    else rubble(x, z, 3);
  }

  return g;
}
