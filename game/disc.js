import * as THREE from "three";

// The sun disc: thrown, it flies straight for a moment, then curves home to the hand like a
// returning blade. It strikes what it meets and turns back at once; flown through a beam of
// light it drinks the light and glows for a while, and a glowing disc can light a lamp.

const OUT_TIME = 0.42,
  OUT_SPEED = 23,
  BACK_SPEED = 27,
  CATCH = 0.7,
  CHARGE_TIME = 7,
  AIM_CONE = THREE.MathUtils.degToRad(26),
  AIM_RANGE = 24;

const TURQUOISE = new THREE.Color(0x39e3d0);

export class SunDisc {
  constructor(mesh, world, sound) {
    this.mesh = mesh;
    this.world = world;
    this.sound = sound;
    this.state = "hidden";
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.prev = new THREE.Vector3();
    this.charge = 0;
    this.t = 0;
    this.spin = 0;
    this.targets = [];
    this.beams = [];
    this.hitThisThrow = new Set();
    mesh.visible = false;
    this.lens = [];
    mesh.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      if (mesh.userData.parts?.lens && isInside(o, mesh.userData.parts.lens)) {
        o.material = o.material.clone();
        this.lens.push(o.material);
      }
    });
    // A soft halo that shows the disc's charge from far away.
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(160,255,240,0.5)");
    g.addColorStop(1, "rgba(60,220,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(0.8, 2.6, 2.4),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        transparent: true,
        opacity: 0,
      }),
    );
    this.halo.scale.setScalar(1.3);
    mesh.add(this.halo);
  }

  get charged() {
    return this.charge > 0;
  }

  get ready() {
    return this.state === "held";
  }

  // Before the explorer takes it back: resting on the pile of confiscated things,
  // turning slowly and glowing so it can be seen from the path.
  display(scene, at) {
    this.state = "display";
    this.mesh.visible = true;
    scene.add(this.mesh);
    this.displayAt = at.clone();
    this.mesh.position.copy(at);
    this.displayLight = new THREE.PointLight(0x39e3d0, 4, 4, 1.8);
    this.displayLight.position.copy(at).add(new THREE.Vector3(0, 0.4, 0));
    scene.add(this.displayLight);
  }

  // The disc rides in the right hand, lying flat.
  attach(hand) {
    if (this.displayLight) {
      this.displayLight.removeFromParent();
      this.displayLight = null;
    }
    this.hand = hand;
    this.state = "held";
    this.mesh.visible = true;
    hand.add(this.mesh);
    this.mesh.position.set(0, -0.36, 0.08);
    this.mesh.rotation.set(0.2, 0, 0);
    this.mesh.scale.setScalar(
      1 / (hand.getWorldScale(new THREE.Vector3()).x || 1),
    );
  }

  handPosition(out = new THREE.Vector3()) {
    this.hand.updateWorldMatrix(true, false);
    return out.set(0, -0.36, 0.08).applyMatrix4(this.hand.matrixWorld);
  }

  // Throws along the camera's heading, bending the aim onto the best target near it.
  throw(scene, camera, fallbackYaw) {
    if (this.state !== "held") return false;
    const from = this.handPosition(new THREE.Vector3());
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = Math.max(-0.15, Math.min(0.35, fwd.y + 0.12));
    if (fwd.lengthSq() < 1e-4)
      fwd.set(Math.sin(fallbackYaw), 0, Math.cos(fallbackYaw));
    fwd.normalize();
    let best = null,
      bestAngle = AIM_CONE;
    for (const t of this.targets) {
      if (!t.alive()) continue;
      const to = t.center().clone().sub(from);
      const dist = to.length();
      if (dist > AIM_RANGE || dist < 0.3) continue;
      const flat = new THREE.Vector3(to.x, 0, to.z).normalize();
      const fflat = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
      const angle = flat.angleTo(fflat);
      if (angle < bestAngle) {
        bestAngle = angle;
        best = t;
      }
    }
    const dir = best ? best.center().clone().sub(from).normalize() : fwd;
    this.aimed = best;
    // Flying at a target, the disc goes all the way to it; loosed freely it turns early.
    this.outTime = best
      ? Math.min(1.0, best.center().distanceTo(from) / OUT_SPEED + 0.08)
      : OUT_TIME;
    this.state = "out";
    this.t = 0;
    this.hitThisThrow.clear();
    this.pos.copy(from);
    this.prev.copy(from);
    this.vel.copy(dir).multiplyScalar(OUT_SPEED);
    scene.attach(this.mesh);
    this.mesh.position.copy(from);
    this.mesh.rotation.set(0, 0, 0);
    this.sound?.play("throw");
    return true;
  }

  update(dt, hero, onCatch) {
    this.charge = Math.max(0, this.charge - dt);
    const glow = Math.min(1, this.charge / 1.5);
    this.halo.material.opacity =
      glow * (0.75 + 0.25 * Math.sin(performance.now() * 0.02));
    for (const m of this.lens) {
      m.emissive = TURQUOISE;
      m.emissiveIntensity = 0.4 + glow * 3;
    }
    if (this.state === "display") {
      this.spin += dt * 1.2;
      this.mesh.position.set(
        this.displayAt.x,
        this.displayAt.y + Math.sin(this.spin * 2) * 0.05,
        this.displayAt.z,
      );
      this.mesh.rotation.set(0.9, this.spin, 0);
      this.halo.material.opacity = 0.35 + Math.sin(this.spin * 3) * 0.1;
      return;
    }
    if (this.state === "held" || this.state === "hidden") return;
    this.t += dt;
    this.spin += dt * 26;
    this.prev.copy(this.pos);
    if (this.state === "out") {
      // A light pull towards the aimed target keeps a moving Warden in the path.
      if (this.aimed?.alive()) {
        const want = this.aimed
          .center()
          .clone()
          .sub(this.pos)
          .normalize()
          .multiplyScalar(OUT_SPEED);
        this.vel.lerp(want, Math.min(1, dt * 4));
      }
      this.pos.addScaledVector(this.vel, dt);
      if (this.t > this.outTime) this.turnBack();
      else this.collide();
    } else {
      const hand = this.handPosition(new THREE.Vector3());
      const to = hand.sub(this.pos);
      const d = to.length();
      if (d < CATCH) {
        this.state = "held";
        this.attach(this.hand);
        this.sound?.play("catch");
        onCatch?.();
        return;
      }
      this.vel.lerp(
        to.normalize().multiplyScalar(BACK_SPEED),
        Math.min(1, dt * 9),
      );
      this.pos.addScaledVector(this.vel, dt);
    }
    this.chargeFromBeams();
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(0.15, this.spin, 0);
  }

  turnBack() {
    if (this.state !== "out") return;
    this.state = "back";
    this.t = 0;
  }

  // Walls send it home; targets take the blow and send it home too.
  collide() {
    const step = this.pos.clone().sub(this.prev);
    const len = step.length();
    if (len < 1e-5) return;
    const dir = step.clone().divideScalar(len);
    const hit = this.world.ray(
      this.prev.x,
      this.prev.y,
      this.prev.z,
      dir.x,
      dir.y,
      dir.z,
      len,
      (b) => b.kind !== "prop",
    );
    for (const t of this.targets) {
      if (!t.alive() || this.hitThisThrow.has(t)) continue;
      const c = t.center();
      const closest = this.prev
        .clone()
        .addScaledVector(
          dir,
          THREE.MathUtils.clamp(c.clone().sub(this.prev).dot(dir), 0, len),
        );
      if (closest.distanceTo(c) < t.radius + 0.22) {
        this.hitThisThrow.add(t);
        t.onHit(this);
        this.pos.copy(closest);
        this.turnBack();
        return;
      }
    }
    if (hit) {
      this.pos.copy(this.prev).addScaledVector(dir, Math.max(0, hit.t - 0.1));
      this.sound?.play("clink");
      this.turnBack();
    }
  }

  // Passing through a beam of light charges the disc.
  chargeFromBeams() {
    for (const b of this.beams) {
      if (!b.active()) continue;
      const d = segmentDistance(this.prev, this.pos, b.from, b.to);
      if (d < 0.45) {
        if (this.charge < CHARGE_TIME - 0.5) this.sound?.play("charge");
        this.charge = CHARGE_TIME;
      }
    }
  }
}

function isInside(node, root) {
  for (let n = node; n; n = n.parent) if (n === root) return true;
  return false;
}

// Closest distance between two segments in 3D.
function segmentDistance(p1, q1, p2, q2) {
  const d1 = q1.clone().sub(p1),
    d2 = q2.clone().sub(p2),
    r = p1.clone().sub(p2);
  const a = d1.dot(d1),
    e = d2.dot(d2),
    f = d2.dot(r);
  let s = 0,
    t = 0;
  if (a <= 1e-9 && e <= 1e-9) return r.length();
  if (a <= 1e-9) t = THREE.MathUtils.clamp(f / e, 0, 1);
  else {
    const c = d1.dot(r);
    if (e <= 1e-9) s = THREE.MathUtils.clamp(-c / a, 0, 1);
    else {
      const b = d1.dot(d2),
        denom = a * e - b * b;
      s =
        denom !== 0 ? THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = THREE.MathUtils.clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = THREE.MathUtils.clamp((b - c) / a, 0, 1);
      }
    }
  }
  const c1 = p1.clone().addScaledVector(d1, s),
    c2 = p2.clone().addScaledVector(d2, t);
  return c1.distanceTo(c2);
}

// Until the generated disc arrives: a bronze disc with a turquoise lens.
export function fallbackDisc() {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({
    color: 0xb98442,
    metalness: 0.85,
    roughness: 0.35,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.225, 0.225, 0.05, 24),
    bronze,
  );
  body.position.y = 0.025;
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16),
    new THREE.MeshStandardMaterial({
      color: 0x1d5f63,
      emissive: 0x39e3d0,
      emissiveIntensity: 0.4,
    }),
  );
  lens.position.y = 0.03;
  g.add(body, lens);
  g.userData.parts = { lens };
  return g;
}
