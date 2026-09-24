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

// Ink marks left where a Warden's stamp came down: an ochre ring and a verdict, fading out.
export class Stamps {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.textures = ["DENIED", "VOID", "REJECTED"].map((word) => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d");
      ctx.strokeStyle = "rgba(170,40,30,0.9)";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(128, 128, 110, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(128, 128, 88, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(170,40,30,0.95)";
      ctx.font = "900 44px 'Barlow Condensed', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(word, 128, 130);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
    this.geo = new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2);
  }

  mark(x, y, z) {
    const m = new THREE.Mesh(
      this.geo,
      new THREE.MeshBasicMaterial({
        map: this.textures[Math.floor(Math.random() * this.textures.length)],
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    m.position.set(x, y + 0.03, z);
    m.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(m);
    this.items.push({ m, life: 3 });
  }

  update(dt) {
    for (const s of this.items) {
      s.life -= dt;
      s.m.material.opacity = Math.min(1, s.life);
    }
    this.items = this.items.filter((s) => {
      if (s.life > 0) return true;
      s.m.removeFromParent();
      s.m.material.dispose();
      return false;
    });
  }
}
