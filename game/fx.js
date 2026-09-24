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

  // Moves every puff into another scene, tinted for its ground.
  moveTo(scene, color) {
    for (const p of this.items) {
      scene.add(p.sprite);
      p.sprite.material.color.setHex(color);
    }
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

// Ink left where a Warden's stamp came down: its glyph in a ring, ochre on the ground, red and
// struck through on the wrong plate, turquoise on the right one. Marks are pooled, one
// material each, so stamping never creates anything new during play.
const INKS = {
  ground: "rgba(196,138,40,0.92)",
  void: "rgba(178,44,34,0.95)",
  plate: "rgba(90,240,222,0.95)",
};

export class Stamps {
  constructor(scene, glyphs, draw) {
    this.scene = scene;
    this.textures = new Map();
    for (const glyph of glyphs)
      for (const [kind, ink] of Object.entries(INKS)) {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const ctx = c.getContext("2d");
        ctx.strokeStyle = ink;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.arc(128, 128, 106, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(128, 128, 84, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2.6;
        draw(ctx, glyph, 128, 128, 130);
        if (kind === "void") {
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.moveTo(52, 52);
          ctx.lineTo(204, 204);
          ctx.moveTo(204, 52);
          ctx.lineTo(52, 204);
          ctx.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        this.textures.set(`${glyph}:${kind}`, t);
      }
    const geo = new THREE.PlaneGeometry(1.2, 1.2).rotateX(-Math.PI / 2);
    this.items = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          map: this.textures.values().next().value,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          opacity: 0,
        }),
      );
      m.visible = false;
      m.renderOrder = 2;
      scene.add(m);
      this.items.push({ m, life: 0 });
    }
    this.next = 0;
  }

  mark(x, y, z, glyph, kind = "ground") {
    const s = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    s.m.material.map =
      this.textures.get(`${glyph}:${kind}`) || s.m.material.map;
    s.m.position.set(x, y + 0.03 + this.next * 0.001, z);
    s.m.rotation.y = Math.random() * Math.PI * 2;
    s.m.visible = true;
    s.life = kind === "plate" ? 6 : 3.5;
  }

  update(dt) {
    for (const s of this.items) {
      if (!s.m.visible) continue;
      s.life -= dt;
      s.m.material.opacity = Math.min(1, s.life);
      if (s.life <= 0) s.m.visible = false;
    }
  }

  clear() {
    for (const s of this.items) s.m.visible = false;
  }
}

// The ring a winding-up Warden paints on the ground where its stamp will land. It fills as
// the stamp rises: ochre on the ground, turquoise over the matching plate, red over the wrong one.
export class Telegraphs {
  constructor(scene, count = 3) {
    this.items = [];
    // The stamp's reach (wardens.js STAMP_RADIUS): inside the ring is hit, outside is not.
    const geo = new THREE.CircleGeometry(0.9, 48).rotateX(-Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const uniforms = {
        uFill: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(1.6, 1.0, 0.25) },
      };
      const m = new THREE.Mesh(
        geo,
        new THREE.ShaderMaterial({
          uniforms,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xz / 0.9; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `
            uniform float uFill; uniform float uTime; uniform vec3 uColor; varying vec2 vP;
            void main() {
              float r = length(vP);
              float rim = smoothstep(0.84, 0.9, r) * (1.0 - smoothstep(0.96, 1.0, r));
              float fill = (1.0 - smoothstep(uFill - 0.03, uFill, r)) * 0.32;
              float pulse = 0.75 + 0.25 * sin(uTime * 18.0);
              float a = max(rim * pulse, fill);
              gl_FragColor = vec4(uColor * (0.6 + a), a);
            }`,
        }),
      );
      m.visible = false;
      m.renderOrder = 3;
      m.frustumCulled = false;
      scene.add(m);
      this.items.push({ m, uniforms, owner: null, t: 0, duration: 0.85 });
    }
  }

  show(owner, x, y, z, tone = "ground", duration = 0.85) {
    let slot =
      this.items.find((s) => s.owner === owner) ||
      this.items.find((s) => !s.owner);
    if (!slot) slot = this.items[0];
    slot.owner = owner;
    slot.t = 0;
    slot.duration = duration;
    slot.m.position.set(x, y + 0.04, z);
    slot.m.visible = true;
    const c = {
      ground: [1.6, 1.0, 0.25],
      plate: [0.3, 2.2, 2.0],
      void: [2.2, 0.35, 0.25],
    }[tone];
    slot.uniforms.uColor.value.setRGB(...c);
  }

  hide(owner) {
    for (const s of this.items)
      if (s.owner === owner) {
        s.owner = null;
        s.m.visible = false;
      }
  }

  update(dt) {
    for (const s of this.items) {
      if (!s.owner) continue;
      s.t += dt;
      s.uniforms.uFill.value = Math.min(1, s.t / s.duration);
      s.uniforms.uTime.value += dt;
    }
  }

  clear() {
    for (const s of this.items) {
      s.owner = null;
      s.m.visible = false;
    }
  }
}
