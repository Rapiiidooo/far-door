// snow_pine, candidate B (profiles): six tiers, each a LatheGeometry swept from one
// closed profile: a thick umbrella of needles whose top runs out almost flat from the
// trunk and then bends down hard at the edge, over a hollow underside. The profile
// changes with the angle, so the rim swells into rounded bough lobes whose tips hang
// lower. The snow on each tier is a second swept profile laid on the flat part, thick,
// ending in a rounded, slightly ragged lip that bulges over the bend; on the laden side
// (front-left, -X +Z) it is thicker and reaches further down, and the boughs under it
// droop further. The trunk is a lathe that flares into five root lobes; the tip is a
// slender lathe spire bent into a crook. 7.0 m tall, flat shaded. Plain data:
// userData.trunk, measured after placement.
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
  // Azimuths are atan2(x, z), the angle LatheGeometry sweeps. The laden side faces
  // front-left, so every one of the four axis views shows the lopsided load.
  const LADEN = Math.atan2(-1, 1);
  const load = (az) => 0.5 + 0.5 * Math.cos(az - LADEN);
  const hash = (i) => {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  const PARTS = new Map();
  const put = (m, geo) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    o.computeVertexNormals();
    if (!PARTS.has(m)) PARTS.set(m, []);
    PARTS.get(m).push(o);
  };
  // A LatheGeometry whose profile may change with the angle: prof(j, az) gives point j
  // of the profile at azimuth az as [r, y]. Points run anticlockwise in the (r, y)
  // plane, so the faces look outwards. LatheGeometry builds the faces; the positions
  // are then set ring by ring.
  const sweep = (S, N, prof, start = 0) => {
    const geo = new THREE.LatheGeometry(Array.from({ length: N }, (_, j) => new THREE.Vector2(1, j)), S, start, TAU);
    const p = geo.attributes.position;
    for (let i = 0; i <= S; i++) {
      const az = start + (i / S) * TAU;
      for (let j = 0; j < N; j++) {
        const [r, y] = prof(j, az);
        p.setXYZ(i * N + j, r * Math.sin(az), y, r * Math.cos(az));
      }
    }
    return geo;
  };

  // --- the tiers ------------------------------------------------------------------
  // rim height, radius, height where the top meets the trunk, bough lobes, phase.
  // Each tier's top meets the trunk just above the next tier's rim, so the snow on the
  // flat part of every tier stays in view under the tier above.
  const TIERS = [
    [2.0, 2.02, 2.84, 8, 0.1],
    [2.74, 1.73, 3.54, 7, 0.6],
    [3.44, 1.46, 4.2, 6, 0.3],
    [4.1, 1.19, 4.8, 5, 0.8],
    [4.7, 0.92, 5.38, 5, 0.2],
    [5.28, 0.66, 5.92, 4, 0.5],
  ];
  // The drop of the top surface below the trunk end, as a fraction of the tier's fall,
  // at fractions of its radius: flat near the trunk, steep at the edge.
  const FALL = [[0, 0], [0.55, 0.34], [0.85, 0.75], [1, 0.97]];
  const lerpTable = (tab, t) => {
    for (let i = 0; i < tab.length - 1; i++) {
      const [t0, a] = tab[i], [t1, b] = tab[i + 1];
      if (t <= t1) return a + ((b - a) * (t - t0)) / (t1 - t0);
    }
    return tab[tab.length - 1][1];
  };
  TIERS.forEach(([rim, R, top, n, phase], ti) => {
    const S = 3 * n, D = top - rim, r0 = 0.07;
    const start = (phase * TAU) / n;
    // Rounded bough lobes whose tips reach a little further and hang lower, and the
    // whole edge hanging lower on the laden side: [radius factor, drop] at a fraction u.
    const lobe = (az) => 0.5 + 0.5 * Math.cos(n * (az - start));
    const bend = (u, az) => [1 + 0.14 * (lobe(az) - 0.4) * u * u, 0.18 * lobe(az) * u ** 3 + 0.22 * load(az) * u * u];
    const topY = (u) => top - D * lerpTable(FALL, u);
    const at = (u, y, az) => {
      const [k, dy] = bend(u, az);
      return [Math.max(r0, u * R) * k, y - dy];
    };
    // underside at the trunk, underside midway, rim bottom, rim outer, top outer, top mid, top at the trunk
    const needle = [
      (az) => at(0, top - 0.62 * D, az),
      (az) => at(0.6, top - 0.88 * D, az),
      (az) => at(0.96, top - 1.08 * D, az),
      (az) => at(1, topY(1), az),
      (az) => at(0.85, topY(0.85), az),
      (az) => at(0.55, topY(0.55), az),
      (az) => at(0, top, az),
    ];
    put(NEEDLE, sweep(S, needle.length, (j, az) => needle[j](az), start));

    // The snow: embedded under the top at the trunk and behind the lip, a rounded lip
    // resting on the bend, and a thick top back to the trunk through the needles' own
    // mid point so it never dips into them. The lip is ragged: its reach wanders a
    // little from one bough to the next.
    const rag = (az) => hash(ti * 17 + ((Math.round(((az - start) / TAU) * S) % S) + S) % S) - 0.5;
    const reach = (az) => 0.7 + 0.18 * load(az) ** 1.2 + 0.07 * rag(az) - (ti === 5 ? 0.12 : 0);
    const thick = (az) => (0.1 + 0.17 * load(az) ** 1.5) * (ti === 5 ? 0.7 : 1);
    const snow = [
      (az) => at(0, top - 0.08, az),
      (az) => at(reach(az) - 0.07, topY(reach(az) - 0.07) - 0.04, az),
      (az) => at(reach(az) + 0.035, topY(reach(az) + 0.035) + 0.03, az),
      (az) => at(reach(az) - 0.02, topY(reach(az) - 0.02) + thick(az), az),
      (az) => at(0.55, topY(0.55) + thick(az), az),
      (az) => at(0, top + 0.8 * thick(az), az),
    ];
    put(SNOW, sweep(S, snow.length, (j, az) => snow[j](az), start));
  });

  // --- the crooked spire ------------------------------------------------------------
  {
    const base = 5.72, L = 1.28;
    // The centreline leans towards +X, bends harder, then the top kinks back.
    const path = [[0, 0], [0.12, 0.42], [0.36, 0.8], [0.2, 1.0]];
    const along = (t) => {
      for (let i = 0; i < path.length - 1; i++) {
        const [x0, t0] = path[i], [x1, t1] = path[i + 1];
        if (t <= t1) return x0 + ((x1 - x0) * (t - t0)) / (t1 - t0);
      }
      return path[path.length - 1][0];
    };
    const prof = [[0.2, 0], [0.15, 0.3], [0.1, 0.6], [0.06, 0.82], [0.0, 1.0]];
    const geo = sweep(7, prof.length, (j) => [prof[j][0], base + prof[j][1] * L]);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + along((p.getY(i) - base) / L));
    put(NEEDLE, geo);
  }

  // --- the trunk: a lathe that flares into five root lobes --------------------------
  const TRUNK = { r: 0.23 };
  {
    const prof = [[0.36, 0], [0.28, 0.1], [0.23, 0.4], [0.18, 2.6], [0.11, 4.6], [0.05, 5.9]];
    put(BARK, sweep(10, prof.length, (j, az) => {
      const [r, y] = prof[j];
      const roots = y < 0.5 ? 0.5 * Math.max(0, Math.cos(5 * (az - 0.3))) ** 2 * (1 - y / 0.5) : 0;
      return [r * (1 + roots), y];
    }));
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
