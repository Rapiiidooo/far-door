import * as THREE from "three";
import { progress, findRelic } from "./store.js";
import { clearGrass } from "./grass.js";

// Five things the expeditions left behind, hidden along the way for the curious. Each is
// found once and for good, like an achievement: taken, it leaves its world and is listed on
// the Relics screen. `at` is [x, z] on the ground of its world, or offsets from an isle's
// centre on the isles. `leave` names the materials that stay behind when it is taken.
export const RELICS = [
  {
    id: "papyrus",
    where: "court",
    world: "The Sunken Court",
    hint: "Somewhere in the Sunken Court.",
    name: "The first papyrus",
    line: "The first expedition's survey of the court, rolled and tied, the mirrors drawn in.",
    verb: "Pick up the papyrus",
    asset: "field_scroll",
    at: [26.25, 16.35],
    yaw: 2.4,
    tint: [0.9, 0.84, 0.72],
  },
  {
    id: "radio",
    where: "two",
    world: "The Checkpoint",
    hint: "Somewhere at the Checkpoint.",
    name: "The field radio",
    line: "Confiscated at the window and dropped by the spire. It still hisses, tuned to home.",
    verb: "Take the radio",
    asset: "field_radio",
    at: [-10.3, -36.4],
    yaw: 1.2,
    // Its dial still glows faintly, enough to find it in the checkpoint's dusk.
    light: { intensity: 0.45, at: 0.35, reach: 3.5 },
  },
  {
    id: "page",
    where: "three",
    world: "The Dawn Isles",
    hint: "Somewhere on the Dawn Isles.",
    name: "Mira's lost page",
    line: "Torn from her journal: the isles drawn at first light, drifting together.",
    verb: "Pick up the page",
    asset: "field_scroll",
    tint: [0.95, 0.9, 0.8],
    isle: "ledge",
    at: [3.1, 0.6],
    yaw: 0.9,
    scale: 0.9,
  },
  {
    id: "scarf",
    where: "four",
    world: "The Frozen Reach",
    hint: "Somewhere in the Frozen Reach.",
    name: "Mira's scarf",
    line: "Left on a stone above the pond. The frost has not yet taken the red.",
    verb: "Take Mira's scarf",
    asset: "mira_scarf",
    at: [-6.4, -78.6],
    yaw: 0.8,
    leave: ["stone"],
  },
  {
    id: "lantern",
    where: "four",
    world: "The Frozen Reach",
    hint: "Somewhere in the Frozen Reach.",
    name: "Mira's lantern",
    line: "Still burning low in the lee of the island. She meant to come back for it.",
    verb: "Take Mira's lantern",
    asset: "mira_lantern",
    at: [-10.4, -160.6],
    yaw: 0.6,
    light: { intensity: 1.1, flame: true, reach: 7 },
  },
];

const TAKE = 0.7;

export class Relics {
  constructor({ assets, hud, sound }) {
    this.assets = assets;
    this.hud = hud;
    this.sound = sound;
    this.items = [];
    this.time = 0;
    this.onFound = null;
  }

  // `worlds` maps each place to its scene, its collision world and what lies on its ground
  // (the court's sand); `isles` finds an isle's centre.
  async build(worlds, isles) {
    const glint = new THREE.SpriteMaterial({
      map: glintTexture(),
      color: 0xfff1cf,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    for (const def of RELICS) {
      const w = worlds[def.where];
      let [x, z] = def.at;
      if (def.isle) {
        const c = isles.isle(def.isle).collider;
        x += c.x;
        z += c.z;
      }
      const ground = w.world.ground(x, z, 0.05, 1e4, 0);
      const y = ground + (w.lift?.(x, z, ground) ?? 0);
      // No tuft grows over it: small things lie low.
      clearGrass(w.scene, x, z, 0.9);
      const model =
        (await this.assets.make(def.asset, {
          keepHierarchy: !!def.light?.flame,
        })) || fallback(def);
      // Aged: the court's sun would bleach new parchment white.
      if (def.tint)
        model.traverse((m) => {
          if (!m.isMesh) return;
          m.material = m.material.clone();
          m.material.color.multiply(new THREE.Color(...def.tint));
        });
      // Small things cast no shadow: the lantern's see-through panes would want a shadow
      // shader of their own, compiled in the middle of play.
      model.traverse((m) => m.isMesh && (m.castShadow = false));
      model.position.set(x, y, z);
      model.rotation.y = def.yaw;
      model.scale.multiplyScalar(def.scale ?? 1);
      // Its own material: a glint fades and turns on its own.
      const sprite = new THREE.Sprite(glint.clone());
      sprite.position.set(x, y + 0.9, z);
      sprite.scale.setScalar(0.55);
      sprite.renderOrder = 8;
      const item = {
        def,
        scene: w.scene,
        model,
        sprite,
        home: model.position.clone(),
        state: "gone",
        taking: 0,
        seed: this.items.length * 1.7,
        box: {
          minX: x - 0.45,
          maxX: x + 0.45,
          minZ: z - 0.45,
          maxZ: z + 0.45,
          minY: y - 0.3,
          maxY: y + 1.2,
        },
      };
      // A relic's light stays in the scene once it is taken, dimmed to nothing: a light that
      // came and went would change every shader of its world in the middle of play.
      if (def.light) {
        if (def.light.flame)
          model.userData.parts?.flame?.traverse((m) => {
            if (!m.isMesh) return;
            m.material = m.material.clone();
            m.material.emissive = new THREE.Color(0xffb24a);
            m.material.emissiveIntensity = 2.2;
            item.flameMat = m.material;
          });
        const at = model.userData.light?.[1] ?? def.light.at ?? 0.2;
        item.light = new THREE.PointLight(0xffb24a, 0, def.light.reach, 1.6);
        item.light.position.set(x, y + at * (def.scale ?? 1), z);
        w.scene.add(item.light);
      }
      this.items.push(item);
      this.place(item);
    }
  }

  // Waiting where it was left, or taken: gone, apart from anything it was set down on.
  place(item) {
    const found = progress.relics.has(item.def.id);
    item.state = found ? "gone" : "waiting";
    item.taking = 0;
    item.model.position.copy(item.home);
    item.model.rotation.y = item.def.yaw;
    item.model.scale.setScalar(item.def.scale ?? 1);
    item.model.traverse((m) => {
      if (m.isMesh) m.visible = !found || this.stays(item, m);
    });
    if (!found || item.def.leave) item.scene.add(item.model);
    else item.scene.remove(item.model);
    if (found) item.scene.remove(item.sprite);
    else item.scene.add(item.sprite);
    item.sprite.material.opacity = 1;
    if (item.light) item.light.intensity = found ? 0 : item.def.light.intensity;
  }

  stays(item, mesh) {
    return !!item.def.leave?.includes(mesh.material?.name);
  }

  // After the progress is forgotten, every relic is back where it was left.
  restore() {
    for (const item of this.items) this.place(item);
  }

  interactables(where) {
    const list = [];
    for (const item of this.items) {
      if (item.def.where !== where || item.state !== "waiting") continue;
      list.push({
        kind: "use",
        box: item.box,
        ref: { use: () => this.take(item) },
        prompt: `relic:${item.def.verb}`,
      });
    }
    return list;
  }

  take(item) {
    if (item.state !== "waiting") return false;
    item.state = "taking";
    item.taking = 0;
    findRelic(item.def.id);
    const count = progress.relics.size;
    this.sound.play("relic");
    this.hud.relic(item.def.name, item.def.line, count, RELICS.length);
    // What it was set down on stays; only the thing itself is lifted away.
    if (item.def.leave)
      item.model.traverse((m) => {
        if (m.isMesh && !this.stays(item, m)) m.visible = false;
      });
    this.onFound?.(item.def, count);
    return true;
  }

  update(dt, where) {
    this.time += dt;
    for (const item of this.items) {
      if (item.def.where !== where || item.state === "gone") continue;
      const s = item.sprite;
      if (item.state === "taking") {
        item.taking += dt;
        const k = Math.min(1, item.taking / TAKE);
        if (!item.def.leave) {
          item.model.position.y = item.home.y + k * 0.6;
          item.model.rotation.y = item.def.yaw + k * 3;
          item.model.scale.setScalar((item.def.scale ?? 1) * (1 - k * k));
        }
        s.scale.setScalar(0.55 + k * 1.6);
        s.material.opacity = 1 - k;
        if (item.light)
          item.light.intensity = item.def.light.intensity * (1 - k);
        if (k >= 1) this.place(item);
        continue;
      }
      // A glint that catches the eye now and then, never a beacon.
      const t = (this.time + item.seed) % 2.8;
      const flash = Math.max(0, 1 - Math.abs(t - 0.25) / 0.25);
      s.scale.setScalar(0.3 + flash * 0.45);
      s.material.rotation = this.time * 0.6;
      if (item.flameMat) {
        const f = 2 + Math.sin(this.time * 9 + item.seed) * 0.25;
        item.flameMat.emissiveIntensity = f;
        item.light.intensity =
          item.def.light.intensity * (0.95 + Math.sin(this.time * 7.3) * 0.09);
      }
    }
  }

  // For the Relics screen.
  list() {
    return RELICS.map((def) => ({
      ...def,
      found: progress.relics.has(def.id),
    }));
  }

  // For the telemetry: where each relic still waiting lies.
  spots() {
    return this.items
      .filter((i) => i.state === "waiting")
      .map((i) => ({
        id: i.def.id,
        where: i.def.where,
        at: [i.home.x, i.home.y, i.home.z].map((v) => +v.toFixed(2)),
      }));
  }
}

// A four-pointed star with a soft core, drawn once.
function glintTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const core = g.createRadialGradient(32, 32, 0, 32, 32, 16);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = core;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (const [w, h] of [
    [3, 30],
    [30, 3],
  ]) {
    g.beginPath();
    g.ellipse(32, 32, w, h, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function fallback(def) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.45, 10).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.9 }),
  );
  m.position.y = 0.06;
  g.add(m);
  if (def.light?.flame) g.userData.parts = { flame: m };
  return g;
}
