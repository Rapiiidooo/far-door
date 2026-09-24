import * as THREE from "three";
import { Warden, fallbackWarden } from "./wardens.js";

// The checkpoint beyond the first gate: a customs booth with a barrier across the only
// path, a clerk behind the window, an empty queue, and a bin of confiscated property with
// the explorer's future weapon in it. Taking the disc back sets off the alarm; beating the
// guards leaves the barrier locked until its lamp is lit, which only a disc charged in the
// crystal's beam can do.

export const LAYOUT = {
  booth: { x: -3.7, z: -27, yaw: 0 },
  bin: { x: -6.4, z: -23.2, yaw: 0.5 },
  emitter: { x: 8, z: -19.5, yaw: -Math.PI / 2 },
  barrierZ: -27,
  barrierFrom: -2.5,
  barrierTo: 1.7,
  // Queue posts stand 1.4 m apart so each rope hooks onto the next post.
  posts: [
    [-6.6, -18.2],
    [-5.2, -18.2],
    [-3.8, -18.2],
    [-2.4, -18.2],
    [-1.0, -18.2],
    [-5.9, -20.6],
    [-4.5, -20.6],
    [-3.1, -20.6],
    [-1.7, -20.6],
  ],
  guards: [
    [-3.7, -23.2],
    [-1.6, -22.4],
    [-5.6, -22.0],
  ],
  respawn: { x: 0, z: -11, yaw: Math.PI },
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class Checkpoint {
  constructor(scene, world, assets, { bubbles, sound, hud }) {
    this.scene = scene;
    this.world = world;
    this.assets = assets;
    this.bubbles = bubbles;
    this.sound = sound;
    this.hud = hud;
    this.phase = "arrive";
    this.guards = [];
    this.said = new Set();
    this.lampLit = false;
    this.time = 0;
    this.barrierOpen = 0;
  }

  async build() {
    const L = LAYOUT;
    const put = async (name, x, z, yaw = 0, opts = {}) => {
      const o = await this.assets.make(name, opts);
      if (!o) return null;
      o.position.set(x, 0, z);
      o.rotation.y = yaw;
      this.scene.add(o);
      return o;
    };
    // The booth's origin is the middle of booth and arm together; its body sits 2.15 m
    // towards -X of it, so the placement shifts to put the body at LAYOUT.booth.
    this.booth =
      (await put("customs_booth", L.booth.x + 2.15, L.booth.z, L.booth.yaw, {
        keepHierarchy: true,
      })) || fallbackBooth(this.scene, L.booth);
    const local = (p, fallback) =>
      p
        ? new THREE.Vector3(...p).applyMatrix4(this.booth.matrixWorld)
        : new THREE.Vector3(...fallback);
    this.booth.updateMatrixWorld(true);
    this.windowPos = local(this.booth.userData.window?.center, [
      L.booth.x,
      1.4,
      L.booth.z + 0.6,
    ]);
    this.insidePos = local(this.booth.userData.inside, [
      L.booth.x,
      0.55,
      L.booth.z - 0.1,
    ]);
    this.barrier = this.booth.userData.joints?.barrier || null;
    this.lamp = this.booth.userData.parts?.lamp || null;
    this.lampMaterials = [];
    this.lamp?.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.material.emissive = new THREE.Color(0x39e3d0);
      o.material.emissiveIntensity = 0.05;
      this.lampMaterials.push(o.material);
    });
    this.booth.updateMatrixWorld(true);
    this.lampPos = new THREE.Vector3();
    if (this.lamp)
      new THREE.Box3().setFromObject(this.lamp).getCenter(this.lampPos);
    else this.lampPos.set(L.booth.x, 3.05, L.booth.z);
    this.lampLight = new THREE.PointLight(0x39e3d0, 0, 14, 1.6);
    this.lampLight.position
      .copy(this.lampPos)
      .add(new THREE.Vector3(0, 0.3, 0.4));
    this.scene.add(this.lampLight);

    // Colliders: the booth, rock shoulders that close the path at the barrier line, and
    // an invisible wall under the barrier arm until it lifts.
    const w = this.world;
    w.add(
      L.booth.x - 1.25,
      -10,
      L.booth.z - 1.05,
      L.booth.x + 1.25,
      2.4,
      L.booth.z + 1.05,
      "rock",
    );
    w.add(
      -15,
      -10,
      L.barrierZ - 1.6,
      L.booth.x - 1.2,
      6,
      L.barrierZ + 1.4,
      "rock",
    );
    w.add(
      L.barrierTo - 0.1,
      -10,
      L.barrierZ - 1.4,
      15,
      6,
      L.barrierZ + 1.4,
      "rock",
    );
    this.gateWall = w.add(
      L.barrierFrom,
      -10,
      L.barrierZ - 0.25,
      L.barrierTo,
      5,
      L.barrierZ + 0.25,
      "prop",
    );
    await this.dressShoulders();

    this.bin = await put("confiscation_bin", L.bin.x, L.bin.z, L.bin.yaw, {
      keepHierarchy: true,
    });
    if (!this.bin) this.bin = fallbackBin(this.scene, L.bin);
    this.binBox = w.add(
      L.bin.x - 0.7,
      -10,
      L.bin.z - 0.55,
      L.bin.x + 0.7,
      0.8,
      L.bin.z + 0.55,
      "prop",
    );
    for (const [x, z] of L.posts) {
      // The post's own base sits 0.587 m towards -X of the asset's origin.
      await put("queue_post", x + 0.587, z, 0);
      w.add(x - 0.18, -10, z - 0.18, x + 0.18, 1.0, z + 0.18, "prop");
    }

    // The crystal's beam crosses the path at head height towards the west.
    const emitter = await put(
      "crystal_emitter",
      L.emitter.x,
      L.emitter.z,
      L.emitter.yaw,
      { keepHierarchy: true },
    );
    w.add(
      L.emitter.x - 0.7,
      -10,
      L.emitter.z - 0.7,
      L.emitter.x + 0.7,
      2.1,
      L.emitter.z + 0.7,
      "prop",
    );
    const beamY = emitter?.userData.beam ? emitter.userData.beam[1] : 1.6;
    this.beam = {
      from: new THREE.Vector3(L.emitter.x - 0.4, beamY, L.emitter.z),
      to: new THREE.Vector3(L.booth.x - 5.5, beamY, L.emitter.z),
      active: () => true,
    };
    emitter?.userData.parts?.crystal?.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.material.emissive = new THREE.Color(0x39e3d0);
      o.material.emissiveIntensity = 2.2;
    });
    const glow = new THREE.PointLight(0x39e3d0, 10, 9, 1.6);
    glow.position.set(L.emitter.x, beamY, L.emitter.z);
    this.scene.add(glow);
    this.buildBeam();

    // The clerk stands on a step behind the counter so the mask shows in the window.
    const clerkModel =
      (await this.assets.make("warden", { keepHierarchy: true })) ||
      fallbackWarden();
    this.clerk = new Warden(this.scene, this.world, clerkModel, {
      x: L.booth.x,
      z: this.insidePos.z,
      yaw: 0,
      bubbles: this.bubbles,
      sound: this.sound,
      role: "clerk",
    });
    this.clerk.pos.x = this.insidePos.x;
    this.clerk.feet = this.insidePos.y;
    this.clerk.place();
  }

  // Rock and spires shoulder the barrier line so the booth is the only way through.
  async dressShoulders() {
    const L = LAYOUT;
    const spots = [
      [-8.5, L.barrierZ - 0.2, 0.9, 0.3],
      [-12.5, L.barrierZ + 0.6, 1.1, 2.1],
      [4.6, L.barrierZ - 0.3, 0.8, 1.2],
      [9.5, L.barrierZ + 0.4, 1.05, 4.2],
      [13, L.barrierZ - 0.6, 0.85, 5.5],
    ];
    for (const [x, z, s, yaw] of spots) {
      const o = await this.assets.make("basalt_spire");
      if (!o) continue;
      o.position.set(x, 0, z);
      o.scale.multiplyScalar(s);
      o.rotation.y = yaw;
      this.scene.add(o);
    }
    const rock = new THREE.MeshStandardMaterial({
      color: 0x2a2830,
      roughness: 0.92,
      flatShading: true,
    });
    for (const [x0, x1] of [
      [-15, L.booth.x - 1.2],
      [L.barrierTo - 0.1, 15],
    ]) {
      const geo = new THREE.DodecahedronGeometry(1, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i);
        v.multiplyScalar(
          1 + (Math.sin(v.x * 7 + v.z * 5) * 0.12 + Math.sin(v.y * 9) * 0.08),
        );
        p.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, rock);
      m.scale.set((x1 - x0) / 2 + 0.4, 3.2, 1.9);
      m.position.set((x0 + x1) / 2, 1.2, L.barrierZ);
      m.castShadow = m.receiveShadow = true;
      this.scene.add(m);
    }
  }

  buildBeam() {
    const { from, to } = this.beam;
    const len = from.distanceTo(to);
    const dir = to.clone().sub(from).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    );
    const mk = (radius, color, opacity) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, len, 10, 1, true).translate(
          0,
          len / 2,
          0,
        ),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          fog: false,
        }),
      );
      m.position.copy(from);
      m.quaternion.copy(q);
      this.scene.add(m);
      return m;
    };
    mk(0.02, new THREE.Color(0.8, 2.6, 2.4), 1);
    this.beamGlow = mk(0.09, new THREE.Color(0.15, 0.7, 0.65), 0.28);
  }

  // What the explorer can use here: only the bin, and only while it still holds the disc.
  interactables() {
    if (this.phase !== "arrive") return [];
    return [{ kind: "use", box: this.binBox, ref: this, prompt: "take" }];
  }

  use() {
    if (this.phase !== "arrive") return false;
    this.phase = "alarm";
    this.lidKick = 1;
    this.onTakeDisc?.();
    this.clerk.talking = 1.5;
    this.clerk.say("HEY! That's evidence!", "shout", 2.2);
    this.sound?.play("alarm");
    this.alarmAt = this.time;
    return true;
  }

  spawnGuards() {
    const L = LAYOUT;
    const window = {
      x: this.windowPos.x,
      y: this.windowPos.y,
      z: this.windowPos.z + 0.3,
    };
    L.guards.forEach(([x, z], i) => {
      setTimeout(async () => {
        const model =
          (await this.assets.make("warden", { keepHierarchy: true })) ||
          fallbackWarden();
        const g = new Warden(this.scene, this.world, model, {
          x,
          z,
          yaw: 0,
          bubbles: this.bubbles,
          sound: this.sound,
        });
        g.enter(window, { x, z });
        g.onDefeat = () => this.onGuardDown?.(g);
        this.guards.push(g);
        this.onGuard?.(g);
      }, i * 450);
    });
  }

  // Charged disc on the lamp: the barrier lifts. An uncharged one earns a complaint.
  lampTarget() {
    return {
      radius: 0.45,
      center: () => this.lampPos,
      alive: () => this.phase === "locked" && !this.lampLit,
      onHit: (disc) => {
        if (disc.charged) {
          this.lampLit = true;
          this.sound?.play("lamp");
          this.clerk.talking = 2;
          setTimeout(
            () =>
              this.clerk.say("…Approved. Have a nice eternity.", "clerk", 3.2),
            900,
          );
          setTimeout(() => this.sound?.play("barrier"), 1500);
          this.phase = "open";
          this.onOpen?.();
        } else {
          this.sound?.play("clink");
          this.clerk.talking = 1.2;
          this.clerk.say(
            "Please do not throw things at the lamp.",
            "clerk",
            2.6,
          );
        }
      },
    };
  }

  update(dt, hero) {
    this.time += dt;
    const once = (key, fn) => {
      if (this.said.has(key)) return;
      this.said.add(key);
      fn();
    };
    // Lines queued for a phase are dropped as soon as the phase moves on.
    const clerk = (text, delay = 0, duration = 2.8) => {
      const phase = this.phase;
      setTimeout(() => {
        if (this.phase !== phase) return;
        this.clerk.talking = 1.4;
        this.clerk.say(text, "clerk", duration);
        this.sound?.play("clerk");
      }, delay * 1000);
    };
    const z = hero.pos.z;
    if (this.phase === "arrive") {
      if (z < -8)
        once("next", () => (clerk("Next!"), clerk("Destination?", 1.9)));
      if (z < -15)
        once(
          "denied",
          () => (
            clerk("No address stamp? Denied."),
            clerk("Please take a number and wait.", 2.6, 3.2)
          ),
        );
      const nearBin =
        Math.hypot(hero.pos.x - LAYOUT.bin.x, z - LAYOUT.bin.z) < 3.2;
      if (nearBin)
        once("bin", () => clerk("Don't touch that. Confiscated.", 0.2));
    }
    if (
      this.phase === "alarm" &&
      this.time - this.alarmAt > 0.9 &&
      !this.spawned
    ) {
      this.spawned = true;
      this.spawnGuards();
    }
    if (
      this.phase === "alarm" &&
      this.spawned &&
      this.guards.length === LAYOUT.guards.length &&
      this.guards.every((g) => !g.alive())
    ) {
      this.phase = "locked";
      this.onCleared?.();
      clerk("…Fine. The barrier is still locked.", 1.2, 3);
      clerk("The lamp's out. Not my department.", 4.4, 3.4);
    }
    if (
      this.phase !== "open" &&
      hero.state === "air" &&
      Math.abs(z - LAYOUT.barrierZ) < 2.2 &&
      hero.pos.x > LAYOUT.barrierFrom - 0.5
    )
      once("jump", () => clerk("No jumping the queue.", 0));
    // The lamp lights, then the arm swings up and the way is clear.
    const lit = this.lampLit ? 1 : 0;
    for (const m of this.lampMaterials)
      m.emissiveIntensity +=
        (lit * 3.2 + 0.05 - m.emissiveIntensity) * Math.min(1, dt * 3);
    this.lampLight.intensity +=
      (lit * 14 - this.lampLight.intensity) * Math.min(1, dt * 3);
    if (this.phase === "open") {
      this.barrierOpen = Math.min(1, this.barrierOpen + dt / 1.6);
      if (this.barrierOpen > 0.5 && this.gateWall.solid)
        this.gateWall.solid = false;
    }
    const k = this.barrierOpen * this.barrierOpen * (3 - 2 * this.barrierOpen);
    if (this.barrier) this.barrier.rotation.z = k * 1.35;
    // The bin's lid jumps when the disc is snatched out of it, then settles.
    const lid = this.bin?.userData.joints?.lid;
    if (lid) {
      if (this.lidRest === undefined) this.lidRest = lid.rotation.x;
      this.lidKick = Math.max(0, (this.lidKick || 0) - dt * 2.2);
      lid.rotation.x =
        this.lidRest - 0.55 * Math.sin(this.lidKick * Math.PI) * this.lidKick;
    }
    this.beamGlow.scale.x = this.beamGlow.scale.z =
      0.85 + Math.sin(this.time * 9) * 0.15;
    this.clerk.update(dt, hero, [], null);
    for (const g of this.guards) g.update(dt, hero, this.guards, this.onStrike);
  }

  // After a knockout: surviving guards return to their posts, the fight picks up again.
  resetFight() {
    for (const g of this.guards) {
      if (g.state === "gone" || g.hp <= 0) continue;
      g.pos.x = g.home.x;
      g.pos.z = g.home.z;
      g.state = "idle";
      g.vel.x = g.vel.z = 0;
      setTimeout(
        () => g.alert(pick(["You again!", "Back of the queue!", "Papers!"])),
        1400,
      );
    }
  }
}

function fallbackBooth(scene, { x, z }) {
  const g = new THREE.Group();
  const basalt = new THREE.MeshStandardMaterial({
    color: 0x3a3531,
    roughness: 0.8,
  });
  const chalk = new THREE.MeshStandardMaterial({
    color: 0xc9c2d8,
    roughness: 0.85,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2), basalt);
  body.position.y = 1.2;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.05), chalk);
  panel.position.set(0, 0.6, 1.01);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0x1d5f63, roughness: 0.3 }),
  );
  lamp.position.y = 2.65;
  const pivot = new THREE.Group();
  pivot.position.set(1.4, 1.2, 0.2);
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xd9a441 }),
  );
  arm.position.x = 2;
  pivot.add(arm);
  g.add(body, panel, lamp, pivot);
  g.position.set(x, 0, z);
  g.userData.joints = { barrier: pivot };
  g.userData.parts = { lamp };
  scene.add(g);
  return g;
}

function fallbackBin(scene, { x, z, yaw }) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x3a3531 }),
  );
  m.position.y = 0.4;
  g.add(m);
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  scene.add(g);
  return g;
}
