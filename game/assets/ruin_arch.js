// ruin_arch, candidate A: primitives, an extruded shape, vertex edits.
// A half-fallen arched gateway of the drowned city, about 10 m wide and 9 m
// tall: two square piers, the left standing tall with the springing of the
// arch curving up from it and breaking off jagged, the right broken low,
// wedge voussoirs fallen at the foot of both. No glow parts.
export default function (THREE) {
  const g = new THREE.Group();
  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
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
  const rnd = rng(6677);

  const STONE = mat(0xcfc6b4, 0.85, 'stone', { flatShading: true });
  const ALGAE = mat(0x8f9a86, 0.9, 'stone', { flatShading: true });
  const CORAL_A = mat(0xff7a8a, 0.7, 'coral', { flatShading: true });
  const CORAL_B = mat(0xf59a55, 0.7, 'coral', { flatShading: true });

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
  const jagProfile = (lo, hi, amp, seed, n = 6) => {
    const r = rng(seed);
    const c = Array.from({ length: n }, () => r());
    return (coord) => {
      const t = Math.max(0, Math.min(1, (coord - lo) / (hi - lo))) * (n - 1);
      const i0 = Math.min(n - 2, Math.floor(t)), fr = t - i0;
      return (c[i0] * (1 - fr) + c[i0 + 1] * fr) * amp;
    };
  };

  // ---- the two piers, a low sill between them ---------------------------
  const PIER_X = 4.4, PW = 1.2, PD = 1.05;
  put(new THREE.BoxGeometry(PIER_X * 2 + PW + 0.6, 0.22, PD + 0.7), ALGAE, 0, 0.11, 0);

  const H_LEFT = 6.55, H_RIGHT = 4.15;
  const leftGeo = new THREE.BoxGeometry(PW, H_LEFT, PD, 3, 1, 2);
  breakTop(leftGeo, (x, z) => 0.1 + jagProfile(-0.5, 0.5, 0.14, 811)(z));
  put(leftGeo, STONE, -PIER_X, 0.22 + H_LEFT / 2, 0);

  const rightGeo = new THREE.BoxGeometry(PW, H_RIGHT, PD, 3, 1, 2);
  breakTop(rightGeo, (x, z) => jagProfile(-0.5, 0.5, 0.55, 822)(z) + jagProfile(-0.6, 0.6, 0.3, 823)(x));
  put(rightGeo, STONE, PIER_X, 0.22 + H_RIGHT / 2, 0);

  // ---- the springing of the arch, curving up from the standing pier -----
  // A torus lies natively in the XY plane; placing its centre so the arc
  // passes through the pier top with a vertical tangent there, then sweeping
  // it inward and up, gives the start of a semicircular arch.
  const springY = 0.22 + H_LEFT, ARC_R = 3.35, ARC_SPAN = 0.74;
  const attachX = -PIER_X + PW / 2;
  const torusCentre = new THREE.Vector3(attachX + ARC_R, springY, 0);
  const springer = put(
    new THREE.TorusGeometry(ARC_R, 0.34, 8, 22, ARC_SPAN),
    STONE, torusCentre.x, torusCentre.y, torusCentre.z,
  );
  springer.rotation.z = Math.PI - ARC_SPAN; // sweep drawn from angle 0; rotate so it ends at the pier
  // a few torn stone fragments at the broken tip (effective angle PI - ARC_SPAN,
  // the end away from the pier), to break the clean cut
  {
    const freeAngle = Math.PI - ARC_SPAN;
    const tipX = torusCentre.x + ARC_R * Math.cos(freeAngle);
    const tipY = torusCentre.y + ARC_R * Math.sin(freeAngle);
    for (let i = 0; i < 4; i++) {
      const s = 0.22 + rnd() * 0.16;
      const f = put(new THREE.BoxGeometry(s, s, s * 0.8), STONE,
        tipX + (rnd() - 0.5) * 0.35, tipY + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.5);
      f.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    }
  }

  // ---- voussoirs fallen at the foot of both piers ------------------------
  const vsh = new THREE.Shape();
  vsh.moveTo(-0.25, 0); vsh.lineTo(0.25, 0); vsh.lineTo(0.4, 0.6); vsh.lineTo(-0.4, 0.6);
  vsh.closePath();
  const voussoirGeo = new THREE.ExtrudeGeometry(vsh, { depth: 0.82, bevelEnabled: false, curveSegments: 1 });
  voussoirGeo.translate(0, 0, -0.41);
  const keystoneGeo = new THREE.ExtrudeGeometry(
    (() => { const s = new THREE.Shape(); s.moveTo(-0.3, 0); s.lineTo(0.3, 0); s.lineTo(0.46, 0.72); s.lineTo(-0.46, 0.72); s.closePath(); return s; })(),
    { depth: 0.95, bevelEnabled: false, curveSegments: 1 },
  );
  keystoneGeo.translate(0, 0, -0.475);

  const drop = (geo, x, z, rotY, tip, y0) => {
    const o = put(geo, rnd() > 0.35 ? STONE : ALGAE, x, y0, z);
    o.rotation.y = rotY;
    o.rotation.x = tip;
  };
  drop(voussoirGeo, -3.4, 1.1, 0.4, 0, 0.22);
  drop(voussoirGeo, -2.6, -0.9, -1.1, 0.15, 0.22);
  drop(voussoirGeo, -1.5, 0.6, 2.2, 0, 0.22);
  drop(voussoirGeo, 3.3, -0.8, 0.9, 0, 0.22);
  drop(voussoirGeo, 2.4, 1.3, -0.6, -0.2, 0.22);
  drop(voussoirGeo, 4.6, 0.4, 2.7, 0, 0.22);
  drop(keystoneGeo, -0.3, -1.2, 0.5, 0, 0.22);
  drop(voussoirGeo, -0.3, -1.2, 0.5, 0, 0.94); // stacked on the keystone
  drop(voussoirGeo, 1.0, 1.6, 1.6, 0.3, 0.22);

  // ---- coral crust near the bases ----------------------------------------
  const coral = (x, y, z, n) => {
    for (let i = 0; i < n; i++) {
      const r = 0.07 + rnd() * 0.07;
      const o = put(new THREE.IcosahedronGeometry(r, 0), i % 2 ? CORAL_A : CORAL_B,
        x + (rnd() - 0.5) * 0.4, y + (rnd() - 0.5) * 0.15, z + (rnd() - 0.5) * 0.4);
      o.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    }
  };
  coral(-4.6, 0.3, 0.7, 3);
  coral(4.7, 0.3, -0.6, 3);

  return g;
}
