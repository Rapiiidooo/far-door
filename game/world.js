// Axis-aligned box colliders. The level is built from 2 m cells, so every solid thing the
// hero can stand on, hang from or bump into is a box; the hero is a vertical cylinder.

export class World {
  constructor() {
    this.boxes = [];
  }

  add(minX, minY, minZ, maxX, maxY, maxZ, kind = "rock", ref = null) {
    const box = { minX, minY, minZ, maxX, maxY, maxZ, kind, ref, solid: true };
    this.boxes.push(box);
    return box;
  }

  remove(box) {
    const i = this.boxes.indexOf(box);
    if (i >= 0) this.boxes.splice(i, 1);
  }

  // Highest top under a disc that the feet can reach by stepping, or -Infinity over a void.
  ground(x, z, radius, feet, stepUp) {
    let best = -Infinity;
    for (const b of this.boxes) {
      if (!b.solid || b.maxY > feet + stepUp || b.maxY <= best) continue;
      if (discHitsBox(x, z, radius, b)) best = b.maxY;
    }
    return best;
  }

  // Pushes a cylinder out of every box overlapping its body above the step height.
  // Returns the last wall normal touched, so the caller can slide or detect a push.
  resolve(pos, radius, feet, height, stepUp) {
    let normal = null;
    for (let pass = 0; pass < 2; pass++) {
      for (const b of this.boxes) {
        if (!b.solid || b.maxY <= feet + stepUp || b.minY >= feet + height)
          continue;
        const cx = clamp(pos.x, b.minX, b.maxX),
          cz = clamp(pos.z, b.minZ, b.maxZ);
        let dx = pos.x - cx,
          dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
          normal = { x: dx / d, z: dz / d, box: b };
        } else {
          // Centre inside the box: leave by the nearest face.
          const exits = [
            [pos.x - b.minX, -1, 0],
            [b.maxX - pos.x, 1, 0],
            [pos.z - b.minZ, 0, -1],
            [b.maxZ - pos.z, 0, 1],
          ].sort((a, c) => a[0] - c[0])[0];
          if (exits[1])
            pos.x = exits[1] < 0 ? b.minX - radius : b.maxX + radius;
          else pos.z = exits[2] < 0 ? b.minZ - radius : b.maxZ + radius;
          normal = { x: exits[1], z: exits[2], box: b };
        }
      }
    }
    return normal;
  }

  // Lowest ceiling above the head within a disc, or Infinity.
  ceiling(x, z, radius, feet, height) {
    let best = Infinity;
    for (const b of this.boxes) {
      if (!b.solid || b.minY < feet + height * 0.6 || b.minY >= best) continue;
      if (discHitsBox(x, z, radius, b)) best = b.minY;
    }
    return best;
  }

  // Is a vertical slab of space free of boxes?
  free(x, z, radius, y0, y1, ignore = null) {
    for (const b of this.boxes) {
      if (
        !b.solid ||
        b === ignore ||
        b.maxY <= y0 + 1e-3 ||
        b.minY >= y1 - 1e-3
      )
        continue;
      if (discHitsBox(x, z, radius, b)) return false;
    }
    return true;
  }

  // Top surface exactly at a height under a point, used to follow a ledge while hanging.
  topAt(x, z, y, tolerance = 0.06) {
    for (const b of this.boxes) {
      if (!b.solid || Math.abs(b.maxY - y) > tolerance) continue;
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return b;
    }
    return null;
  }

  // First box hit by a ray, as a distance. Used by the camera and the light beams.
  ray(ox, oy, oz, dx, dy, dz, maxDist, filter = null) {
    let best = maxDist,
      hit = null;
    for (const b of this.boxes) {
      if (!b.solid || (filter && !filter(b))) continue;
      const t = rayBox(ox, oy, oz, dx, dy, dz, b, best);
      if (t !== null && t < best) {
        best = t;
        hit = b;
      }
    }
    return hit ? { t: best, box: hit } : null;
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function discHitsBox(x, z, r, b) {
  const cx = clamp(x, b.minX, b.maxX),
    cz = clamp(z, b.minZ, b.maxZ);
  const dx = x - cx,
    dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

function rayBox(ox, oy, oz, dx, dy, dz, b, maxT) {
  let t0 = 0,
    t1 = maxT;
  const axes = [
    [ox, dx, b.minX, b.maxX],
    [oy, dy, b.minY, b.maxY],
    [oz, dz, b.minZ, b.maxZ],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let a = (lo - o) / d,
      c = (hi - o) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return null;
  }
  return t0;
}
