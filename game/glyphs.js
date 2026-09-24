import * as THREE from "three";

// The glyphs of the addresses, built as thin raised geometry in the XY plane,
// facing +Z and centred. They sit in the stelae's panels and on the gate's medallions.

const DEPTH = 0.025;

function ring(r, w, x = 0, y = 0) {
  const s = new THREE.Shape();
  s.absarc(x, y, r, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(x, y, r - w, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

function disc(r, x = 0, y = 0) {
  const s = new THREE.Shape();
  s.absarc(x, y, r, 0, Math.PI * 2, false);
  return s;
}

// A spiral band: inner and outer edges of an Archimedean spiral joined into one outline.
function spiral(turns, r0, r1, w) {
  const n = 90,
    outer = [],
    inner = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      a = t * turns * Math.PI * 2,
      r = r0 + (r1 - r0) * t;
    outer.push(
      new THREE.Vector2(Math.cos(a) * (r + w / 2), Math.sin(a) * (r + w / 2)),
    );
    inner.push(
      new THREE.Vector2(
        Math.cos(a) * Math.max(0.005, r - w / 2),
        Math.sin(a) * Math.max(0.005, r - w / 2),
      ),
    );
  }
  return new THREE.Shape([...outer, ...inner.reverse()]);
}

function triangleOutline(size, w) {
  const h = size * 0.87;
  const pts = [
    [0, h * 0.62],
    [size / 2, -h * 0.38],
    [-size / 2, -h * 0.38],
  ];
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const k = 1 - (w * 3.4) / size;
  const hole = new THREE.Path(
    pts.map(([x, y]) => new THREE.Vector2(x * k, y * k - w * 0.2)).reverse(),
  );
  s.holes.push(hole);
  return s;
}

// A crescent: the left part of a circle minus a circle shifted right that passes through
// both horns, so the band is thickest at the left and comes to points at the horns.
function crescent(r) {
  const s = new THREE.Shape();
  const n = 48,
    horn = 0.95;
  for (let i = 0; i <= n; i++) {
    const a = horn + ((Math.PI * 2 - 2 * horn) * i) / n;
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const hx = Math.cos(horn) * r,
    hy = Math.sin(horn) * r;
  const cx = r * 0.42;
  const ri = Math.hypot(hx - cx, hy);
  const b = Math.atan2(hy, hx - cx);
  // Back from the lower horn to the upper one, the long way round the left.
  for (let i = 1; i < n; i++) {
    const a = -b - ((Math.PI * 2 - 2 * b) * i) / n;
    s.lineTo(cx + Math.cos(a) * ri, Math.sin(a) * ri);
  }
  s.closePath();
  return s;
}

// Three stacked wave lines, each a band following a sine.
function waves(width, amp, w) {
  const shapes = [];
  for (const y0 of [-0.24, 0, 0.24]) {
    const top = [],
      bottom = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const x = -width / 2 + (width * i) / n;
      const y = y0 + Math.sin((i / n) * Math.PI * 3) * amp;
      top.push(new THREE.Vector2(x, y + w / 2));
      bottom.push(new THREE.Vector2(x, y - w / 2));
    }
    shapes.push(new THREE.Shape([...top, ...bottom.reverse()]));
  }
  return shapes;
}

const SHAPES = {
  twin: () => [ring(0.23, 0.07, -0.21), ring(0.23, 0.07, 0.21)],
  spiral: () => [spiral(2.2, 0.02, 0.4, 0.07)],
  peak: () => [triangleOutline(0.9, 0.075), disc(0.07, 0, -0.06)],
  crescent: () => [crescent(0.42)],
  waves: () => waves(0.84, 0.06, 0.075),
  disc: () => [ring(0.4, 0.075), disc(0.12)],
};

export function makeGlyph(kind, size, material) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(SHAPES[kind](), {
    depth: DEPTH,
    bevelEnabled: false,
    curveSegments: 24,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.setScalar(size);
  mesh.scale.z = 1;
  g.add(mesh);
  return g;
}

export function glyphMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x1d5f63,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x39e3d0,
    emissiveIntensity: 0,
  });
}
