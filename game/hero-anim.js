import * as THREE from "three";

// Procedural animation for the articulated explorer. Each state builds a pose, a target
// angle per joint, and every joint axis chases its target through a damped spring, so
// states blend and land with weight instead of snapping. Gait curves follow real walking
// and running: the knee folds during the swing, the body bobs twice a cycle (lowest at
// mid-stance when running, highest when walking), shoulders counter-rotate the hips.
// Conventions follow the asset contract: with the front at +Z, a positive rotation.x
// swings a hanging limb backwards and tips the spine forwards.

const JOINTS = [
  "hips",
  "spine",
  "head",
  "leftUpperArm",
  "leftLowerArm",
  "rightUpperArm",
  "rightLowerArm",
  "leftUpperLeg",
  "leftLowerLeg",
  "rightUpperLeg",
  "rightLowerLeg",
];

// Spring frequency (Hz) and damping per joint; limbs are brisk, the head lags a little.
const TUNING = {
  hips: [6, 0.9],
  spine: [5, 0.8],
  head: [4, 0.7],
  leftUpperArm: [7, 0.75],
  rightUpperArm: [7, 0.75],
  leftLowerArm: [8, 0.8],
  rightLowerArm: [8, 0.8],
  leftUpperLeg: [9, 0.85],
  rightUpperLeg: [9, 0.85],
  leftLowerLeg: [10, 0.85],
  rightLowerLeg: [10, 0.85],
};

class Spring {
  constructor(v = 0) {
    this.v = v;
    this.dv = 0;
  }

  step(target, dt, freq, damping) {
    const w = freq * Math.PI * 2;
    // Semi-implicit Euler turns unstable once w·h nears 1 with this much damping, so
    // substep until each step is a small fraction of the spring's period.
    const n = Math.max(1, Math.ceil(dt * w * 4));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = w * w * (target - this.v) - 2 * damping * w * this.dv;
      this.dv += a * h;
      this.v += this.dv * h;
    }
    return this.v;
  }
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class HeroAnimator {
  constructor(model) {
    this.model = model;
    this.joints = model.userData.joints || {};
    this.rest = {};
    this.springs = {};
    for (const name of JOINTS) {
      const j = this.joints[name];
      if (!j) continue;
      this.rest[name] = { rot: j.rotation.clone(), pos: j.position.clone() };
      this.springs[name] = [new Spring(), new Spring(), new Spring()];
    }
    this.root = {
      yaw: new Spring(),
      pitch: new Spring(),
      roll: new Spring(),
      bob: new Spring(),
    };
    this.phase = 0;
    this.time = 0;
    this.lastYaw = null;
    this.lastSpeed = 0;
    this.lastState = "ground";
    this.scarf = { x: 0, z: 0, vx: 0, vz: 0 };
    this.look = { y: 0, target: 0, next: 3 };
  }

  update(dt, hero, reduced = false) {
    if (dt <= 0) return;
    this.time += dt;
    const turnRate =
      this.lastYaw === null ? 0 : wrap(hero.yaw - this.lastYaw) / dt;
    this.lastYaw = hero.yaw;
    const accel = (hero.speed - this.lastSpeed) / dt;
    this.lastSpeed = hero.speed;
    if (hero.state !== this.lastState) this.enter(hero.state, hero);
    this.lastState = hero.state;

    const pose = {};
    const root = { bob: 0, pitch: 0, roll: 0 };
    const builder = POSES[hero.state] || POSES.ground;
    builder.call(this, pose, root, hero, dt, { turnRate, accel });

    for (const name of JOINTS) {
      const j = this.joints[name],
        r = this.rest[name];
      if (!j || !r) continue;
      const t = pose[name] || [0, 0, 0];
      const [freq, damp] = TUNING[name];
      const s = this.springs[name];
      const f = reduced ? 30 : freq;
      j.rotation.set(
        r.rot.x + s[0].step(t[0], dt, f, damp),
        r.rot.y + s[1].step(t[1] || 0, dt, f, damp),
        r.rot.z + s[2].step(t[2] || 0, dt, f, damp),
      );
    }
    const hips = this.joints.hips;
    if (hips && this.rest.hips)
      hips.position.y =
        this.rest.hips.pos.y + this.root.bob.step(root.bob, dt, 7, 0.7);

    // The body turns with a little weight rather than snapping to the controller's heading.
    const yaw = this.root.yaw;
    if (this.lastState && yaw.v === 0 && yaw.dv === 0 && !this.started) {
      yaw.v = hero.yaw;
      this.started = true;
    }
    const targetYaw = yaw.v + wrap(hero.yaw - yaw.v);
    yaw.step(targetYaw, dt, reduced ? 30 : 5.5, 1);
    const pitch = this.root.pitch.step(root.pitch, dt, 4, 0.55);
    const roll = this.root.roll.step(root.roll, dt, 4, 0.8);
    const m = this.model;
    m.position.set(
      hero.pos.x + hero.snap.x,
      hero.feet + hero.stepLift,
      hero.pos.z + hero.snap.z,
    );
    m.rotation.set(pitch, yaw.v, roll, "YXZ");
    this.updateScarf(dt, hero, turnRate);
  }

  // One-off impulses when a state begins: the swing of a catch, the squash of a landing.
  enter(state, hero) {
    const S = this.springs;
    if (state === "hang") {
      this.root.pitch.dv += 3.2;
      if (S.leftUpperLeg) S.leftUpperLeg[0].dv -= 4;
      if (S.rightUpperLeg) S.rightUpperLeg[0].dv -= 3;
    }
    if (state === "ground" && this.lastState === "air") {
      const L = hero.landing;
      this.root.bob.dv -= 1.6 + 2.2 * L;
      if (S.spine) S.spine[0].dv += 3 + 5 * L;
      if (S.head) S.head[0].dv -= 2;
    }
  }

  updateScarf(dt, hero, turnRate) {
    const j = this.joints.scarfTail;
    if (!j) return;
    if (!this.scarfRest) this.scarfRest = j.rotation.clone();
    const gust =
      Math.sin(this.time * 2.3) * 0.5 + Math.sin(this.time * 5.1 + 1) * 0.3;
    const lift =
      hero.state === "hang"
        ? -0.1
        : 0.2 + hero.speed * 0.16 + Math.max(0, -hero.vel.y) * 0.07;
    const tx = Math.min(1.35, lift + gust * 0.12),
      tz = THREE.MathUtils.clamp(-turnRate * 0.08, -0.6, 0.6) + gust * 0.08;
    const s = this.scarf;
    s.vx += ((tx - s.x) * 60 - s.vx * 7) * dt;
    s.vz += ((tz - s.z) * 60 - s.vz * 7) * dt;
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    j.rotation.x = this.scarfRest.x + s.x;
    j.rotation.z = this.scarfRest.z + s.z;
  }
}

function set(pose, name, x = 0, y = 0, z = 0) {
  pose[name] = [x, y, z];
}

function add(pose, name, x = 0, y = 0, z = 0) {
  const p = pose[name] || (pose[name] = [0, 0, 0]);
  p[0] += x;
  p[1] += y;
  p[2] += z;
}

// Locomotion blends an idle stance, a walk and a run by speed.
function locomotion(pose, root, hero, dt, { turnRate, accel }) {
  const speed = hero.speed;
  const r = smooth(2.2, 4.6, speed);
  const moving = smooth(0.08, 0.7, speed);
  const cycle = mix(1.5, 2.9, r);
  this.phase =
    (this.phase + (Math.PI * 2 * speed * dt) / cycle) % (Math.PI * 2);
  const phi = this.phase;
  const thighAmp = mix(0.42, 0.8, r) * moving,
    swingKnee = mix(0.8, 1.6, r) * moving,
    stanceKnee = mix(0.06, 0.26, r) * moving,
    armAmp = mix(0.3, 0.7, r) * moving,
    elbow = mix(0.22, 1.3, r) * moving,
    twist = mix(0.1, 0.2, r) * moving;
  const leg = (p) => {
    const thigh = thighAmp * Math.sin(p);
    const knee =
      stanceKnee +
      swingKnee * Math.pow(Math.max(0, Math.cos(p + 0.4 * r)), 1.3);
    return [-thigh, knee];
  };
  const [lt, lk] = leg(phi),
    [rt, rk] = leg(phi + Math.PI);
  set(pose, "leftUpperLeg", lt, 0, 0.02);
  set(pose, "leftLowerLeg", lk);
  set(pose, "rightUpperLeg", rt, 0, -0.02);
  set(pose, "rightLowerLeg", rk);
  const s = Math.sin(phi);
  set(pose, "leftUpperArm", armAmp * s, 0, 0.09 + 0.05 * r);
  set(pose, "rightUpperArm", -armAmp * s, 0, -0.09 - 0.05 * r);
  set(pose, "leftLowerArm", -0.18 - elbow);
  set(pose, "rightLowerArm", -0.18 - elbow);
  const lean =
    0.03 + 0.2 * r * moving + THREE.MathUtils.clamp(accel * 0.015, -0.12, 0.12);
  set(pose, "hips", 0, -0.45 * twist * s, 0);
  set(pose, "spine", lean, twist * s, 0);
  set(pose, "head", -0.55 * lean - 0.04, -0.7 * twist * s, 0);
  const bounce = Math.abs(s);
  root.bob = moving * mix(0.015 - 0.035 * bounce, 0.05 * bounce - 0.045, r);
  root.roll = THREE.MathUtils.clamp(-turnRate * speed * 0.03, -0.28, 0.28);

  // Standing still: breathing, a slow shift of weight, and now and then a look around.
  const idle = 1 - moving;
  if (idle > 0.01) {
    const t = this.time;
    const breathe = Math.sin(t * 1.6) * 0.022;
    const shift = Math.sin(t * 0.55) * 0.045;
    const L = this.look;
    L.next -= dt;
    if (L.next <= 0) {
      L.target = Math.random() < 0.4 ? 0 : (Math.random() - 0.5) * 1.1;
      L.next = 2.5 + Math.random() * 3.5;
    }
    L.y += (L.target - L.y) * Math.min(1, dt * 2.5);
    add(pose, "spine", idle * breathe, 0, idle * shift * 0.5);
    add(pose, "hips", 0, 0, -idle * shift);
    add(pose, "head", -idle * breathe, idle * L.y, 0);
    add(pose, "leftUpperArm", 0, 0, idle * 0.05);
    add(pose, "rightUpperArm", 0, 0, -idle * 0.05);
    add(pose, "leftLowerArm", -idle * 0.12);
    add(pose, "rightLowerArm", -idle * 0.12);
    add(pose, "leftUpperLeg", 0, 0, idle * (0.06 + shift));
    add(pose, "rightUpperLeg", 0, 0, idle * (-0.06 + shift));
  }

  // Landing folds the knees for a beat.
  const L = hero.landing;
  if (L > 0) {
    add(pose, "leftUpperLeg", -0.75 * L);
    add(pose, "rightUpperLeg", -0.55 * L);
    add(pose, "leftLowerLeg", 1.3 * L);
    add(pose, "rightLowerLeg", 1.15 * L);
    add(pose, "spine", 0.35 * L);
    add(pose, "leftUpperArm", -0.4 * L, 0, 0.3 * L);
    add(pose, "rightUpperArm", -0.4 * L, 0, -0.3 * L);
    root.bob -= 0.3 * L;
  }
}

const POSES = {
  ground: locomotion,

  // Rising, tucked at the top, reaching for the ground on the way down.
  air(pose, root, hero) {
    const u = THREE.MathUtils.clamp(hero.vel.y / 7.4, -1.6, 1);
    const up = smooth(0.15, 0.6, u),
      down = smooth(-0.15, -0.7, u),
      top = Math.max(0, 1 - up - down);
    const k = (a, b, c) => a * up + b * top + c * down;
    set(pose, "leftUpperLeg", k(-1.15, -0.85, -0.4), 0, 0.04);
    set(pose, "leftLowerLeg", k(1.45, 1.35, 0.4));
    set(pose, "rightUpperLeg", k(0.35, -0.55, -0.12), 0, -0.04);
    set(pose, "rightLowerLeg", k(0.55, 1.1, 0.3));
    const flail = Math.max(0, -hero.vel.y - 9) * 0.08;
    const w = Math.sin(this.time * 9) * Math.min(0.7, flail);
    set(pose, "leftUpperArm", k(-1.7, -0.9, -1.25) + w, 0, k(0.2, 0.75, 1.05));
    set(
      pose,
      "rightUpperArm",
      k(-0.95, -0.9, -1.25) - w,
      0,
      k(-0.2, -0.75, -1.05),
    );
    set(pose, "leftLowerArm", k(-0.55, -0.4, -0.25));
    set(pose, "rightLowerArm", k(-0.65, -0.4, -0.25));
    set(pose, "spine", k(0.18, 0.28, 0.02));
    set(pose, "head", k(-0.15, -0.2, 0.05));
    root.pitch = k(0.08, 0.12, -0.04);
  },

  // Hanging: arms reach up and forward to the lip, legs dangle, shimmying goes hand over hand.
  hang(pose, root, hero) {
    const sh = hero.shimmy || 0;
    const t = this.time;
    const reach = sh ? Math.sin(t * 8.5) : 0;
    set(
      pose,
      "leftUpperArm",
      -2.72 + 0.14 * reach * sh,
      0,
      -0.14 + 0.1 * Math.max(0, reach) * sh,
    );
    set(
      pose,
      "rightUpperArm",
      -2.72 - 0.14 * reach * sh,
      0,
      0.14 + 0.1 * Math.max(0, -reach) * sh,
    );
    set(pose, "leftLowerArm", -0.12 - 0.3 * Math.max(0, -reach));
    set(pose, "rightLowerArm", -0.12 - 0.3 * Math.max(0, reach));
    set(pose, "spine", -0.08);
    set(pose, "head", -0.32, 0.25 * sh);
    const sway = sh ? Math.sin(t * 8.5) * 0.18 : Math.sin(t * 1.3) * 0.05;
    set(pose, "leftUpperLeg", 0.02 + sway, 0, 0.05);
    set(pose, "rightUpperLeg", -0.05 - sway, 0, -0.05);
    set(pose, "leftLowerLeg", 0.3 + Math.max(0, sway));
    set(pose, "rightLowerLeg", 0.22 + Math.max(0, -sway));
    root.roll = sh * 0.05 * reach;
  },

  // The mantle: pull with bent arms, press down with a knee on the lip, then stand.
  climb(pose, root, hero) {
    const t = Math.min(1, hero.t);
    const a = smooth(0, 0.4, t),
      b = smooth(0.38, 0.7, t),
      c = smooth(0.68, 1, t);
    const armX = mix(mix(-2.72, -1.25, a), 0.3, b) * (1 - c);
    const elbow = mix(mix(-0.12, -1.9, a), -0.2, b) * (1 - c);
    set(pose, "leftUpperArm", armX, 0, 0.12);
    set(pose, "rightUpperArm", armX, 0, -0.12);
    set(pose, "leftLowerArm", elbow);
    set(pose, "rightLowerArm", elbow);
    set(pose, "spine", mix(mix(-0.05, 0.35, a), 0.75, b) * (1 - c) + 0.06 * c);
    set(pose, "head", mix(-0.35, 0.1, a) * (1 - c));
    set(pose, "leftUpperLeg", mix(mix(0, -0.45, a), -1.6, b) * (1 - c));
    set(
      pose,
      "leftLowerLeg",
      mix(mix(0.3, 0.7, a), 2.1, b) * (1 - c) + 0.08 * c,
    );
    set(pose, "rightUpperLeg", mix(mix(0, 0.1, a), 0.35, b) * (1 - c));
    set(
      pose,
      "rightLowerLeg",
      mix(mix(0.25, 0.4, a), 0.9, b) * (1 - c) + 0.08 * c,
    );
    root.bob = -0.08 * b * (1 - c);
  },

  // A quick hop onto a low ledge: hands plant, knees tuck through.
  vault(pose, root, hero) {
    const t = Math.min(1, hero.t);
    const plant = smooth(0, 0.35, t),
      tuck = Math.sin(Math.PI * smooth(0.1, 0.9, t)),
      rise = smooth(0.7, 1, t);
    const arm = mix(-1.2, 0.25, plant) * (1 - rise);
    set(pose, "leftUpperArm", arm, 0, 0.15);
    set(pose, "rightUpperArm", arm, 0, -0.15);
    set(pose, "leftLowerArm", -0.3 * (1 - rise));
    set(pose, "rightLowerArm", -0.3 * (1 - rise));
    set(pose, "leftUpperLeg", -1.35 * tuck);
    set(pose, "rightUpperLeg", -1.1 * tuck);
    set(pose, "leftLowerLeg", 1.7 * tuck);
    set(pose, "rightLowerLeg", 1.5 * tuck);
    set(pose, "spine", 0.55 * tuck);
    set(pose, "head", -0.2 * tuck);
  },

  // Braced against a block, ready to push or pull.
  grab(pose, root, hero) {
    brace(pose, root, hero, 0, this.time);
  },

  // Driving the block: legs step in time with its slide, the body leans into the work.
  shove(pose, root, hero) {
    brace(pose, root, hero, Math.min(1, hero.t), this.time);
  },

  // Hands on the mirror's handles, the body twisting with the turn.
  turn(pose, root, hero) {
    const spin = hero.turning || 0;
    const t = this.time;
    set(pose, "leftUpperArm", -1.05, 0, 0.18);
    set(pose, "rightUpperArm", -1.05, 0, -0.18);
    set(pose, "leftLowerArm", -1.0 + 0.25 * spin);
    set(pose, "rightLowerArm", -1.0 - 0.25 * spin);
    set(pose, "spine", 0.28, -0.3 * spin, 0);
    set(pose, "head", -0.1, 0.35 * spin, 0);
    const step = Math.abs(spin) > 0.2 ? Math.sin(t * 6) * 0.25 : 0;
    set(pose, "leftUpperLeg", -0.35 + step, 0, 0.08);
    set(pose, "rightUpperLeg", 0.3 - step, 0, -0.08);
    set(pose, "leftLowerLeg", 0.45 + Math.max(0, step));
    set(pose, "rightLowerLeg", 0.2 + Math.max(0, -step));
    root.bob = -0.06;
  },
};

function brace(pose, root, hero, progress, time) {
  const pulling = hero.state === "shove" && hero.pulling;
  const moving = hero.state === "shove";
  const p = moving ? progress * Math.PI * 4 : 0;
  const s = Math.sin(p);
  set(pose, "leftUpperArm", pulling ? -1.25 : -1.45, 0, 0.05);
  set(pose, "rightUpperArm", pulling ? -1.25 : -1.45, 0, -0.05);
  set(pose, "leftLowerArm", pulling ? -0.1 : -0.5);
  set(pose, "rightLowerArm", pulling ? -0.1 : -0.5);
  set(pose, "spine", pulling ? -0.25 : 0.45 + 0.05 * Math.sin(time * 3));
  set(pose, "head", pulling ? 0.1 : -0.3);
  const base = pulling ? [0.35, -0.3] : [-0.6, 0.45];
  set(pose, "leftUpperLeg", base[0] + 0.45 * s, 0, 0.05);
  set(pose, "rightUpperLeg", base[1] - 0.45 * s, 0, -0.05);
  set(pose, "leftLowerLeg", 0.45 + 0.5 * Math.max(0, s));
  set(pose, "rightLowerLeg", 0.3 + 0.5 * Math.max(0, -s));
  root.bob = -0.12 + (moving ? 0.03 * Math.abs(s) : 0);
  root.pitch = pulling ? -0.06 : 0.08;
}

// A stand-in with the same joints, used until the generated explorer is available.
export function placeholderHero() {
  const g = new THREE.Group();
  const mat = (color) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const indigo = mat(0x2d3656),
    canvas = mat(0xcdbf9f),
    leather = mat(0x4b2e1e),
    scarf = mat(0xc2412d),
    skin = mat(0x9c6b4e);
  const joint = (parent, x, y, z) => {
    const j = new THREE.Group();
    j.position.set(x, y, z);
    parent.add(j);
    return j;
  };
  const part = (parent, geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const hips = joint(g, 0, 0.95, 0);
  part(hips, new THREE.BoxGeometry(0.36, 0.2, 0.22), canvas, 0, -0.02, 0);
  const spine = joint(hips, 0, 0.1, 0);
  part(spine, new THREE.BoxGeometry(0.42, 0.44, 0.26), indigo, 0, 0.22, 0);
  const head = joint(spine, 0, 0.47, 0);
  part(head, new THREE.SphereGeometry(0.13, 12, 10), skin, 0, 0.12, 0);
  part(
    head,
    new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12),
    scarf,
    0,
    0.05,
    0,
  );
  const scarfTail = joint(spine, -0.08, 0.44, -0.12);
  part(scarfTail, new THREE.BoxGeometry(0.1, 0.4, 0.03), scarf, 0, -0.2, 0);
  const limb = (side, isArm) => {
    const x = side * (isArm ? 0.25 : 0.1);
    const upper = joint(isArm ? spine : hips, x, isArm ? 0.4 : -0.03, 0);
    const len = isArm ? 0.3 : 0.44;
    part(
      upper,
      new THREE.BoxGeometry(0.11, len, 0.12),
      isArm ? indigo : canvas,
      0,
      -len / 2,
      0,
    );
    const lower = joint(upper, 0, -len, 0);
    part(
      lower,
      new THREE.BoxGeometry(0.1, len, 0.11),
      isArm ? leather : canvas,
      0,
      -len / 2,
      0,
    );
    if (!isArm)
      part(
        lower,
        new THREE.BoxGeometry(0.12, 0.08, 0.24),
        leather,
        0,
        -len - 0.02,
        0.05,
      );
    return [upper, lower];
  };
  const [leftUpperArm, leftLowerArm] = limb(1, true);
  const [rightUpperArm, rightLowerArm] = limb(-1, true);
  const [leftUpperLeg, leftLowerLeg] = limb(1, false);
  const [rightUpperLeg, rightLowerLeg] = limb(-1, false);
  g.userData.joints = {
    hips,
    spine,
    head,
    leftUpperArm,
    leftLowerArm,
    rightUpperArm,
    rightLowerArm,
    leftUpperLeg,
    leftLowerLeg,
    rightUpperLeg,
    rightLowerLeg,
    scarfTail,
  };
  g.userData.grip = { hands: 2.05 };
  return g;
}
