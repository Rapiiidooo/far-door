// snow_pine, candidate A (primitives): five stacked tiers and a crooked tuft. Each tier
// is a one-segment ConeGeometry for the flat upper slope, an open CylinderGeometry band
// for the steeper hanging skirt (shoulder, plain knee, serrated hem whose bough tips
// hang low between the notches) and a second cone turned inside out for the underside.
// Its snow is the same kit again: a cone cap, a band for the thick lip that hangs over
// the shoulder, and a cone underneath. The side facing front-left (-X, +Z) is the laden
// one: thicker snow hanging lower, boughs drooping further, each tier tipped a few
// degrees down. The crown bends towards +X near the top; the tuft keeps only a lump of
// snow so the crooked leader, a thin cylinder and a cone kinked back, stays dark
// against the sky. A tapered cylinder trunk with a flared foot and five cone roots
// shows below the lowest tier. 7.0 m tall, flat shaded. Plain data: userData.trunk,
// measured after placement.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    m.name = name;
    return m;
  };
  const NEEDLE = mat(0x2f4a3e, 0.9, 'foliage');
  const BARK = mat(0x5a4030, 0.92, 'timber');
  const SNOW = mat(0xe9f2f6, 0.8, 'ground');

  const TAU = Math.PI * 2;
  // Azimuths are atan2(x, z), the angle ConeGeometry itself uses. The laden side faces
  // front-left, so every one of the four axis views shows the lopsided load.
  const LADEN = Math.atan2(-1, 1);
  const load = (az) => 0.5 + 0.5 * Math.cos(az - LADEN);
  const hash = (i) => {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  // Every part is baked into one flat-shaded geometry per material.
  const PARTS = new Map();
  const put = (m, geo, matrix) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    if (matrix) o.applyMatrix4(matrix);
    o.computeVertexNormals();
    if (!PARTS.has(m)) PARTS.set(m, []);
    PARTS.get(m).push(o);
  };
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) =>
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')),
      new THREE.Vector3(...s),
    );
  // Places the rings of a unit cone or open cylinder by hand: ring(j, az) gives the
  // radius and height of ring j (0 at the top) at azimuth az. A cone here is never more
  // than one segment tall: the verifier's three.js (r169) drops half the faces of every
  // lower row of a multi-segment ConeGeometry, which the game's r186 does not.
  const shape = (geo, rows, ring) => {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = Math.hypot(v.x, v.z), az = Math.atan2(v.x, v.z);
      const [r, y] = ring(Math.round((0.5 - v.y) * rows), az);
      p.setXYZ(i, k < 1e-6 ? 0 : (v.x / k) * r, y, k < 1e-6 ? 0 : (v.z / k) * r);
    }
    return geo;
  };
  // Reverses the winding, so a cone placed apex-up faces down: an underside.
  const flip = (geo) => {
    const ix = geo.index.array;
    for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
    return geo;
  };
  const cone = (S, start) => new THREE.ConeGeometry(1, 1, S, 1, true, start);
  const band = (S, rows, start) => new THREE.CylinderGeometry(1, 1, 1, S, rows, true, start);

  // --- the tiers ------------------------------------------------------------------
  // The load tips each tier a few degrees down on the laden side, about this axis.
  const TIP_AXIS = new THREE.Vector3(Math.cos(LADEN), 0, -Math.sin(LADEN));
  // rim height, rim radius, cone height above the rim, radial segments, phase of the tips,
  // shift towards +X, tilt down on the laden side, lean towards +X. The crown bends
  // towards +X near the top, and the last one is the crooked tuft under the leader.
  const TIERS = [
    [1.8, 2.0, 1.2, 24, 0.0, 0, 0.025, 0],
    [2.68, 1.66, 1.08, 22, 0.5, 0, 0.025, 0],
    [3.52, 1.33, 0.98, 18, 0.2, 0.03, 0.02, 0.02],
    [4.31, 1.01, 0.88, 16, 0.7, 0.07, 0.02, 0.05],
    [5.05, 0.71, 0.8, 12, 0.35, 0.13, 0.02, 0.09],
    [5.72, 0.4, 0.85, 10, 0.1, 0.2, 0, 0.3],
  ];
  let tuft = null;
  TIERS.forEach(([y0, R, h, S, phase, shift, tilt, lean], ti) => {
    const top = ti === TIERS.length - 1;
    const step = TAU / S, start = phase * step;
    const slot = (az) => ((Math.round((az - start) / step) % S) + S) % S;
    const tip = (az) => slot(az) % 2 === 0;
    const wob = (az) => hash(ti * 31 + slot(az)) - 0.5;
    const droop = (r, az) => 0.22 * load(az) * (r / R) ** 2;
    const SHr = 0.62 * R, SHy = 0.5 * h;
    // Bough tips hang down rather than out, so the hem reads as a serrated fringe.
    const NOTCH = 0.95;
    const rimR = (az) => R * (tip(az) ? 1.02 + 0.04 * wob(az) : NOTCH);
    const rimY = (az) => (tip(az) ? -0.26 + 0.1 * wob(az) : 0.02);
    // How far below the shoulder the snow's lip hangs: deeper on the laden side.
    // Every third vertex hangs a clump a little lower, so the lip is not a clean ring.
    const drop = (az) => SHy * (0.22 + 0.42 * load(az) ** 1.5 + 0.08 * wob(az) + (slot(az) % 3 === 0 ? 0.1 : 0));
    // The skirt's line through the notches, at a depth below the shoulder.
    const skirtR = (d) => SHr + ((NOTCH * R - SHr) * d) / (SHy - 0.02);
    const thick = (az) => 0.12 + 0.18 * load(az) ** 1.5;

    const shoulder = (az) => [SHr, SHy - droop(SHr, az)];
    // A plain knee just below the snow's lip: only the hem is serrated, since a
    // serrated facet bulges past its own radial lines and would poke through the snow.
    const knee = (az) => {
      const d = Math.min(drop(az) + 0.07, SHy - 0.05), r = skirtR(d);
      return [r, SHy - d - droop(r, az)];
    };
    const hem = (az) => [rimR(az), rimY(az) - droop(rimR(az), az)];
    const capTop = (az) => [SHr + 0.04, SHy + thick(az) - droop(SHr, az)];
    const lip = (az) => {
      const d = drop(az), r = skirtR(d) + 0.07;
      return [r, SHy - d - droop(r, az)];
    };

    const place = new THREE.Matrix4().compose(
      new THREE.Vector3(shift, y0, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -lean)
        .multiply(new THREE.Quaternion().setFromAxisAngle(TIP_AXIS, tilt)),
      new THREE.Vector3(1, 1, 1),
    );
    put(NEEDLE, shape(cone(S, start), 1, (j, az) => (j === 0 ? [0, h] : shoulder(az))), place);
    put(NEEDLE, shape(band(S, 2, start), 2, (j, az) => [shoulder, knee, hem][j](az)), place);
    put(NEEDLE, flip(shape(cone(S, start), 1, (j, az) => (j === 0 ? [0, 0.3 * h] : hem(az)))), place);

    // The tuft stays dark so the crooked tip reads against the sky: one lump of snow on
    // its laden shoulder instead of a cap.
    if (top) {
      tuft = { place, h };
      // Seated on the cone's upper slope, three quarters of the way out to the shoulder.
      const az = LADEN, r = 0.75 * SHr, y = h - ((h - SHy) * r) / SHr - droop(r, az);
      put(SNOW, new THREE.SphereGeometry(1, 7, 4), place.clone().multiply(M(Math.sin(az) * r, y + 0.03, Math.cos(az) * r, 0, az, 0, [0.2, 0.11, 0.26])));
      return;
    }
    put(SNOW, shape(cone(S, start), 1, (j, az) => (j === 0 ? [0, h + 0.14] : capTop(az))), place);
    put(SNOW, shape(band(S, 1, start), 1, (j, az) => (j === 0 ? capTop(az) : lip(az))), place);
    put(SNOW, flip(shape(cone(S, start), 1, (j, az) => (j === 0 ? [0, SHy - 0.2] : lip(az)))), place);
  });

  // --- the leader: a cylinder and a cone kinked into a crooked tip, out of the tuft --
  {
    const base = new THREE.Vector3(0, 0.74 * tuft.h, 0).applyMatrix4(tuft.place);
    const a1 = 0.45, l1 = 0.42;       // carries on towards +X
    const d1 = new THREE.Vector3(Math.sin(a1), Math.cos(a1), 0);
    const mid = base.clone().addScaledVector(d1, l1);
    put(NEEDLE, new THREE.CylinderGeometry(0.065, 0.1, l1, 6), M(base.x + d1.x * l1 / 2, base.y + d1.y * l1 / 2, 0, 0, 0, -a1));
    const a2 = -0.55, l2 = 0.36;      // then kinks back
    const d2 = new THREE.Vector3(Math.sin(a2), Math.cos(a2), 0);
    const tipTop = mid.clone().addScaledVector(d2, l2);
    put(NEEDLE, new THREE.ConeGeometry(0.075, l2, 6), M((mid.x + tipTop.x) / 2, (mid.y + tipTop.y) / 2, 0, 0, 0, -a2));
    put(NEEDLE, new THREE.SphereGeometry(0.075, 6, 4), M(mid.x, mid.y, 0));
  }

  // --- the trunk -------------------------------------------------------------------
  const TRUNK = { r: 0.22 };
  put(BARK, new THREE.CylinderGeometry(0.09, 0.22, 5.0, 8), M(0, 0.3 + 5.0 / 2, 0));
  put(BARK, new THREE.CylinderGeometry(0.22, 0.34, 0.3, 8), M(0, 0.15, 0));
  for (let i = 0; i < 5; i++) {
    const az = (i / 5) * TAU + 0.4;
    const len = 0.55 + 0.14 * hash(i + 90);
    // A cone lying outwards, pointing down 10 degrees; its base centre sits at 0.12 m
    // so the lowest edge of its base and its tip both stay just above y = 0.
    const tilt = Math.PI / 2 + 0.17;
    const cx = Math.sin(az) * (0.22 + (len / 2) * Math.sin(tilt));
    const cz = Math.cos(az) * (0.22 + (len / 2) * Math.sin(tilt));
    put(BARK, new THREE.ConeGeometry(0.11, len, 5), M(cx, 0.12 + (len / 2) * Math.cos(tilt), cz, tilt, az, 0));
  }

  // --- bake: one mesh per material --------------------------------------------------
  // Box-mapped UVs in units of this material's own extent. The game's surfaces multiply
  // UVs by extent over tile size, so every part comes out at the same texel density.
  const boxUV = (pos) => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i++) { lo[i % 3] = Math.min(lo[i % 3], pos[i]); hi[i % 3] = Math.max(hi[i % 3], pos[i]); }
    const W = Math.max(hi[0] - lo[0], hi[2] - lo[2]), H = hi[1] - lo[1];
    const uv = new Float32Array((pos.length / 3) * 2);
    for (let t = 0; t < pos.length; t += 9) {
      const ax = pos[t + 3] - pos[t], ay = pos[t + 4] - pos[t + 1], az = pos[t + 5] - pos[t + 2];
      const bx = pos[t + 6] - pos[t], by = pos[t + 7] - pos[t + 1], bz = pos[t + 8] - pos[t + 2];
      const nx = Math.abs(ay * bz - az * by), ny = Math.abs(az * bx - ax * bz), nz = Math.abs(ax * by - ay * bx);
      for (let k = 0; k < 3; k++) {
        const x = pos[t + 3 * k], y = pos[t + 3 * k + 1], z = pos[t + 3 * k + 2], o = (t / 3 + k) * 2;
        if (ny >= nx && ny >= nz) { uv[o] = x / W; uv[o + 1] = z / H; }
        else if (nx >= nz) { uv[o] = z / W; uv[o + 1] = y / H; }
        else { uv[o] = x / W; uv[o + 1] = y / H; }
      }
    }
    return uv;
  };
  for (const [m, list] of PARTS) {
    let n = 0;
    for (const q of list) n += q.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const q of list) {
      pos.set(q.attributes.position.array, o * 3);
      nor.set(q.attributes.normal.array, o * 3);
      o += q.attributes.position.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(boxUV(pos), 2));
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }

  // --- the six lines -----------------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put2 = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put2(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put2(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  // The load pushes the crown's box off the trunk, so say where the trunk stands.
  g.userData.trunk = { base: [+(-c.x).toFixed(3), 0, +(-c.z).toFixed(3)], radius: TRUNK.r };
  return g;
}
