// Keyboard, mouse, gamepad and touch folded into one set of intentions. Keys are read by
// physical position (event.code), so ZQSD on an AZERTY keyboard moves like WASD, and prompts
// ask the layout map for the printed label. The on-screen stick and buttons (touch.js) feed
// `touchMove`, `touchDown` and the `touch:` edges.

const MOVE = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
};
const ACTIONS = {
  jump: ["Space"],
  interact: ["KeyE", "KeyF"],
  drop: ["KeyC", "ControlLeft"],
  walk: ["ShiftLeft", "ShiftRight"],
  throw: ["KeyR", "Mouse0"],
  roll: ["KeyQ", "Mouse2"],
  pause: ["Escape", "KeyP"],
  skip: ["Escape", "Enter", "Space"],
};
const PAD = {
  jump: 0,
  drop: 1,
  interact: 2,
  roll: 5,
  walk: 6,
  throw: 7,
  pause: 9,
  skip: 0,
};

export class Input {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.down = new Set();
    this.edges = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.padLook = { x: 0, y: 0 };
    this.padMove = { x: 0, y: 0 };
    this.padDown = new Set();
    this.usingPad = false;
    this.touchMove = { x: 0, y: 0 };
    this.touchDown = new Set();
    this.touchWalk = false;
    this.usingTouch = false;
    this.labels = new Map();
    this.dragging = false;
    // Look sensitivity and inversion live in the shared settings (store.js).
    this.settings = settings;
    addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (isGameKey(e.code)) e.preventDefault();
      this.down.add(e.code);
      this.edges.add(e.code);
      this.usingPad = false;
      this.usingTouch = false;
    });
    addEventListener("keyup", (e) => this.down.delete(e.code));
    addEventListener("blur", () => this.down.clear());
    // With the pointer locked, mouse buttons are actions; without it, the right button
    // drags the view.
    canvas.addEventListener("mousedown", (e) => {
      if (this.locked) {
        this.down.add("Mouse" + e.button);
        this.edges.add("Mouse" + e.button);
        this.usingPad = false;
      } else if (e.button === 2) this.dragging = true;
    });
    addEventListener("mouseup", (e) => {
      this.dragging = false;
      this.down.delete("Mouse" + e.button);
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    // Escape releases the pointer before the page sees the key: the release is the pause.
    this.wasLocked = false;
    document.addEventListener("pointerlockchange", () => {
      const locked = this.locked;
      if (this.wasLocked && !locked) this.onUnlock?.();
      this.wasLocked = locked;
    });
    addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === canvas || this.dragging) {
        this.lookX += e.movementX;
        this.lookY += e.movementY;
      }
    });
    navigator.keyboard
      ?.getLayoutMap?.()
      .then((map) => {
        for (const code of [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "KeyE",
          "KeyC",
          "KeyR",
          "KeyQ",
          "KeyP",
        ])
          if (map.get(code)) this.labels.set(code, map.get(code).toUpperCase());
      })
      .catch(() => {});
  }

  lockPointer() {
    this.canvas.requestPointerLock?.()?.catch?.(() => {});
  }

  get locked() {
    return document.pointerLockElement === this.canvas;
  }

  poll() {
    const pad = [...(navigator.getGamepads?.() || [])].find(Boolean);
    const before = new Set(this.padDown);
    this.padDown.clear();
    this.padMove.x = this.padMove.y = this.padLook.x = this.padLook.y = 0;
    if (!pad) return;
    const dead = (v) =>
      Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82;
    this.padMove.x = dead(pad.axes[0] || 0);
    this.padMove.y = -dead(pad.axes[1] || 0);
    this.padLook.x = dead(pad.axes[2] || 0);
    this.padLook.y = dead(pad.axes[3] || 0);
    for (const [name, index] of Object.entries(PAD))
      if (pad.buttons[index]?.pressed) this.padDown.add(name);
    for (const name of this.padDown)
      if (!before.has(name)) this.edges.add("pad:" + name);
    if (this.padDown.size || Math.hypot(this.padMove.x, this.padMove.y) > 0.3) {
      this.usingPad = true;
      this.usingTouch = false;
    }
  }

  // Stick or keys, as x (right) and y (forward), length at most 1.
  get move() {
    const key = (list) => list.some((c) => this.down.has(c));
    let x =
      (key(MOVE.right) ? 1 : 0) -
      (key(MOVE.left) ? 1 : 0) +
      this.padMove.x +
      this.touchMove.x;
    let y =
      (key(MOVE.forward) ? 1 : 0) -
      (key(MOVE.back) ? 1 : 0) +
      this.padMove.y +
      this.touchMove.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  held(action) {
    return (
      ACTIONS[action].some((c) => this.down.has(c)) ||
      this.padDown.has(action) ||
      this.touchDown.has(action)
    );
  }

  pressed(action) {
    return (
      ACTIONS[action].some((c) => this.edges.has(c)) ||
      this.edges.has("pad:" + action) ||
      this.edges.has("touch:" + action)
    );
  }

  anyPressed() {
    return this.edges.size > 0;
  }

  // Forget everything held, after a menu or a cinematic took the controls.
  clear() {
    this.down.clear();
    this.edges.clear();
    this.touchDown.clear();
    this.lookX = this.lookY = 0;
  }

  // Camera look in radians for this frame.
  takeLook(dt) {
    const k = this.settings.sensitivity,
      inv = this.settings.invertY ? -1 : 1;
    const x = (this.lookX * 0.0026 + this.padLook.x * 2.6 * dt) * k;
    const y = (this.lookY * 0.0022 + this.padLook.y * 1.8 * dt) * k * inv;
    this.lookX = this.lookY = 0;
    return { x, y };
  }

  endFrame() {
    this.edges.clear();
  }

  // Printed name of a control for prompts, following the current device and layout.
  label(action) {
    // The on-screen buttons carry these names.
    if (this.usingTouch)
      return (
        {
          jump: "Jump",
          interact: "Use",
          drop: "Hang",
          walk: "Stick",
          throw: "Throw",
          roll: "Roll",
          pause: "Pause",
        }[action] || action
      );
    if (this.usingPad)
      return (
        {
          jump: "A",
          interact: "X",
          drop: "B",
          walk: "LT",
          throw: "RT",
          roll: "RB",
          pause: "Start",
        }[action] || action
      );
    if (action === "throw") return `Click / ${this.labels.get("KeyR") || "R"}`;
    if (action === "roll")
      return `Right click / ${this.labels.get("KeyQ") || "Q"}`;
    if (action === "pause") return "Esc";
    const code = {
      jump: "Space",
      interact: "KeyE",
      drop: "KeyC",
      walk: "ShiftLeft",
    }[action];
    if (code === "Space") return "Space";
    if (code === "ShiftLeft") return "Shift";
    return this.labels.get(code) || code.replace("Key", "");
  }

  // The printed label of a key on the current layout: KeyW reads Z on AZERTY.
  keyLabel(code) {
    if (this.usingPad || this.usingTouch)
      return { KeyW: "↑", KeyS: "↓", KeyA: "←", KeyD: "→" }[code] || code;
    return this.labels.get(code) || code.replace("Key", "");
  }

  moveLabel() {
    if (this.usingPad) return "Left stick";
    if (this.usingTouch) return "Stick";
    return ["KeyW", "KeyA", "KeyS", "KeyD"]
      .map((c) => this.labels.get(c) || c.replace("Key", ""))
      .join("");
  }
}

function isGameKey(code) {
  return (
    Object.values(MOVE).some((l) => l.includes(code)) ||
    Object.values(ACTIONS).some((l) => l.includes(code))
  );
}
