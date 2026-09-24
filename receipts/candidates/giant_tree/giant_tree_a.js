// giant_tree, arm A: assembled from primitives.
// The bole is one faceted cylinder, 24 sides, flared at the foot, tapered and then swollen where
// it parts, turned about its axis above the hollow so its facets wind round it. It is built with
// a gap in front: its columns are spread so the gap is 3.6 m wide up to the springline, then close
// in to a pointed arch at 10 m, and above that it is whole. Behind the gap stands a closed dark
// core and a floor whose normals face the ground, so the hollow reads as shadow in any light.
// Eight tapered cylinders half sunk in the bole rise over the roots as ribs, and three squashed
// spheres swell out of it as burls. Each of the eight buttress roots is three half cones in one
// vertical plane, turning a little each, whose sloping edges add up to a concave crest from 8 m
// up the bole to a tip 12.6 to 14.3 m out, with a surface root of two tapered cylinders beyond.
// The four limbs are tapered cylinders with knuckle spheres at the elbows, rising from a squashed
// sphere on top of the bole, with branches and a central leader into the crown. The crown is
// fourteen clumps, each a lumpy flattened icosahedron in moss green under a smaller fern green
// one, smooth shaded where the bark stays faceted. Moss is primitive too: sleeves of open
// cylinder round the foot of the bole, squashed spheres between the roots and on four crests.
// Twelve pods, each an ellipsoid with a cone for a tip, hang from thin cylinders under the crown
// in spore lime, as one mesh: userData.parts.glow.
export default function (THREE) {
  const g = new THREE.Group();

  const mat = (color, roughness, name, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
    m.name = name;
    return m;
  };
  const BARK = mat(0x5a4030, 0.95, 'timber');
  const MOSS = mat(0x4f7a3a, 0.9, 'foliage');
  const FERN = mat(0x7da04a, 0.85, 'foliage');
  // spore lime is emission only; the base is fern green, so a dimmed pod still reads as a pod
  const SPORE = mat(0x7da04a, 0.55, 'foliage', { emissive: 0xc3f25a, emissiveIntensity: 1.2 });

  let seed = 424242;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + (b - a) * rnd();
  const D = Math.PI / 180;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const at = (deg, r, y) => V(Math.sin(deg * D) * r, y, Math.cos(deg * D) * r);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // a millimetre grid key for a vertex; toFixed would tell -0.000 from 0.000 and split a seam
  const key = (x, y, z) => `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;

  const buckets = new Map();
  // flat shaded: every face keeps its own normal, unless the part brings normals of its own
  const add = (geo, m, keep = false) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    if (!keep) o.computeVertexNormals();
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(o);
  };
  // smooth normals for a rounded part, every copy of a vertex sharing one
  const soft = (geo) => {
    const o = geo.index ? geo.toNonIndexed() : geo;
    o.computeVertexNormals();
    const p = o.attributes.position, n = o.attributes.normal, sum = new Map();
    const k3 = (i) => key(p.getX(i), p.getY(i), p.getZ(i));
    for (let i = 0; i < p.count; i++) {
      const k = k3(i), s = sum.get(k) || new THREE.Vector3();
      sum.set(k, s.add(new THREE.Vector3().fromBufferAttribute(n, i)));
    }
    for (let i = 0; i < p.count; i++) { const s = sum.get(k3(i)).clone().normalize(); n.setXYZ(i, s.x, s.y, s.z); }
    return o;
  };
  // every normal turned down and away from the front, so a part inside the hollow reads as shadow
  const DARK = V(0, -1, -0.3).normalize();
  const shade = (geo) => {
    const o = geo.index ? geo.toNonIndexed() : geo, n = new Float32Array(o.attributes.position.count * 3);
    for (let i = 0; i < n.length; i += 3) { n[i] = DARK.x; n[i + 1] = DARK.y; n[i + 2] = DARK.z; }
    o.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    return o;
  };
  // push each distinct vertex in or out along its radius, the same for every copy of it,
  // so a polyhedron turns lumpy without opening cracks
  const lumpy = (geo, amt) => {
    const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = key(p.getX(i), p.getY(i), p.getZ(i));
      if (!seen.has(k)) seen.set(k, 1 + (rnd() * 2 - 1) * amt);
      const s = seen.get(k);
      p.setXYZ(i, p.getX(i) * s, p.getY(i) * s, p.getZ(i) * s);
    }
    return geo;
  };
  const blob = (sx, sy, sz, amt) => lumpy(new THREE.IcosahedronGeometry(1, 1), amt).scale(sx, sy, sz);
  // a tapered cylinder from p0 (radius r0) to p1 (radius r1)
  const rod = (p0, p1, r0, r1, seg) => {
    const d = p1.clone().sub(p0), len = d.length();
    const geo = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false).translate(0, len / 2, 0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
    return geo.translate(p0.x, p0.y, p0.z);
  };
  const ball = (p, r, ws = 8, hs = 6) => new THREE.SphereGeometry(r, ws, hs).translate(p.x, p.y, p.z);

  // ---- the bole -------------------------------------------------------------------------------------
  const TOPY = 30.5;                                   // where it parts into the four limbs
  const lean = (y) => { const s = Math.max(0, y) / TOPY; return V(-0.7 * s * s, 0, -0.5 * s * s); };
  const flare = (y) => 1 + 0.25 * Math.exp(-y / 2.2) + 0.08 * Math.exp(-y / 9);
  const boleR = (y) => (3.65 - 0.3 * Math.min(1, y / 22) + 0.45 * smooth(23, TOPY, y)) * flare(y);
  const twist = (y) => 0.75 * smooth(10, TOPY, y);    // radians: about 43 degrees, all above the hollow
  const ROOTS_AZ = [45, 84, 123, 162, 200, 239, 277, 315];
  // the hollow: a pointed arch of half width AW springing at AS, its arcs of radius AR
  const AW = 1.8, AS = 6.4, AR = 2.5 * AW, AH = Math.sqrt(AR * AR - (AR - AW) ** 2);
  const archW = (y) => (y <= AS ? AW : y >= AS + AH ? 0 : Math.sqrt(AR * AR - (y - AS) ** 2) - (AR - AW));
  {
    const RS = 24, YS = [0, 0.6, 1.5, 2.8, 4.4, AS, 7.5, 8.4, 9.1, 9.7, AS + AH, 12, 15, 18.5, 22, 25, 27.5, 29.3, TOPY];
    const HS = YS.length - 1, GAP = 22 * D;
    const geo = new THREE.CylinderGeometry(1, 1, 1, RS, HS, true, GAP, 2 * Math.PI - 2 * GAP);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const row = Math.floor(i / (RS + 1)), col = i % (RS + 1);
      const y = YS[HS - row], r = boleR(y), u = col / RS;             // rows run from the top down
      // spread the columns over whatever the hollow leaves at this height, closed above the arch
      const gap = Math.asin(Math.min(0.95, archW(y) / r));
      const th = gap + u * (2 * Math.PI - 2 * gap) + twist(y), l = lean(y);
      p.setXYZ(i, l.x + Math.sin(th) * r, y, l.z + Math.cos(th) * r);
    }
    add(geo, BARK);
    // a closed core behind the hollow, and a floor, both in shadow
    add(shade(new THREE.CylinderGeometry(2.3, 3.1, 15, 14, 1, false).translate(0, 7.5, -0.2)), BARK, true);
    add(shade(new THREE.CircleGeometry(4.6, 16).rotateX(-Math.PI / 2).translate(0, 0.03, 0)), BARK, true);
    // ribs: a tapered cylinder half sunk in the bole over each root, leaning with the twist
    ROOTS_AZ.forEach((deg, i) => {
      const y0 = 5.5, y1 = 16 + 3 * (i % 3), a0 = deg * D, a1 = a0 + twist(y1);
      const p0 = lean(y0).add(V(Math.sin(a0), 0, Math.cos(a0)).multiplyScalar(boleR(y0) - 0.4)).setY(y0);
      const p1 = lean(y1).add(V(Math.sin(a1), 0, Math.cos(a1)).multiplyScalar(boleR(y1) - 0.3)).setY(y1);
      add(rod(p0, p1, 1.0, 0.25, 7), BARK);
    });
    // burls: squashed spheres swelling out of the bole
    for (const [deg, y, s] of [[140, 15.5, 1.5], [255, 21, 1.7], [60, 12, 1.2]]) {
      const a = deg * D + twist(y), q = lean(y).add(V(Math.sin(a), 0, Math.cos(a)).multiplyScalar(boleR(y) - 0.5 * s)).setY(y);
      add(new THREE.SphereGeometry(s, 8, 6).scale(1, 1.35, 0.8).rotateY(a).translate(q.x, q.y, q.z), BARK);
    }
    // the parting: a squashed sphere closes the top of the bole
    const t = lean(TOPY);
    add(new THREE.SphereGeometry(boleR(TOPY) * 1.04, 16, 8).scale(1, 0.55, 1).translate(t.x, TOPY, t.z), BARK);
  }

  // ---- buttress roots: [azimuth, size, reach from the axis, half thickness at the bole] ---------------
  // the two either side of the hollow are thinner where they meet the bole, so they frame it
  const ROOTS = [[1.0, 13.4, 1.0], [0.86, 12.6, 1.7], [1.05, 14.0, 1.7], [0.9, 12.9, 1.7],
    [1.0, 14.3, 1.7], [0.87, 12.7, 1.7], [1.04, 13.8, 1.7], [0.95, 13.2, 1.0]].map((r, i) => [ROOTS_AZ[i], ...r]);
  const OFF = 2.6;                                     // the blades start inside the bole
  // half of a four-sided cone: apex over the bole end, a half polygon on the ground, cut on z = 0
  const blade = (deg, H, L, t) => new THREE.ConeGeometry(1, 1, 4, 1, true, -Math.PI / 2, Math.PI)
    .translate(0, 0.5, 0).scale(t, H, L).translate(0, 0, OFF).rotateY(deg * D);
  // [height, length, half thickness, turn in plan] for the three blades of one root
  const BLADES = (k, L, t1) => [[12.5 * k, 4.6, t1, 0], [8.5 * k, 8.6, 1.6, 3], [3.4 * k, L - OFF, 1.15, 7]];
  ROOTS.forEach(([deg, k, L, t1], i) => {
    const s = i % 2 ? -1 : 1;                           // which way this root bends
    for (const [H, len, t, turn] of BLADES(k, L, t1)) add(blade(deg + s * turn, H, len, t), BARK);
    // a surface root carries on past the tip, bending away; it starts inside the last blade
    const a = at(deg + s * 7, L - 2.2, 0.1), b = at(deg + s * 9, L + 0.1, 0.05), c = at(deg + s * 13, L + 1.1, 0.02);
    add(rod(a, b, 0.7, 0.5, 7), BARK);
    add(ball(b, 0.5, 7, 5), BARK);
    add(rod(b, c, 0.5, 0.12, 7), BARK);
  });

  // ---- moss: sleeves round the foot of the bole, mounds between the roots, pads on four crests ---------
  // part of an open cylinder hugging the flare a little off the bark, its top edge ragged
  const sleeve = (deg, arc, y1) => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 3, true, (deg - arc / 2) * D, arc * D);
    const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), f = p.getY(i) + 0.5, th = Math.atan2(x, z);
      const k = key(x, f, z);
      if (!seen.has(k)) seen.set(k, f > 0.99 ? rr(-0.3, 0.15) : f > 0.3 ? rr(-0.06, 0.06) : 0);
      const y = Math.max(0, f * y1 * (1 + seen.get(k))), r = boleR(y) + 0.14;
      p.setXYZ(i, Math.sin(th) * r, y, Math.cos(th) * r);
    }
    return geo;
  };
  ROOTS.forEach(([deg], i) => {
    const next = ROOTS[(i + 1) % 8][0], gap = deg + (((next - deg + 360) % 360) / 2) + rr(-4, 4);
    if (i === 7) return;                                // the hollow stands between the last root and the first
    add(sleeve(gap, rr(26, 34), rr(4.5, 9)), MOSS);
    const m = at(gap, rr(6.2, 7.2), -0.25);
    add(new THREE.IcosahedronGeometry(1, 1).scale(2.2, 0.7, 1.6).rotateY(gap * D).translate(m.x, m.y, m.z), MOSS);
  });
  [0, 2, 4, 6].forEach((i) => {
    const [deg, k] = ROOTS[i], r = rr(6.0, 7.0), h = 8.5 * k * (1 - (r - OFF) / 8.6) - 0.2;
    const c = at(deg + (i % 2 ? -3 : 3), r, h), slope = Math.atan2(8.5 * k, 8.6);
    add(new THREE.IcosahedronGeometry(1, 1).scale(1.0, 0.45, 2.0).rotateX(slope).rotateY(deg * D).translate(c.x, c.y, c.z), MOSS);
  });

  // ---- the crown: [azimuth, distance out, height, radius, half height] ---------------------------------
  const CLUMPS = [
    [72, 15.8, 42.3, 7.0, 4.3], [162, 15.6, 43.0, 6.8, 4.2], [252, 16.0, 41.8, 7.2, 4.4], [342, 15.7, 42.6, 6.9, 4.3],   // limb ends
    [117, 15.2, 39.8, 6.0, 3.8], [207, 15.4, 39.4, 6.2, 3.9], [297, 15.0, 40.2, 5.9, 3.8], [27, 15.3, 39.6, 6.0, 3.8],   // rim between
    [45, 8.8, 49.6, 7.0, 4.4], [135, 9.2, 50.2, 6.6, 4.3], [225, 8.6, 49.2, 6.9, 4.4], [315, 9.0, 50.0, 6.7, 4.3],      // upper ring
    [95, 3.0, 55.4, 7.2, 4.4], [275, 2.8, 56.0, 6.8, 4.3],                                                             // top
  ];
  const centre = (k) => { const [az, r, y] = CLUMPS[k]; return at(az, r, y).add(lean(TOPY)); };

  // ---- limbs: two tapered cylinders each, knuckles at the elbows, branches into the crown -------------
  const LIMBS = [66, 156, 246, 336];
  const t0 = lean(TOPY), hangs = [];
  LIMBS.forEach((az, k) => {
    const p0 = at(az, 1.2, 26.5).add(t0), p1 = at(az + 3, 8.0, 35.8).add(t0), p2 = centre(k).lerp(p1, 0.12);
    add(rod(p0, p1, 2.5, 1.75, 10), BARK);
    add(ball(p1, 1.85, 10, 7), BARK);
    add(rod(p1, p2, 1.75, 0.8, 9), BARK);
    // up into the upper ring, and out to the rim clump that follows this limb
    add(rod(p1, p1.clone().lerp(centre(8 + k), 0.9), 1.2, 0.5, 8), BARK);
    add(rod(p1, p1.clone().lerp(centre(4 + k), 0.9), 1.1, 0.45, 8), BARK);
    hangs.push(p0.clone().lerp(p1, 0.72), p1.clone().lerp(p2, 0.45));
  });
  add(rod(V(t0.x, 29, t0.z), centre(12).lerp(centre(13), 0.5).setY(53.5), 1.7, 0.6, 9), BARK);   // a leader

  // each clump: a lumpy flattened icosahedron in moss, a smaller one in fern breaking through on top
  CLUMPS.forEach(([, , , R, H], k) => {
    const c = centre(k), spin = rr(0, 6.28);
    add(soft(blob(R * rr(0.93, 1.05), H, R * rr(0.93, 1.05), 0.13).rotateY(spin).translate(c.x, c.y, c.z)), MOSS, true);
    const s = R * rr(0.62, 0.72), q = c.clone().add(at(rr(0, 360), R * rr(0.08, 0.2), H * rr(0.34, 0.44)));
    add(soft(blob(s, s * 0.52, s * rr(0.85, 1.0), 0.15).rotateY(spin + 1).translate(q.x, q.y, q.z)), FERN, true);
  });

  // ---- pods: an ellipsoid with a cone for a tip, on a thin cylinder --------------------------------------
  const pods = [];
  const hang = (a, drop, k) => {
    const e = a.clone().add(V(rr(-0.3, 0.3), -drop, rr(-0.3, 0.3)));
    add(rod(a, e.clone().add(V(0, -0.4 * k, 0)), 0.16, 0.11, 5), FERN);
    const c = e.clone().add(V(0, -0.95 * k, 0));
    pods.push(new THREE.SphereGeometry(1, 8, 6).scale(0.66 * k, 0.95 * k, 0.66 * k).translate(c.x, c.y, c.z));
    pods.push(new THREE.ConeGeometry(0.4 * k, 0.8 * k, 7, 1).rotateX(Math.PI).translate(c.x, c.y - 0.95 * k, c.z));
  };
  // under the eight rim clumps: [clump, azimuth nudge, drop, size]
  for (const [k, da, drop, s] of [[0, -6, 5.4, 1.25], [1, 5, 6.2, 1.15], [2, -4, 5.0, 1.3], [3, 6, 5.8, 1.2],
    [4, 4, 3.6, 1.1], [5, -5, 4.3, 1.25], [6, 5, 3.3, 1.15], [7, -4, 4.1, 1.35]]) {
    const [az, r, y, , H] = CLUMPS[k];
    hang(at(az + da, r - 1.4, y - 0.5 * H).add(t0), drop, s);
  }
  // from the limbs, nearer the bole
  [[0, 2.9, 1.05], [3, 2.4, 1.15], [4, 3.2, 1.1], [7, 2.7, 1.2]].forEach(([h, drop, s]) => hang(hangs[h], drop, s));

  // ---- meshes: one per material, and the pods on their own; nothing below the ground ------------------
  const merge = (geos) => {
    let n = 0;
    for (const x of geos) n += x.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const x of geos) {
      pos.set(x.attributes.position.array, o * 3);
      nor.set(x.attributes.normal.array, o * 3);
      uv.set(x.attributes.uv.array, o * 2);
      o += x.attributes.position.count;
    }
    for (let i = 1; i < pos.length; i += 3) if (pos[i] < 0) pos[i] = 0;
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  };
  for (const [m, geos] of buckets) g.add(new THREE.Mesh(merge(geos), m));
  const glow = new THREE.Mesh(merge(pods.map(soft)), SPORE);
  glow.name = 'glow';
  g.add(glow);

  // ---- place: base on y = 0, centred on x and z ----------------------------------------------------------
  const box = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mat4) => { for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mat4)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = box.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= box.min.y; o.position.z -= c.z; });

  g.userData.parts = { glow };
  return g;
}
