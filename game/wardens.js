import * as THREE from "three";
import { Spring } from "./hero-anim.js";

// The Wardens: squat stone clerks of the gate network with an enormous customs stamp.
// They are officious rather than dangerous: they announce themselves, waddle after the
// explorer, wind up slowly and slam the stamp down where the explorer stood. Three hits
// with the disc end their shift; a charged disc ends it at once.

export const LINES = {
  alert: [
    "HALT!",
    "Papers!",
    "Unauthorised traveller!",
    "Stop right there!",
    "Confiscated property!",
  ],
  slam: ["DENIED!", "REJECTED!", "VOID!", "RETURN TO SENDER!"],
  hurt: [
    "Ow!",
    "Hey!",
    "Rude!",
    "I'm filing a complaint!",
    "That's assault on an official!",
  ],
  defeat: [
    "…in triplicate…",
    "I'm on my break…",
    "Form 7-B…",
    "Tell my supervisor…",
    "Closing this window…",
  ],
};

const JOINTS = [
  "body",
  "head",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
  "stamp",
];
const R = 0.45,
  SPEED = 2.5,
  REACH = 1.55;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class Warden {
  constructor(
    scene,
    world,
    model,
    { x, z, yaw = 0, bubbles, sound, role = "guard" },
  ) {
    this.scene = scene;
    this.world = world;
    this.model = model;
    this.bubbles = bubbles;
    this.sound = sound;
    this.role = role;
    this.pos = { x, z };
    this.home = { x, z, yaw };
    this.feet = 0;
    this.yaw = yaw;
    this.vel = { x: 0, z: 0 };
    this.hp = 3;
    this.state = role === "clerk" ? "clerk" : "idle";
    this.t = 0;
    this.phase = Math.random() * 6;
    this.time = Math.random() * 10;
    this.joints = model.userData.joints || {};
    this.rest = {};
    this.springs = {};
    for (const name of JOINTS) {
      const j = this.joints[name];
      if (!j) continue;
      this.rest[name] = j.rotation.clone();
      this.springs[name] = [new Spring(), new Spring(), new Spring()];
    }
    this.root = { pitch: new Spring(), roll: new Spring(), bob: new Spring() };
    this.eye = [];
    const eye = model.userData.parts?.eye;
    if (eye)
      eye.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(0x39e3d0);
        o.material.emissiveIntensity = 1.4;
        this.eye.push(o.material);
      });
    scene.add(model);
    this.place();
  }

  get radius() {
    return 0.62;
  }

  center() {
    return new THREE.Vector3(this.pos.x, this.feet + 0.62, this.pos.z);
  }

  head() {
    return new THREE.Vector3(this.pos.x, this.feet + 1.55, this.pos.z);
  }

  alive() {
    return this.role === "guard" && this.hp > 0 && this.state !== "gone";
  }

  say(text, kind = "warden", duration = 2.2) {
    this.bubbles.say(() => this.head(), text, { kind, duration, key: this });
  }

  // Wakes a Warden up; it announces itself before it moves.
  alert(line = pick(LINES.alert)) {
    if (this.state !== "idle" && this.state !== "enter") return;
    this.state = "alert";
    this.t = 0;
    this.say(line, "shout", 1.6);
    this.sound?.play("warden-alert");
  }

  // A hop from a window or ledge down to a spot on the ground.
  enter(from, to) {
    this.state = "enter";
    this.t = 0;
    this.hopFrom = from;
    this.hopTo = to;
    this.pos.x = from.x;
    this.pos.z = from.z;
    this.feet = from.y;
  }

  onHit(disc) {
    if (!this.alive()) return;
    const dmg = disc.charged ? 2 : 1;
    this.hp -= dmg;
    const dx = this.pos.x - disc.pos.x,
      dz = this.pos.z - disc.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    this.vel.x = (dx / d) * 4.5;
    this.vel.z = (dz / d) * 4.5;
    this.sound?.play("warden-hit");
    if (this.hp <= 0) {
      this.state = "down";
      this.t = 0;
      this.say(pick(LINES.defeat), "warden", 2.4);
      this.sound?.play("warden-down");
      this.onDefeat?.(this);
    } else {
      this.state = "stagger";
      this.t = 0;
      if (Math.random() < 0.7) this.say(pick(LINES.hurt), "warden", 1.4);
    }
  }

  update(dt, hero, others, onStrike) {
    this.t += dt;
    this.time += dt;
    const toX = hero.pos.x - this.pos.x,
      toZ = hero.pos.z - this.pos.z;
    const dist = Math.hypot(toX, toZ);
    const faceHero = (rate) => {
      const want = Math.atan2(toX, toZ);
      const d = Math.atan2(
        Math.sin(want - this.yaw),
        Math.cos(want - this.yaw),
      );
      this.yaw += THREE.MathUtils.clamp(d, -rate * dt, rate * dt);
    };
    let moving = 0;
    switch (this.state) {
      case "enter": {
        const k = Math.min(1, this.t / 0.7);
        this.pos.x = this.hopFrom.x + (this.hopTo.x - this.hopFrom.x) * k;
        this.pos.z = this.hopFrom.z + (this.hopTo.z - this.hopFrom.z) * k;
        this.feet = this.hopFrom.y * (1 - k) + Math.sin(k * Math.PI) * 1.2;
        if (k >= 1) {
          this.feet = 0;
          this.state = "idle";
          this.alert();
        }
        break;
      }
      case "alert":
        faceHero(8);
        if (this.t > 0.75) this.state = "chase";
        break;
      case "chase": {
        faceHero(5);
        if (dist < REACH && hero.state !== "hang") {
          this.state = "windup";
          this.t = 0;
          this.sound?.play("warden-windup");
          break;
        }
        const sp = SPEED * (dist > 6 ? 1.15 : 1);
        let vx = (toX / (dist || 1)) * sp,
          vz = (toZ / (dist || 1)) * sp;
        // Keep a little space between colleagues so they do not stack.
        for (const o of others) {
          if (o === this || !o.alive()) continue;
          const ox = this.pos.x - o.pos.x,
            oz = this.pos.z - o.pos.z;
          const od = Math.hypot(ox, oz);
          if (od > 0.01 && od < 1.4) {
            vx += (ox / od) * (1.4 - od) * 3;
            vz += (oz / od) * (1.4 - od) * 3;
          }
        }
        this.vel.x += (vx - this.vel.x) * Math.min(1, dt * 6);
        this.vel.z += (vz - this.vel.z) * Math.min(1, dt * 6);
        moving = 1;
        break;
      }
      case "windup":
        faceHero(2.2);
        this.vel.x *= Math.exp(-dt * 10);
        this.vel.z *= Math.exp(-dt * 10);
        if (this.t > 0.7) {
          this.state = "slam";
          this.t = 0;
          this.struck = false;
        }
        break;
      case "slam":
        if (!this.struck && this.t > 0.1) {
          this.struck = true;
          const fx = Math.sin(this.yaw),
            fz = Math.cos(this.yaw);
          const sx = this.pos.x + fx * 0.95,
            sz = this.pos.z + fz * 0.95;
          const hit =
            Math.hypot(hero.pos.x - sx, hero.pos.z - sz) < 1.05 &&
            Math.abs(hero.feet - this.feet) < 1.2;
          onStrike?.(this, sx, sz, hit);
          if (Math.random() < 0.45) this.say(pick(LINES.slam), "shout", 1.2);
        }
        if (this.t > 0.25) {
          this.state = "recover";
          this.t = 0;
        }
        break;
      case "recover":
        if (this.t > 0.85) this.state = "chase";
        break;
      case "stagger":
        if (this.t > 0.5) this.state = "chase";
        break;
      case "down":
        if (this.t > 1.6) {
          this.state = "gone";
          this.model.visible = false;
          this.onGone?.(this);
        }
        break;
      case "clerk":
      case "idle":
        break;
    }
    if (
      this.state !== "enter" &&
      this.state !== "clerk" &&
      this.state !== "gone"
    ) {
      const drag = moving ? 1 : Math.exp(-dt * 6);
      if (!moving) {
        this.vel.x *= drag;
        this.vel.z *= drag;
      }
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this.world.resolve(this.pos, R, this.feet, 1.1, 0.3);
      const g = this.world.ground(this.pos.x, this.pos.z, 0.2, this.feet, 0.5);
      if (Number.isFinite(g)) this.feet = g;
    }
    this.animate(dt, Math.hypot(this.vel.x, this.vel.z));
    this.place();
  }

  place() {
    this.model.position.set(
      this.pos.x,
      this.feet + (this.root.bob.v || 0),
      this.pos.z,
    );
    this.model.rotation.set(
      this.root.pitch.v,
      this.yaw,
      this.root.roll.v,
      "YXZ",
    );
  }

  animate(dt, speed) {
    const pose = {};
    const set = (n, x = 0, y = 0, z = 0) => (pose[n] = [x, y, z]);
    const root = { pitch: 0, roll: 0, bob: 0 };
    const t = this.time;
    const st = this.state;
    if (st === "chase" || (st === "stagger" && speed > 0.5)) {
      this.phase += dt * (4 + speed * 2.4);
      const s = Math.sin(this.phase);
      set("leftLeg", -0.6 * s);
      set("rightLeg", 0.6 * s);
      set("leftArm", 0.5 * s, 0, 0.2);
      set("rightArm", -2.2, 0, -0.35);
      set("stamp", 0.4);
      set("body", 0.15, 0.1 * s, 0);
      set("head", -0.1, 0, -0.12 * s);
      root.roll = 0.16 * s;
      root.bob = Math.abs(Math.cos(this.phase)) * 0.07;
    } else if (st === "windup") {
      const k = smooth(0, 0.35, this.t);
      const quiver = Math.sin(t * 60) * 0.05 * k;
      set("rightArm", -2.85 * k + quiver, 0, -0.25);
      set("leftArm", -0.9 * k, 0, 0.45);
      set("stamp", -0.3 * k);
      set("body", -0.32 * k + quiver);
      set("head", 0.12 * k);
      set("leftLeg", -0.25, 0, 0.18);
      set("rightLeg", 0.2, 0, -0.18);
      root.bob = 0.04 * k;
    } else if (st === "slam" || st === "recover") {
      const up = st === "recover" ? smooth(0.4, 0.85, this.t) : 0;
      set("rightArm", -0.35 - 1.2 * up, 0, -0.1);
      set("leftArm", -0.5, 0, 0.5);
      set("stamp", 0.6);
      set("body", 0.55 * (1 - up));
      set("head", 0.25 * (1 - up));
      set("leftLeg", -0.35, 0, 0.2);
      set("rightLeg", 0.3, 0, -0.2);
      root.bob = -0.08 * (1 - up);
    } else if (st === "stagger") {
      const k = 1 - smooth(0.1, 0.5, this.t);
      set("body", -0.55 * k);
      set("head", 0.3 * k, 0, 0.2 * k);
      set("leftArm", -1.2 * k, 0, 0.9 * k);
      set("rightArm", -1.6 * k, 0, -0.7 * k);
      set("leftLeg", -0.4 * k);
      root.pitch = -0.2 * k;
    } else if (st === "down") {
      const k = smooth(0, 0.45, this.t);
      set("leftLeg", -1.3 * k);
      set("rightLeg", -1.0 * k);
      set("leftArm", -1.8 * k, 0, 0.9 * k);
      set("rightArm", -1.8 * k, 0, -0.9 * k);
      set("head", -0.3 * k);
      root.pitch = -1.45 * k;
      root.bob = 0.1 * Math.sin(k * Math.PI);
      if (this.t > 1.2)
        this.model.scale.setScalar(Math.max(0.01, 1 - (this.t - 1.2) / 0.4));
    } else if (st === "enter") {
      set("leftLeg", -0.8);
      set("rightLeg", -0.5);
      set("leftArm", -2.4, 0, 0.6);
      set("rightArm", -2.4, 0, -0.6);
    } else if (st === "clerk") {
      // At the counter: shuffling papers, glancing up to talk.
      const talk = this.talking > 0 ? Math.sin(t * 14) * 0.06 : 0;
      set("head", -0.12 + talk, Math.sin(t * 0.7) * 0.3, 0);
      set("body", 0.18);
      set("leftArm", -1.1 + Math.sin(t * 3.1) * 0.12, 0, 0.2);
      set("rightArm", -1.0 + Math.sin(t * 2.3 + 1) * 0.15, 0, -0.2);
      root.bob = Math.sin(t * 1.6) * 0.01;
    } else {
      set("body", Math.sin(t * 1.5) * 0.03);
      set("head", 0, Math.sin(t * 0.6) * 0.4, 0);
      set("rightArm", 0.1);
      root.bob = Math.sin(t * 1.5) * 0.012;
    }
    for (const name of JOINTS) {
      const j = this.joints[name],
        r = this.rest[name];
      if (!j || !r) continue;
      const tg = pose[name] || [0, 0, 0];
      const s = this.springs[name];
      j.rotation.set(
        r.x + s[0].step(tg[0], dt, 8, 0.75),
        r.y + s[1].step(tg[1], dt, 8, 0.75),
        r.z + s[2].step(tg[2], dt, 8, 0.75),
      );
    }
    this.root.pitch.step(root.pitch, dt, 4, 0.7);
    this.root.roll.step(root.roll, dt, 6, 0.6);
    this.root.bob.step(root.bob, dt, 8, 0.7);
    const glow = st === "windup" ? 3.2 : st === "down" ? 0.2 : 1.4;
    for (const m of this.eye)
      m.emissiveIntensity += (glow - m.emissiveIntensity) * Math.min(1, dt * 8);
    if (this.talking > 0) this.talking -= dt;
  }

  reset() {
    this.hp = 3;
    this.pos.x = this.home.x;
    this.pos.z = this.home.z;
    this.yaw = this.home.yaw;
    this.feet = 0;
    this.vel.x = this.vel.z = 0;
    this.state = this.role === "clerk" ? "clerk" : "idle";
    this.model.visible = true;
    this.model.scale.setScalar(1);
    this.place();
  }
}

// Until the generated Warden arrives: the same joints on simple shapes.
export function fallbackWarden() {
  const g = new THREE.Group();
  const chalk = new THREE.MeshStandardMaterial({
    color: 0xc9c2d8,
    roughness: 0.9,
  });
  const bronze = new THREE.MeshStandardMaterial({
    color: 0x9a6a35,
    metalness: 0.7,
    roughness: 0.45,
  });
  const ochre = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    roughness: 0.8,
  });
  const basalt = new THREE.MeshStandardMaterial({
    color: 0x3a3531,
    roughness: 0.8,
  });
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
  const body = joint(g, 0, 0.3, 0);
  part(body, new THREE.SphereGeometry(0.32, 12, 10), chalk, 0, 0.12, 0);
  part(
    body,
    new THREE.TorusGeometry(0.3, 0.05, 6, 16),
    ochre,
    0,
    0.12,
    0,
  ).rotation.x = Math.PI / 2;
  const head = joint(body, 0, 0.32, 0);
  part(
    head,
    new THREE.CylinderGeometry(0.3, 0.26, 0.55, 12),
    bronze,
    0,
    0.27,
    0,
  );
  const eye = part(
    head,
    new THREE.BoxGeometry(0.05, 0.28, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x1d5f63,
      emissive: 0x39e3d0,
      emissiveIntensity: 1.4,
    }),
    0,
    0.3,
    0.28,
  );
  const arm = (side) => {
    const a = joint(body, side * 0.32, 0.22, 0);
    part(a, new THREE.CapsuleGeometry(0.07, 0.25, 4, 8), chalk, 0, -0.18, 0);
    return a;
  };
  const leftArm = arm(1),
    rightArm = arm(-1);
  const stamp = joint(rightArm, 0, -0.36, 0.05);
  part(
    stamp,
    new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6),
    bronze,
    0,
    0.12,
    0,
  );
  part(
    stamp,
    new THREE.CylinderGeometry(0.17, 0.17, 0.14, 14),
    basalt,
    0,
    -0.14,
    0,
  );
  const leg = (side) => {
    const l = joint(g, side * 0.13, 0.3, 0);
    part(
      l,
      new THREE.CylinderGeometry(0.08, 0.09, 0.26, 8),
      chalk,
      0,
      -0.14,
      0,
    );
    part(
      l,
      new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10),
      chalk,
      0,
      -0.27,
      0.03,
    );
    return l;
  };
  const leftLeg = leg(1),
    rightLeg = leg(-1);
  g.userData.joints = {
    body,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    stamp,
  };
  g.userData.parts = { eye };
  return g;
}
