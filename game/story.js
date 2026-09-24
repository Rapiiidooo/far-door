import * as THREE from "three";
import * as COURT from "./court.js";

// The guide for the first level: which objective is current, where its marker points, and
// the one-time control cards that teach each move the first time it is needed. Steps follow
// the route in order; reaching a later step's goal skips the ones before it, so a player
// who finds their own way is never told to do what they have done.

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const near = (a, b, e = 0.06) => Math.abs(a - b) < e;

// A cinematic in world space: the camera eases between keyframes { at, eye, look } from
// wherever it was, and lines of narration come up at their times. Enter or jump skips it.
export class Shot {
  constructor(keys, lines, hud) {
    this.keys = keys;
    this.lines = lines.slice();
    this.hud = hud;
    this.t = 0;
    this.end = keys[keys.length - 1].at;
    this.letterbox = true;
    this.probe = new THREE.PerspectiveCamera();
  }

  update(dt, camera) {
    this.t += dt;
    if (!this.from)
      this.from = {
        pos: camera.position.clone(),
        quat: camera.quaternion.clone(),
      };
    const k = this.keys;
    let i = 0;
    while (i < k.length - 2 && this.t > k[i + 1].at) i++;
    const a = k[i],
      b = k[i + 1];
    const q = smooth(a.at, b.at, this.t);
    this.probe.position.set(...a.eye).lerp(new THREE.Vector3(...b.eye), q);
    this.probe.lookAt(
      new THREE.Vector3(...a.look).lerp(new THREE.Vector3(...b.look), q),
    );
    const blend = smooth(0, 1.2, this.t);
    camera.position.lerpVectors(this.from.pos, this.probe.position, blend);
    camera.quaternion.slerpQuaternions(
      this.from.quat,
      this.probe.quaternion,
      blend,
    );
    while (this.lines.length && this.t >= this.lines[0][0]) {
      const [, text, seconds] = this.lines.shift();
      this.hud.subtitle(text, seconds);
    }
    if (this.t >= this.end) this.done = true;
  }

  skip() {
    this.hud.clearSubtitle();
    this.done = true;
  }
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export class CourtStory {
  constructor({ hero, level, beams, gate, hud }) {
    this.hero = hero;
    this.level = level;
    this.beams = beams;
    this.gate = gate;
    this.hud = hud;
    this.shown = new Set();
    this.steps = this.makeSteps();
    this.index = 0;
    this.time = 0;
    this.stepTime = 0;
  }

  makeSteps() {
    const hero = this.hero,
      level = this.level;
    const on = (feet) => hero.state === "ground" && near(hero.feet, feet);
    const floor = () => on(0);
    const home = COURT.BLOCKS[0];
    const lit = () => level.stelae.filter((s) => s.lit).length;
    const k = (a) => this.hud.k(a);
    const keys = (...c) => this.hud.keys(...c);
    return [
      {
        id: "camp",
        objective: "Find the first expedition",
        sub: "Their camp is on this terrace: search it",
        marker: V(COURT.NOTES.x, COURT.NOTES.y + 0.7, COURT.NOTES.z),
        done: () => this.notesRead,
      },
      {
        id: "gap",
        objective: "Follow the expedition down into the court",
        sub: "Jump the gap to the west platform",
        marker: V(4, 8.6, 39),
        done: () => on(8) && hero.pos.x < 6.2 && hero.pos.z > 35.8,
        hint: [
          "Jumping",
          `Run at the gap and press ${k("jump")}. Hold it for a full jump.`,
        ],
      },
      {
        id: "drop",
        objective: "Follow the expedition down into the court",
        sub: "Hang from the platform's edge, then let go onto the ledge below",
        marker: V(4, 8.4, 36.1),
        done: () => on(5.5) && hero.pos.x < 6.2 && hero.pos.z > 34,
        hint: [
          "Hanging",
          `Walk to the edge and press ${k("drop")} to hang from it. Press ${k("drop")} again to let go.`,
        ],
      },
      {
        id: "crack",
        objective: "Follow the expedition down into the court",
        sub: "Jump across the chasm and grab the crack in the wall",
        marker: V(5, 7.3, 32.1),
        done: () =>
          hero.state === "hang" &&
          near(hero.ledge?.top ?? 0, 7, 0.1) &&
          hero.pos.z > 32,
        hint: [
          "Grabbing",
          `Jump ${k("jump")} towards the crack: the explorer catches any edge within reach. The rope marks the spot.`,
        ],
      },
      {
        id: "climb",
        objective: "Follow the expedition down into the court",
        sub: "Shimmy right along the crack and climb up",
        marker: V(9.6, 7.4, 31),
        done: () => on(7) && hero.pos.x > 8 && hero.pos.x < 10,
        hint: [
          "Climbing",
          `${keys("KeyA", "KeyD")} shimmy along the edge · ${keys("KeyW")} climb up · ${k("drop")} let go.`,
        ],
      },
      {
        id: "stair",
        objective: "Follow the expedition down into the court",
        sub: "Take the broken stair down to the floor",
        marker: V(17, 1.3, 27),
        done: () => floor() && hero.pos.z < 34,
      },
      {
        id: "block",
        objective: "Bring the sunlight to the three stelae",
        sub: "A stone block sits in the sunbeam: push it out of the way",
        marker: () => {
          const b = level.blocks[0];
          return V(b.x, 2.4, b.z);
        },
        done: () => {
          const b = level.blocks[0];
          return b.x !== home.x || b.z !== home.z || lit() > 0;
        },
        hint: [
          "Blocks",
          `Stand against the block and hold ${k("interact")}, then push ${keys("KeyW")} or pull ${keys("KeyS")}.`,
        ],
      },
      {
        id: "mirror",
        objective: "Bring the sunlight to the three stelae",
        sub: "Turn the bronze mirror to send the light onto a stela's crystal",
        marker: () => this.lastMirror(),
        done: () => lit() > 0,
        hint: [
          "Mirrors",
          `Hold ${k("interact")} at a mirror and steer ${keys("KeyA", "KeyD")} to turn it. It catches when the light lines up.`,
        ],
      },
      {
        id: "more",
        objective: "Bring the sunlight to the three stelae",
        sub: () =>
          `Stelae lit: ${lit()} of 3. Mirrors can pass the light to each other.`,
        marker: () => this.lastMirror(),
        done: () => lit() >= 3,
        hint: [
          "Relaying light",
          "A lit mirror can aim at another mirror. Turn the last mirror the light reaches towards a dark stela or the next mirror.",
        ],
        hintAfter: 3,
      },
      {
        id: "opening",
        objective: "",
        marker: null,
        done: () => this.gate.isOpen,
      },
      {
        id: "enter",
        objective: "The far door is open",
        sub: "Step through it",
        marker: () => this.gate.center.clone().setY(this.gate.daisTop + 1.2),
        done: () => false,
      },
    ];
  }

  // The last mirror the sunlight reaches: the one to turn next.
  lastMirror() {
    let last = null;
    for (const s of this.beams.segments || []) if (s.end === "mirror") last = s;
    if (!last) {
      const m = this.level.mirrors[0];
      return V(m.x, 2.4, m.z);
    }
    return V(last.x1, 2.4, last.z1);
  }

  // The opening shot of a new game: over the court to the ring, then back up to the
  // abandoned camp and down behind the explorer, with two lines of narration.
  introShot() {
    return new Shot(
      [
        { at: 0, eye: [18, 12.5, 30], look: [15, 4.5, 11] },
        { at: 4.2, eye: [16, 7.8, 21], look: [15, 4.5, 11] },
        { at: 7.4, eye: [26, 11.5, 34.5], look: [22.5, 8.4, 40.5] },
        { at: 9.6, eye: [19.5, 10.2, 41.5], look: [19.4, 9.3, 34.3] },
      ],
      [
        [
          0.6,
          "Three weeks ago, the first expedition sent word from this ravine: a sunken court, a stone ring, a door.",
          4.6,
        ],
        [5.6, "Then nothing. Their camp is still here.", 3.8],
      ],
      this.hud,
    );
  }

  // Keeps control cards back while a line of narration is on screen.
  holdHints(seconds) {
    this.hintHold = this.time + seconds;
  }

  start(chapter) {
    this.hintHold = 0;
    this.index = 0;
    this.stepTime = 0;
    this.time = 0;
    this.notesRead = false;
    if (chapter === "floor")
      this.index = this.steps.findIndex((s) => s.id === "block");
    this.enter();
  }

  get step() {
    return this.steps[this.index];
  }

  enter() {
    const s = this.step;
    this.stepTime = 0;
    // A card about the step just finished would only mislead.
    this.hud.clearHint();
    // The first card waits for the level's title to clear.
    const first = this.time < 4 ? 4.2 - this.time : 0.8;
    this.hintDue =
      s.hint && !this.shown.has(s.id) ? (s.hintAfter ?? first) : null;
    this.refresh();
  }

  refresh() {
    const s = this.step;
    const sub = typeof s.sub === "function" ? s.sub() : s.sub;
    this.hud.objective(s.objective, s.objective ? sub : "");
    this.hud.setMarkers(s.marker ? [s.marker] : []);
  }

  update(dt) {
    this.time += dt;
    this.stepTime += dt;
    // Jump past the furthest step whose goal is met; never go back.
    let moved = false;
    for (let j = this.steps.length - 2; j >= this.index; j--)
      if (this.steps[j].done()) {
        this.index = j + 1;
        moved = true;
        break;
      }
    if (moved) this.enter();
    else if (typeof this.step.sub === "function") this.refresh();
    if (
      this.hintDue !== null &&
      this.stepTime > this.hintDue &&
      this.time >= (this.hintHold ?? 0)
    ) {
      const s = this.step;
      this.shown.add(s.id);
      this.hintDue = null;
      this.hud.hint(s.hint[0], s.hint[1], 9);
    }
  }
}
