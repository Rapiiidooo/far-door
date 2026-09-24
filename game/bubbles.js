import * as THREE from "three";

// Speech bubbles pinned to points in the world: small DOM cards projected every frame, so
// the Wardens can be officious in readable type instead of in textures.
export class Bubbles {
  constructor() {
    this.layer = document.createElement("div");
    this.layer.id = "bubbles";
    document.body.appendChild(this.layer);
    this.items = [];
    this.v = new THREE.Vector3();
  }

  // `anchor` returns the world point to pin to; lines replace any bubble on the same anchor.
  say(anchor, text, { duration = 2.4, kind = "warden", key = null } = {}) {
    if (key)
      this.items
        .filter((b) => b.key === key)
        .forEach((b) => (b.life = Math.min(b.life, 0.12)));
    const el = document.createElement("p");
    el.className = `bubble ${kind}`;
    el.textContent = text;
    this.layer.appendChild(el);
    this.items.push({ el, anchor, life: duration, total: duration, key });
  }

  clear() {
    for (const b of this.items) b.el.remove();
    this.items = [];
  }

  update(dt, camera) {
    const w = innerWidth,
      h = innerHeight;
    for (const b of this.items) {
      b.life -= dt;
      const p = this.v.copy(b.anchor());
      p.project(camera);
      const visible = p.z < 1 && Math.abs(p.x) < 1.2 && Math.abs(p.y) < 1.2;
      const x = (p.x * 0.5 + 0.5) * w,
        y = (-p.y * 0.5 + 0.5) * h;
      b.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      const age = b.total - b.life;
      b.el.style.opacity = visible ? Math.min(1, age * 8, b.life * 4) : 0;
    }
    this.items = this.items.filter((b) => {
      if (b.life > 0) return true;
      b.el.remove();
      return false;
    });
  }
}
