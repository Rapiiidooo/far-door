import * as THREE from "three";

// Procedural animation for the articulated explorer. Every pose is a set of joint targets;
// the joints ease towards them, so states blend without keyframes. Conventions follow the
// asset contract: with the front at +Z, a positive rotation.x swings a hanging limb
// backwards and tips the spine forwards.

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
  "scarfTail",
];

export class HeroAnimator {
  constructor(model) {
    this.model = model;
    this.joints = model.userData.joints || {};
    this.rest = {};
    for (const name of JOINTS) {
      const j = this.joints[name];
      if (j)
        this.rest[name] = { rot: j.rotation.clone(), pos: j.position.clone() };
    }
    this.phase = 0;
    this.pose = {};
    this.scarf = { x: 0, z: 0, vx: 0, vz: 0 };
    this.time = 0;
    this.lastYaw = 0;
  }

  update(dt, hero, reduced = false) {
    this.time += dt;
    const t = this.time;
    const p = {};
    const set = (name, x = 0, y = 0, z = 0) => (p[name] = [x, y, z]);
    let hipDrop = 0,
      rate = 16;
    const speed = hero.speed;
    const st = hero.state;

    if (st === "ground") {
      const run = Math.min(1, speed / 5.6),
        walk = Math.min(1, speed / 2.1);
      const amt = speed > 0.15 ? 1 : 0;
      const cycle = speed > 2.6 ? 3.5 : 1.7;
      this.phase += (Math.PI * 2 * speed * dt) / cycle;
      const s = Math.sin(this.phase),
        c = Math.cos(this.phase);
      const legA = amt * (0.35 + 0.45 * run),
        armA = amt * (0.25 + 0.4 * run);
      const knee = (x) =>
        0.12 + amt * (0.35 + 0.8 * run) * Math.pow(Math.max(0, x), 1.4);
      set("leftUpperLeg", -legA * s);
      set("rightUpperLeg", legA * s);
      set("leftLowerLeg", knee(c));
      set("rightLowerLeg", knee(-c));
      set("leftUpperArm", armA * s, 0, 0.1);
      set("rightUpperArm", -armA * s, 0, -0.1);
      set("leftLowerArm", -0.25 - 0.75 * run * amt);
      set("rightLowerArm", -0.25 - 0.75 * run * amt);
      const breathe = Math.sin(t * 1.7) * 0.02 * (1 - amt);
      set("spine", 0.04 + 0.16 * run * amt + breathe, 0.14 * s * amt * run);
      set("head", -0.05 - 0.1 * run * amt, -0.1 * s * amt * run);
      hipDrop =
        amt * (0.03 + 0.05 * run) * (1 - Math.abs(c)) - 0.02 * walk * amt;
      // Landing folds the knees for a beat.
      const L = hero.landing;
      if (L > 0) {
        p.leftUpperLeg[0] -= 0.7 * L;
        p.rightUpperLeg[0] -= 0.55 * L;
        p.leftLowerLeg[0] += 1.2 * L;
        p.rightLowerLeg[0] += 1.1 * L;
        p.spine[0] += 0.35 * L;
        hipDrop += 0.28 * L;
        rate = 30;
      }
    } else if (st === "air") {
      const up = hero.vel.y > 0;
      if (up) {
        set("leftUpperLeg", -1.05);
        set("leftLowerLeg", 1.3);
        set("rightUpperLeg", 0.35);
        set("rightLowerLeg", 0.6);
        set("leftUpperArm", -1.5, 0, 0.25);
        set("rightUpperArm", -1.1, 0, -0.25);
        set("leftLowerArm", -0.5);
        set("rightLowerArm", -0.6);
        set("spine", 0.12);
      } else {
        set("leftUpperLeg", -0.4);
        set("leftLowerLeg", 0.5);
        set("rightUpperLeg", 0.15);
        set("rightLowerLeg", 0.35);
        set("leftUpperArm", -0.7, 0, 0.9);
        set("rightUpperArm", -0.7, 0, -0.9);
        set("leftLowerArm", -0.3);
        set("rightLowerArm", -0.3);
        set("spine", 0.02);
      }
      set("head", -0.12);
      rate = 10;
    } else if (st === "hang") {
      const sway = hero.shimmy ? Math.sin(t * 9) : 0;
      set("leftUpperArm", -2.98 + 0.08 * sway, 0, -0.08);
      set("rightUpperArm", -2.98 - 0.08 * sway, 0, 0.08);
      set("leftLowerArm", -0.08);
      set("rightLowerArm", -0.08);
      set("spine", -0.04);
      set("head", -0.25);
      set("leftUpperLeg", -0.15 + 0.2 * sway);
      set("rightUpperLeg", 0.1 - 0.2 * sway);
      set("leftLowerLeg", 0.35);
      set("rightLowerLeg", 0.2);
      rate = 14;
    } else if (st === "climb" || st === "vault") {
      const k = Math.min(1, hero.t);
      const climb = st === "climb";
      // Arms pull from overhead to pressing down beside the chest as the body rises.
      const pull = climb ? Math.min(1, k / 0.55) : Math.min(1, k / 0.4);
      const armX = climb ? -2.95 + 3.1 * pull : -1.2 + 1.3 * pull;
      set("leftUpperArm", armX, 0, 0.12);
      set("rightUpperArm", armX, 0, -0.12);
      const bend = Math.sin(Math.PI * pull);
      set("leftLowerArm", -0.2 - 1.6 * bend);
      set("rightLowerArm", -0.2 - 1.6 * bend);
      const knee = Math.sin(
        Math.PI * Math.min(1, Math.max(0, (k - 0.35) / 0.6)),
      );
      set("leftUpperLeg", -1.5 * knee);
      set("leftLowerLeg", 0.2 + 1.7 * knee);
      set("rightUpperLeg", 0.3 * knee);
      set("rightLowerLeg", 0.4 + 0.6 * knee);
      set("spine", 0.1 + 0.5 * Math.sin(Math.PI * k));
      set("head", -0.1);
      rate = 22;
    } else if (st === "grab" || st === "shove") {
      const moving = st === "shove";
      const pulling = moving && hero.pulling;
      if (moving) this.phase += Math.PI * 2 * 1.4 * dt;
      const s = moving ? Math.sin(this.phase) : 0;
      set("leftUpperArm", -1.4, 0, 0.05);
      set("rightUpperArm", -1.4, 0, -0.05);
      set("leftLowerArm", pulling ? -0.1 : -0.55);
      set("rightLowerArm", pulling ? -0.1 : -0.55);
      set("spine", pulling ? -0.18 : 0.42);
      set("head", pulling ? 0.05 : -0.25);
      set("leftUpperLeg", (pulling ? 0.3 : -0.55) + 0.35 * s);
      set("rightUpperLeg", (pulling ? -0.2 : 0.35) - 0.35 * s);
      set("leftLowerLeg", 0.5 + 0.3 * Math.max(0, s));
      set("rightLowerLeg", 0.25 + 0.3 * Math.max(0, -s));
      hipDrop = 0.12;
      rate = 12;
    } else if (st === "turn") {
      const push = 0.5 + 0.5 * Math.abs(hero.turning || 0);
      set("leftUpperArm", -1.3 - 0.2 * push, 0, 0.1);
      set("rightUpperArm", -1.3 - 0.2 * push, 0, -0.1);
      set("leftLowerArm", -0.6 + 0.4 * push);
      set("rightLowerArm", -0.6 + 0.4 * push);
      set("spine", 0.35 * push, 0.25 * push);
      set("leftUpperLeg", -0.4 * push);
      set("rightUpperLeg", 0.3 * push);
      set("leftLowerLeg", 0.4 * push);
      set("rightLowerLeg", 0.2);
      hipDrop = 0.08 * push;
      rate = 14;
    }

    const blend = reduced ? 1 : 1 - Math.exp(-rate * dt);
    for (const name of JOINTS) {
      const j = this.joints[name],
        r = this.rest[name];
      if (!j || !r || name === "scarfTail") continue;
      const target = p[name] || [0, 0, 0];
      j.rotation.x += (r.rot.x + target[0] - j.rotation.x) * blend;
      j.rotation.y += (r.rot.y + target[1] - j.rotation.y) * blend;
      j.rotation.z += (r.rot.z + target[2] - j.rotation.z) * blend;
    }
    const hips = this.joints.hips;
    if (hips && this.rest.hips) {
      const y = this.rest.hips.pos.y - hipDrop;
      hips.position.y += (y - hips.position.y) * blend;
    }
    this.updateScarf(dt, hero);
  }

  // The scarf tail is a damped spring pushed by speed, turning and a gusting wind.
  updateScarf(dt, hero) {
    const j = this.joints.scarfTail,
      r = this.rest.scarfTail;
    if (!j || !r) return;
    const turn =
      Math.atan2(
        Math.sin(hero.yaw - this.lastYaw),
        Math.cos(hero.yaw - this.lastYaw),
      ) / Math.max(dt, 1e-3);
    this.lastYaw = hero.yaw;
    const gust =
      Math.sin(this.time * 2.3) * 0.5 + Math.sin(this.time * 5.1 + 1) * 0.3;
    const lift =
      hero.state === "hang"
        ? -0.2
        : 0.25 + hero.speed * 0.17 + Math.max(0, -hero.vel.y) * 0.08;
    const tx = Math.min(1.35, lift + gust * 0.12),
      tz = THREE.MathUtils.clamp(-turn * 0.08, -0.6, 0.6) + gust * 0.08;
    const s = this.scarf;
    s.vx += ((tx - s.x) * 60 - s.vx * 7) * dt;
    s.vz += ((tz - s.z) * 60 - s.vz * 7) * dt;
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    j.rotation.x = r.rot.x + s.x;
    j.rotation.z = r.rot.z + s.z;
  }
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
