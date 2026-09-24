import * as THREE from "three";

// Third-person orbit camera. It trails a smoothed point above the explorer, pulls in when
// rock comes between them, and drifts behind the explorer's heading when the player runs
// without steering the camera. yaw follows the hero convention: the lens looks along
// (sin yaw, cos yaw).
export class FollowCamera {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = Math.PI;
    this.pitch = 0.2;
    this.dist = 5.6;
    this.current = 5.6;
    this.target = new THREE.Vector3();
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
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.y, -0.45, 1.15);

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

    const hanging = hero.state === "hang" || hero.state === "climb";
    const goal = new THREE.Vector3(
      hero.pos.x,
      hero.feet + (hanging ? 1.85 : 1.55),
      hero.pos.z,
    );
    const kxz = 1 - Math.exp(-dt * 14),
      ky = 1 - Math.exp(-dt * (hero.state === "air" ? 5 : 9));
    this.target.x += (goal.x - this.target.x) * kxz;
    this.target.z += (goal.z - this.target.z) * kxz;
    this.target.y += (goal.y - this.target.y) * ky;

    const cp = Math.cos(this.pitch),
      sp = Math.sin(this.pitch);
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw) * cp,
      sp,
      -Math.cos(this.yaw) * cp,
    );
    // Rock between the explorer and the lens pulls it in at once; it eases back out.
    const hit = this.world.ray(
      this.target.x,
      this.target.y,
      this.target.z,
      dir.x,
      dir.y,
      dir.z,
      this.dist + 0.4,
      (b) => b.kind !== "mirror" && b.kind !== "stela" && b.kind !== "prop",
    );
    const allowed = hit ? Math.max(0.9, hit.t - 0.4) : this.dist;
    this.current =
      allowed < this.current
        ? allowed
        : this.current + (allowed - this.current) * (1 - Math.exp(-dt * 2.5));

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
