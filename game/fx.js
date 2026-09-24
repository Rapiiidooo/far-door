import * as THREE from "three";

// Sand kicked up by landings and scraping blocks: soft sprites that billow out and fade.
export class Dust {
  constructor(scene, count = 90) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.5, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    this.items = [];
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map,
          color: 0xd9b88a,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      sprite.visible = false;
      scene.add(sprite);
      this.items.push({
        sprite,
        life: 0,
        max: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 1,
      });
    }
    this.next = 0;
  }

  // A ring of puffs at a point; strength scales count, spread and size.
  burst(x, y, z, strength = 1, count = 10) {
    for (let i = 0; i < count; i++) {
      const p = this.items[this.next];
      this.next = (this.next + 1) % this.items.length;
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const v = (0.8 + Math.random() * 1.4) * strength;
      Object.assign(p, {
        life: 0,
        max: 0.6 + Math.random() * 0.5,
        vx: Math.cos(a) * v,
        vy: 0.3 + Math.random() * 0.6 * strength,
        vz: Math.sin(a) * v,
        size: (0.35 + Math.random() * 0.3) * (0.7 + strength * 0.5),
      });
      p.sprite.position.set(
        x + Math.cos(a) * 0.2,
        y + 0.08,
        z + Math.sin(a) * 0.2,
      );
      p.sprite.visible = true;
    }
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.sprite.visible) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) {
        p.sprite.visible = false;
        continue;
      }
      const drag = Math.exp(-dt * 3.5);
      p.vx *= drag;
      p.vz *= drag;
      p.vy *= drag;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      p.sprite.scale.setScalar(p.size * (1 + k * 1.6));
      p.sprite.material.opacity = 0.55 * (1 - k) * Math.min(1, k * 8);
    }
  }
}
