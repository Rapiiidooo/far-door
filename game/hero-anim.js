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
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
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
  leftHand: [9, 0.8],
  rightHand: [9, 0.8],
  leftUpperLeg: [9, 0.85],
  rightUpperLeg: [9, 0.85],
  leftLowerLeg: [10, 0.85],
  rightLowerLeg: [10, 0.85],
};

export class Spring {
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
    // Where each palm sits in its hand (or forearm) joint, from the asset's rest data, and the
    // palm's height with the arm straight overhead: the height the explorer hangs from.
    this.ik = { left: this.arm("left", 1), right: this.arm("right", -1) };
    this.palmReach = this.measureReach();
  }

  arm(side, s) {
    const J = this.joints;
    const upper = J[side + "UpperArm"],
      lower = J[side + "LowerArm"],
      hand = J[side + "Hand"] || null;
    if (!upper || !lower) return null;
    this.model.updateMatrixWorld(true);
    const rest = this.model.userData.palms?.[side];
    const palmModel = rest
      ? new THREE.Vector3(...rest)
      : new THREE.Vector3(0.24 * s, 0.86, 0.06);
    const palmWorld = this.model.localToWorld(palmModel.clone());
    const holder = hand || lower;
    return {
      side: s,
      upper,
      lower,
      hand,
      palm: holder.worldToLocal(palmWorld.clone()),
      // The palm faces the thigh at rest: inwards, towards the body's centre line.
      normal: new THREE.Vector3(-s, 0, 0),
      // From the wrist through the palm towards the fingers, in the hand's frame.
      fingers: holder.worldToLocal(palmWorld.clone()).normalize(),
      weight: 0,
    };
  }

  // Soles to palm when hanging with the palms `ahead` metres in front of the shoulders: the
  // arm nearly straight, leaning forward to the lip. The explorer hangs at that depth.
  hangReach(ahead) {
    const L = this.ik.left;
    if (!L) return null;
    const m = this.model;
    const saved = [m.position.clone(), m.rotation.clone()];
    m.position.set(0, 0, 0);
    m.rotation.set(0, 0, 0);
    m.updateMatrixWorld(true);
    const S = L.upper.getWorldPosition(new THREE.Vector3());
    const E = L.lower.getWorldPosition(new THREE.Vector3());
    const P = (L.hand || L.lower).localToWorld(L.palm.clone());
    m.position.copy(saved[0]);
    m.rotation.copy(saved[1]);
    m.updateMatrixWorld(true);
    const len = S.distanceTo(E) + E.distanceTo(P) - 0.01;
    return S.y + Math.sqrt(Math.max(0, len * len - ahead * ahead));
  }

  measureReach() {
    const L = this.ik.left;
    if (!L) return null;
    const m = this.model;
    const saved = [m.position.clone(), m.rotation.clone()];
    m.position.set(0, 0, 0);
    m.rotation.set(0, 0, 0);
    L.upper.rotation.x = -2.9;
    m.updateMatrixWorld(true);
    const p = (L.hand || L.lower).localToWorld(L.palm.clone());
    L.upper.rotation.x = 0;
    m.position.copy(saved[0]);
    m.rotation.copy(saved[1]);
    m.updateMatrixWorld(true);
    return p.y;
  }

  // `lift` raises the feet onto ground the colliders do not model, such as a sand drift.
  update(dt, hero, reduced = false, lift = 0) {
    if (dt <= 0) return;
    this.lift =
      (this.lift || 0) + (lift - (this.lift || 0)) * Math.min(1, dt * 10);
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
    overlays(pose, root, hero);

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
      hero.feet + hero.stepLift + this.lift,
      hero.pos.z + hero.snap.z,
    );
    // A roll turns the whole body once about its tucked middle, not about the feet.
    let tumble = 0;
    if (hero.state === "roll") {
      tumble = Math.min(1, hero.t / 0.52) * Math.PI * 2;
      const c = 0.55;
      const ly = c - c * Math.cos(tumble),
        lz = -c * Math.sin(tumble);
      m.position.x += Math.sin(yaw.v) * lz;
      m.position.z += Math.cos(yaw.v) * lz;
      m.position.y += ly;
    }
    m.rotation.set(pitch + tumble, yaw.v, roll, "YXZ");
    this.updateScarf(dt, hero, turnRate);
    this.reach(dt, hero, reduced);
    this.showHands(hero);
  }

  // Open, relaxed hands at rest; closed ones while a hand grips a lip, a block or a mirror, or
  // holds or throws the disc (the asset's userData.hands).
  showHands(hero) {
    const H = this.model.userData.hands;
    if (!H) return;
    const throwing = hero.throwT !== undefined && hero.throwT < 0.5;
    const closed = {
      left: (this.ik.left?.weight ?? 0) > 0.35,
      right: (this.ik.right?.weight ?? 0) > 0.35 || !!hero.holding || throwing,
    };
    for (const side of ["left", "right"]) {
      const open = H[side + "Open"],
        grip = H[side + "Grip"];
      if (!open || !grip) continue;
      open.visible = !closed[side];
      grip.visible = closed[side];
    }
  }

  // --- hands on things: two-bone IK after the pose ----------------------------------------------
  // Hanging, the palms rest on the lip; climbing, they stay there while the body rises;
  // against a block they press its face; at a mirror they hold the drum's rim. Each arm
  // blends towards its solution by a weight that eases in and out with the state.
  reach(dt, hero, reduced) {
    const L = this.ik.left,
      R = this.ik.right;
    if (!L || !R) return;
    const goal = this.reachGoals(hero);
    const k = Math.min(1, dt * (reduced ? 30 : 9));
    this.model.updateMatrixWorld(true);
    for (const arm of [L, R]) {
      const g = goal?.[arm.side > 0 ? "left" : "right"];
      arm.weight += ((g ? goal.weight : 0) - arm.weight) * k;
      if (g) arm.goal = g;
      if (arm.weight < 0.01 || !arm.goal) continue;
      solveArm(arm, arm.goal, arm.weight);
    }
  }

  reachGoals(hero) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const f = { x: Math.sin(hero.yaw), z: Math.cos(hero.yaw) };
    // The explorer's left is +X when facing +Z.
    const left = { x: f.z, z: -f.x };
    const pair = (cx, cy, cz, spread, pole, normal) => ({
      left: {
        at: V(cx + left.x * spread, cy, cz + left.z * spread),
        pole: V(
          left.x * pole.side + pole.x,
          pole.y,
          left.z * pole.side + pole.z,
        ),
        normal,
      },
      right: {
        at: V(cx - left.x * spread, cy, cz - left.z * spread),
        pole: V(
          -left.x * pole.side + pole.x,
          pole.y,
          -left.z * pole.side + pole.z,
        ),
        normal,
      },
    });
    const st = hero.state;
    if ((st === "hang" || st === "climb") && hero.ledge) {
      const { n, top, hand } = hero.ledge;
      // Planted where the climb began, so the hands stay put while the body rises.
      if (st === "hang" || !this.climbHold)
        this.climbHold = { x: hand.x, z: hand.z };
      const h = st === "climb" ? this.climbHold : hand;
      // Each palm flat on the top just behind the lip, its fingers reaching over the stone.
      const g = pair(
        h.x - n.x * 0.03,
        top + LIP,
        h.z - n.z * 0.03,
        0.2,
        { side: 0.7, x: n.x * 0.6, y: -0.3, z: n.z * 0.6 },
        V(0, -1, 0),
      );
      g.left.fingers = g.right.fingers = V(-n.x, 0, -n.z);
      // Shimmying, the leading hand reaches ahead and the other follows.
      if (st === "hang" && hero.shimmy) {
        const lead = hero.shimmy > 0 ? g.left : g.right;
        const along = { x: -n.z * hero.shimmy, z: n.x * hero.shimmy };
        const swing = Math.max(0, Math.sin(this.time * 8.5));
        lead.at.x += along.x * 0.08 * swing;
        lead.at.z += along.z * 0.08 * swing;
        lead.at.y += 0.05 * swing;
      }
      g.weight =
        st === "climb" ? 1 - smooth(0.55, 0.85, Math.min(1, hero.t)) : 1;
      return g;
    }
    this.climbHold = null;
    if ((st === "grab" || st === "shove") && hero.grip?.n) {
      const n = hero.grip.n;
      // The face the explorer braces against (hero.js BRACE), at chest height.
      const fx = hero.pos.x - n.x * 0.52,
        fz = hero.pos.z - n.z * 0.52;
      const g = pair(
        fx + n.x * 0.02,
        hero.feet + 1.12,
        fz + n.z * 0.02,
        0.24,
        { side: 0.6, x: 0, y: -0.8, z: 0 },
        V(-n.x, 0, -n.z),
      );
      g.weight = 1;
      return g;
    }
    if (st === "turn" && hero.grip?.ref) {
      const m = hero.grip.ref;
      const dx = hero.pos.x - m.x,
        dz = hero.pos.z - m.z;
      const d = Math.hypot(dx, dz) || 1;
      const g = pair(
        m.x + (dx / d) * 0.5,
        0.6,
        m.z + (dz / d) * 0.5,
        0.3,
        { side: 0.7, x: dx / d, y: -0.5, z: dz / d },
        V(0, -1, 0),
      );
      g.weight = 1;
      return g;
    }
    return null;
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

// Two-bone IK for one arm: swing the upper arm so the elbow lies in the plane of shoulder,
// target and pole, at the angle the arm's lengths allow, then swing the forearm onto the
// target, then turn the hand so its palm faces `normal`. `weight` blends from the pose.
const _v = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector3());
// Hanging, the palm's face rests this far over the lip's top.
export const LIP = 0.004;
const _q = [0, 1, 2].map(() => new THREE.Quaternion());
function swing(joint, from, to, weight) {
  const q = _q[0].setFromUnitVectors(from, to);
  _q[1].identity().slerp(q, weight);
  const parent = joint.parent.getWorldQuaternion(_q[2]);
  const world = parent.clone().multiply(joint.quaternion);
  joint.quaternion.copy(parent.invert().multiply(_q[1].multiply(world)));
  joint.updateMatrixWorld(true);
}

function solveArm(arm, goal, weight) {
  // Given the fingers' way as well as the palm's, the hand's whole turn is known before the
  // arm moves: the wrist is then brought to where the palm lands on the goal once the hand
  // takes that turn. Otherwise the palm itself is brought there and turned after.
  const turned = arm.hand && goal.fingers ? handTurn(arm, goal) : null;
  const holder = arm.hand || arm.lower;
  const end = () =>
    turned
      ? arm.hand.getWorldPosition(_v[2])
      : holder.localToWorld(_v[2].copy(arm.palm));
  const at = turned
    ? _v[6].copy(goal.at).sub(arm.palm.clone().applyQuaternion(turned))
    : _v[6].copy(goal.at);
  const S = arm.upper.getWorldPosition(_v[0]);
  const E = arm.lower.getWorldPosition(_v[1]);
  const P = end();
  const a = S.distanceTo(E),
    b = E.distanceTo(P);
  const toT = _v[3].copy(at).sub(S);
  const d = THREE.MathUtils.clamp(
    toT.length(),
    Math.abs(a - b) + 1e-3,
    a + b - 1e-3,
  );
  const dir = toT.normalize();
  const pole = _v[4].copy(goal.pole).addScaledVector(dir, -goal.pole.dot(dir));
  if (pole.lengthSq() < 1e-6) pole.set(0, -1, 0).addScaledVector(dir, -dir.y);
  pole.normalize();
  const cosA = THREE.MathUtils.clamp(
    (a * a + d * d - b * b) / (2 * a * d),
    -1,
    1,
  );
  const sinA = Math.sqrt(1 - cosA * cosA);
  const elbow = _v[5]
    .copy(S)
    .addScaledVector(dir, cosA * a)
    .addScaledVector(pole, sinA * a);
  swing(
    arm.upper,
    E.clone().sub(S).normalize(),
    elbow.clone().sub(S).normalize(),
    weight,
  );
  const E2 = arm.lower.getWorldPosition(_v[1]).clone();
  const P2 = end().clone();
  const target = S.clone().addScaledVector(dir, d);
  swing(arm.lower, P2.sub(E2).normalize(), target.sub(E2).normalize(), weight);
  if (turned) {
    const parent = arm.hand.parent.getWorldQuaternion(_q[2]);
    const now = arm.hand.getWorldQuaternion(new THREE.Quaternion());
    arm.hand.quaternion.copy(
      parent.invert().multiply(now.slerp(turned, weight)),
    );
    arm.hand.updateMatrixWorld(true);
  } else if (arm.hand && goal.normal) {
    const q = arm.hand.getWorldQuaternion(_q[0]);
    const now = arm.normal.clone().applyQuaternion(q);
    swing(arm.hand, now, goal.normal.clone().normalize(), weight);
  }
}

// The hand's turn in the world that sets its palm facing `goal.normal` and its fingers along
// `goal.fingers`: the rest frame of palm and fingers carried onto the wanted one.
function handTurn(arm, goal) {
  const frame = (n, f) => {
    const fn = f.clone().addScaledVector(n, -f.dot(n)).normalize();
    return new THREE.Matrix4().makeBasis(
      n,
      fn,
      new THREE.Vector3().crossVectors(n, fn),
    );
  };
  const rest = frame(arm.normal.clone().normalize(), arm.fingers);
  const want = frame(goal.normal.clone().normalize(), goal.fingers);
  return new THREE.Quaternion().setFromRotationMatrix(
    want.multiply(rest.transpose()),
  );
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
  const before = this.phase;
  this.phase =
    (this.phase + (Math.PI * 2 * speed * dt) / cycle) % (Math.PI * 2);
  // A foot lands twice a cycle; the game kicks up a little sand when it does.
  if (
    speed > 2.5 &&
    Math.floor(before / Math.PI) !== Math.floor(this.phase / Math.PI)
  )
    this.footfall = (this.footfall || 0) + 1;
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

// Upper-body layers on top of any state: the disc thrown, caught or carried, and a flinch.
function overlays(pose, root, hero) {
  const t = hero.throwT;
  if (t !== undefined && t < 0.5) {
    // Wind back, whip across, follow through.
    const wind = smooth(0, 0.08, t),
      whip = smooth(0.08, 0.2, t),
      back = smooth(0.25, 0.5, t);
    const armX = mix(mix(0, 0.9, wind), -1.55, whip) * (1 - back);
    const armZ = mix(mix(0, -0.9, wind), -0.2, whip) * (1 - back);
    add(pose, "rightUpperArm", armX, 0, armZ);
    add(pose, "rightLowerArm", mix(-1.2 * wind, -0.15, whip) * (1 - back));
    add(
      pose,
      "spine",
      0.1 * whip * (1 - back),
      mix(0.5 * wind, -0.45, whip) * (1 - back),
    );
  } else if (hero.holding) {
    add(pose, "rightUpperArm", -0.35, 0, -0.08);
    add(pose, "rightLowerArm", -0.55);
  }
  const c = hero.catchT;
  if (c !== undefined && c < 0.3) {
    const k = Math.sin((c / 0.3) * Math.PI);
    add(pose, "rightUpperArm", -1.3 * k, 0, -0.2 * k);
  }
  if (hero.stun > 0) {
    const k = Math.min(1, hero.stun / 0.3);
    add(pose, "spine", -0.45 * k);
    add(pose, "head", 0.3 * k);
    add(pose, "leftUpperArm", -0.9 * k, 0, 0.6 * k);
    add(pose, "rightUpperArm", -0.9 * k, 0, -0.6 * k);
    root.pitch -= 0.25 * k;
  }
}

const POSES = {
  ground: locomotion,

  // Tucked tight for the tumble; the body's rotation is applied at the root.
  roll(pose) {
    set(pose, "leftUpperLeg", -1.9);
    set(pose, "rightUpperLeg", -1.8);
    set(pose, "leftLowerLeg", 2.2);
    set(pose, "rightLowerLeg", 2.1);
    set(pose, "leftUpperArm", -1.4, 0, 0.3);
    set(pose, "rightUpperArm", -1.4, 0, -0.3);
    set(pose, "leftLowerArm", -1.6);
    set(pose, "rightLowerArm", -1.6);
    set(pose, "spine", 0.9);
    set(pose, "head", 0.5);
  },

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
    // The legs hang a little back with the knees bent, so the boots keep off the wall as
    // they sway.
    const sway = sh ? Math.sin(t * 8.5) * 0.12 : Math.sin(t * 1.3) * 0.04;
    set(pose, "leftUpperLeg", 0.16 + sway, 0, 0.05);
    set(pose, "rightUpperLeg", 0.1 - sway, 0, -0.05);
    set(pose, "leftLowerLeg", 0.5 + Math.max(0, sway));
    set(pose, "rightLowerLeg", 0.4 + Math.max(0, -sway));
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

  // Braced against a block, ready to push or pull; straining when it will not move.
  grab(pose, root, hero) {
    brace(pose, root, hero, 0, this.time);
    const strain = hero.t - (hero.strainAt ?? -9);
    if (strain < 0.6) {
      const k = Math.sin((strain / 0.6) * Math.PI);
      add(pose, "spine", 0.12 * k + Math.sin(this.time * 38) * 0.03 * k);
      add(pose, "leftUpperLeg", -0.25 * k);
      add(pose, "rightUpperLeg", 0.2 * k);
      root.bob -= 0.05 * k;
    }
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
  set(pose, "spine", pulling ? -0.25 : 0.3 + 0.05 * Math.sin(time * 3));
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
