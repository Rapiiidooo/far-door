import { clamp } from "./world.js";

// The explorer's movement. Every traversal verb is a state: ground, air, hang, climb, vault,
// grab (a block held), shove (a block moving) and use (turning a mirror). Distances are
// tuned to the 2 m grid: a running jump clears one cell with room to spare and a
// standing jump reaches a ledge 3 m up.
const R = 0.32,
  HEIGHT = 1.75,
  STEP = 0.55,
  RUN = 5.6,
  WALK = 2.1,
  GRAVITY = 21,
  JUMP = 7.4,
  COYOTE = 0.13,
  BUFFER = 0.15,
  SHIMMY = 1.35,
  CLIMB_TIME = 0.95,
  VAULT_TIME = 0.55,
  SHOVE_TIME = 1.05,
  TURN_RATE = 0.75;

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Hero {
  constructor(world, level) {
    this.world = world;
    this.level = level;
    this.hands = 2.05;
    this.pos = { x: 0, z: 0 };
    this.feet = 0;
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = Math.PI;
    this.state = "ground";
    this.t = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.regrab = 0;
    this.backHold = 0;
    this.landing = 0;
    this.fallStart = 0;
    this.prompt = "";
    this.safe = { x: 0, z: 0, feet: 0, yaw: Math.PI };
    this.events = [];
    this.stepLift = 0;
    // Positional snaps (squaring up to a block, catching a ledge) are absorbed here and
    // eased out by the renderer, so the body glides instead of teleporting.
    this.snap = { x: 0, z: 0 };
    this.sinceJump = 9;
  }

  spawn(x, z, feet, yaw) {
    Object.assign(this.pos, { x, z });
    this.feet = feet;
    this.yaw = yaw;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.state = "ground";
    this.safe = { x, z, feet, yaw };
  }

  get facing() {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
  }

  get speed() {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  // input: { move: {x, y} camera relative, camYaw, jump, interact, interactHeld, drop, walk }
  update(dt, input) {
    this.t += dt;
    this.regrab = Math.max(0, this.regrab - dt);
    this.landing = Math.max(0, this.landing - dt * 3);
    this.stepLift *= Math.exp(-dt * 14);
    const decay = Math.exp(-dt * 11);
    this.snap.x *= decay;
    this.snap.z *= decay;
    this.sinceJump += dt;
    if (input.jump) this.buffer = BUFFER;
    else this.buffer = Math.max(0, this.buffer - dt);
    const wish = worldWish(input.move, input.camYaw);
    this.wish = wish;
    this.prompt = "";
    this[this.state](dt, input, wish);
    if (this.feet < -5 && this.state === "air") {
      this.lastFall = "deep";
      this.respawn();
    }
  }

  // --- ground ---------------------------------------------------------------
  ground(dt, input, wish) {
    const w = this.world;
    const target = input.walk ? WALK : RUN;
    const k = wish.len > 0.05 ? 11 : 14;
    const blend = 1 - Math.exp(-k * dt);
    this.vel.x += (wish.x * target - this.vel.x) * blend;
    this.vel.z += (wish.z * target - this.vel.z) * blend;
    if (wish.len > 0.05) this.turnTowards(Math.atan2(wish.x, wish.z), dt, 13);

    const nx = this.pos.x + this.vel.x * dt,
      nz = this.pos.z + this.vel.z * dt;
    // Walking never steps off an edge, as a deliberate way to line up a jump.
    if (
      input.walk &&
      w.ground(nx, nz, R * 0.6, this.feet, STEP) < this.feet - STEP
    ) {
      this.vel.x = this.vel.z = 0;
    } else {
      this.pos.x = nx;
      this.pos.z = nz;
    }
    w.resolve(this.pos, R, this.feet, HEIGHT, STEP);
    const g = w.ground(this.pos.x, this.pos.z, R * 0.6, this.feet, STEP);
    if (g >= this.feet - 0.6) {
      if (g !== this.feet) this.stepLift += this.feet - g;
      this.feet = g;
      this.coyote = COYOTE;
      this.remember();
    } else {
      // Off an edge: fall at once, but keep the coyote window for a late jump.
      this.state = "air";
      this.vel.y = 0;
      this.fallStart = this.feet;
      return;
    }

    const target2 = this.interactTarget();
    if (target2) this.prompt = target2.kind === "mirror" ? "turn" : "grab";
    else if (this.speed < 1.5 && this.findEdgeBelow()) this.prompt = "edge";

    if (this.buffer > 0) {
      const ledge = this.findLedge(0.5, 1.4, R + 0.55);
      if (ledge) return this.beginVault(ledge);
      this.buffer = 0;
      this.coyote = 0;
      this.state = "air";
      this.vel.y = JUMP;
      this.sinceJump = 0;
      this.jumpCut = false;
      this.fallStart = this.feet;
      // A standing jump still carries you forward if the stick asks for it.
      if (this.speed < 2.4 && wish.len > 0.3) {
        this.vel.x = wish.x * 2.6;
        this.vel.z = wish.z * 2.6;
      }
      this.events.push("jump");
      return;
    }
    if (input.interactHeld && target2?.kind === "mirror") {
      this.faceBox(target2.box);
      this.state = "turn";
      this.t = 0;
      this.grip = { ref: target2.ref, box: target2.box };
      this.events.push("grip");
      return;
    }
    if (input.interactHeld && target2?.kind === "block") {
      this.beginGrab(target2);
      return;
    }
    if (input.drop) {
      const edge = this.findEdgeBelow();
      if (edge) this.beginHangFromTop(edge);
    }
  }

  // --- air ------------------------------------------------------------------
  air(dt, input, wish) {
    const w = this.world;
    // Letting go of jump early cuts the rise short; falling is a little heavier than
    // rising, which keeps arcs readable without feeling floaty.
    if (
      !input.jumpHeld &&
      !this.jumpCut &&
      this.vel.y > 2 &&
      this.sinceJump < 0.35
    ) {
      this.vel.y *= 0.55;
      this.jumpCut = true;
    }
    this.vel.y -= GRAVITY * (this.vel.y < 0 ? 1.3 : 1) * dt;
    const air = 1 - Math.exp(-2.2 * dt);
    if (wish.len > 0.05) {
      this.vel.x += (wish.x * RUN - this.vel.x) * air * 0.5;
      this.vel.z += (wish.z * RUN - this.vel.z) * air * 0.5;
      this.turnTowards(Math.atan2(wish.x, wish.z), dt, 4);
    }
    // Late jump just after running off an edge.
    if (this.buffer > 0 && this.coyote > 0) {
      this.buffer = 0;
      this.coyote = 0;
      this.vel.y = JUMP;
      this.sinceJump = 0;
      this.jumpCut = false;
      this.events.push("jump");
    }
    this.coyote -= dt;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.feet += this.vel.y * dt;
    w.resolve(this.pos, R, this.feet, HEIGHT, 0.2);
    if (this.vel.y > 0) {
      const c = w.ceiling(this.pos.x, this.pos.z, R * 0.8, this.feet, HEIGHT);
      if (this.feet + HEIGHT > c) {
        this.feet = c - HEIGHT;
        this.vel.y = 0;
      }
    }
    // Hands catch a ledge on the way down, or near the top of the jump.
    if (this.vel.y < 2.5 && this.regrab <= 0 && !input.drop) {
      const ledge = this.findLedge(1.3, this.hands + 0.4, R + 0.3);
      // Only a wall the explorer is heading into, or hanging still beside, is caught.
      if (ledge && this.vel.x * ledge.n.x + this.vel.z * ledge.n.z < 0.8)
        return this.beginHang(ledge);
    }
    if (this.vel.y <= 0) {
      const g = w.ground(this.pos.x, this.pos.z, R * 0.6, this.feet, 0.25);
      if (this.feet <= g + 1e-3) {
        const drop = this.fallStart - g;
        // A fall of more than two storeys ends the attempt, as it would on real stone.
        if (drop > 6.5) {
          this.lastFall = "high";
          return this.respawn();
        }
        this.feet = g;
        this.landing = clamp(-this.vel.y / 14, 0.15, 1);
        this.vel.y = 0;
        this.state = "ground";
        this.coyote = COYOTE;
        this.events.push(drop > 3.5 ? "land-hard" : "land");
      }
    }
  }

  // --- hang -----------------------------------------------------------------
  beginHang(ledge) {
    this.state = "hang";
    this.ledge = ledge;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.yaw = Math.atan2(-ledge.n.x, -ledge.n.z);
    const ox = this.pos.x,
      oz = this.pos.z,
      of = this.feet;
    this.placeOnLedge(ledge.hand.x, ledge.hand.z);
    this.snap.x += ox - this.pos.x;
    this.snap.z += oz - this.pos.z;
    this.stepLift += of - this.feet;
    this.backHold = 0;
    this.events.push("grab");
  }

  beginHangFromTop(edge) {
    this.beginHang(edge);
    this.events.push("drop-to-hang");
  }

  placeOnLedge(hx, hz) {
    const { n, top } = this.ledge;
    this.ledge.hand = { x: hx, z: hz };
    this.pos.x = hx + n.x * (R + 0.04);
    this.pos.z = hz + n.z * (R + 0.04);
    this.feet = top - this.hands;
  }

  hang(dt, input, wish) {
    const { n, top } = this.ledge;
    const tx = -n.z,
      tz = n.x; // along the face
    const along = wish.x * tx + wish.z * tz;
    const into = -(wish.x * n.x + wish.z * n.z);
    this.shimmy = 0;
    this.prompt = "hang";
    if (Math.abs(along) > 0.35) {
      const s = Math.sign(along) * SHIMMY * dt;
      const hx = this.ledge.hand.x + tx * s,
        hz = this.ledge.hand.z + tz * s;
      const probe = 0.22 * Math.sign(along);
      const support = this.world.topAt(
        hx + tx * probe - n.x * 0.15,
        hz + tz * probe - n.z * 0.15,
        top,
      );
      const bx = hx + n.x * (R + 0.04),
        bz = hz + n.z * (R + 0.04);
      if (
        support &&
        this.world.free(bx, bz, R * 0.85, top - this.hands + 0.1, top - 0.15)
      ) {
        this.placeOnLedge(hx, hz);
        this.shimmy = Math.sign(along);
      }
    }
    if (into > 0.5 || this.buffer > 0) {
      this.buffer = 0;
      const spot = this.climbSpot();
      if (spot) {
        this.state = "climb";
        this.t = 0;
        this.from = { x: this.pos.x, z: this.pos.z, feet: this.feet };
        this.to = { x: spot.x, z: spot.z, feet: top };
        this.events.push("climb");
        return;
      }
    }
    this.backHold = into < -0.5 ? this.backHold + dt : 0;
    if (input.drop || this.backHold > 0.35) {
      this.state = "air";
      this.vel.y = 0;
      this.fallStart = this.feet;
      this.regrab = 0.35;
      this.pos.x += n.x * 0.08;
      this.pos.z += n.z * 0.08;
      this.events.push("let-go");
    }
  }

  // Where the explorer can stand after pulling up: straight over the hands, or a little to
  // either side when a wall crowds the spot.
  climbSpot() {
    const { n, top, hand } = this.ledge;
    const tx = -n.z,
      tz = n.x;
    for (const off of [0, 0.15, -0.15, 0.3, -0.3, 0.45, -0.45]) {
      const hx = hand.x + tx * off,
        hz = hand.z + tz * off;
      if (!this.world.topAt(hx - n.x * 0.15, hz - n.z * 0.15, top)) continue;
      const x = hx - n.x * 0.6,
        z = hz - n.z * 0.6;
      if (this.world.free(x, z, R, top + 0.02, top + HEIGHT)) return { x, z };
    }
    return null;
  }

  climb(dt) {
    this.t += dt / CLIMB_TIME;
    const k = Math.min(1, this.t);
    const up = smooth(Math.min(1, k / 0.55)),
      over = smooth(clamp((k - 0.45) / 0.55, 0, 1));
    this.feet = this.from.feet + (this.to.feet - this.from.feet) * up;
    this.pos.x = this.from.x + (this.to.x - this.from.x) * over;
    this.pos.z = this.from.z + (this.to.z - this.from.z) * over;
    if (k >= 1) this.land();
  }

  beginVault(ledge) {
    this.buffer = 0;
    this.state = "vault";
    this.t = 0;
    this.yaw = Math.atan2(-ledge.n.x, -ledge.n.z);
    this.from = { x: this.pos.x, z: this.pos.z, feet: this.feet };
    this.to = {
      x: ledge.hand.x - ledge.n.x * 0.55,
      z: ledge.hand.z - ledge.n.z * 0.55,
      feet: ledge.top,
    };
    this.vel.x = this.vel.z = 0;
    this.events.push("vault");
  }

  vault(dt) {
    this.t += dt / VAULT_TIME;
    const k = Math.min(1, this.t);
    const up = smooth(Math.min(1, k / 0.6)),
      over = smooth(clamp((k - 0.25) / 0.75, 0, 1));
    this.feet = this.from.feet + (this.to.feet - this.from.feet) * up;
    this.pos.x = this.from.x + (this.to.x - this.from.x) * over;
    this.pos.z = this.from.z + (this.to.z - this.from.z) * over;
    if (k >= 1) this.land();
  }

  land() {
    this.state = "ground";
    this.t = 0;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.coyote = COYOTE;
  }

  // --- blocks and mirrors ---------------------------------------------------
  beginGrab(target) {
    const n = this.faceBox(target.box);
    this.state = "grab";
    this.grip = { ref: target.ref, box: target.box, n };
    this.vel.x = this.vel.z = 0;
    this.events.push("grip");
  }

  grab(dt, input, wish) {
    const { n, ref } = this.grip;
    this.prompt = "block";
    if (!input.interactHeld) return this.land();
    const into = -(wish.x * n.x + wish.z * n.z);
    if (Math.abs(into) > 0.6) {
      const pulling = into < 0;
      const dir = pulling ? { x: n.x, z: n.z } : { x: -n.x, z: -n.z };
      // Pulling needs a free cell of level ground behind the explorer.
      const bx = this.pos.x + n.x * 2,
        bz = this.pos.z + n.z * 2;
      const room =
        !pulling ||
        (this.world.free(bx, bz, R, this.feet + 0.05, this.feet + HEIGHT) &&
          Math.abs(
            this.world.ground(bx, bz, R * 0.6, this.feet, STEP) - this.feet,
          ) < 0.05);
      if (room && this.level.moveBlock(ref, dir, SHOVE_TIME)) {
        this.state = "shove";
        this.t = 0;
        this.from = { x: this.pos.x, z: this.pos.z };
        this.dir = dir;
        this.pulling = pulling;
        this.events.push(pulling ? "pull" : "push");
      }
    }
  }

  shove(dt) {
    this.t += dt / SHOVE_TIME;
    const k = smooth(Math.min(1, this.t));
    this.pos.x = this.from.x + this.dir.x * 2 * k;
    this.pos.z = this.from.z + this.dir.z * 2 * k;
    if (this.t >= 1) {
      this.state = "grab";
      this.grip.box = this.level.blockBox(this.grip.ref);
    }
  }

  // Holding a mirror's handles: left and right turn it, releasing lets go.
  turn(dt, input) {
    this.prompt = "turning";
    this.t += dt;
    if (!input.interactHeld) return this.land();
    const spin = input.move.x;
    this.turning = spin;
    if (Math.abs(spin) > 0.2)
      this.level.turnMirror(this.grip.ref, -spin * TURN_RATE * dt);
  }

  // --- queries --------------------------------------------------------------
  interactTarget() {
    const f = this.facing;
    let best = null,
      bestD = Infinity;
    for (const item of this.level.interactables()) {
      const b = item.box;
      const cx = clamp(this.pos.x, b.minX, b.maxX),
        cz = clamp(this.pos.z, b.minZ, b.maxZ);
      const dx = cx - this.pos.x,
        dz = cz - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > R + 0.55 || b.minY > this.feet + 0.6 || b.maxY < this.feet + 0.5)
        continue;
      // Facing it, or simply touching it: standing against a mirror is enough to take hold.
      if (d > R + 0.15 && (dx * f.x + dz * f.z) / d < 0.35) continue;
      if (d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  // Turns to face the nearest side of a box and returns that side's outward normal.
  faceBox(b) {
    const n = sideNormal(this.pos, b);
    this.yaw = Math.atan2(-n.x, -n.z);
    const ox = this.pos.x,
      oz = this.pos.z;
    if (n.x) this.pos.x = (n.x > 0 ? b.maxX : b.minX) + n.x * (R + 0.1);
    if (n.z) this.pos.z = (n.z > 0 ? b.maxZ : b.minZ) + n.z * (R + 0.1);
    if (n.x) this.pos.z = clamp(this.pos.z, b.minZ + 0.3, b.maxZ - 0.3);
    if (n.z) this.pos.x = clamp(this.pos.x, b.minX + 0.3, b.maxX - 0.3);
    this.snap.x += ox - this.pos.x;
    this.snap.z += oz - this.pos.z;
    return n;
  }

  // A ledge whose top lies between feet + low and feet + high, on a side the explorer faces.
  findLedge(low, high, reach) {
    const f = this.facing;
    let best = null;
    for (const b of this.world.boxes) {
      if (
        !b.solid ||
        b.kind === "mirror" ||
        b.kind === "stela" ||
        b.kind === "fire"
      )
        continue;
      const top = b.maxY;
      if (top < this.feet + low || top > this.feet + high) continue;
      if (b.maxX - b.minX < 0.6 && b.maxZ - b.minZ < 0.6) continue;
      const n = sideNormal(this.pos, b);
      if (-(n.x * f.x + n.z * f.z) < 0.55) continue;
      const faceX = n.x ? (n.x > 0 ? b.maxX : b.minX) : null,
        faceZ = n.z ? (n.z > 0 ? b.maxZ : b.minZ) : null;
      const gap = n.x ? (this.pos.x - faceX) * n.x : (this.pos.z - faceZ) * n.z;
      if (gap < -0.05 || gap > reach) continue;
      const hx = n.x ? faceX : clamp(this.pos.x, b.minX + 0.25, b.maxX - 0.25);
      const hz = n.z ? faceZ : clamp(this.pos.z, b.minZ + 0.25, b.maxZ - 0.25);
      if (
        !this.world.free(hx - n.x * 0.2, hz - n.z * 0.2, 0.14, top, top + 0.45)
      )
        continue;
      if (!best || gap < best.gap)
        best = { box: b, top, n, hand: { x: hx, z: hz }, gap };
    }
    return best;
  }

  // Standing at an edge and facing a drop: the ledge under the explorer's feet.
  findEdgeBelow() {
    const f = this.facing;
    const ax = Math.abs(f.x) > Math.abs(f.z);
    const n = ax ? { x: Math.sign(f.x), z: 0 } : { x: 0, z: Math.sign(f.z) };
    const b = this.world.topAt(this.pos.x, this.pos.z, this.feet, 0.05);
    if (!b) return null;
    const faceX = n.x ? (n.x > 0 ? b.maxX : b.minX) : null,
      faceZ = n.z ? (n.z > 0 ? b.maxZ : b.minZ) : null;
    const gap = n.x ? (faceX - this.pos.x) * n.x : (faceZ - this.pos.z) * n.z;
    if (gap > 0.8) return null;
    const hx = n.x ? faceX : this.pos.x,
      hz = n.z ? faceZ : this.pos.z;
    const below = this.world.ground(
      hx + n.x * 0.6,
      hz + n.z * 0.6,
      0.2,
      this.feet - 1.2,
      0,
    );
    if (below > this.feet - 1.6) return null;
    if (
      !this.world.free(
        hx + n.x * (R + 0.04),
        hz + n.z * (R + 0.04),
        R * 0.85,
        this.feet - this.hands,
        this.feet - 0.1,
      )
    )
      return null;
    return { box: b, top: this.feet, n, hand: { x: hx, z: hz } };
  }

  turnTowards(target, dt, rate) {
    const d = wrapAngle(target - this.yaw);
    this.yaw = wrapAngle(this.yaw + clamp(d, -rate * dt, rate * dt));
  }

  remember() {
    if (this.feet < -0.5 || this.t - (this.rememberedAt || 0) < 0.3) return;
    this.rememberedAt = this.t;
    const w = this.world;
    // Only a spot with firm ground all round is a safe place to return to.
    for (const [dx, dz] of [
      [0.7, 0],
      [-0.7, 0],
      [0, 0.7],
      [0, -0.7],
    ])
      if (
        Math.abs(
          w.ground(this.pos.x + dx, this.pos.z + dz, 0.1, this.feet, 0.1) -
            this.feet,
        ) > 0.05
      )
        return;
    this.safe = {
      x: this.pos.x,
      z: this.pos.z,
      feet: this.feet,
      yaw: this.yaw,
    };
  }

  respawn() {
    const s = this.safe;
    this.spawn(s.x, s.z, s.feet, s.yaw);
    this.events.push("respawn");
  }
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// Camera-relative stick to a world direction. The camera looks along (sin yaw, cos yaw).
function worldWish(move, camYaw) {
  const fx = Math.sin(camYaw),
    fz = Math.cos(camYaw);
  const rx = -fz,
    rz = fx;
  const x = fx * move.y + rx * move.x,
    z = fz * move.y + rz * move.x;
  const len = Math.hypot(x, z);
  return len > 1e-4
    ? {
        x: x / Math.max(1, len),
        z: z / Math.max(1, len),
        len: Math.min(1, len),
      }
    : { x: 0, z: 0, len: 0 };
}

// Outward normal of the box side nearest a point outside it.
function sideNormal(p, b) {
  const dx = p.x < b.minX ? p.x - b.minX : p.x > b.maxX ? p.x - b.maxX : 0;
  const dz = p.z < b.minZ ? p.z - b.minZ : p.z > b.maxZ ? p.z - b.maxZ : 0;
  if (Math.abs(dx) >= Math.abs(dz) && dx !== 0)
    return { x: Math.sign(dx), z: 0 };
  if (dz !== 0) return { x: 0, z: Math.sign(dz) };
  // Inside or touching: the nearest face.
  const opts = [
    [p.x - b.minX, -1, 0],
    [b.maxX - p.x, 1, 0],
    [p.z - b.minZ, 0, -1],
    [b.maxZ - p.z, 0, 1],
  ].sort((a, c) => a[0] - c[0])[0];
  return { x: opts[1], z: opts[2] };
}
