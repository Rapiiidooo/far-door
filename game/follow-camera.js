import * as THREE from "three";

// Third-person orbit camera. It trails a smoothed point above the explorer that leads a
// little in the direction of travel, reframes itself for what the explorer is doing
// (higher and wider over a mirror so the beams read, closer on a ledge), pulls in when
// rock comes between them and drifts behind the heading when the player runs without
// steering. yaw follows the hero convention: the lens looks along (sin yaw, cos yaw).
const FRAMES = {
  ground: { dist: 5.6, lift: 1.55, pitch: 0 },
  air: { dist: 5.9, lift: 1.5, pitch: 0 },
  hang: { dist: 5.0, lift: 1.95, pitch: 0.05 },
  climb: { dist: 5.0, lift: 1.9, pitch: 0.05 },
  vault: { dist: 5.6, lift: 1.6, pitch: 0 },
  grab: { dist: 6.2, lift: 1.6, pitch: 0.12 },
  shove: { dist: 6.4, lift: 1.6, pitch: 0.12 },
  turn: { dist: 8.8, lift: 1.3, pitch: 0.42 },
};

const PROBES = [
  [0, 0],
  [0.3, 0.15],
  [-0.3, 0.15],
  [0, -0.22],
];

export class FollowCamera {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = Math.PI;
    this.pitch = 0.2;
    this.current = 5.6;
    this.frame = { dist: 5.6, lift: 1.55, pitch: 0 };
    this.target = new THREE.Vector3();
    this.lead = new THREE.Vector3();
    this.idle = 10;
    this.shake = 0;
    this.ready = false;
  }

  snap(hero) {
    this.target.set(hero.pos.x, hero.feet + 1.55, hero.pos.z);
    this.yaw = hero.yaw;
    this.ready = true;
  }

  update(dt, hero, look, move = { x: 0, y: 0 }) {
    if (!this.ready) this.snap(hero);
    const touched = Math.abs(look.x) + Math.abs(look.y) > 1e-4;
    this.idle = touched ? 0 : this.idle + dt;
    this.yaw -= look.x;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.y, -0.45, 1.2);

    // Lazy follow: only while running straight ahead without touching the camera. Following
    // sideways input would chase its own tail, since input is relative to the camera.
    if (
      this.idle > 1.1 &&
      hero.state === "ground" &&
      hero.speed > 1.5 &&
      move.y > 0.7 &&
      Math.abs(move.x) < 0.35
    ) {
      const d = Math.atan2(
        Math.sin(hero.yaw - this.yaw),
        Math.cos(hero.yaw - this.yaw),
      );
      if (Math.abs(d) < 1.9)
        this.yaw += d * Math.min(1, dt * 0.9 * (hero.speed / 5.6));
    }

    // On a ledge or against a block the lens swings round behind the explorer, so a hang
    // entered facing the other way does not leave the camera on the wrong side of the wall.
    if (
      (hero.state === "hang" ||
        hero.state === "climb" ||
        hero.state === "grab") &&
      this.idle > 0.25
    ) {
      const d = Math.atan2(
        Math.sin(hero.yaw - this.yaw),
        Math.cos(hero.yaw - this.yaw),
      );
      this.yaw += d * Math.min(1, dt * (Math.abs(d) > 1.2 ? 5 : 2));
    }

    // Framing eases between states.
    const want = FRAMES[hero.state] || FRAMES.ground;
    const kf = 1 - Math.exp(-dt * 3);
    for (const key of ["dist", "lift", "pitch"])
      this.frame[key] += (want[key] - this.frame[key]) * kf;

    // Lead the target a little in the direction of travel.
    const kl = 1 - Math.exp(-dt * 3);
    this.lead.x +=
      (THREE.MathUtils.clamp(hero.vel.x * 0.16, -0.9, 0.9) - this.lead.x) * kl;
    this.lead.z +=
      (THREE.MathUtils.clamp(hero.vel.z * 0.16, -0.9, 0.9) - this.lead.z) * kl;
    const goal = new THREE.Vector3(
      hero.pos.x + this.lead.x,
      hero.feet + this.frame.lift,
      hero.pos.z + this.lead.z,
    );
    const kxz = 1 - Math.exp(-dt * 12),
      ky = 1 - Math.exp(-dt * (hero.state === "air" ? 4.5 : 8));
    this.target.x += (goal.x - this.target.x) * kxz;
    this.target.z += (goal.z - this.target.z) * kxz;
    this.target.y += (goal.y - this.target.y) * ky;

    const pitch = THREE.MathUtils.clamp(
      this.pitch + this.frame.pitch,
      -0.45,
      1.3,
    );
    const cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw) * cp,
      sp,
      -Math.cos(this.yaw) * cp,
    );
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));

    // Rock between the explorer and the lens: several probes stand in for the lens's width.
    let allowed = this.frame.dist;
    for (const [side, up] of PROBES) {
      const ox = this.target.x + right.x * side,
        oy = this.target.y + up,
        oz = this.target.z + right.z * side;
      const hit = this.world.ray(
        ox,
        oy,
        oz,
        dir.x,
        dir.y,
        dir.z,
        this.frame.dist + 0.5,
        (b) =>
          b.kind !== "mirror" &&
          b.kind !== "stela" &&
          b.kind !== "prop" &&
          b.kind !== "fire",
      );
      if (hit) allowed = Math.min(allowed, Math.max(1.1, hit.t - 0.45));
    }
    const kin = 1 - Math.exp(-dt * 18),
      kout = 1 - Math.exp(-dt * 2.2);
    this.current +=
      (allowed - this.current) * (allowed < this.current ? kin : kout);
    this.current = Math.min(this.current, allowed + 0.15);

    const cam = this.camera;
    cam.position.copy(this.target).addScaledVector(dir, this.current);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * this.shake * 0.12;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
    }
    cam.lookAt(this.target);
  }
}
