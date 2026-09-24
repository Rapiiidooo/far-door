// clay_urns, candidate A: primitives. Bodies are squashed spheres on cylinder feet,
// necks are cylinders and lips tori; the incised rings are thin dark tori sunk into
// the surface; handles are torus arcs. The smallest urn is built from the same
// primitives with their sweep angles cut short, so a wedge of its shoulder and rim is
// missing, and the shards are small curved patches of sphere. 0.5, 0.75 and 1.0 m tall.
export default function (THREE) {
  const g = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const mat = (color, name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
    m.name = name;
    return m;
  };
  // Named plaster so the surface pass keeps fired clay smooth: by colour alone
  // terracotta classifies as timber and would grow wood grain.
  const CLAY = mat(0xa8603a, 'plaster', { roughness: 0.85, side: THREE.DoubleSide });
  const INSIDE = mat(0x8a5433, 'plaster', { roughness: 0.95, side: THREE.DoubleSide });
  const CHANNEL = mat(0x8a5433, 'plaster', { roughness: 0.9 });

  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z);
    parent.add(me);
    return me;
  };

  // one urn: body ellipsoid (radius rb, half height hb, centre yb), foot, neck, lip
  // a horizontal torus of `arc`, its gap turned to face +z
  const ringGeo = (r, t, seg, arc) => {
    const geo = new THREE.TorusGeometry(r, t, 4, seg, arc);
    geo.rotateX(-Math.PI / 2);
    geo.rotateY((Math.PI * 2 - arc) / 2 - Math.PI / 2);
    return geo;
  };
  const urn = ({ rb, hb, yb, foot, neck, lip, rings, handles, cut = 0 }) => {
    const u = new THREE.Group();
    const full = Math.PI * 2 - cut, start = cut / 2;       // any missing wedge faces +z
    const body = add(u, new THREE.SphereGeometry(1, 16, 12, Math.PI / 2 + start, full), CLAY, 0, yb, 0);
    body.scale.set(rb, hb, rb);
    const [fr0, fr1, fh] = foot;
    add(u, new THREE.CylinderGeometry(fr1, fr0, fh, 16), CLAY, 0, fh / 2, 0);
    const [nr, n0, n1] = neck;
    add(u, new THREE.CylinderGeometry(nr, nr * 1.25, n1 - n0, 16, 1, true, start, full), CLAY, 0, (n0 + n1) / 2, 0);
    const [lr, lt, ly] = lip;
    add(u, ringGeo(lr, lt, 16, full), CLAY, 0, ly, 0);
    if (!cut) add(u, new THREE.CylinderGeometry(lr - lt * 0.6, lr - lt * 0.6, 0.012, 16), INSIDE, 0, ly - 0.02, 0);
    const rAt = (y) => rb * Math.sqrt(Math.max(0, 1 - ((y - yb) / hb) ** 2));
    for (const y of rings) {
      add(u, ringGeo(rAt(y) - 0.002, 0.009, 24, full), CHANNEL, 0, y, 0);
    }
    for (const [phi, y, size, flatLoop] of handles) {
      const h = add(u, new THREE.TorusGeometry(size, 0.018, 6, 10, Math.PI), CLAY);
      const r = rAt(y) - 0.01;
      h.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r);
      // a vertical loop stands out from the wall; a lug lies flat against it
      if (flatLoop) h.rotation.set(-Math.PI / 2, phi - Math.PI, 0, 'YXZ');
      else h.rotation.set(0, phi - Math.PI / 2, -Math.PI / 2, 'YXZ');
    }
    return { u, rAt };
  };

  const big = urn({ rb: 0.29, hb: 0.44, yb: 0.48, foot: [0.14, 0.12, 0.08], neck: [0.1, 0.84, 0.95], lip: [0.115, 0.03, 0.965],
    rings: [0.58, 0.63, 0.68, 0.24], handles: [[Math.PI / 2, 0.8, 0.075, false], [-Math.PI / 2, 0.8, 0.075, false]] });
  big.u.position.set(-0.26, 0, -0.16);
  big.u.rotation.y = 0.3;
  g.add(big.u);

  const mid = urn({ rb: 0.225, hb: 0.33, yb: 0.35, foot: [0.115, 0.1, 0.06], neck: [0.09, 0.62, 0.71], lip: [0.105, 0.026, 0.725],
    rings: [0.42, 0.46, 0.2], handles: [[Math.PI / 2, 0.52, 0.05, true], [-Math.PI / 2, 0.52, 0.05, true]] });
  mid.u.position.set(0.36, 0, -0.2);
  mid.u.rotation.y = -0.5;
  g.add(mid.u);

  const small = urn({ rb: 0.165, hb: 0.22, yb: 0.23, foot: [0.09, 0.08, 0.04], neck: [0.075, 0.41, 0.47], lip: [0.085, 0.02, 0.48],
    rings: [0.26, 0.29], handles: [[Math.PI, 0.38, 0.045, false]], cut: 1.9 });
  small.u.position.set(0.08, 0, 0.33);
  small.u.rotation.y = 0.25;
  g.add(small.u);
  // the broken wedge shows the dark inside: a smaller sphere lines the wall
  const liner = add(small.u, new THREE.SphereGeometry(1, 12, 8), INSIDE, 0, 0.23, 0);
  liner.scale.set(0.15, 0.2, 0.15);

  // three shards: curved patches of the same wall, lying on the ground
  for (const [x, z, yaw, tilt, a] of [[0.34, 0.5, 0.4, 0.3, 0.7], [0.44, 0.28, 2.1, -0.4, 0.55], [-0.08, 0.58, 1.2, 0.5, 0.6]]) {
    const s = add(g, new THREE.SphereGeometry(0.165, 5, 3, 0, a, Math.PI * 0.35, Math.PI * 0.25), CLAY, x, 0, z);
    s.rotation.set(Math.PI / 2 + tilt, yaw, 0, 'YXZ');
    s.updateMatrixWorld(true);
    const p = s.geometry.attributes.position;
    let low = Infinity;
    for (let i = 0; i < p.count; i++) low = Math.min(low, V(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(s.matrixWorld).y);
    s.position.y -= low;
  }

  // --- placement: base on y = 0, centred on x and z -------------------------------------------------
  const bb = new THREE.Box3(), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), im = new THREE.Matrix4();
  g.updateMatrixWorld(true);
  g.traverse((n) => {
    const p = n.isMesh && n.geometry.attributes.position; if (!p) return;
    const put = (mm) => { for (let i = 0; i < p.count; i++) bb.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mm)); };
    if (n.isInstancedMesh) { for (let c = 0; c < n.count; c++) { n.getMatrixAt(c, im); put(m4.multiplyMatrices(n.matrixWorld, im)); } return; }
    put(n.matrixWorld);
  });
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((o) => { o.position.x -= c.x; o.position.y -= bb.min.y; o.position.z -= c.z; });
  return g;
}
